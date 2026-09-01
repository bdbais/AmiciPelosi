import { NextResponse } from 'next/server'

/**
 * Geocodifica inversa via Nominatim (OpenStreetMap): da coordinate GPS a
 * indirizzo leggibile. Se il servizio non risponde, il client resta comunque
 * utilizzabile perche l'indirizzo si puo scrivere a mano.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Coordinate non valide' }, { status: 400 })
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/reverse')
  endpoint.searchParams.set('format', 'jsonv2')
  endpoint.searchParams.set('lat', String(lat))
  endpoint.searchParams.set('lon', String(lng))
  endpoint.searchParams.set('zoom', '16')
  endpoint.searchParams.set('accept-language', 'it')

  try {
    const response = await fetch(endpoint, {
      headers: { 'User-Agent': 'AmiciPelosi/1.0 (bacheca animali smarriti)' },
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) throw new Error(`Nominatim ${response.status}`)

    const json = await response.json()
    const a = json.address ?? {}
    const city = a.city || a.town || a.village || a.municipality || a.county || ''
    const road = [a.road, a.suburb || a.neighbourhood].filter(Boolean).join(', ')

    return NextResponse.json({
      address: road || json.display_name?.split(',').slice(0, 2).join(',') || '',
      city,
      province: a.county || a.state || '',
    })
  } catch {
    return NextResponse.json({ address: '', city: '', province: '' })
  }
}
