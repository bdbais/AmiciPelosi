import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

/**
 * «Vedi il sito come…»: l'amministratore guarda il sito con gli occhi di
 * un'altra persona, per capire cosa vede e cosa puo' fare con il suo ruolo.
 *
 * Non e' un accesso al suo account: e' un secondo cookie, firmato, che dice
 * "sono l'amministratore X e sto guardando come Y", e vale mezz'ora. Il
 * cookie di sessione vero resta quello dell'amministratore, quindi se il
 * secondo cookie viene tolto o scade si torna a se stessi senza rientrare.
 * In questa modalita' il sito e' in sola lettura: lo impone il middleware,
 * che rifiuta ogni richiesta che non sia GET finche' il cookie c'e'.
 */
export const IMPERSONATION_COOKIE = 'ap_imp'
export const IMPERSONATION_MINUTES = 30

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET mancante')
  return new TextEncoder().encode(secret)
}

export type Impersonation = { adminId: string; targetId: string }

export async function startImpersonation(adminId: string, targetId: string) {
  const token = await new SignJWT({ sub: adminId, imp: targetId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${IMPERSONATION_MINUTES}m`)
    .sign(secretKey())
  const store = await cookies()
  store.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: IMPERSONATION_MINUTES * 60,
  })
}

export async function stopImpersonation() {
  const store = await cookies()
  store.delete(IMPERSONATION_COOKIE)
}

/**
 * Chi sta guardando come chi, se il cookie c'e' ed e' valido. `adminId` va
 * confrontato con la sessione vera da chi chiama: un cookie di un altro
 * amministratore, o rimasto da un'altra sessione, non vale.
 */
export async function readImpersonation(): Promise<Impersonation | null> {
  const store = await cookies()
  const token = store.get(IMPERSONATION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.sub !== 'string' || typeof payload.imp !== 'string') return null
    return { adminId: payload.sub, targetId: payload.imp }
  } catch {
    return null
  }
}
