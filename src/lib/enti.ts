import { and, inArray, isNotNull, isNull, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { distanceKm } from '@/lib/geo'

/**
 * Gli enti iscritti qui: canili, gattili, associazioni e veterinari che hanno
 * un account sul sito, sono stati verificati da chi modera e hanno messo il
 * punto sulla mappa.
 *
 * Perche' esistono, visto che c'e' gia' OpenStreetMap: un canile che si
 * iscrive qui e mette il suo indirizzo si aspetta di essere trovato da chi
 * cerca «vicino a me». Prima non succedeva — la ricerca guardava solo la
 * mappa esterna — e chi si era iscritto risultava invisibile proprio nella
 * pagina fatta per trovarlo.
 *
 * Vengono prima degli altri: di questi sappiamo chi sono, perche' una persona
 * ha guardato la prova prima di approvarli, e rispondono qui dentro.
 *
 * Non e' un buco nella regola «nessun recapito e' pubblico»: quella protegge
 * chi pubblica un annuncio. Qui il numero e' quello di una struttura aperta
 * al pubblico, scritto da chi la gestisce per essere chiamato.
 */

export type OrgPlace = {
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
  /** Iscritto qui: la pagina lo mostra con il bollino e il link alla scheda. */
  member: true
  accountType: string
  hasLogo: boolean
}

/** I tipi che hanno una sede da mostrare su una mappa. Una balia o una colonia no. */
const PLACE_TYPES = ['SHELTER_DOG', 'SHELTER_CAT', 'ASSOCIATION', 'VET']

/** Un indirizzo web vero: nel campo «sito» capita di trovarci una email. */
function normalizeSite(raw: string | null): string | null {
  const value = raw?.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(value)) return `https://${value}`
  return null
}

/**
 * Il nome ridotto all'osso per confrontarlo con quello di OpenStreetMap:
 * «Rifugio "Le Zampe" Onlus» e «rifugio le zampe» devono somigliarsi.
 */
export function slugName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(associazione|onlus|aps|odv|ets|canile|gattile|rifugio|ambulatorio|clinica|veterinaria|veterinario|dott(?:oressa|ore|\.)?|s\.?r\.?l\.?|di|del|della|il|la|le|lo|i|gli)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sameHost(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  try {
    return new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, '')
  } catch {
    return false
  }
}

/**
 * Lo stesso posto visto da due parti. Due criteri, non uno: il nome puo'
 * essere scritto diversamente ma il punto e' lo stesso, oppure il punto e'
 * spostato di qualche centinaio di metri (su OSM il canile e' spesso
 * l'edificio, qui il cancello) ma il nome o il sito coincidono.
 */
export function isSamePlace(
  org: { name: string; lat: number; lng: number; website: string | null },
  other: { name: string; lat: number; lng: number; website: string | null },
): boolean {
  const km = distanceKm(org.lat, org.lng, other.lat, other.lng)
  if (km > 3) return false
  if (sameHost(org.website, other.website)) return true
  const a = slugName(org.name)
  const b = slugName(other.name)
  const nameMatches = a.length > 2 && b.length > 2 && (a === b || a.includes(b) || b.includes(a))
  if (nameMatches) return true
  // Stesso punto, a meno di centocinquanta metri: e' quello, comunque si chiami.
  return km < 0.15
}

/**
 * Gli enti verificati entro un raggio. La tabella delle persone e' piccola e
 * SQLite non ha funzioni geografiche: si filtra per riquadro nella query e si
 * calcola la distanza vera qui, come fa gia' la ricerca degli annunci.
 */
export async function nearbyOrgs(lat: number, lng: number, radiusKm: number): Promise<OrgPlace[]> {
  const db = await getDb()
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      orgName: users.orgName,
      accountType: users.accountType,
      lat: users.orgLat,
      lng: users.orgLng,
      address: users.orgAddress,
      city: users.orgCity,
      phone: users.orgPhone,
      site: users.orgSite,
      hours: users.orgHours,
      logoAt: users.orgLogoAt,
    })
    .from(users)
    .where(
      and(
        eq(users.accountStatus, 'VERIFIED'),
        inArray(users.accountType, PLACE_TYPES),
        isNull(users.bannedAt),
        isNotNull(users.orgLat),
        isNotNull(users.orgLng),
      ),
    )

  const out: OrgPlace[] = []
  for (const row of rows) {
    if (row.lat == null || row.lng == null) continue
    const km = distanceKm(lat, lng, row.lat, row.lng)
    if (km > radiusKm) continue
    const address = [row.address, row.city].filter(Boolean).join(', ') || null
    out.push({
      id: `ente/${row.id}`,
      name: (row.orgName ?? row.name).trim(),
      lat: row.lat,
      lng: row.lng,
      distanceKm: km,
      address,
      phone: row.phone?.trim() || null,
      website: normalizeSite(row.site),
      openingHours: row.hours?.trim() || null,
      emergency: false,
      member: true,
      accountType: row.accountType,
      hasLogo: row.logoAt != null,
    })
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm)
}
