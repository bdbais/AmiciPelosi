import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

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

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
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

/** Utente della richiesta corrente, oppure null se non autenticato. */
export async function currentUser() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (!payload.sub) return null
    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        alertLat: true,
        alertLng: true,
        alertRadiusKm: true,
        alertsEnabled: true,
        alertCity: true,
      },
    })
  } catch {
    return null
  }
}

export async function requireUser() {
  const user = await currentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}
