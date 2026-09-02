import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { pets } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'
import { PET_STATUSES } from '@/lib/constants'

type Params = { params: Promise<{ id: string }> }

/** Cambia la scheda, o decide se condividerla con le persone fidate. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  // Solo il proprietario cambia la scheda: chi la vede per fiducia non la tocca.
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as {
    sharedWithCircle?: boolean
    status?: string
    farewellDate?: string
  }

  const changes: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.sharedWithCircle === 'boolean') changes.sharedWithCircle = body.sharedWithCircle
  if (body.status && body.status in PET_STATUSES) {
    changes.status = body.status
    // La data del commiato si scrive solo quando ha senso, e si toglie se si
    // torna indietro: capita di premere il pulsante sbagliato in un giorno cosi.
    changes.farewellDate =
      body.status === 'DECEASED' ? body.farewellDate || new Date().toISOString().slice(0, 10) : null
  }

  const db = await getDb()
  await db.update(pets).set(changes).where(eq(pets.id, id))

  return NextResponse.json({ ok: true })
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
