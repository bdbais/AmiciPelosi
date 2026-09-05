'use client'

import { useCallback, useEffect, useState } from 'react'
import { PostCard, type PostCardData } from './PostCard'
import { DynamicMap } from './DynamicMap'
import { PlacePicker, type Home } from './PlacePicker'
import { type Coords } from '@/lib/useGeolocation'
import { KINDS, RADIUS_OPTIONS, SPECIES, type Kind, type Species } from '@/lib/constants'
import { readJson } from '@/lib/http'

type Props = {
  /** La zona salvata nel profilo: da qui si parte, e qui si torna con un tasto. */
  home?: Home | null
}

/**
 * Gli annunci attorno a un posto. Il posto lo sceglie chi guarda: scrivendo
 * un comune, dal telefono con il GPS, o con la zona salvata nel profilo.
 * Quest'ultima e' il caso di chi e' in vacanza e vuole sapere cosa succede a
 * casa: "vicino a me" non vuol dire per forza "dove sono adesso".
 */
export function NearbyBrowser({ home }: Props) {
  const [center, setCenter] = useState<Coords | null>(home ?? null)
  const [where, setWhere] = useState<string | null>(home?.label ?? null)
  const [radius, setRadius] = useState<number>(10)
  const [kind, setKind] = useState<string>('')
  const [posts, setPosts] = useState<PostCardData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (coords: Coords, radiusKm: number, kindFilter: string, signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radius: String(radiusKm),
      })
      if (kindFilter) params.set('kind', kindFilter)

      try {
        const response = await fetch(`/api/posts?${params}`, { signal })
        const json = await readJson<{ posts: PostCardData[] }>(response)
        if (!signal.aborted) setPosts(json.posts ?? [])
      } catch {
        if (!signal.aborted) {
          setPosts([])
          setError('Non sono riuscito a caricare gli annunci: controlla la connessione e riprova.')
        }
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [],
  )

  // Raggio e filtro si toccano di fila: la risposta della richiesta vecchia
  // non deve coprire quella nuova, quindi la si annulla quando parte l'altra.
  useEffect(() => {
    if (!center) return
    const controller = new AbortController()
    void load(center, radius, kind, controller.signal)
    return () => controller.abort()
  }, [center, radius, kind, load])

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 12 }}>
        <PlacePicker
          home={home}
          compact
          onPick={(coords, place) => {
            setCenter(coords)
            setWhere(place?.label ?? (coords === home ? home?.label ?? null : null))
          }}
        />

        <div className="inline">
          <span className="small muted">Raggio</span>
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip ${radius === option ? 'active' : ''}`}
              onClick={() => setRadius(option)}
            >
              {option} km
            </button>
          ))}
        </div>

        <div className="chips">
          <button
            type="button"
            className={`chip ${kind ? '' : 'active'}`}
            onClick={() => setKind('')}
          >
            Tutti
          </button>
          {Object.entries(KINDS).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={`chip ${kind === key ? 'active' : ''}`}
              onClick={() => setKind(kind === key ? '' : key)}
            >
              {value.emoji} {value.label}
            </button>
          ))}
        </div>
      </div>

      {center && (
        <DynamicMap
          center={center}
          zoom={radius <= 5 ? 13 : radius <= 20 ? 11 : 9}
          radiusKm={radius}
          markers={[
            { lat: center.lat, lng: center.lng, emoji: '📍', color: '#2a2320' },
            ...posts.map((post) => {
              const anyPost = post as PostCardData & { lat: number; lng: number }
              return {
                lat: anyPost.lat,
                lng: anyPost.lng,
                emoji: SPECIES[post.species as Species]?.emoji ?? '🐾',
                color: KINDS[post.kind as Kind]?.color,
              }
            }),
          ]}
        />
      )}

      {error && <div className="alert error">{error}</div>}

      {!center ? (
        <div className="empty">
          <div className="emoji">🗺️</div>
          <p>Scrivi un comune o un indirizzo per vedere cosa succede lì intorno.</p>
        </div>
      ) : loading ? (
        <p className="muted" style={{ textAlign: 'center' }}>
          Carico gli annunci…
        </p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <div className="emoji">🌿</div>
          <p>
            Nessun annuncio entro {radius} km{where ? ` da ${where}` : ''}. Buona notizia!
            <br />
            Prova ad allargare il raggio.
          </p>
        </div>
      ) : (
        <>
          <p className="muted small">
            {posts.length} {posts.length === 1 ? 'annuncio' : 'annunci'} entro {radius} km
            {where ? ` da ${where}` : ''}.
          </p>
          <div className="grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
