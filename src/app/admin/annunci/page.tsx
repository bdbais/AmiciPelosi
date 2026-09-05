import Link from 'next/link'
import { listAdminPosts } from '@/lib/moderation'
import { kindLabel, speciesLabel } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { AdminPostActions } from '@/components/AdminPostActions'

export const dynamic = 'force-dynamic'

/** Gli stati come compaiono nell'indirizzo, in italiano, e come li chiama il database. */
const STATUS_FILTERS = [
  { key: '', label: 'Tutti', status: undefined },
  { key: 'aperti', label: 'Aperti', status: 'OPEN' },
  { key: 'risolti', label: 'Risolti', status: 'RESOLVED' },
  { key: 'rimossi', label: 'Rimossi', status: 'REMOVED' },
] as const

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  RESOLVED: 'Risolto',
  REMOVED: 'Rimosso',
}

function statusClass(status: string) {
  if (status === 'REMOVED') return 'badge removed'
  if (status === 'RESOLVED') return 'badge resolved'
  return 'badge FOUND'
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stato?: string }>
}) {
  const { q = '', stato = '' } = await searchParams
  const filter = STATUS_FILTERS.find((item) => item.key === stato) ?? STATUS_FILTERS[0]
  const query = q.trim()
  const posts = await listAdminPosts({ q: query || undefined, status: filter.status, limit: 100 })

  const withQuery = (key: string) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (key) params.set('stato', key)
    const suffix = params.toString()
    return `/admin/annunci${suffix ? `?${suffix}` : ''}`
  }

  return (
    <>
      <form method="get" action="/admin/annunci" className="inline" style={{ margin: '16px 0 10px' }}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Cerca per titolo, città o autore"
          aria-label="Cerca fra gli annunci"
          style={{ flex: '1 1 220px' }}
        />
        {filter.key && <input type="hidden" name="stato" value={filter.key} />}
        <button type="submit" className="btn secondary small">
          Cerca
        </button>
      </form>

      <div className="chips" style={{ marginBottom: 12 }}>
        {STATUS_FILTERS.map((item) => (
          <Link
            key={item.key}
            href={withQuery(item.key)}
            className={`chip${item.key === filter.key ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="muted small">Nessun annuncio con questi criteri.</p>
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Annuncio</th>
                <th>Autore</th>
                <th>Segnalazioni</th>
                <th>Stato</th>
                <th>Data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <Link href={`/annunci/${post.id}`} style={{ fontWeight: 700 }}>
                      {post.title}
                    </Link>
                    <div className="small muted">
                      {kindLabel(post.kind)} · {speciesLabel(post.species)}
                      {post.city ? ` · ${post.city}` : ''}
                    </div>
                    {post.moderationReason && (
                      <div className="small muted">Motivo: {post.moderationReason}</div>
                    )}
                  </td>
                  <td>
                    <Link href={`/persone/${post.authorId}`} className="person-link">
                      {post.authorName}
                    </Link>
                    {post.authorBanned && (
                      <>
                        {' '}
                        <span className="badge banned">bloccato</span>
                      </>
                    )}
                  </td>
                  <td>{post.reportsOpen > 0 ? <strong>{post.reportsOpen}</strong> : '—'}</td>
                  <td>
                    <span className={statusClass(post.status)}>
                      {STATUS_LABELS[post.status] ?? post.status}
                    </span>
                  </td>
                  <td className="small muted">{formatDate(post.createdAt)}</td>
                  <td>
                    <AdminPostActions postId={post.id} status={post.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
