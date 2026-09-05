import { NextResponse } from 'next/server'
import { requireModerator, moderatePost } from '@/lib/moderation'
import { adminPostActionSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/** Chiudere, rimuovere o riaprire un annuncio, da parte di chi modera. */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireModerator()
  if (!actor) return NextResponse.json({ error: 'Non hai i permessi per moderare.' }, { status: 403 })

  const parsed = adminPostActionSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { id } = await params
  const result = await moderatePost(id, parsed.data.action, parsed.data.reason ?? '', actor)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ post: result.data })
}
