import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
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

  const where: Record<string, unknown> = { status: 'OPEN' }
  if (tipo && tipo in KINDS) where.kind = tipo
  if (specie) where.species = specie
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { city: { contains: q } },
      { breed: { contains: q } },
      { petName: { contains: q } },
    ]
  }

  const [posts, counts] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { photos: { select: { id: true }, orderBy: { position: 'asc' }, take: 1 } },
    }),
    prisma.post.groupBy({ by: ['kind'], where: { status: 'OPEN' }, _count: true }),
  ])

  const countByKind = Object.fromEntries(counts.map((row) => [row.kind, row._count]))

  return (
    <div className="container">
      <section className="hero">
        <h1>Aiutiamoli a tornare a casa 🐾</h1>
        <p>
          Pubblica un annuncio se hai perso o trovato un animale, o se cerchi una famiglia per lui.
          Attiva le notifiche di prossimita e ricevi un avviso quando succede qualcosa vicino a te.
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
            <PostCard
              key={post.id}
              post={{ ...post, createdAt: post.createdAt.toISOString() }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
