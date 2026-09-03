import { NextResponse } from 'next/server'
import { requireModerator } from '@/lib/moderation'
import { voteIdea } from '@/lib/ideas'
import { ideaVoteSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/** Il voto di chi modera su un'idea: uno a testa, e si cambia. */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireModerator()
  if (!actor) return NextResponse.json({ error: 'Non hai i permessi per moderare.' }, { status: 403 })

  const parsed = ideaVoteSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { id } = await params
  const result = await voteIdea(id, { value: parsed.data.value, comment: parsed.data.comment }, actor)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ ok: true })
}
