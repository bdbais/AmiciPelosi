import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { getPostDetail } from '@/lib/queries'
import { PostForm } from '@/components/PostForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Correggi l’annuncio - Amici Pelosi' }

type Params = { params: Promise<{ id: string }> }

/**
 * Correggere quello che si e' scritto di corsa.
 *
 * Un annuncio si scrive nel momento peggiore: di notte, con le mani che
 * tremano, e ci finiscono dentro il colore sbagliato e un numero con una cifra
 * in meno. Prima l'unico rimedio era cancellare e ripubblicare, buttando via le
 * segnalazioni gia' arrivate - cioe' proprio le notizie che si aspettavano.
 */
export default async function EditPostPage({ params }: Params) {
  const { id } = await params
  const user = await currentUser()
  if (!user) redirect('/accedi')

  const post = await getPostDetail(id)
  if (!post) notFound()
  if (post.authorId !== user.id) notFound()

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <p className="small">
        <Link href={`/annunci/${post.id}`} style={{ textDecoration: 'underline' }}>
          ‹ Torna all’annuncio
        </Link>
      </p>
      <h1 className="page-title">Correggi l’annuncio</h1>
      <p className="page-sub">
        Le segnalazioni già arrivate restano dove sono: stai correggendo il testo, non
        ripubblicando.
      </p>

      <PostForm
        defaultContact={{ name: user.name, phone: user.phone ?? '' }}
        initial={{
          id: post.id,
          kind: post.kind,
          title: post.title,
          species: post.species,
          breed: post.breed,
          petName: post.petName,
          sex: post.sex,
          ageRange: post.ageRange,
          size: post.size,
          color: post.color,
          hasMicrochip: post.hasMicrochip,
          microchip: post.microchip,
          hasCollar: post.hasCollar,
          neutered: post.neutered,
          vaccinated: post.vaccinated,
          goodWithKids: post.goodWithKids,
          goodWithPets: post.goodWithPets,
          description: post.description,
          extraNotes: post.extraNotes,
          fosterPeriod: post.fosterPeriod,
          address: post.address,
          city: post.city,
          province: post.province,
          lat: post.lat,
          lng: post.lng,
          eventDate: post.eventDate.toISOString().slice(0, 10),
          contactName: post.contactName,
          contactPhone: post.contactPhone,
          contactEmail: post.contactEmail,
          contactMode: post.contactMode,
          photos: post.photos.map((photo) => ({ id: photo.id })),
        }}
      />
    </div>
  )
}
