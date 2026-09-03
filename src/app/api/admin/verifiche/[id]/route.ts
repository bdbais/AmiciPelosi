import { NextResponse } from 'next/server'
import { requireModerator, decideVerification } from '@/lib/moderation'
import { adminVerificationSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/**
 * Approvare o rifiutare chi si e' dichiarato ente. Le regole (motivo
 * obbligatorio per il rifiuto, niente auto-verifica, niente bloccati) stanno
 * in decideVerification, cosi' valgono anche per chi non passa da qui.
 */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireModerator()
  if (!actor) return NextResponse.json({ error: 'Non hai i permessi per moderare.' }, { status: 403 })

  const parsed = adminVerificationSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { id } = await params
  const { decision, note } = parsed.data
  const result = await decideVerification(id, decision, note || undefined, actor)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ user: result.data })
}
