import { countOpenByKind, listPosts } from '@/lib/queries'
import { BoardList } from '@/components/BoardList'
import { KINDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bacheca - Amici Pelosi' }

type Search = { tipo?: string; specie?: string; q?: string }

/**
 * La bacheca sono gli annunci, e basta.
 *
 * Prima qui sopra c'era una presentazione con tre tasti: su un telefono
 * riempiva tutta la prima schermata e il primo annuncio stava sotto. Chi
 * spiega di cosa si tratta e' la pagina di ingresso; pubblicare e segnalare
 * stanno nella barra in basso.
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { tipo, specie, q } = await searchParams

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
      <h1 className="sr-only">Bacheca</h1>
      <BoardList
        initialPosts={posts.map((post) => ({ ...post, createdAt: post.createdAt.toISOString() }))}
        filters={{ kind: tipo, species: specie, q }}
        counts={countByKind}
      />
    </div>
  )
}
