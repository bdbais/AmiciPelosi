import Link from 'next/link'
import { countPendingVerifications, listReports, requireModerator } from '@/lib/moderation'
import { countIdeasToVote } from '@/lib/ideas'
import { REPORT_REASONS } from '@/lib/moderation-types'
import { formatDateTime } from '@/lib/format'
import { AdminReportActions } from '@/components/AdminReportActions'

export const dynamic = 'force-dynamic'

const OUTCOME_LABELS = { REMOVED: 'Annuncio rimosso', KEPT: 'Lasciato com’è' } as const

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tutte?: string }>
}) {
  const { tutte } = await searchParams
  const showHandled = tutte === '1'
  const viewer = await requireModerator()
  if (!viewer) return null
  const [reports, pendingVerifications, ideasToVote] = await Promise.all([
    listReports({ open: !showHandled }),
    countPendingVerifications(),
    countIdeasToVote(viewer.id),
  ])

  return (
    <>
      {pendingVerifications > 0 && (
        <p className="alert info" style={{ margin: '16px 0 0' }}>
          {pendingVerifications === 1
            ? '1 richiesta di verifica in attesa'
            : `${pendingVerifications} richieste di verifica in attesa`}{' '}
          → <Link href="/admin/richieste">Richieste</Link>
        </p>
      )}
      {ideasToVote > 0 && (
        <p className="alert info" style={{ margin: '16px 0 0' }}>
          {ideasToVote === 1 ? '1 idea in attesa di un voto tuo' : `${ideasToVote} idee in attesa di un voto tuo`} →{' '}
          <Link href="/admin/idee">Idee</Link>
        </p>
      )}
      <div className="inline" style={{ justifyContent: 'space-between', margin: '16px 0 10px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
          {showHandled ? 'Segnalazioni gestite' : `Segnalazioni aperte (${reports.length})`}
        </h2>
        <Link href={showHandled ? '/admin' : '/admin?tutte=1'} className="small muted">
          {showHandled ? '← Torna a quelle aperte' : 'Vedi quelle chiuse'}
        </Link>
      </div>

      {reports.length === 0 ? (
        <p className="muted small">
          {showHandled ? 'Nessuna segnalazione gestita finora.' : 'Niente da guardare: nessuna segnalazione aperta.'}
        </p>
      ) : (
        <div className="stack">
          {reports.map((report) => (
            <div className="card" key={report.id}>
              <div className="inline" style={{ justifyContent: 'space-between' }}>
                <Link href={`/annunci/${report.postId}`} style={{ fontWeight: 700 }}>
                  {report.postTitle}
                </Link>
                {report.postStatus === 'REMOVED' && <span className="badge removed">Rimosso</span>}
              </div>
              <p style={{ margin: '6px 0 2px' }}>{REPORT_REASONS[report.reason] ?? report.reason}</p>
              {report.note && (
                <p className="muted" style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>
                  «{report.note}»
                </p>
              )}
              <p className="small muted" style={{ margin: 0 }}>
                Segnalato da {report.reporterName ?? 'un utente che non c’è più'} ·{' '}
                {formatDateTime(report.createdAt)}
              </p>
              {report.outcome ? (
                <p className="small" style={{ margin: '8px 0 0' }}>
                  <strong>{OUTCOME_LABELS[report.outcome]}</strong>
                  {report.handledAt && ` · ${formatDateTime(report.handledAt)}`}
                </p>
              ) : (
                <AdminReportActions
                  reportId={report.id}
                  suggestedReason={
                    report.reason === 'OTHER' && report.note
                      ? report.note
                      : REPORT_REASONS[report.reason] ?? report.reason
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
