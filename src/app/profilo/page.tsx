import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
import { PostCard } from '@/components/PostCard'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Il mio profilo - Amici Pelosi' }

export default async function ProfilePage() {
  const user = await currentUser()
  if (!user) redirect('/accedi')

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { photos: { select: { id: true }, orderBy: { position: 'asc' }, take: 1 } },
  })

  const open = posts.filter((post) => post.status === 'OPEN')
  const closed = posts.filter((post) => post.status === 'RESOLVED')

  return (
    <div className="container">
      <h1 className="page-title">Ciao {user.name.split(' ')[0]} 👋</h1>
      <p className="page-sub">{user.email}</p>

      <div className="card">
        <h2>La tua zona di avviso</h2>
        <p className="section-hint">
          {user.alertLat != null
            ? `${user.alertCity || 'Zona impostata'} · raggio ${user.alertRadiusKm} km · avvisi ${
                user.alertsEnabled ? 'attivi' : 'sospesi'
              }`
            : 'Non hai ancora impostato la tua zona.'}
        </p>
        <Link href="/notifiche" className="btn secondary small">
          Gestisci notifiche
        </Link>
      </div>

      <h2 className="page-title" style={{ fontSize: '1.2rem' }}>
        Annunci attivi ({open.length})
      </h2>
      {open.length === 0 ? (
        <p className="muted small">
          Nessun annuncio attivo. <Link href="/nuovo">Pubblicane uno</Link>.
        </p>
      ) : (
        <div className="grid">
          {open.map((post) => (
            <PostCard key={post.id} post={{ ...post, createdAt: post.createdAt.toISOString() }} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="page-title" style={{ fontSize: '1.2rem' }}>
            Storico ({closed.length})
          </h2>
          <div className="grid">
            {closed.map((post) => (
              <PostCard key={post.id} post={{ ...post, createdAt: post.createdAt.toISOString() }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
