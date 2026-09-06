import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

/**
 * Geocodifica via Nominatim (OpenStreetMap), nei due versi:
 *
 * - `?lat=..&lng=..` da coordinate a indirizzo leggibile (inversa);
 * - `?q=Monselice` oppure `?q=via Roma 3, Monselice` da testo a coordinate
 *   (diretta). Serve a chi scrive il proprio comune invece di farsi
 *   localizzare: la posizione che da' un browser da computer arriva
 *   dall'indirizzo IP e sbaglia anche di cento chilometri. E' successo:
 *   Monselice risolta in Trentino.
 *
 * Se il servizio non risponde, il client resta comunque utilizzabile perche'
 * l'indirizzo si puo' scrivere a mano e il punto si sposta sulla mappa.
 */
type NominatimAddress = Record<string, string | undefined>
type NominatimReverse = { display_name?: string; address?: NominatimAddress }
type NominatimSearch = { lat: string; lon: string; display_name?: string; address?: NominatimAddress }

const HEADERS = { 'User-Agent': 'AmiciPelosi/1.0 (bacheca animali smarriti)' }

function pickCity(a: NominatimAddress) {
  return a.city || a.town || a.village || a.municipality || a.county || ''
}

export async function GET(request: Request) {
  // Nominatim e' un servizio gratuito con le sue regole: chi lo usa attraverso
  // di noi come geocodificatore per altro fa chiudere il rubinetto a tutti.
  const limited = await rateLimit(request, { key: 'geocode', limit: 30, windowSeconds: 60 })
  if (limited) return limited

  const url = new URL(request.url)
  const q = url.searchParams.get('q')
  if (q !== null) return search(q.trim())

  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Coordinate non valide' }, { status: 400 })
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/reverse')
  endpoint.searchParams.set('format', 'jsonv2')
  endpoint.searchParams.set('lat', String(lat))
  endpoint.searchParams.set('lon', String(lng))
  endpoint.searchParams.set('zoom', '16')
  endpoint.searchParams.set('accept-language', 'it')

  try {
    const response = await fetch(endpoint, { headers: HEADERS, signal: AbortSignal.timeout(6000) })
    if (!response.ok) throw new Error(`Nominatim ${response.status}`)

    const json = (await response.json()) as NominatimReverse
    const a = json.address ?? {}
    const road = [a.road, a.suburb || a.neighbourhood].filter(Boolean).join(', ')

    return NextResponse.json({
      address: road || json.display_name?.split(',').slice(0, 2).join(',') || '',
      city: pickCity(a),
      province: a.county || a.state || '',
    })
  } catch {
    return NextResponse.json({ address: '', city: '', province: '' })
  }
}

/** Da un comune o un indirizzo scritto a mano al punto sulla mappa. */
async function search(q: string) {
  if (q.length < 2 || q.length > 200) {
    return NextResponse.json({ error: 'Scrivi il nome di un comune o un indirizzo.' }, { status: 400 })
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search')
  endpoint.searchParams.set('format', 'jsonv2')
  endpoint.searchParams.set('q', q)
  endpoint.searchParams.set('limit', '1')
  endpoint.searchParams.set('addressdetails', '1')
  // L'app e' italiana: "Monselice" non deve finire in un omonimo altrove.
  endpoint.searchParams.set('countrycodes', 'it')
  endpoint.searchParams.set('accept-language', 'it')

  try {
    const response = await fetch(endpoint, { headers: HEADERS, signal: AbortSignal.timeout(6000) })
    if (!response.ok) throw new Error(`Nominatim ${response.status}`)

    const results = (await response.json()) as NominatimSearch[]
    const first = results[0]
    const lat = Number(first?.lat)
    const lng = Number(first?.lon)
    if (!first || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { error: 'Non trovo questo posto: prova con il nome del comune, o tocca la mappa.' },
        { status: 404 },
      )
    }

    const a = first.address ?? {}
    const road = [a.road, a.house_number].filter(Boolean).join(' ')
    return NextResponse.json({
      lat,
      lng,
      label: first.display_name?.split(',').slice(0, 3).join(',') ?? q,
      address: road,
      city: pickCity(a),
      province: a.county || a.state || '',
    })
  } catch {
    return NextResponse.json(
      { error: 'Il servizio che cerca gli indirizzi non risponde: tocca la mappa nel punto giusto.' },
      { status: 502 },
    )
  }
}
