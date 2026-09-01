'use client'

import { useCallback, useEffect, useState } from 'react'
import { PostCard, type PostCardData } from './PostCard'
import { readJson } from '@/lib/http'
import { useGeolocation, type Coords } from '@/lib/useGeolocation'
import { RADIUS_OPTIONS } from '@/lib/constants'

type Props = {
  initialPosts: PostCardData[]
  /** Filtri gia applicati dal server: vanno ripetuti quando si cerca per distanza. */
  filters: { kind?: string; species?: string; q?: string }
}

const DEFAULT_RADIUS = 10

/**
 * Bacheca con il filtro per distanza dal punto GPS.
 * Parte dagli annunci gia resi dal server; quando si accende la prossimita
 * chiede la posizione e ricarica solo quelli entro il raggio scelto.
 */
export function BoardList({ initialPosts, filters }: Props) {
  const { locate, loading: locating, error: geoError } = useGeolocation()
  const [center, setCenter] = useState<Coords | null>(null)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [nearPosts, setNearPosts] = useState<PostCardData[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (coords: Coords, radiusKm: number) => {
      setLoading(true)
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radius: String(radiusKm),
      })
      if (filters.kind) params.set('kind', filters.kind)
      if (filters.species) params.set('species', filters.species)
      if (filters.q) params.set('q', filters.q)

      try {
        const response = await fetch(`/api/posts?${params}`)
        const json = await readJson<{ posts: PostCardData[] }>(response)
        setNearPosts(json.posts ?? [])
      } catch {
        setNearPosts([])
      } finally {
        setLoading(false)
      }
    },
    [filters.kind, filters.species, filters.q],
  )

  useEffect(() => {
    if (center) void load(center, radius)
  }, [center, radius, load])

  async function toggle() {
    if (center) {
      // Spegnere riporta alla bacheca completa.
      setCenter(null)
      setNearPosts(null)
      return
    }
    const coords = await locate()
    if (coords) setCenter(coords)
  }

  const active = Boolean(center)
  const posts = active ? (nearPosts ?? []) : initialPosts

  return (
    <>
      <div className={`near-box${active ? ' on' : ''}`}>
        <button
          type="button"
          className="near-toggle"
          onClick={toggle}
          aria-pressed={active}
          disabled={locating}
        >
          <span className="pin" aria-hidden="true">
            📍
          </span>
          <span className="txt">
            <span className="t">
              {locating
                ? 'Cerco la tua posizione…'
                : active
                  ? `Entro ${radius} km da te`
                  : 'Solo quello che ti sta vicino'}
            </span>
            <span className="d">
              {active
                ? 'Ordinati per distanza'
                : 'Usa il GPS per filtrare gli annunci per distanza'}
            </span>
          </span>
          <span className="sw" aria-hidden="true" />
        </button>

        {active && (
          <div className="radius-row">
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
        )}
      </div>

      {geoError && <div className="alert error">{geoError}</div>}

      {loading ? (
        <p className="muted small" style={{ textAlign: 'center', padding: '20px 0' }}>
          Cerco gli annunci vicino a te…
        </p>
      ) : posts.length === 0 ? (
        <div className="empty">
          <div className="emoji">{active ? '🌿' : '🐕‍🦺'}</div>
          <p>
            {active ? (
              <>
                Nessun annuncio entro {radius} km. Buona notizia!
                <br />
                Allarga il raggio per guardare più lontano.
              </>
            ) : (
              'Nessun annuncio con questi filtri.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 16 }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  )
}
