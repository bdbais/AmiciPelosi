import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { pushSubscriptions } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { readJson } from '@/lib/http'

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await readJson<{ endpoint: string; keys: { p256dh: string; auth: string } }>(request)
  const endpoint = body.endpoint
  const p256dh = body.keys?.p256dh
  const auth = body.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Iscrizione push non valida' }, { status: 400 })
  }

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

  return NextResponse.json({ ok: true })
}
