import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { moderationLog, users } from '@/db/schema'
import { requireAdmin } from '@/lib/moderation'
import { startImpersonation, stopImpersonation } from '@/lib/impersonation'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

/**
 * «Vedi il sito come…», solo per l'amministratore.
 *
 * POST apre la modalita' su una persona che non sia amministratrice a sua
 * volta; DELETE la chiude. Il DELETE non chiede chi sei: mentre si guarda
 * come un altro `currentUser()` restituisce l'altro, e chi vuole tornare a
 * se stesso non deve trovare una porta chiusa. Togliere un cookie a chi non
 * ce l'ha non fa niente.
 *
 * Ogni apertura finisce nel registro: chi ha guardato chi, e quando. Anche
 * l'amministratore risponde di quello che fa.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Solo l’amministratore può farlo.' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { userId?: unknown }
  const userId = typeof body.userId === 'string' ? body.userId : ''
  if (!userId) return NextResponse.json({ error: 'Manca chi guardare.' }, { status: 400 })
  if (userId === admin.id) return NextResponse.json({ error: 'Sei già tu.' }, { status: 400 })

  const db = await getDb()
  const rows = await db
    .select({ id: users.id, name: users.name, role: users.role, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const target = rows[0]
  if (!target) return NextResponse.json({ error: 'Questa persona non c’è.' }, { status: 404 })
  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: 'Un amministratore non si guarda dall’interno.' }, { status: 400 })
  }
  if (target.bannedAt) {
    return NextResponse.json({ error: 'È bloccata: non vede niente, e nemmeno tu al suo posto.' }, { status: 400 })
  }

  await startImpersonation(admin.id, target.id)
  await db.insert(moderationLog).values({
    actorId: admin.id,
    action: 'user.impersonate',
    targetType: 'USER',
    targetId: target.id,
    targetLabel: target.name.slice(0, 120),
    reason: null,
  })
  return NextResponse.json({ ok: true, name: target.name })
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  await stopImpersonation()
  return NextResponse.json({ ok: true })
}
