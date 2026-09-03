import Link from 'next/link'
import { listVerificationRequests } from '@/lib/moderation'
import type { VerificationRequest } from '@/lib/moderation-types'
import { accountTypeLabel } from '@/lib/constants'
import { formatDate, timeAgo } from '@/lib/format'
import { AdminVerificationActions } from '@/components/AdminVerificationActions'

export const dynamic = 'force-dynamic'

/**
 * Chi si e' dichiarato ente e aspetta che qualcuno lo guardi.
 *
 * Il lavoro sta tutto nel link: lo si apre, si vede se parla davvero di un
 * canile, di un'associazione, di uno studio, e si decide. L'email c'e'
 * perche' e' l'unico modo di chiedere il link a chi non l'ha dato — e' il
 * caso di chi si era dichiarato ente prima che esistesse la verifica.
 */
export default async function AdminVerificationsPage() {
  const { pending, rejected } = await listVerificationRequests()

  return (
    <>
      <h2 style={{ margin: '16px 0 10px', fontSize: '1.1rem' }}>
        Richieste di verifica in attesa ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p className="muted small">Nessuno aspetta di essere verificato.</p>
      ) : (
        <div className="stack">
          {pending.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      {rejected.length > 0 && (
        <>
          <h2 style={{ margin: '24px 0 10px', fontSize: '1.1rem' }}>Rifiutate negli ultimi 30 giorni</h2>
          <p className="small muted" style={{ margin: '0 0 12px' }}>
            Per ricordarsi cosa si è detto. Se la persona ripresenta con un altro link torna qui sopra.
          </p>
          <div className="stack">
            {rejected.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

function RequestCard({ request }: { request: VerificationRequest }) {
  const rejected = request.accountStatus === 'REJECTED'
  const place = [request.orgAddress, request.orgCity].filter(Boolean).join(', ')
  return (
    <div className="card">
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span>
          <Link href={`/persone/${request.id}`} style={{ fontWeight: 700 }}>
            {request.name}
          </Link>{' '}
          <span className={`badge ${rejected ? 'rejected' : 'pending'}`}>
            {rejected ? 'rifiutata' : 'in attesa'}
          </span>
        </span>
        <span className="small muted">
          iscritta {timeAgo(request.createdAt)} · {formatDate(request.createdAt)}
        </span>
      </div>
      <p style={{ margin: '6px 0 2px' }}>
        Si dichiara <strong>{accountTypeLabel(request.accountType) ?? request.accountType}</strong>
        {request.orgName && (
          <>
            {' '}
            · <strong>{request.orgName}</strong>
          </>
        )}
        {place && <span className="muted"> · {place}</span>}
      </p>
      <p className="small muted" style={{ margin: '0 0 6px' }}>
        {request.email}
      </p>
      {/*
        Il link lo ha scritto la persona: si apre in un'altra scheda, senza
        passare referrer e senza dargli una mano sulla nostra finestra.
      */}
      <p style={{ margin: '0 0 6px' }}>
        {request.proofUrl ? (
          <>
            Link di prova:{' '}
            <a href={request.proofUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
              {request.proofUrl}
            </a>
          </>
        ) : (
          <span className="muted">Nessun link: chiedilo per email, o cerca tu.</span>
        )}
        {request.orgSite && request.orgSite !== request.proofUrl && (
          <span className="small muted"> · sito dichiarato: {request.orgSite}</span>
        )}
      </p>
      {rejected && request.verificationNote && (
        <p className="small" style={{ margin: '0 0 6px' }}>
          <strong>Motivo del rifiuto:</strong> {request.verificationNote}
        </p>
      )}
      <AdminVerificationActions userId={request.id} rejected={rejected} />
    </div>
  )
}
