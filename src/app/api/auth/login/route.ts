import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { bannedMessage, createSession, verifyPassword } from '@/lib/auth'
import { deviceToken, isDeviceBanned, noteEntry } from '@/lib/devices'
import { DEVICE_BLOCKED_MESSAGE } from '@/lib/moderation-types'
import { loginSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'
import { rateLimit } from '@/lib/ratelimit'

/**
 * Un hash vero di una password che non esiste. Serve quando l'email non e'
 * registrata: si verifica comunque contro questo, cosi' la risposta impiega
 * lo stesso tempo che impiegherebbe per un account vero e dal cronometro
 * non si capisce quali email ci sono.
 */
const DECOY_HASH =
  'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const limited = await rateLimit(request, { key: 'login', limit: 10, windowSeconds: 600 })
  if (limited) return limited

  const parsed = loginSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 },
    )
  }

  // Un browser bloccato da chi modera non entra con nessun account. Si dice
  // prima della password: non riguarda l'account, riguarda il dispositivo.
  const device = deviceToken(request)
  if (!device.isNew && (await isDeviceBanned(device.token))) {
    return NextResponse.json({ error: DEVICE_BLOCKED_MESSAGE }, { status: 403 })
  }

  const { email, password } = parsed.data
  const db = await getDb()
  const found = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
      sessionVersion: users.sessionVersion,
      bannedAt: users.bannedAt,
      bannedReason: users.bannedReason,
      suspectOf: users.suspectOf,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Messaggio unico, sempre lo stesso: email inesistente, password sbagliata
  // e account che entra solo con Google rispondono allo stesso modo. Dire
  // "questo account usa Google" confermerebbe che l'email e' iscritta, ed e'
  // proprio l'informazione che un elenco di indirizzi rubati vuole verificare.
  // Chi ha davvero un account Google trova il pulsante sotto al modulo.
  const invalid = NextResponse.json({ error: 'Email o password non corretti' }, { status: 401 })
  const user = found[0]

  const ok = await verifyPassword(password, user?.passwordHash ?? DECOY_HASH)
  if (!user || !user.passwordHash || !ok) return invalid

  // Il motivo si dice solo dopo la password giusta: a chi conosce la password
  // spetta sapere perche' non entra, a chi la sta indovinando no.
  if (user.bannedAt) {
    return NextResponse.json({ error: bannedMessage(user.bannedReason) }, { status: 403 })
  }

  await createSession(user.id, user.sessionVersion)
  await noteEntry(request, user, device)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
