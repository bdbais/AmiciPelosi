'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { PostCard, type PostCardData } from './PostCard'
import { readJson } from '@/lib/http'
import { useGeolocation, type Coords } from '@/lib/useGeolocation'
import { KINDS, QUIET_KINDS, RADIUS_OPTIONS, SPECIES } from '@/lib/constants'

type Props = {
  initialPosts: PostCardData[]
  /** Filtri gia applicati dal server: vanno ripetuti quando si cerca per distanza. */
  filters: { kind?: string; species?: string; q?: string }
  /** Quanti annunci aperti per tipo: i tipi a zero non hanno un chip. */
  counts: Record<string, number>
}

const DEFAULT_RADIUS = 10

/**
 * La bacheca: una riga di ricerca, i tipi, e subito gli annunci.
 *
 * Su un telefono da 375 pixel ogni blocco messo qui sopra spinge il primo
 * annuncio fuori dallo schermo: chi ha appena perso un animale deve vederne
 * uno prima ancora di capire come si filtra. Per questo le specie e il GPS
 * stanno in un pannello che si apre a richiesta, e i tipi restano su una
 * riga sola che scorre di lato.
 *
 * La prossimita' e' l'unico filtro che vive qui e non nell'indirizzo:
 * parte dagli annunci gia resi dal server e, quando si accende, chiede la
 * posizione e ricarica solo quelli entro il raggio scelto.
 */
export function BoardList({ initialPosts, filters, counts }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const { locate, loading: locating, error: geoError } = useGeolocation()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [center, setCenter] = useState<Coords | null>(null)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)
  const [nearPosts, setNearPosts] = useState<PostCardData[] | null>(null)
  const [loading, setLoading] = useState(false)

  const activeKind = params.get('tipo') ?? ''
  const activeSpecies = params.get('specie') ?? ''
  // Chi arriva con una specie gia' scelta deve vedere da dove viene il filtro.
  const [panelOpen, setPanelOpen] = useState(Boolean(activeSpecies))

  function navigate(next: Record<string, string>) {
    const search = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value)
      else search.delete(key)
    }
    router.push(search.toString() ? `/bacheca?${search}` : '/bacheca')
  }

  const load = useCallback(
    async (coords: Coords, radiusKm: number, signal: AbortSignal) => {
      setLoading(true)
      const search = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radius: String(radiusKm),
      })
      if (filters.kind) search.set('kind', filters.kind)
      if (filters.species) search.set('species', filters.species)
      if (filters.q) search.set('q', filters.q)

      try {
        const response = await fetch(`/api/posts?${search}`, { signal })
        const json = await readJson<{ posts: PostCardData[] }>(response)
        if (!signal.aborted) setNearPosts(json.posts ?? [])
      } catch {
        if (!signal.aborted) setNearPosts([])
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [filters.kind, filters.species, filters.q],
  )

  // Chi tocca «5 km» e poi «20 km» di fila manda due richieste: se la prima
  // risponde per ultima, senza questo annullamento sarebbe lei a restare.
  useEffect(() => {
    if (!center) return
    const controller = new AbortController()
    void load(center, radius, controller.signal)
    return () => controller.abort()
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
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  // Quanti filtri stanno nel pannello chiuso: si vede sul tasto anche da chiuso.
  const hidden = (activeSpecies ? 1 : 0) + (active ? 1 : 0)

  return (
    <>
      <div className="board-head">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            navigate({ q: query.trim() })
          }}
          className="board-search"
        >
          <input
            type="search"
            placeholder="Cerca per nome, razza, città…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Cerca annunci"
            enterKeyHint="search"
          />
          <button
            type="button"
            className={`btn secondary${panelOpen || hidden ? ' on' : ''}`}
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="board-filters"
          >
            Filtri{hidden > 0 ? ` (${hidden})` : ''}
          </button>
        </form>

        <div className="chips">
          <button
            type="button"
            className={`chip ${activeKind ? '' : 'active'}`}
            onClick={() => navigate({ tipo: '' })}
          >
            Tutti ({total})
          </button>
          {Object.entries(KINDS).map(([key, value]) => {
            // Un tipo senza annunci non ha un chip: sarebbe un tasto per una
            // pagina vuota. Resta solo se e' quello gia' scelto, per poterlo togliere.
            if (!(counts[key] > 0) && activeKind !== key) return null
            // La sezione senza vita si distingue anche a colpo d'occhio, e sta
            // per ultima: chi scorre la bacheca non deve incrociarla per caso.
            const quiet = QUIET_KINDS.includes(key)
            const label = 'short' in value ? value.short : value.label
            return (
              <button
                key={key}
                type="button"
                className={`chip ${quiet ? 'quiet ' : ''}${activeKind === key ? 'active' : ''}`}
                onClick={() => navigate({ tipo: activeKind === key ? '' : key })}
              >
                {quiet ? <span className="quiet-dot" aria-hidden="true" /> : `${value.emoji} `}
                {label} ({counts[key] ?? 0})
              </button>
            )
          })}
        </div>

        {panelOpen && (
          <div className="card board-filters" id="board-filters">
            <div>
              <span className="label">Che animale</span>
              <div className="chips wrap" style={{ marginTop: 8 }}>
                {Object.entries(SPECIES).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip ${activeSpecies === key ? 'active' : ''}`}
                    onClick={() => navigate({ specie: activeSpecies === key ? '' : key })}
                  >
                    {value.emoji} {value.label}
                  </button>
                ))}
              </div>
            </div>

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
                        : 'Solo vicino a me'}
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
        <div className="grid" style={{ marginTop: 14 }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  )
}
