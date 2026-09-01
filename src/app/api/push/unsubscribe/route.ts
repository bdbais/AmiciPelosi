import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { pushSubscriptions } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { readJson } from '@/lib/http'

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await readJson<{ endpoint: string }>(request)
  if (!body.endpoint) {
    return NextResponse.json({ error: 'Endpoint mancante' }, { status: 400 })
  }

  const db = await getDb()
  await db
    .delete(pushSubscriptions)
    .where(
      and(eq(pushSubscriptions.endpoint, body.endpoint), eq(pushSubscriptions.userId, user.id)),
    )

  return NextResponse.json({ ok: true })
}
