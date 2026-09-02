import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { getPostDetail } from '@/lib/queries'
import { jsonLd, toStructured } from '@/lib/structured'
import { headers } from 'next/headers'
import { AGE_RANGES, KINDS, SEXES, SIZES, SPECIES, type Kind, type Species, accountTypeLabel, kindLabel } from '@/lib/constants'
import { formatDate, timeAgo } from '@/lib/format'
import { DynamicMap } from '@/components/DynamicMap'
import { Gallery } from '@/components/Gallery'
import { SightingBox } from '@/components/SightingBox'
import { PostOwnerActions } from '@/components/PostOwnerActions'
import { SpeciesSound } from '@/components/SoundProvider'
import { ThankYou } from '@/components/ThankYou'
import { ThanksButton } from '@/components/ThanksButton'
import { ContactGate } from '@/components/ContactGate'
import { contactAccess } from '@/lib/contacts'
import { ShareListing } from '@/components/ShareListing'
import { thankYouForPost } from '@/lib/messages'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pubblicato?: string; avvisati?: string }>
}

function yesNo(value: boolean | null) {
  if (value === null) return null
  return value ? 'Si' : 'No'
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { pubblicato, avvisati } = await searchParams

  const post = await getPostDetail(id)
  if (!post) notFound()

  const user = await currentUser()
  const isOwner = user?.id === post.authorId
  const access = await contactAccess(post, user?.id ?? null)

  // Dati strutturati: chi legge la pagina con un programma trova tutto qui,
  // senza dover interpretare il testo.
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const origin = `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${host}`
  const structured = jsonLd(
    toStructured(post, post.photos.map((photo) => photo.id), origin),
  )
  const kind = KINDS[post.kind as Kind]
  const species = SPECIES[post.species as Species]

  const specs: [string, string | null][] = [
    ['Specie', species?.label ?? post.species],
    ['Nome', post.petName],
    ['Razza', post.breed],
    ['Sesso', post.sex ? (SEXES[post.sex as keyof typeof SEXES] ?? post.sex) : null],
    ['Eta', post.ageRange ? (AGE_RANGES[post.ageRange as keyof typeof AGE_RANGES] ?? post.ageRange) : null],
    ['Taglia', post.size ? (SIZES[post.size as keyof typeof SIZES] ?? post.size) : null],
    ['Colore', post.color],
    ['Collare', post.hasCollar ? 'Si' : null],
    ['Microchip', post.hasMicrochip ? (post.microchip || 'Si') : null],
    ['Sterilizzato', yesNo(post.neutered)],
    ['Vaccinato', yesNo(post.vaccinated)],
    ['Con bambini', yesNo(post.goodWithKids)],
    ['Con altri animali', yesNo(post.goodWithPets)],
  ]

  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      {/*
        JSON.stringify non tocca il carattere "<": una descrizione che contiene
        "</script><script>..." chiuderebbe questo tag ed eseguirebbe codice su
        chiunque apra l'annuncio. Codificarlo come sequenza \u003c resta JSON valido e
        toglie il problema alla radice.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
      />
      <SpeciesSound species={post.species} />
      {pubblicato && (
        <>
          <ThankYou message={thankYouForPost(post.kind)} />
          <p className="muted small" style={{ marginTop: -8 }}>
            {Number(avvisati) > 0
              ? `Abbiamo gia avvisato ${avvisati} ${Number(avvisati) === 1 ? 'persona' : 'persone'} nella zona.`
              : 'L annuncio e ora visibile a chi cerca in questa zona.'}
          </p>
        </>
      )}

      <p style={{ marginTop: 18 }}>
        <Link href="/bacheca" className="muted small">
          ← Torna alla bacheca
        </Link>
      </p>

      <div className="inline" style={{ marginBottom: 10 }}>
        <span className={`badge ${post.kind}`}>
          {kind?.emoji} {kind?.label}
        </span>
        {post.status === 'RESOLVED' && <span className="badge resolved">✓ Caso chiuso</span>}
        <span className="small muted">Pubblicato {timeAgo(post.createdAt)}</span>
      </div>

      {/*
        Chi ha pubblicato, con un collegamento al suo profilo pubblico: nome,
        tipo di account, da quanto e' qui, e i grazie ricevuti. Nessun
        recapito: quello si chiede piu' in basso.
      */}
      <p className="small muted" style={{ margin: '0 0 8px' }}>
        da{' '}
        <Link href={`/persone/${post.author.id}`} className="person-link">
          {post.author.name}
        </Link>
        {post.author.accountType !== 'PERSON' && accountTypeLabel(post.author.accountType) && (
          <>
            {' '}
            <span className="badge account">{accountTypeLabel(post.author.accountType)}</span>
          </>
        )}
      </p>

      <h1 className="page-title" style={{ marginTop: 0 }}>
        {post.title}
      </h1>

      <div className="detail-grid">
        <div className="stack">
          <Gallery photos={post.photos} fallbackEmoji={species?.emoji ?? '🐾'} alt={post.title} />

          <div className="card">
            <h2>Descrizione</h2>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{post.description}</p>
            {/*
              Uno stallo senza una durata e' un'adozione non detta: chi si offre
              ha bisogno di sapere a cosa sta dicendo di si'.
            */}
            {post.kind === 'FOSTER' && post.fosterPeriod && (
              <>
                <h2 style={{ marginTop: 18 }}>Per quanto tempo</h2>
                <p style={{ margin: 0 }}>{post.fosterPeriod}</p>
              </>
            )}
            {post.extraNotes && (
              <>
                <h2 style={{ marginTop: 18 }}>Informazioni utili</h2>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{post.extraNotes}</p>
              </>
            )}
          </div>

          <div className="card">
            <h2>Avvistamenti e messaggi</h2>
            <p className="section-hint">
              Hai visto questo animale? Lascia una segnalazione con luogo e ora: aiuta chi lo cerca.
            </p>
            <SightingBox postId={post.id} canPost={Boolean(user)} />

            <div style={{ marginTop: 16 }}>
              {post.sightings.length === 0 ? (
                <p className="muted small">Ancora nessuna segnalazione.</p>
              ) : (
                post.sightings.map((sighting) => (
                  <div className="sighting" key={sighting.id}>
                    <div className="who">
                      <Link href={`/persone/${sighting.authorId}`} className="person-link">
                        {sighting.authorName}
                      </Link>
                      {' · '}
                      {timeAgo(sighting.createdAt)}
                      {sighting.address ? ` · 📍 ${sighting.address}` : ''}
                    </div>
                    <div>{sighting.message}</div>
                    {/*
                      Il grazie lo da' solo chi ha pubblicato, e non a se stesso:
                      una segnalazione scritta sul proprio annuncio e' un
                      aggiornamento, non un aiuto.
                    */}
                    {isOwner && sighting.authorId !== post.authorId && (
                      <ThanksButton
                        target={{ sightingId: sighting.id }}
                        done={sighting.thankedAt != null}
                      />
                    )}
                    {sighting.photoIds.length > 0 && (
                      <div className="sighting-shots">
                        {sighting.photoIds.map((photoId) => (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            key={photoId}
                            src={`/api/photos/${photoId}`}
                            alt="Foto della segnalazione"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                    {sighting.lat != null && sighting.lng != null && (
                      <a
                        className="sighting-map"
                        href={`https://www.openstreetmap.org/?mlat=${sighting.lat}&mlon=${sighting.lng}#map=17/${sighting.lat}/${sighting.lng}`}
                        target="_blank"
                        rel="noopener"
                      >
                        📍 Apri il punto esatto sulla mappa
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <h2>Zona</h2>
            <p className="section-hint">
              {post.address}
              {post.city ? `, ${post.city}` : ''}
              {post.province ? ` (${post.province})` : ''}
            </p>
            <DynamicMap
              center={{ lat: post.lat, lng: post.lng }}
              zoom={14}
              markers={[
                { lat: post.lat, lng: post.lng, emoji: species?.emoji, color: kind?.color },
              ]}
              className="map-box small"
            />
            <p className="hint">
              {post.kind === 'LOST' ? 'Visto l ultima volta il ' : 'Dal '}
              {formatDate(post.eventDate)}
            </p>
          </div>

          <div className="card">
            <h2>Caratteristiche</h2>
            <div className="spec-list">
              {specs
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label}>
                    <span className="k">{label}</span>
                    <span className="v">{value}</span>
                  </div>
                ))}
            </div>
          </div>

          {/*
            Il recapito non e' una cosa che si legge, e' una cosa che si chiede.

            Un numero in chiaro su una bacheca lo raccoglie chiunque passi, e
            la truffa del "ho il tuo cane, mandami i soldi per riportartelo"
            comincia esattamente da un elenco cosi'. Adesso chi ha pubblicato
            legge chi glielo chiede e decide lui.
          */}
          <div className="card">
            <h2>Contatti</h2>
            <div className="spec-list">
              <div>
                <span className="k">Riferimento</span>
                <span className="v">{post.contactName}</span>
              </div>
            </div>
            {/*
              Se il recapito non si deve vedere non parte nemmeno: passato al
              componente sarebbe dentro la pagina, in chiaro, leggibile con due
              tasti anche senza che compaia a schermo.
            */}
            <ContactGate
              postId={post.id}
              visible={access.visible}
              reason={access.reason}
              contactName={post.contactName}
              contactPhone={access.visible ? post.contactPhone : null}
              contactEmail={access.visible ? post.contactEmail : null}
              title={post.title}
            />
          </div>

          <ShareListing
            title={post.title}
            url={`https://amicipelosi.bais.info/annunci/${post.id}`}
            city={post.city}
            kindLabel={kindLabel(post.kind)}
            social={
              user && isOwner
                ? { facebook: user.orgFacebook, instagram: user.orgInstagram }
                : undefined
            }
          />

          <div className="card">
            <h2>Il volantino</h2>
            <p className="section-hint">
              Un foglio A4 da attaccare al palo, con il codice da inquadrare che riporta qui. Chi
              porta fuori il cane alle sette di mattina è esattamente la persona che potrebbe
              averlo incrociato, e non aprirà mai un&apos;app per caso.
            </p>
            <Link href={`/annunci/${post.id}/locandina`} className="btn secondary">
              🖨️ Prepara la locandina
            </Link>
          </div>

          {isOwner && (
            <div className="card">
              <h2>Correggi</h2>
              <p className="section-hint">
                Hai sbagliato il colore, la via o una cifra del telefono? Si corregge senza
                ripubblicare: le segnalazioni già arrivate restano dove sono.
              </p>
              <Link href={`/annunci/${post.id}/modifica`} className="btn secondary">
                ✏️ Modifica l’annuncio
              </Link>
            </div>
          )}

          {isOwner && <PostOwnerActions postId={post.id} status={post.status} kind={post.kind} />}
        </div>
      </div>
    </div>
  )
}
