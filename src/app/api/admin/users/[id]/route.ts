import { NextResponse } from 'next/server'
import { requireModerator, moderateUser } from '@/lib/moderation'
import { adminUserActionSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/**
 * Bloccare, sbloccare o cambiare il ruolo di una persona. Il cambio di ruolo
 * lo accetta solo un amministratore: il controllo sta in moderateUser, cosi'
 * vale anche per chi non passa da questa rotta.
 */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireModerator()
  if (!actor) return NextResponse.json({ error: 'Non hai i permessi per moderare.' }, { status: 403 })

  const parsed = adminUserActionSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { id } = await params
  const { action, reason, role } = parsed.data
  const result = await moderateUser(id, action, { reason: reason || undefined, role }, actor)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ user: result.data })
}
