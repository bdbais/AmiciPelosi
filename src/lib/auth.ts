import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'

export { hashPassword, verifyPassword } from './password'

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

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
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

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export type SessionUser = {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  emailVerified: boolean
  alertLat: number | null
  alertLng: number | null
  alertRadiusKm: number
  alertsEnabled: boolean
  alertCity: string | null
  alertEveryMinutes: number
  accountType: string
  orgName: string | null
}

/** Utente della richiesta corrente, oppure null se non autenticato. */
export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (!payload.sub) return null

    const db = await getDb()
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        alertLat: users.alertLat,
        alertLng: users.alertLng,
        alertRadiusKm: users.alertRadiusKm,
        alertsEnabled: users.alertsEnabled,
        alertCity: users.alertCity,
        alertEveryMinutes: users.alertEveryMinutes,
        accountType: users.accountType,
        orgName: users.orgName,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    return rows[0] ?? null
  } catch {
    return null
  }
}
