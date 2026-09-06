import { NextResponse } from 'next/server'
import { requireModerator, resolveReport } from '@/lib/moderation'
import { adminReportOutcomeSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/** La risposta a una segnalazione: l'annuncio va via (e con lui le altre segnalazioni aperte), oppure resta. */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const actor = await requireModerator()
  if (!actor) return NextResponse.json({ error: 'Non hai i permessi per moderare.' }, { status: 403 })

  const parsed = adminReportOutcomeSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { id } = await params
  const result = await resolveReport(id, parsed.data.outcome, actor, parsed.data.reason || undefined)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ report: result.data })
}
