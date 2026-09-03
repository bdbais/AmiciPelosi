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

  // Qui non c'e' un modulo a cui rispondere 403: si torna alla pagina di
  // accesso con il motivo, che e' l'unica cosa che a quella persona serve.
  const blocked = (reason: string | null) => {
    const target = new URL('/accedi', url.origin)
    target.searchParams.set('errore', 'account-bloccato')
    if (reason) target.searchParams.set('motivo', reason)
    return NextResponse.redirect(target)
  }

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
    .select({
      id: users.id,
      sessionVersion: users.sessionVersion,
      bannedAt: users.bannedAt,
      bannedReason: users.bannedReason,
    })
    .from(users)
    .where(eq(users.googleId, profile.sub))
    .limit(1)

  if (byGoogleId[0]) {
    if (byGoogleId[0].bannedAt) return blocked(byGoogleId[0].bannedReason)
    await createSession(byGoogleId[0].id, byGoogleId[0].sessionVersion)
    return NextResponse.redirect(new URL('/bacheca', url.origin))
  }

  // Da qui in poi l'email decide a quale account si entra, o quale si apre:
  // e Google la fornisce anche quando non l'ha mai verificata. Con un account
  // Google Workspace di un dominio proprio si puo' dichiarare l'indirizzo che
  // si vuole, e senza questo controllo basterebbe quello per entrare
  // nell'account con password di chiunque.
  if (profile.emailVerified !== true) return fail('email-non-verificata')

  // Stessa email registrata con password: colleghiamo i due accessi.
  const byEmail = await db
    .select({
      id: users.id,
      sessionVersion: users.sessionVersion,
      bannedAt: users.bannedAt,
      bannedReason: users.bannedReason,
    })
    .from(users)
    .where(eq(users.email, profile.email))
    .limit(1)

  if (byEmail[0]) {
    if (byEmail[0].bannedAt) return blocked(byEmail[0].bannedReason)
    await db
      .update(users)
      .set({
        googleId: profile.sub,
        avatarUrl: profile.picture,
        emailVerified: profile.emailVerified,
      })
      .where(eq(users.id, byEmail[0].id))
    await createSession(byEmail[0].id, byEmail[0].sessionVersion)
    return NextResponse.redirect(new URL('/bacheca', url.origin))
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

  await createSession(created[0].id, 0)
  return NextResponse.redirect(new URL('/notifiche?benvenuto=1', url.origin))
}
