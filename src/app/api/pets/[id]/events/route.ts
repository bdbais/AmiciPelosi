import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { petEvents } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'
import { firstIssue, petEventSchema } from '@/lib/validators'
import { RECURRING_EVENT_KINDS } from '@/lib/constants'

type Params = { params: Promise<{ id: string }> }

/** Una riga del diario: la visita, il vaccino, il parto, il compleanno. */
export async function POST(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const parsed = petEventSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const db = await getDb()
  const created = await db
    .insert(petEvents)
    .values({
      petId: id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      note: parsed.data.note || null,
      happenedAt: parsed.data.happenedAt,
      recursYearly: RECURRING_EVENT_KINDS.includes(parsed.data.kind),
    })
    .returning({ id: petEvents.id })

  return NextResponse.json({ event: { id: created[0].id } }, { status: 201 })
}
