'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import {
  forwardGeocode,
  isMobileDevice,
  useGeolocation,
  type Coords,
  type Place,
} from '@/lib/useGeolocation'
import { PermissionButton } from './PermissionButton'

export type Home = Coords & { label?: string | null }

type Props = {
  /** Chiamato quando l'utente ha scelto un posto, in qualunque dei tre modi. */
  onPick: (coords: Coords, place?: Place) => void
  /** La zona salvata nel profilo, se c'e': diventa il tasto «La mia zona». */
  home?: Home | null
  placeholder?: string
  /** Testo accanto al risultato trovato, es. "Trovato:". */
  compact?: boolean
}

/**
 * I tre modi per dire "qui": scrivere un comune o un indirizzo, usare la
 * posizione del telefono, o tornare alla zona salvata nel profilo.
 *
 * Il secondo compare solo su telefoni e tablet. Su un computer la
 * "posizione" viene dall'indirizzo IP, e chi vive a Monselice si e' visto
 * piazzare la casa in Trentino: un tasto che sbaglia di cento chilometri con
 * l'aria di sapere dove sei e' peggio di nessun tasto.
 *
 * Il terzo serve a chi e' in vacanza e vuole guardare cosa succede a casa:
 * la posizione di adesso non e' mai l'unica che conta.
 */
export function PlacePicker({ onPick, home, placeholder, compact }: Props) {
  const { locate, loading, error } = useGeolocation()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [found, setFound] = useState<string | null>(null)
  // Deciso dopo il montaggio: sul server non si sa che dispositivo e', e un
  // valore diverso fra server e browser fa saltare l'idratazione.
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMobile(isMobileDevice())
  }, [])

  async function locateMe() {
    const coords = await locate()
    if (coords) {
      setFound(null)
      onPick(coords)
    }
  }

  async function searchPlace() {
    const text = query.trim()
    if (text.length < 2 || searching) return
    setSearching(true)
    setSearchError(null)
    setFound(null)
    try {
      const result = await forwardGeocode(text)
      if ('error' in result) {
        setSearchError(result.error)
        return
      }
      setFound(result.place.label)
      onPick({ lat: result.place.lat, lng: result.place.lng }, result.place)
    } finally {
      setSearching(false)
    }
  }

  // Questo campo vive spesso dentro un form piu' grande: Invio deve cercare
  // il posto, non pubblicare l'annuncio a meta'.
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void searchPlace()
    }
  }

  const hasHome = home && Number.isFinite(home.lat) && Number.isFinite(home.lng)

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="inline" style={{ alignItems: 'stretch' }}>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'Comune o indirizzo, es. Monselice'}
          aria-label="Comune o indirizzo da cercare"
          autoComplete="off"
          style={{ flex: 1, minWidth: 160 }}
        />
        <button
          type="button"
          className="btn secondary small"
          onClick={() => void searchPlace()}
          disabled={searching || query.trim().length < 2}
        >
          {searching ? 'Cerco…' : 'Cerca'}
        </button>
        {mobile && (
          <button type="button" className="btn secondary small" onClick={() => void locateMe()} disabled={loading}>
            {loading ? 'Cerco la posizione…' : '📡 Dove sono'}
          </button>
        )}
        {hasHome && (
          <button
            type="button"
            className="btn secondary small"
            onClick={() => {
              setFound(home.label ?? null)
              onPick({ lat: home.lat, lng: home.lng })
            }}
          >
            🏠 La mia zona
          </button>
        )}
      </div>

      {searchError && <p className="alert error small" style={{ margin: 0 }}>{searchError}</p>}
      {found && !searchError && !compact && (
        <p className="small muted" style={{ margin: 0 }}>
          Trovato: {found}
        </p>
      )}

      {error && (
        <div className="alert error">
          <p style={{ margin: '0 0 8px' }}>{error}</p>
          <PermissionButton kind="geolocation" compact onGranted={() => void locateMe()} />
        </div>
      )}
    </div>
  )
}
