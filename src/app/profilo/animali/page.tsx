import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { listPetsOf, listPetsSharedWith, listTrustedOf } from '@/lib/pets'
import { SPECIES, type Species } from '@/lib/constants'
import { PetForm } from '@/components/PetForm'
import { TrustedPeople } from '@/components/TrustedPeople'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'I miei animali - Amici Pelosi' }

function PetCard({
  pet,
  href,
  ownerName,
}: {
  pet: { id: string; name: string; species: string; breed: string | null; photos: { id: string; slot: string }[] }
  href: string
  ownerName?: string
}) {
  const front = pet.photos.find((photo) => photo.slot === 'FRONT') ?? pet.photos[0]
  return (
    <Link href={href} className="pet-card">
      <span className="pet-face">
        {front ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={`/api/pets/photos/${front.id}`} alt="" />
        ) : (
          <span aria-hidden="true">{SPECIES[pet.species as Species]?.emoji ?? '🐾'}</span>
        )}
      </span>
      <span className="pet-who">
        <strong>{pet.name}</strong>
        <em>
          {SPECIES[pet.species as Species]?.label ?? pet.species}
          {pet.breed ? ` · ${pet.breed}` : ''}
          {ownerName ? ` · di ${ownerName}` : ''}
        </em>
      </span>
    </Link>
  )
}

export default async function MyPetsPage() {
  const user = await currentUser()
  if (!user) redirect('/accedi')

  const [mine, shared, trusted] = await Promise.all([
    listPetsOf(user.id),
    listPetsSharedWith(user.id),
    listTrustedOf(user.id),
  ])

  return (
    <div className="container stack">
      <header className="page-head">
        <h1 className="page-title">I miei animali</h1>
        <p className="page-sub">
          La scheda di chi vive con te: le tre foto che servirebbero se sparisse, il microchip, il
          libretto e il diario della sua vita. <strong>Resta privata</strong> — non finisce in
          bacheca e non la vede nessuno, a meno che tu non decida diversamente.
        </p>
      </header>

      <div className="card">
        <h2>Le tue schede ({mine.length})</h2>
        {mine.length === 0 ? (
          <p className="section-hint">
            Ancora nessuna. Si compila in cinque minuti adesso che è tutto tranquillo, e serve il
            giorno in cui non avresti la testa per farlo.
          </p>
        ) : (
          <div className="pet-grid">
            {mine.map((pet) => (
              <PetCard key={pet.id} pet={pet} href={`/profilo/animali/${pet.id}`} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <PetForm />
        </div>
      </div>

      {shared.length > 0 && (
        <div className="card">
          <h2>Condivisi con te ({shared.length})</h2>
          <p className="section-hint">
            Qualcuno ti ha dato la chiave. Se dovesse succedere qualcosa, sai già come sono fatti.
          </p>
          <div className="pet-grid">
            {shared.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                href={`/profilo/animali/${pet.id}`}
                ownerName={pet.ownerName}
              />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Persone fidate</h2>
        <p className="section-hint">
          Chi sta qui può vedere le schede che tu marchi come condivise: il compagno di casa, un
          familiare, il vicino che gli dà da mangiare quando parti. Non vedono altro del tuo
          profilo, e la chiave si toglie in un secondo.
        </p>
        <TrustedPeople people={trusted} />
      </div>
    </div>
  )
}
