import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { getPostDetail } from '@/lib/queries'
import { AGE_RANGES, KINDS, SEXES, SIZES, SPECIES, type Kind, type Species } from '@/lib/constants'
import { formatDate, timeAgo } from '@/lib/format'
import { DynamicMap } from '@/components/DynamicMap'
import { Gallery } from '@/components/Gallery'
import { SightingBox } from '@/components/SightingBox'
import { PostOwnerActions } from '@/components/PostOwnerActions'

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
      {pubblicato && (
        <div className="alert success" style={{ marginTop: 20 }}>
          ✅ Annuncio pubblicato!{' '}
          {Number(avvisati) > 0
            ? `Abbiamo avvisato ${avvisati} ${Number(avvisati) === 1 ? 'persona' : 'persone'} nella zona.`
            : 'Sara visibile a chi cerca in questa zona.'}
        </div>
      )}

      <p style={{ marginTop: 18 }}>
        <Link href="/" className="muted small">
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

      <h1 className="page-title" style={{ marginTop: 0 }}>
        {post.title}
      </h1>

      <div className="detail-grid">
        <div className="stack">
          <Gallery photos={post.photos} fallbackEmoji={species?.emoji ?? '🐾'} alt={post.title} />

          <div className="card">
            <h2>Descrizione</h2>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{post.description}</p>
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
                      {sighting.authorName} · {timeAgo(sighting.createdAt)}
                      {sighting.address ? ` · 📍 ${sighting.address}` : ''}
                    </div>
                    <div>{sighting.message}</div>
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

          <div className="card">
            <h2>Contatti</h2>
            <div className="spec-list">
              <div>
                <span className="k">Riferimento</span>
                <span className="v">{post.contactName}</span>
              </div>
              {post.contactPhone && (
                <div>
                  <span className="k">Telefono</span>
                  <span className="v">
                    <a href={`tel:${post.contactPhone}`}>{post.contactPhone}</a>
                  </span>
                </div>
              )}
              {post.contactEmail && (
                <div>
                  <span className="k">Email</span>
                  <span className="v">
                    <a href={`mailto:${post.contactEmail}`}>{post.contactEmail}</a>
                  </span>
                </div>
              )}
            </div>
            {post.contactPhone && (
              <a href={`tel:${post.contactPhone}`} className="btn block" style={{ marginTop: 14 }}>
                📞 Chiama {post.contactName}
              </a>
            )}
          </div>

          {isOwner && <PostOwnerActions postId={post.id} status={post.status} kind={post.kind} />}
        </div>
      </div>
    </div>
  )
}
