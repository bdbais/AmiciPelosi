import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import type { Role } from './moderation-types'
import { readImpersonation } from './impersonation'

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
  // Un login e' un accesso: la data serve a chi modera per vedere chi c'e'.
  const db = await getDb()
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId))

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
  /** Il tipo dichiarato vale solo con VERIFIED: per i privilegi si usa effectiveAccountType. */
  accountStatus: string
  proofUrl: string | null
  verifiedAt: Date | null
  verificationNote: string | null
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
  /** Presente quando un amministratore sta guardando il sito come questa persona. */
  viewingAs?: { adminId: string; adminName: string }
  orgInstagram: string | null
  /** Il logo dell'ente: la chiave su KV (null in locale) e quando e' stato caricato (null se non c'e'). */
  orgLogoKey: string | null
  orgLogoAt: Date | null
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

    const row = await loadSessionRow(payload.sub)
    if (!row || row.sessionVersion !== tokenVersion) return null

    // Bloccare alza gia' la versione di sessione, ma il cookie sul telefono
    // resta e ad ogni pagina ritenta: meglio toglierlo. Da un componente
    // server i cookie non si possono scrivere e la chiamata lancia: in quel
    // caso pazienza, la persona risulta comunque fuori.
    if (row.bannedAt) {
      await destroySession().catch(() => undefined)
      return null
    }

    // «Vedi il sito come…»: solo se il cookie e' di QUESTO amministratore, e
    // solo verso una persona che non e' amministratrice a sua volta. Il sito
    // in questa modalita' e' in sola lettura, lo impone il middleware.
    if (asRole(row.role) === 'ADMIN') {
      const imp = await readImpersonation()
      if (imp && imp.adminId === row.id && imp.targetId !== row.id) {
        const target = await loadSessionRow(imp.targetId)
        if (target && !target.bannedAt && asRole(target.role) !== 'ADMIN') {
          return { ...stripRow(target), viewingAs: { adminId: row.id, adminName: row.name } }
        }
      }
    }

    return stripRow(row)
  } catch {
    return null
  }
}

type SessionRow = NonNullable<Awaited<ReturnType<typeof loadSessionRow>>>

function stripRow(row: SessionRow): SessionUser {
  const { sessionVersion: _revoked, bannedAt: _banned, ...user } = row
  void _revoked
  void _banned
  return { ...user, role: asRole(user.role) }
}

/** La riga della sessione: tutto quello che le pagine chiedono di chi guarda. */
async function loadSessionRow(id: string) {
  {
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
        accountStatus: users.accountStatus,
        proofUrl: users.proofUrl,
        verifiedAt: users.verifiedAt,
        verificationNote: users.verificationNote,
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
        orgLogoKey: users.orgLogoKey,
        orgLogoAt: users.orgLogoAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return rows[0] ?? null
  }
}

/** Un valore sconosciuto nella colonna non deve regalare permessi: vale come utente. */
function asRole(value: string): Role {
  return value === 'ADMIN' || value === 'MODERATOR' ? value : 'USER'
}
