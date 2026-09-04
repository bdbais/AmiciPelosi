import { NextResponse, after } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { createSession, hashPassword } from '@/lib/auth'
import { deviceToken, isDeviceBanned, noteEntry } from '@/lib/devices'
import { DEVICE_BLOCKED_MESSAGE } from '@/lib/moderation-types'
import { accountTypeLabel } from '@/lib/constants'
import { notifyModerators } from '@/lib/push'
import { registerSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'
import { rateLimit } from '@/lib/ratelimit'

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const limited = await rateLimit(request, { key: 'register', limit: 5, windowSeconds: 3600 })
  if (limited) return limited

  const parsed = registerSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 },
    )
  }

  // Da un browser che chi modera ha bloccato non si apre un altro account:
  // e' l'unico caso in cui la porta si chiude da sola. Un codice appena nato
  // non puo' essere bloccato, quindi non si interroga il database per niente.
  const device = deviceToken(request)
  if (!device.isNew && (await isDeviceBanned(device.token))) {
    return NextResponse.json({ error: DEVICE_BLOCKED_MESSAGE }, { status: 403 })
  }

  const { name, email, phone, password, accountType, proofUrl, proofNote } = parsed.data
  // Chi si dichiara ente entra in coda: il tipo resta scritto, ma vale solo
  // quando una persona lo ha approvato. Una persona non ha niente da verificare.
  const isPerson = accountType === 'PERSON'
  const db = await getDb()

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing[0]) {
    return NextResponse.json({ error: 'Esiste gia un account con questa email' }, { status: 409 })
  }

  let created: { id: string; name: string; email: string }[]
  try {
    created = await db
      .insert(users)
      .values({
        name,
        email,
        phone: phone || null,
        accountType,
        accountStatus: isPerson ? 'NONE' : 'PENDING',
        proofUrl: isPerson ? null : proofUrl || null,
        proofNote: accountType === 'COLONY' ? proofNote || null : null,
        passwordHash: await hashPassword(password),
      })
      .returning({ id: users.id, name: users.name, email: users.email })
  } catch (error) {
    // Due registrazioni con la stessa email nello stesso istante: il controllo
    // qui sopra le lascia passare entrambe, il vincolo unique ferma la seconda.
    // Va detto come sopra, non come un errore del server.
    if (String(error).includes('UNIQUE')) {
      return NextResponse.json({ error: 'Esiste gia un account con questa email' }, { status: 409 })
    }
    throw error
  }

  await createSession(created[0].id, 0)
  await noteEntry(request, { id: created[0].id, suspectOf: null }, device)
  if (!isPerson) {
    // Dopo la risposta: la registrazione non deve aspettare le push, e un
    // avviso mancato non deve farla fallire.
    after(() =>
      notifyModerators(
        'Una richiesta da verificare',
        `${name} si dichiara ${accountTypeLabel(accountType) ?? accountType}`,
        '/admin/richieste',
      ).catch((error) => console.error('Avviso di verifica non inviato:', error)),
    )
  }
  return NextResponse.json({ user: created[0] }, { status: 201 })
}
