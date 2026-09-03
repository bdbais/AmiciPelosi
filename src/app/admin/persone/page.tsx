import Link from 'next/link'
import { requireModerator, searchUsers } from '@/lib/moderation'
import { ROLES, type Role } from '@/lib/moderation-types'
import { accountTypeLabel } from '@/lib/constants'
import { formatDate, timeAgo } from '@/lib/format'
import { AdminUserActions } from '@/components/AdminUserActions'
import { VerificationBadge } from '@/components/VerificationBadge'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const query = q.trim()
  const viewer = await requireModerator()
  if (!viewer) return null
  const viewerRole: Role = viewer.role

  // Senza ricerca, l'elenco di chi e' entrato per ultimo: e' la domanda che
  // chi modera si fa piu' spesso, "chi c'e' in giro adesso".
  const users = await searchUsers(query.length >= 2 ? query : null, 50)

  return (
    <>
      <form method="get" action="/admin/persone" className="inline" style={{ margin: '16px 0 4px' }}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Nome o email"
          aria-label="Cerca una persona"
          style={{ flex: '1 1 220px' }}
        />
        <button type="submit" className="btn secondary small">
          Cerca
        </button>
      </form>
      <p className="small muted" style={{ margin: '0 0 12px' }}>
        {query.length >= 2
          ? 'Risultati della ricerca, dall’ultimo accesso.'
          : 'Le ultime 50 persone entrate, dall’ultimo accesso. Cerca per nome o email per trovarne altre.'}
      </p>

      {query.length >= 2 && users.length === 0 && (
        <p className="muted small">Nessuno con questo nome o email.</p>
      )}

      {users.length > 0 && (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Ruolo</th>
                <th>Ultimo accesso</th>
                <th>Iscritto</th>
                <th>Annunci</th>
                <th>Segnalazioni</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => {
                /*
                  Su se stessi e sugli amministratori i tasti non compaiono:
                  un moderatore non deve poter bloccare chi lo ha nominato, e
                  nessuno deve potersi togliere il ruolo da solo per sbaglio.
                */
                const untouchable = person.id === viewer.id || person.role === 'ADMIN'
                return (
                  <tr key={person.id}>
                    <td>
                      <Link href={`/persone/${person.id}`} style={{ fontWeight: 700 }}>
                        {person.name}
                      </Link>
                      {person.bannedAt && (
                        <>
                          {' '}
                          <span className="badge banned">bloccato</span>
                        </>
                      )}
                      <div className="small muted">{person.email}</div>
                      {accountTypeLabel(person.accountType) && (
                        <div className="small muted">
                          {accountTypeLabel(person.accountType)}
                          {person.accountType !== 'PERSON' && (
                            <>
                              {' '}
                              <VerificationBadge status={person.accountStatus} />
                            </>
                          )}
                        </div>
                      )}
                      {person.bannedAt && (
                        <div className="small muted">
                          Bloccato il {formatDate(person.bannedAt)}
                          {person.bannedReason ? `: ${person.bannedReason}` : ''}
                        </div>
                      )}
                      {/*
                        Il sospetto si vede anche dove i tasti non ci sono
                        (se stessi, gli amministratori): e' un'informazione,
                        prima che un'azione.
                      */}
                      {person.suspectOf && (
                        <div className="small">
                          <span className="badge suspect">somiglia a</span>{' '}
                          <Link href={`/persone/${person.suspectOf.id}`}>{person.suspectOf.name}</Link>
                          {person.suspectReason ? <span className="muted"> ({person.suspectReason})</span> : null}
                        </div>
                      )}
                      {person.deviceBanned && (
                        <div className="small muted">Uno dei suoi dispositivi è bloccato</div>
                      )}
                    </td>
                    <td>{ROLES[person.role] ?? person.role}</td>
                    <td className="small">
                      {person.lastSeenAt ? (
                        <>
                          {timeAgo(person.lastSeenAt)}
                          {person.lastClient && (
                            <span className={`badge client ${person.lastClient === 'APP' ? 'app' : 'sito'}`}>
                              {person.lastClient === 'APP' ? 'app' : 'sito'}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="muted">mai, da quando lo contiamo</span>
                      )}
                    </td>
                    <td className="small muted">{formatDate(person.createdAt)}</td>
                    <td>{person.postsCount}</td>
                    <td>{person.reportsReceived > 0 ? <strong>{person.reportsReceived}</strong> : '—'}</td>
                    <td>
                      {untouchable ? (
                        <span className="small muted">—</span>
                      ) : (
                        <AdminUserActions
                          userId={person.id}
                          banned={person.bannedAt != null}
                          role={person.role}
                          viewerRole={viewerRole}
                          suspectOf={person.suspectOf}
                          suspectReason={person.suspectReason}
                          deviceBanned={person.deviceBanned}
                        />
                      )}
                    </td>
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
