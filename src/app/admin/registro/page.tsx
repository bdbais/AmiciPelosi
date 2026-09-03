import Link from 'next/link'
import { listLog } from '@/lib/moderation'
import { ROLES, type Role } from '@/lib/moderation-types'
import { formatDateTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

/**
 * Le azioni come le scrive il server ("post.close", "user.ban",
 * "user.role.ADMIN", "device.ban"), tradotte. Il prefisso dice su cosa, il
 * resto cosa: si guarda prima la coppia intera, poi la coda senza prefisso,
 * e se non si riconosce si mostra com'e'. Il cambio di ruolo porta il ruolo
 * nuovo in coda, e va letto a parte.
 */
const ACTION_LABELS: Record<string, string> = {
  close: 'ha chiuso',
  remove: 'ha rimosso',
  reopen: 'ha riaperto',
  ban: 'ha bloccato',
  unban: 'ha sbloccato',
  'device.ban': 'ha bloccato il',
  'device.unban': 'ha sbloccato il',
  suspect: 'è stato segnalato come somigliante a un bloccato:',
  suspect_cleared: 'ha sciolto il sospetto su',
  impersonate: 'ha guardato il sito come',
  create: 'ha segnalato',
  report: 'ha gestito una segnalazione su',
  report_removed: 'ha gestito una segnalazione (rimosso)',
  report_kept: 'ha gestito una segnalazione (lasciato)',
  removed: 'ha gestito una segnalazione (rimosso)',
  kept: 'ha gestito una segnalazione (lasciato)',
}

function actionLabel(action: string) {
  const full = action.toLowerCase()
  if (full.startsWith('user.role.')) {
    const role = action.slice('user.role.'.length) as Role
    return `ha dato il ruolo ${ROLES[role] ?? role} a`
  }
  const tail = full.slice(full.indexOf('.') + 1)
  return ACTION_LABELS[full] ?? ACTION_LABELS[tail] ?? action
}

function targetHref(entry: { targetType: string; targetId: string }) {
  if (entry.targetType === 'POST') return `/annunci/${entry.targetId}`
  if (entry.targetType === 'USER') return `/persone/${entry.targetId}`
  return null
}

/** Un dispositivo non ha una pagina: si legge "dispositivo" e le prime lettere del codice. */
function targetLabel(entry: { targetType: string; targetLabel: string }) {
  return entry.targetType === 'DEVICE' ? `dispositivo ${entry.targetLabel}` : entry.targetLabel
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
                          {targetLabel(entry)}
                        </Link>
                      ) : (
                        <strong>{targetLabel(entry)}</strong>
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
