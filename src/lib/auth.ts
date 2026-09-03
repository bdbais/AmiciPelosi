import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import type { Role } from './moderation-types'

export { hashPassword, verifyPassword } from './password'

/** Le parole con cui si dice a una persona che non puo' piu' entrare. */
export function bannedMessage(reason: string | null) {
  return `Questo account è stato bloccato. Motivo: ${reason?.trim() || 'non indicato'}`
}

const COOKIE_NAME = 'ap_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET mancante o troppo corto: impostalo nel file .env (vedi .env.example)',
    )
  }
  return new TextEncoder().encode(secret)
}

/**
 * Apre una sessione. Il numero di versione finisce nel token: se un giorno
 * l'utente vuole uscire da tutti i dispositivi basta alzarlo di uno
 * (revokeAllSessions) e ogni token in giro smette di valere.
 */
export async function createSession(userId: string, sessionVersion: number) {
  const token = await new SignJWT({ sub: userId, sv: sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

/** Chiude la sessione di questo dispositivo soltanto: gli altri restano dentro. */
export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/**
 * "Esci da tutti i dispositivi": alza la versione e ogni token firmato con la
 * precedente viene rifiutato da currentUser. Oggi non c'e' ancora un posto in
 * cui premere quel pulsante, ne' una rotta per cambiare la password, che
 * sarebbe l'altro momento in cui chiamarla: il meccanismo e' pronto, manca
 * solo chi lo invoca. La cancellazione dell'account non ne ha bisogno,
 * perche' senza la riga in users nessun token trova piu' nessuno.
 */
export async function revokeAllSessions(userId: string) {
  const db = await getDb()
  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))
}

export type SessionUser = {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  emailVerified: boolean
  role: Role
  alertLat: number | null
  alertLng: number | null
  alertRadiusKm: number
  alertsEnabled: boolean
  alertCity: string | null
  alertEveryMinutes: number
  accountType: string
  orgName: string | null
  orgAddress: string | null
  orgCity: string | null
  orgPhone: string | null
  orgEmail: string | null
  orgSite: string | null
  orgHours: string | null
  orgLat: number | null
  orgLng: number | null
  orgFacebook: string | null
  orgInstagram: string | null
}

/** Utente della richiesta corrente, oppure null se non autenticato. */
export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (!payload.sub) return null

    // I token emessi prima che esistesse la versione non la portano: valgono
    // come versione 0, cosi' nessuno e' stato buttato fuori dal cambiamento.
    const tokenVersion = typeof payload.sv === 'number' ? payload.sv : 0

    const db = await getDb()
    const rows = await db
      .select({
        sessionVersion: users.sessionVersion,
        bannedAt: users.bannedAt,
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        role: users.role,
        alertLat: users.alertLat,
        alertLng: users.alertLng,
        alertRadiusKm: users.alertRadiusKm,
        alertsEnabled: users.alertsEnabled,
        alertCity: users.alertCity,
        alertEveryMinutes: users.alertEveryMinutes,
        accountType: users.accountType,
        orgName: users.orgName,
        orgAddress: users.orgAddress,
        orgCity: users.orgCity,
        orgPhone: users.orgPhone,
        orgEmail: users.orgEmail,
        orgSite: users.orgSite,
        orgHours: users.orgHours,
        orgLat: users.orgLat,
        orgLng: users.orgLng,
        orgFacebook: users.orgFacebook,
        orgInstagram: users.orgInstagram,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    const row = rows[0]
    if (!row || row.sessionVersion !== tokenVersion) return null

    // Bloccare alza gia' la versione di sessione, ma il cookie sul telefono
    // resta e ad ogni pagina ritenta: meglio toglierlo. Da un componente
    // server i cookie non si possono scrivere e la chiamata lancia: in quel
    // caso pazienza, la persona risulta comunque fuori.
    if (row.bannedAt) {
      await destroySession().catch(() => undefined)
      return null
    }

    const { sessionVersion: _revoked, bannedAt: _banned, ...user } = row
    void _revoked
    void _banned
    return { ...user, role: asRole(user.role) }
  } catch {
    return null
  }
}

/** Un valore sconosciuto nella colonna non deve regalare permessi: vale come utente. */
function asRole(value: string): Role {
  return value === 'ADMIN' || value === 'MODERATOR' ? value : 'USER'
}
