import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { canSeePet, daysUntilNextAnniversary, getPetDetail } from '@/lib/pets'
import {
  MEDICAL_EVENT_KINDS,
  PET_EVENT_KINDS,
  PET_PHOTO_SLOTS,
  SEXES,
  SPECIES,
  type PetEventKind,
  type PetPhotoSlot,
  type Species,
} from '@/lib/constants'
import { PetActions } from '@/components/PetActions'
import { PetDiary } from '@/components/PetDiary'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export default async function PetPage({ params }: Params) {
  const user = await currentUser()
  if (!user) redirect('/accedi')

  const { id } = await params
  const access = await canSeePet(id, user.id)
  if (!access) notFound()

  const { pet, isOwner, scope } = access
  const { photos, events } = await getPetDetail(id)

  // Al veterinario arriva la parte clinica: il resto non gli serve e non lo riguarda.
  const medicalOnly = scope === 'MEDICAL'
  const visibleEvents = medicalOnly
    ? events.filter((event) => MEDICAL_EVENT_KINDS.includes(event.kind as PetEventKind))
    : events
  const visiblePhotos = photos
  const birthday = pet.birthDate ? daysUntilNextAnniversary(pet.birthDate) : null

  return (
    <div className="container stack">
      <p className="muted small">
        <Link href="/profilo/animali">‹ I miei animali</Link>
      </p>

      <header className="page-head">
        <h1 className="page-title">
          {SPECIES[pet.species as Species]?.emoji ?? '🐾'} {pet.name}
        </h1>
        <p className="page-sub">
          {SPECIES[pet.species as Species]?.label ?? pet.species}
          {pet.breed ? ` · ${pet.breed}` : ''}
          {pet.sex ? ` · ${SEXES[pet.sex as keyof typeof SEXES] ?? pet.sex}` : ''}
          {!isOwner && medicalOnly && ' · scheda sanitaria'}
        </p>
      </header>

      {!isOwner && (
        <div className="alert info">
          {medicalOnly
            ? 'Ti è stata data la parte sanitaria di questa scheda. Il resto resta di casa.'
            : 'Qualcuno ti ha dato la chiave di questa scheda. Trattala come tale.'}
        </div>
      )}

      {pet.status === 'DECEASED' && (
        <p className="quiet-note">
          ● {pet.name} non c&apos;è più
          {pet.farewellDate ? `, dal ${pet.farewellDate}` : ''}. Questa scheda resta com&apos;è, con
          il diario e le foto: non si cancella niente.
        </p>
      )}

      {pet.status === 'ADOPTED' && (
        <p className="section-hint">
          {pet.name} ha trovato la sua famiglia. La scheda resta nel vostro storico.
        </p>
      )}

      {birthday !== null && !medicalOnly && pet.status === 'ACTIVE' && (
        <div className="alert info">
          🎂 {birthday === 0 ? `Oggi ${pet.name} compie gli anni.` : `Il compleanno di ${pet.name} è fra ${birthday} giorni.`}
        </div>
      )}

      <div className="card">
        <h2>Le foto</h2>
        {visiblePhotos.length === 0 ? (
          <p className="section-hint">
            Nessuna foto. Sono la cosa che serve davvero il giorno in cui sparisce.
          </p>
        ) : (
          <div className="pet-photos">
            {(Object.keys(PET_PHOTO_SLOTS) as PetPhotoSlot[]).map((slot) => {
              const photo = visiblePhotos.find((item) => item.slot === slot)
              if (!photo) return null
              return (
                <figure key={slot}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/pets/photos/${photo.id}`} alt={PET_PHOTO_SLOTS[slot].label} />
                  <figcaption>{PET_PHOTO_SLOTS[slot].label}</figcaption>
                </figure>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>I dati</h2>
        <div className="spec-list">
          {pet.microchip && (
            <div>
              <span className="k">Microchip</span>
              <span className="v">{pet.microchip}</span>
            </div>
          )}
          {pet.birthDate && (
            <div>
              <span className="k">Nato il</span>
              <span className="v">{pet.birthDate}</span>
            </div>
          )}
          {pet.color && (
            <div>
              <span className="k">Colore e segni</span>
              <span className="v">{pet.color}</span>
            </div>
          )}
        </div>
        {pet.notes && !medicalOnly && <p className="section-hint">{pet.notes}</p>}
      </div>

      <div className="card">
        <h2>{medicalOnly ? 'Storia clinica' : 'Diario'}</h2>
        {visibleEvents.length === 0 ? (
          <p className="section-hint">
            {medicalOnly
              ? 'Ancora nessuna visita registrata.'
              : 'Ancora niente. Le visite, i vaccini, il compleanno: si annota una riga e resta.'}
          </p>
        ) : (
          <div className="diary">
            {visibleEvents.map((event) => (
              <div className="diary-row" key={event.id}>
                <span className="d-mark" aria-hidden="true">
                  {PET_EVENT_KINDS[event.kind as PetEventKind]?.emoji ?? '📝'}
                </span>
                <span className="d-body">
                  <span className="d-title">{event.title}</span>
                  <span className="d-when">
                    {event.happenedAt}
                    {event.recursYearly ? ' · ogni anno' : ''}
                  </span>
                  {event.note && <span className="d-note">{event.note}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
        {isOwner && (
          <div style={{ marginTop: 14 }}>
            <PetDiary petId={pet.id} />
          </div>
        )}
      </div>

      {isOwner && (
        <PetActions
          petId={pet.id}
          petName={pet.name}
          shared={pet.sharedWithCircle}
          hasPhotos={photos.some((photo) => photo.slot !== 'DOCUMENT')}
          status={pet.status}
        />
      )}
    </div>
  )
}
