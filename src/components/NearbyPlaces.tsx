'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Coords, Place as PickedPlace } from '@/lib/useGeolocation'
import type { Place } from '@/app/api/luoghi/route'
import { PlacePicker, type Home } from './PlacePicker'

type Props = {
  home?: Home | null
}

type Result = { veterinari: Place[]; rifugi: Place[] }
type Picked = Coords & { label: string | null }

const RADII = [5, 15, 30] as const
type Radius = (typeof RADII)[number]

/** «2,4 km», «900 m»: una cifra decimale e la virgola, come si legge qui. */
function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km / 50) * 50 || 50} m`
  return `${km.toFixed(1).replace('.', ',')} km`
}

/**
 * Gli orari su OpenStreetMap sono scritti in un formato tecnico
 * («Mo-Fr 09:00-20:00; PH off»). Non lo interpretiamo: traduciamo solo le
 * sigle dei giorni, che e' quello che serve per capire se vale la pena
 * partire. Chi vuole la certezza chiama, e glielo diciamo in fondo.
 */
const DAYS: Record<string, string> = {
  Mo: 'lun', Tu: 'mar', We: 'mer', Th: 'gio', Fr: 'ven', Sa: 'sab', Su: 'dom', PH: 'festivi',
}
function formatHours(raw: string): string {
  if (raw.trim() === '24/7') return 'sempre aperto'
  const text = raw
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (d) => DAYS[d] ?? d)
    .replace(/\boff\b/g, 'chiuso')
    .replace(/;\s*$/, '')
    .replace(/;\s*/g, ' · ')
  return `orari ${text}`
}

function PlaceRow({ place, emoji }: { place: Place; emoji: string }) {
  const detail = [formatKm(place.distanceKm), place.address, place.openingHours && formatHours(place.openingHours)]
    .filter(Boolean)
    .join(' · ')
  const osm = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`
  return (
    <div className="place">
      <div className="pg" aria-hidden="true">
        {place.emergency ? '🚑' : emoji}
      </div>
      <div className="pb">
        <div className="pn">
          {place.name}
          {place.emergency && <span className="badge-emergency">pronto soccorso</span>}
        </div>
        <div className="pd">{detail}</div>
        <div className="pl">
          {place.phone && <a href={`tel:${place.phone.replace(/\s+/g, '')}`}>Chiama</a>}
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener">
              Sito ↗
            </a>
          )}
          <a href={osm} target="_blank" rel="noopener">
            Indicazioni ↗
          </a>
        </div>
      </div>
    </div>
  )
}

function EmptyGroup({ what, query, picked, radius }: { what: string; query: string; picked: Picked; radius: number }) {
  const maps = `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${picked.lat},${picked.lng},13z`
  return (
    <p className="muted small" style={{ margin: '8px 0 0' }}>
      Nessun {what} su OpenStreetMap entro {radius} km: prova ad allargare, o{' '}
      <a href={maps} target="_blank" rel="noopener">
        cerca su Google Maps ↗
      </a>
      .
    </p>
  )
}

/**
 * Veterinari e rifugi veri attorno a un posto scelto da chi legge, presi da
 * OpenStreetMap. Il posto lo sceglie il PlacePicker; qui si decide il raggio
 * e si mostra quello che c'e'.
 *
 * Se nel profilo c'e' una zona salvata si parte da li' senza chiedere
 * niente: chi ha perso un animale vuole il numero del veterinario, non un
 * modulo.
 */
export function NearbyPlaces({ home }: Props) {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [radius, setRadius] = useState<Radius>(15)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cambiare posto o raggio mentre una richiesta e' in volo farebbe arrivare
  // due risposte in ordine sparso: la vecchia si annulla.
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(async (coords: Coords, km: number) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng), radius: String(km) })
      const response = await fetch(`/api/luoghi?${params}`, { signal: current.signal })
      const json = (await response.json().catch(() => ({}))) as Partial<Result> & { error?: string }
      if (!response.ok) {
        setError(json.error ?? 'Qualcosa non ha funzionato: riprova fra un momento.')
        setResult(null)
        return
      }
      setResult({ veterinari: json.veterinari ?? [], rifugi: json.rifugi ?? [] })
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return
      setError('Non riesco a raggiungere il server: controlla la connessione e riprova.')
      setResult(null)
    } finally {
      if (controller.current === current) setLoading(false)
    }
  }, [])

  function onPick(coords: Coords, place?: PickedPlace) {
    const next = { lat: coords.lat, lng: coords.lng, label: place?.label ?? null }
    setPicked(next)
    void load(next, radius)
  }

  function onRadius(km: Radius) {
    setRadius(km)
    if (picked) void load(picked, km)
  }

  const homeLat = home?.lat
  const homeLng = home?.lng
  const homeLabel = home?.label ?? null
  useEffect(() => {
    if (homeLat == null || homeLng == null) return
    const start = { lat: homeLat, lng: homeLng, label: homeLabel }
    setPicked(start)
    void load(start, 15)
    return () => controller.current?.abort()
  }, [homeLat, homeLng, homeLabel, load])

  return (
    <div className="card stack" style={{ gap: 12 }}>
      <h2 style={{ margin: 0 }}>Vicino a te</h2>
      <PlacePicker onPick={onPick} home={home} compact />

      {picked && (
        <div className="inline" style={{ alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="small muted">
            {picked.label ? `Attorno a ${picked.label}, entro` : 'Entro'}
          </span>
          <div className="chips" role="group" aria-label="Raggio di ricerca">
            {RADII.map((km) => (
              <button
                key={km}
                type="button"
                className={`chip${km === radius ? ' active' : ''}`}
                aria-pressed={km === radius}
                onClick={() => onRadius(km)}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      )}

      {!picked && !loading && (
        <p className="muted" style={{ margin: 0 }}>
          Scrivi il tuo comune qui sopra e ti mostriamo i veterinari, i canili e i gattili che
          OpenStreetMap conosce lì attorno.
        </p>
      )}

      {loading && (
        <p className="muted" style={{ margin: 0 }} aria-live="polite">
          Cerco su OpenStreetMap…
        </p>
      )}

      {error && !loading && (
        <p className="alert error" style={{ margin: 0 }}>
          {error}
        </p>
      )}

      {result && picked && !loading && !error && (
        <>
          <section>
            <h3 style={{ margin: '4px 0 0' }}>Veterinari</h3>
            {result.veterinari.length > 0 ? (
              result.veterinari.map((p) => <PlaceRow key={p.id} place={p} emoji="🩺" />)
            ) : (
              <EmptyGroup what="veterinario" query="veterinario" picked={picked} radius={radius} />
            )}
          </section>
          <section>
            <h3 style={{ margin: '4px 0 0' }}>Canili, gattili e pensioni</h3>
            {result.rifugi.length > 0 ? (
              result.rifugi.map((p) => <PlaceRow key={p.id} place={p} emoji="🏠" />)
            ) : (
              <EmptyGroup what="canile o gattile" query="canile" picked={picked} radius={radius} />
            )}
          </section>
          <p className="muted small" style={{ margin: 0 }}>
            Dati da OpenStreetMap: possono essere incompleti o vecchi. Prima di partire, chiama.
          </p>
        </>
      )}
    </div>
  )
}
