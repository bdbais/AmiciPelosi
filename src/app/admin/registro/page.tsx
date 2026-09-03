import Link from 'next/link'
import { listLog } from '@/lib/moderation'
import { formatDateTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Le azioni come le scrive il server, tradotte. Chi scrive il registro
 * potrebbe usare maiuscole o forme diverse per l'esito di una segnalazione:
 * si confronta in minuscolo e, se non si riconosce, si mostra com'e'.
 */
const ACTION_LABELS: Record<string, string> = {
  close: 'ha chiuso',
  remove: 'ha rimosso',
  reopen: 'ha riaperto',
  ban: 'ha bloccato',
  unban: 'ha sbloccato',
  role: 'ha cambiato il ruolo a',
  report: 'ha gestito una segnalazione su',
  report_removed: 'ha gestito una segnalazione (rimosso)',
  report_kept: 'ha gestito una segnalazione (lasciato)',
  removed: 'ha gestito una segnalazione (rimosso)',
  kept: 'ha gestito una segnalazione (lasciato)',
}

function actionLabel(action: string) {
  return ACTION_LABELS[action.toLowerCase()] ?? action
}

function targetHref(entry: { targetType: string; targetId: string }) {
  if (entry.targetType === 'POST') return `/annunci/${entry.targetId}`
  if (entry.targetType === 'USER') return `/persone/${entry.targetId}`
  return null
}

export default async function AdminLogPage() {
  const entries = await listLog(100)

  return (
    <>
      <h2 style={{ margin: '16px 0 10px', fontSize: '1.1rem' }}>Le ultime cento azioni</h2>
      {entries.length === 0 ? (
        <p className="muted small">Nessuna azione registrata finora.</p>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Chi</th>
                <th>Cosa</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const href = targetHref(entry)
                return (
                  <tr key={entry.id}>
                    <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td>{entry.actorName}</td>
                    <td>
                      {actionLabel(entry.action)}{' '}
                      {href ? (
                        <Link href={href} style={{ fontWeight: 700 }}>
                          {entry.targetLabel}
                        </Link>
                      ) : (
                        <strong>{entry.targetLabel}</strong>
                      )}
                    </td>
                    <td className="small muted">{entry.reason ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
