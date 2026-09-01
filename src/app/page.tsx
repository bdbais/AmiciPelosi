import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { countOpenByKind, listPosts } from '@/lib/queries'
import { KindFilter } from '@/components/KindFilter'
import { BoardList } from '@/components/BoardList'
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
        <h1>Aiutiamoli a tornare a casa&nbsp;🐾</h1>
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

      <BoardList
        initialPosts={posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString() }))}
        filters={{ kind: tipo, species: specie, q }}
      />
    </div>
  )
}
