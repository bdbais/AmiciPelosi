import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'
import { distanceKm } from '@/lib/geo'

/**
 * Veterinari, canili e pensioni attorno a un punto, presi da OpenStreetMap
 * attraverso Overpass.
 *
 * Prima di questa rotta la pagina degli enti mostrava luoghi inventati e
 * ambientati a Roma: chi vive a Monselice li ha letti come «completamente
 * fuori zona», e aveva ragione. Meglio pochi luoghi veri, con l'avvertenza
 * che i dati possono essere vecchi, che esempi ben scritti nel posto
 * sbagliato.
 *
 * Qui il telefono viaggia in chiaro e la pagina lo mostra come link `tel:`.
 * Non contraddice la regola «nessun recapito è pubblico»: quella protegge le
 * persone che pubblicano un annuncio. Questi sono i numeri di attività
 * aperte al pubblico, messi su OpenStreetMap da chi le gestisce o da chi ci
 * e' passato, e servono proprio per essere chiamati.
 */

export type Place = {
  id: string
  name: string
  lat: number
  lng: number
  distanceKm: number
  address: string | null
  phone: string | null
  website: string | null
  openingHours: string | null
  emergency: boolean
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string | undefined>
}

const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const HEADERS = {
  'User-Agent': 'AmiciPelosi/1.0 (bacheca animali smarriti)',
  'Content-Type': 'application/x-www-form-urlencoded',
}
const MAX_PER_GROUP = 12

function clampRadius(raw: string | null): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 15
  return Math.min(50, Math.max(2, value))
}

/** Solo indirizzi web veri: su OSM capita un `website` con dentro un'email. */
function pickWebsite(tags: Record<string, string | undefined>): string | null {
  const raw = (tags.website ?? tags['contact:website'])?.trim()
  if (!raw) return null
  return /^https?:\/\//i.test(raw) ? raw : null
}

function pickAddress(tags: Record<string, string | undefined>): string | null {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')
  const parts = [street, tags['addr:city']].filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function isEmergency(tags: Record<string, string | undefined>): boolean {
  return tags.emergency === 'yes' || tags['veterinary:emergency'] === 'yes'
}

function toPlace(element: OverpassElement, lat: number, lng: number): Place | null {
  const tags = element.tags ?? {}
  const name = tags.name?.trim()
  // Un punto senza nome sulla mappa e' inutile a chi deve chiamare o andarci.
  if (!name) return null
  // Vie e relazioni non hanno una coordinata sola: Overpass ci da' il centro.
  const pLat = element.lat ?? element.center?.lat
  const pLng = element.lon ?? element.center?.lon
  if (pLat == null || pLng == null) return null
  return {
    id: `${element.type}/${element.id}`,
    name,
    lat: pLat,
    lng: pLng,
    distanceKm: distanceKm(lat, lng, pLat, pLng),
    address: pickAddress(tags),
    phone: (tags.phone ?? tags['contact:phone'])?.trim() || null,
    website: pickWebsite(tags),
    openingHours: tags.opening_hours?.trim() || null,
    emergency: isEmergency(tags),
  }
}

export async function GET(request: Request) {
  // Overpass e' gratuito e condiviso: chi lo usa attraverso di noi per altro
  // fa chiudere il rubinetto a tutti.
  const limited = await rateLimit(request, { key: 'luoghi', limit: 20, windowSeconds: 60 })
  if (limited) return limited

  const url = new URL(request.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Coordinate non valide' }, { status: 400 })
  }
  const radiusKm = clampRadius(url.searchParams.get('radius'))
  const radiusM = Math.round(radiusKm * 1000)

  // `nwr` prende nodi, vie e relazioni insieme: un ambulatorio puo' essere un
  // punto o l'intero edificio, a seconda di chi l'ha disegnato.
  const around = `(around:${radiusM},${lat},${lng})`
  const query =
    `[out:json][timeout:8];(` +
    `nwr["amenity"="veterinary"]${around};` +
    `nwr["amenity"="animal_shelter"]${around};` +
    `nwr["amenity"="animal_boarding"]${around};` +
    `);out center tags 60;`

  let elements: OverpassElement[]
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: HEADERS,
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Overpass ${response.status}`)
    const json = (await response.json()) as { elements?: OverpassElement[] }
    elements = json.elements ?? []
  } catch (error) {
    console.warn('Overpass non risponde:', error)
    return NextResponse.json(
      { error: 'OpenStreetMap non risponde in questo momento: riprova fra un minuto.' },
      { status: 502 },
    )
  }

  const veterinari: Place[] = []
  const rifugi: Place[] = []
  for (const element of elements) {
    const place = toPlace(element, lat, lng)
    if (!place) continue
    if (element.tags?.amenity === 'veterinary') veterinari.push(place)
    else rifugi.push(place)
  }
  const byDistance = (a: Place, b: Place) => a.distanceKm - b.distanceKm

  return NextResponse.json({
    veterinari: veterinari.sort(byDistance).slice(0, MAX_PER_GROUP),
    rifugi: rifugi.sort(byDistance).slice(0, MAX_PER_GROUP),
  })
}
