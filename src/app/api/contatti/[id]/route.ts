import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { decideContact } from '@/lib/contacts'

type Params = { params: Promise<{ id: string }> }

/** La risposta a una richiesta di contatto: la da' solo chi ha pubblicato. */
export async function POST(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  let accept = false
  try {
    const body = (await request.json()) as { accept?: unknown }
    accept = body.accept === true
  } catch {
    return NextResponse.json({ error: 'Richiesta non leggibile' }, { status: 400 })
  }

  const result = await decideContact(id, user.id, accept)
  // Chi non e' il destinatario non deve nemmeno sapere che quella richiesta esiste.
  if (!result.ok) return NextResponse.json({ error: 'Richiesta non trovata' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
