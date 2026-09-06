import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/moderation'
import { setIdeaStatus } from '@/lib/ideas'
import { ideaStatusSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/**
 * Lo stato di un'idea lo cambia solo l'amministratore: un moderatore vota,
 * non decide. Il controllo sta qui e di nuovo in setIdeaStatus, cosi' vale
 * anche per chi non passa da questa rotta.
 */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireAdmin()
  if (!actor) return NextResponse.json({ error: 'Lo stato di un’idea lo cambia solo l’amministratore.' }, { status: 403 })

  const parsed = ideaStatusSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { id } = await params
  const result = await setIdeaStatus(id, parsed.data.status, actor)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}
