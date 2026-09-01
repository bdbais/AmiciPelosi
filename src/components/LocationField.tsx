'use client'

import { useState } from 'react'
import { DynamicMap } from './DynamicMap'
import { reverseGeocode, useGeolocation, type Coords } from '@/lib/useGeolocation'

type Props = {
  value: Coords | null
  onChange: (coords: Coords) => void
  onAddressResolved?: (address: { address: string; city: string; province: string }) => void
  radiusKm?: number
  emoji?: string
  hint?: string
}

// Centro Italia: usato solo come inquadratura iniziale della mappa.
const FALLBACK: Coords = { lat: 41.9028, lng: 12.4964 }

export function LocationField({
  value,
  onChange,
  onAddressResolved,
  radiusKm,
  emoji = '📍',
  hint,
}: Props) {
  const { locate, loading, error } = useGeolocation()
  const [resolving, setResolving] = useState(false)

  async function applyCoords(coords: Coords) {
    onChange(coords)
    if (!onAddressResolved) return
    setResolving(true)
    const address = await reverseGeocode(coords.lat, coords.lng)
    if (address) onAddressResolved(address)
    setResolving(false)
  }

  async function useMyPosition() {
    const coords = await locate()
    if (coords) await applyCoords(coords)
  }

  const center = value ?? FALLBACK

  return (
    <div className="stack">
      <div className="inline">
        <button type="button" className="btn secondary small" onClick={useMyPosition} disabled={loading}>
          {loading ? 'Cerco la posizione…' : '📡 Usa la mia posizione'}
        </button>
        {resolving && <span className="small muted">Cerco l indirizzo…</span>}
        {value && (
          <span className="small muted">
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <DynamicMap
        center={center}
        zoom={value ? 15 : 5}
        markers={value ? [{ lat: value.lat, lng: value.lng, emoji }] : []}
        radiusKm={value ? radiusKm : undefined}
        onPick={(lat, lng) => void applyCoords({ lat, lng })}
      />

      <p className="hint">{hint ?? 'Tocca la mappa per spostare il punto esatto.'}</p>
    </div>
  )
}
