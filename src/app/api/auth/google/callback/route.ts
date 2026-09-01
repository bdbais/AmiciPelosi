import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { createSession } from '@/lib/auth'
import { exchangeCode, googleEnabled } from '@/lib/google'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/accedi?errore=${reason}`, url.origin))

  if (!googleEnabled()) return fail('google-non-configurato')
  if (!code) return fail('accesso-annullato')

  const store = await cookies()
  const expectedState = store.get('ap_oauth_state')?.value
  store.delete('ap_oauth_state')
  if (!state || state !== expectedState) return fail('stato-non-valido')

  let profile
  try {
    profile = await exchangeCode(code, url.origin)
  } catch (error) {
    console.error('Accesso Google non riuscito:', error)
    return fail('google-non-riuscito')
  }

  const db = await getDb()

  // Un account gia collegato a questo profilo Google?
  const byGoogleId = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.googleId, profile.sub))
    .limit(1)

  if (byGoogleId[0]) {
    await createSession(byGoogleId[0].id)
    return NextResponse.redirect(new URL('/', url.origin))
  }

  // Stessa email registrata con password: colleghiamo i due accessi.
  const byEmail = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1)

  if (byEmail[0]) {
    await db
      .update(users)
      .set({
        googleId: profile.sub,
        avatarUrl: profile.picture,
        emailVerified: profile.emailVerified,
      })
      .where(eq(users.id, byEmail[0].id))
    await createSession(byEmail[0].id)
    return NextResponse.redirect(new URL('/', url.origin))
  }

  const created = await db
    .insert(users)
    .values({
      email: profile.email,
      name: profile.name,
      googleId: profile.sub,
      avatarUrl: profile.picture,
      emailVerified: profile.emailVerified,
      passwordHash: null,
    })
    .returning({ id: users.id })

  await createSession(created[0].id)
  return NextResponse.redirect(new URL('/notifiche?benvenuto=1', url.origin))
}
