import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { askForContact } from '@/lib/contacts'

type Params = { params: Promise<{ id: string }> }

/**
 * "Posso avere il tuo contatto?"
 *
 * Non consegna niente: registra la domanda e lascia decidere chi ha pubblicato.
 */
export async function POST(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi per chiedere il contatto' }, { status: 401 })

  const { id } = await params
  let message = ''
  try {
    const body = (await request.json()) as { message?: unknown }
    message = typeof body.message === 'string' ? body.message : ''
  } catch {
    return NextResponse.json({ error: 'Richiesta non leggibile' }, { status: 400 })
  }

  // Due righe non sono burocrazia: chi deve rispondere ha bisogno di sapere
  // chi sei e cosa vuoi, e chi non ha voglia di scriverle di solito non e' li'
  // per l'animale.
  if (message.trim().length < 10) {
    return NextResponse.json(
      { error: 'Scrivi due righe: chi sei e perché lo chiedi.' },
      { status: 400 },
    )
  }
  if (message.length > 600) {
    return NextResponse.json({ error: 'Messaggio troppo lungo.' }, { status: 400 })
  }

  const result = await askForContact(id, user.id, message)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json({ ok: true })
}
