import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { pets } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'

type Params = { params: Promise<{ id: string }> }

/** Cambia la scheda, o decide se condividerla con le persone fidate. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  // Solo il proprietario cambia la scheda: chi la vede per fiducia non la tocca.
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as { sharedWithCircle?: boolean }
  const db = await getDb()
  await db
    .update(pets)
    .set({ sharedWithCircle: Boolean(body.sharedWithCircle), updatedAt: new Date() })
    .where(eq(pets.id, id))

  return NextResponse.json({ sharedWithCircle: Boolean(body.sharedWithCircle) })
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const db = await getDb()
  await db.delete(pets).where(eq(pets.id, id))
  return NextResponse.json({ ok: true })
}
