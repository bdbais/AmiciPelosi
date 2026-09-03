import Link from 'next/link'
import { requireModerator, searchUsers } from '@/lib/moderation'
import { ROLES, type Role } from '@/lib/moderation-types'
import { accountTypeLabel } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { AdminUserActions } from '@/components/AdminUserActions'

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

  const users = query.length >= 2 ? await searchUsers(query, 50) : []

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
        Scrivi almeno due lettere del nome o dell’email.
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
                        <div className="small muted">{accountTypeLabel(person.accountType)}</div>
                      )}
                      {person.bannedAt && (
                        <div className="small muted">
                          Bloccato il {formatDate(person.bannedAt)}
                          {person.bannedReason ? `: ${person.bannedReason}` : ''}
                        </div>
                      )}
                    </td>
                    <td>{ROLES[person.role] ?? person.role}</td>
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
