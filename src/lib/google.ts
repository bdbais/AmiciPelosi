/**
 * Accesso con Google (OAuth 2.0, authorization code flow).
 * Serve a legare ogni annuncio a una persona identificata da un account reale.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function redirectUri(origin: string) {
  return `${origin}/api/auth/google/callback`
}

/** URL a cui mandare l'utente per autorizzare l'accesso. */
export function buildAuthUrl(origin: string, state: string) {
  const url = new URL(AUTH_ENDPOINT)
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID ?? '')
  url.searchParams.set('redirect_uri', redirectUri(origin))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

export type GoogleProfile = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture: string | null
}

/** Scambia il codice di autorizzazione con il profilo dell'utente. */
export async function exchangeCode(code: string, origin: string): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(origin),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Scambio del codice non riuscito (${tokenResponse.status})`)
  }

  const token = (await tokenResponse.json()) as { access_token?: string }
  if (!token.access_token) throw new Error('Google non ha restituito un access token')

  const profileResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  if (!profileResponse.ok) {
    throw new Error(`Lettura del profilo non riuscita (${profileResponse.status})`)
  }

  const profile = (await profileResponse.json()) as {
    sub: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }

  if (!profile.email) throw new Error('L account Google non espone un indirizzo email')

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    emailVerified: Boolean(profile.email_verified),
    name: profile.name || profile.email.split('@')[0],
    picture: profile.picture ?? null,
  }
}
