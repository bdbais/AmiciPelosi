import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { createReport } from '@/lib/moderation'
import { reportSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'
import { rateLimit } from '@/lib/ratelimit'

/**
 * "Qui c'e' qualcosa che non va."
 *
 * Serve essere entrati: una segnalazione anonima non costa niente a chi la
 * fa e costa un controllo a chi modera, e dieci al minuto per indirizzo
 * bastano a chiunque abbia visto davvero qualcosa.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi per segnalare' }, { status: 401 })

  const limited = await rateLimit(request, { key: 'reports', limit: 10, windowSeconds: 60 })
  if (limited) return limited

  const parsed = reportSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const { postId, reason, note } = parsed.data
  const result = await createReport(postId, user.id, reason, note || null)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ ok: true, report: result.data })
}
