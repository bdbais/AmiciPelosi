import { NextResponse } from 'next/server'
import { requireModerator } from '@/lib/moderation'
import { createIdea } from '@/lib/ideas'
import { ideaSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

/** Un'idea scritta dal sito, da chi modera. Non e' pubblica: la leggono solo in /admin/idee. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireModerator()
  if (!actor) return NextResponse.json({ error: 'Non hai i permessi per moderare.' }, { status: 403 })

  const parsed = ideaSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const result = await createIdea(parsed.data, actor)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ idea: result.data }, { status: 201 })
}
