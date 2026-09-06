import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'
import { distanceKm } from '@/lib/geo'
import { isSamePlace, nearbyOrgs, type OrgPlace } from '@/lib/enti'

/**
 * Veterinari, canili e pensioni attorno a un punto: prima quelli iscritti
 * qui, poi quelli che conosce OpenStreetMap attraverso Overpass.
 *
 * L'ordine non e' un dettaglio. Un canile che si iscrive, si fa verificare e
 * mette il punto sulla mappa si aspetta di essere trovato da chi cerca
 * «vicino a me»; per un po' non e' successo, perche' qui si guardava solo la
 * mappa esterna. Chi sta nel database viene prima e porta il bollino: di lui
 * sappiamo chi e', e risponde qui dentro. Se lo stesso posto sta anche su
 * OpenStreetMap, quello di fuori sparisce: due schede uguali fanno solo
 * dubitare.
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
  /** Solo per gli iscritti qui: il bollino, la scheda, l'eventuale logo. */
  member?: true
  accountType?: string
  hasLogo?: boolean
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string | undefined>
}

/*
  Overpass ha piu' server, tutti gratuiti e tutti a volte occupati. Chiamato
  da Cloudflare, quello principale rispondeva 521 — la connessione rifiutata,
  probabilmente perche' usciamo dagli stessi indirizzi di mezzo mondo — mentre
  dal computer di casa funzionava: per questo il guasto si vedeva solo online.
  Si chiedono tutti insieme e vince il primo che risponde. Sono richieste
  identiche e brevi: la copia in piu' pesa meno di una pagina senza risultati.
*/
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/**
 * La risposta di Overpass tenuta da parte su KV per una settimana.
 *
 * Serve a due cose: non chiedere la stessa zona cento volte, e avere qualcosa
 * da mostrare quando Overpass non risponde — capita spesso, e una pagina
 * vuota davanti a chi ha appena perso un animale e' peggio di un elenco di
 * qualche giorno fa. La chiave arrotonda le coordinate a tre decimali, un
 * centinaio di metri: piu' preciso non cambierebbe i risultati.
 */
function cacheKey(lat: number, lng: number, radiusKm: number) {
  // La «2» nella chiave e' una copia buttata: un server mal messo aveva
  // risposto «nessun luogo» per tutta Italia, e quelle risposte erano finite
  // in cache. Chi cambia i server cambi anche questo numero.
  return `luoghi2:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}`
}

type Cached = { elements: OverpassElement[]; at: number }

async function kv(): Promise<KVNamespace | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    return (env as unknown as { PHOTOS_KV?: KVNamespace }).PHOTOS_KV ?? null
  } catch {
    return null
  }
}
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

  // Gli iscritti prima di tutto: se Overpass e' giu' o lento, questi ci sono
  // comunque, ed e' il motivo per cui la richiesta non parte in parallelo con
  // un solo `await` che le lega insieme.
  let orgs: OrgPlace[] = []
  try {
    orgs = await nearbyOrgs(lat, lng, radiusKm)
  } catch (error) {
    console.warn('Enti iscritti non leggibili:', error)
  }
  const isVet = (place: OrgPlace) => place.accountType === 'VET'

  // `nwr` prende nodi, vie e relazioni insieme: un ambulatorio puo' essere un
  // punto o l'intero edificio, a seconda di chi l'ha disegnato.
  const around = `(around:${radiusM},${lat},${lng})`
  const query =
    `[out:json][timeout:8];(` +
    `nwr["amenity"="veterinary"]${around};` +
    `nwr["amenity"="animal_shelter"]${around};` +
    `nwr["amenity"="animal_boarding"]${around};` +
    `);out center tags 60;`

  const store = await kv()
  const key = cacheKey(lat, lng, radiusKm)
  const cached = store ? await store.get<Cached>(key, 'json').catch(() => null) : null

  let elements: OverpassElement[] | null = cached?.elements ?? null
  if (!cached) {
    const attempts = ENDPOINTS.map(async (endpoint) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: HEADERS,
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(9_000),
      })
      if (!response.ok) throw new Error(`${endpoint}: stato ${response.status}`)
      const json = (await response.json()) as { elements?: OverpassElement[]; osm3s?: unknown }
      return { endpoint, elements: json.elements ?? [] }
    })
    try {
      const winner = await Promise.any(attempts)
      console.log(`Luoghi da ${winner.endpoint}: ${winner.elements.length}`)
      elements = winner.elements
      if (store) {
        await store
          .put(key, JSON.stringify({ elements, at: Date.now() } satisfies Cached), {
            expirationTtl: 7 * 24 * 60 * 60,
          })
          .catch(() => {})
      }
    } catch (error) {
      console.warn('Nessun server Overpass ha risposto:', error)
    }
  }
  if (!elements) {
    // Con gli iscritti in mano non e' un errore: si mostra quello che c'e' e
    // si dice che manca il resto. Un 502 secco nasconderebbe proprio i posti
    // di cui siamo piu' sicuri. Senza iscritti non c'e' niente da mostrare, e
    // allora tanto vale dirlo.
    if (orgs.length === 0) {
      return NextResponse.json(
        { error: 'OpenStreetMap non risponde in questo momento: riprova fra un minuto.' },
        { status: 502 },
      )
    }
    return NextResponse.json({
      veterinari: orgs.filter(isVet),
      rifugi: orgs.filter((p) => !isVet(p)),
      warning:
        'OpenStreetMap non risponde in questo momento: qui sotto ci sono solo gli enti iscritti qui.',
    })
  }

  const veterinari: Place[] = []
  const rifugi: Place[] = []
  for (const element of elements) {
    const place = toPlace(element, lat, lng)
    if (!place) continue
    // Lo stesso posto raccontato due volte: tiene quello iscritto, che
    // sappiamo chi e'.
    if (orgs.some((org) => isSamePlace(org, place))) continue
    if (element.tags?.amenity === 'veterinary') veterinari.push(place)
    else rifugi.push(place)
  }
  const byDistance = (a: Place, b: Place) => a.distanceKm - b.distanceKm

  // Gli iscritti restano in cima anche quando sono piu' lontani: il taglio a
  // dodici vale sui luoghi presi da fuori.
  return NextResponse.json({
    veterinari: [...orgs.filter(isVet), ...veterinari.sort(byDistance).slice(0, MAX_PER_GROUP)],
    rifugi: [...orgs.filter((p) => !isVet(p)), ...rifugi.sort(byDistance).slice(0, MAX_PER_GROUP)],
  })
}
