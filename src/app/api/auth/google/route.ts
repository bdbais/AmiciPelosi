import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { buildAuthUrl, googleEnabled } from '@/lib/google'

/** Avvia l'accesso con Google. */
export async function GET(request: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(new URL('/accedi?errore=google-non-configurato', request.url))
  }

  // Lo state protegge dagli attacchi CSRF sul callback.
  const state = crypto.randomUUID()
  const store = await cookies()
  store.set('ap_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })

  const origin = new URL(request.url).origin
  return NextResponse.redirect(buildAuthUrl(origin, state))
}
