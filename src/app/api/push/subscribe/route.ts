import { NextResponse } from 'next/server'
import { desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { pushSubscriptions } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'
import { rateLimit } from '@/lib/ratelimit'
import { firstIssue, pushSubscriptionSchema } from '@/lib/validators'

/**
 * Quanti dispositivi puo' avere una persona. Telefono, tablet, il computer di
 * casa e quello del lavoro ci stanno; cento iscrizioni sono qualcuno che sta
 * riempiendo la tabella, o un browser che si re-iscrive in loop.
 */
const MAX_DEVICES = 5

export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const limited = await rateLimit(request, { key: 'push-subscribe', limit: 20, windowSeconds: 3600 })
  if (limited) return limited

  const parsed = pushSubscriptionSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: `Iscrizione push non valida (${firstIssue(parsed.error)})` }, { status: 400 })
  }
  const { endpoint, keys } = parsed.data
  const { p256dh, auth } = keys

  const db = await getDb()
  // Lo stesso endpoint puo cambiare proprietario se il dispositivo e condiviso.
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1)

  if (existing[0]) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh, auth, userId: user.id })
      .where(eq(pushSubscriptions.id, existing[0].id))
  } else {
    await db.insert(pushSubscriptions).values({ endpoint, p256dh, auth, userId: user.id })
  }

  // Oltre il tetto se ne va la piu' vecchia: e' quasi sempre un browser che
  // non c'e' piu'.
  const mine = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id))
    .orderBy(desc(pushSubscriptions.createdAt))
  const surplus = mine.slice(MAX_DEVICES).map((row) => row.id)
  if (surplus.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, surplus))
  }

  return NextResponse.json({ ok: true })
}
