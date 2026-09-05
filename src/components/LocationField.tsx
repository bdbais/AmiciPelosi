'use client'

import { useState } from 'react'
import { DynamicMap } from './DynamicMap'
import { PlacePicker, type Home } from './PlacePicker'
import { reverseGeocode, type Coords, type Place, type ResolvedAddress } from '@/lib/useGeolocation'

type Props = {
  value: Coords | null
  onChange: (coords: Coords) => void
  onAddressResolved?: (address: ResolvedAddress) => void
  radiusKm?: number
  emoji?: string
  hint?: string
  /** La zona salvata nel profilo, per il tasto «La mia zona». */
  home?: Home | null
}

// Centro Italia: usato solo come inquadratura iniziale della mappa.
const FALLBACK: Coords = { lat: 41.9028, lng: 12.4964 }

/**
 * Un punto sulla mappa, scelto scrivendo un posto, toccando la mappa, o (solo
 * da telefono) con la posizione del dispositivo. Il perche' di quel "solo"
 * sta in PlacePicker.
 */
export function LocationField({
  value,
  onChange,
  onAddressResolved,
  radiusKm,
  emoji = '📍',
  hint,
  home,
}: Props) {
  const [resolving, setResolving] = useState(false)

  async function applyCoords(coords: Coords, place?: Place) {
    onChange(coords)
    if (!onAddressResolved) return
    // Chi ha scritto il posto ha gia' l'indirizzo in mano: niente seconda
    // chiamata a Nominatim per riscoprire quello che sappiamo.
    if (place) {
      onAddressResolved({ address: place.address, city: place.city, province: place.province })
      return
    }
    setResolving(true)
    const address = await reverseGeocode(coords.lat, coords.lng)
    if (address) onAddressResolved(address)
    setResolving(false)
  }

  const center = value ?? FALLBACK

  return (
    <div className="stack">
      <PlacePicker onPick={(coords, place) => void applyCoords(coords, place)} home={home} />

      {(resolving || value) && (
        <div className="inline">
          {resolving && <span className="small muted">Cerco l’indirizzo…</span>}
          {value && (
            <span className="small muted">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
          )}
        </div>
      )}

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
