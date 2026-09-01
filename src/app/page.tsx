import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { countOpenByKind, listPosts } from '@/lib/queries'
import { PostCard } from '@/components/PostCard'
import { KindFilter } from '@/components/KindFilter'
import { KINDS, type Kind } from '@/lib/constants'

export const dynamic = 'force-dynamic'

type Search = { tipo?: string; specie?: string; q?: string }

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { tipo, specie, q } = await searchParams
  const user = await currentUser()

  const [posts, countByKind] = await Promise.all([
    listPosts({
      kind: tipo && tipo in KINDS ? tipo : null,
      species: specie ?? null,
      query: q ?? null,
      status: 'OPEN',
    }),
    countOpenByKind(),
  ])

  return (
    <div className="container">
      <section className="hero">
        <h1>Aiutiamoli a tornare a casa 🐾</h1>
        <p>
          Amici Pelosi serve a due cose: <strong>ritrovare un animale perduto</strong> e{' '}
          <strong>trovare una famiglia a chi non ha casa</strong>. Pubblica un annuncio con foto e
          zona, e attiva le notifiche di prossimita: chi vive li vicino ricevera un avviso e potra
          tenere gli occhi aperti.
        </p>
        <div className="actions">
          <Link href="/nuovo" className="btn">
            Pubblica un annuncio
          </Link>
          <Link href="/vicino" className="btn secondary">
            📍 Cerca vicino a me
          </Link>
          {!user && (
            <Link href="/registrati" className="btn ghost">
              Crea un account
            </Link>
          )}
        </div>
      </section>

      <KindFilter counts={countByKind} />

      {posts.length === 0 ? (
        <div className="empty">
          <div className="emoji">🐕‍🦺</div>
          <p>
            Nessun annuncio con questi filtri.
            <br />
            <Link href="/nuovo" style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>
              Pubblicane uno tu
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 20 }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
