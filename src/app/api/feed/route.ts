import { NextResponse } from 'next/server'
import { and, desc, eq, gte, inArray, lte, notInArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, posts } from '@/db/schema'
import { approximateDistanceOrder, boundingBox, distanceKm } from '@/lib/geo'
import { toStructured } from '@/lib/structured'
import { QUIET_KINDS } from '@/lib/constants'
import { notByBannedAuthor, notRemoved } from '@/lib/queries'

/**
 * Elenco degli annunci in forma strutturata, pensato per essere letto da un
 * programma piuttosto che da una persona.
 *
 * Parametri: situation (lost|found|adoption), species, city, status,
 * lat + lng + radius per la ricerca in una zona, limit.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = url.searchParams
  const db = await getDb()

  const situation = params.get('situation')?.toUpperCase()
  const species = params.get('species')?.toUpperCase()
  const status = (params.get('status') ?? 'open').toLowerCase()
  const requestedLimit = Number(params.get('limit'))
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 100, 500)

  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const requestedRadius = Number(params.get('radius'))
  const radius = Number.isFinite(requestedRadius) && requestedRadius > 0 ? requestedRadius : 25
  const hasCenter =
    params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng)

  // Quello che la moderazione ha tolto non esce nemmeno da qui: un
  // aggregatore che lo ripubblica lo terrebbe in giro per settimane.
  const conditions = [notRemoved(), notByBannedAuthor(db)]
  if (situation) conditions.push(eq(posts.kind, situation))
  // Le segnalazioni senza vita si vedono solo se le si chiede, come in bacheca:
  // un aggregatore che chiede "tutto" non deve mostrarle a chi non se le aspetta.
  else conditions.push(notInArray(posts.kind, QUIET_KINDS))
  if (species) conditions.push(eq(posts.species, species))
  if (status !== 'all') {
    conditions.push(eq(posts.status, status === 'resolved' ? 'RESOLVED' : 'OPEN'))
  }
  if (hasCenter) {
    const box = boundingBox(lat, lng, radius)
    conditions.push(
      gte(posts.lat, box.minLat),
      lte(posts.lat, box.maxLat),
      gte(posts.lng, box.minLng),
      lte(posts.lng, box.maxLng),
    )
  }

  const rows = await db
    .select()
    .from(posts)
    .where(conditions.length ? and(...conditions) : undefined)
    // Con un centro si ordina per distanza gia' in SQL, cosi' il LIMIT taglia
    // i piu' lontani e non i piu' vecchi; la distanza esatta rifinisce dopo.
    .orderBy(hasCenter ? approximateDistanceOrder(posts.lat, posts.lng, lat, lng) : desc(posts.createdAt))
    .limit(hasCenter ? 500 : limit)

  const selected = hasCenter
    ? rows
        .map((row) => ({ row, km: distanceKm(lat, lng, row.lat, row.lng) }))
        .filter(({ km }) => km <= radius)
        .sort((a, b) => a.km - b.km)
        .slice(0, limit)
        .map(({ row }) => row)
    : rows

  // Le foto di tutti gli annunci in una query sola.
  const photoRows = selected.length
    ? await db
        .select({ id: photos.id, postId: photos.postId })
        .from(photos)
        .where(inArray(photos.postId, selected.map((row) => row.id)))
        .orderBy(photos.position)
    : []

  const byPost = new Map<string, string[]>()
  for (const photo of photoRows) {
    byPost.set(photo.postId, [...(byPost.get(photo.postId) ?? []), photo.id])
  }

  return NextResponse.json(
    {
      source: 'Amici Pelosi',
      purpose:
        'Annunci di animali smarriti, ritrovati o in cerca di adozione, con la zona in cui cercarli.',
      documentation: `${url.origin}/llms.txt`,
      generatedAt: new Date().toISOString(),
      count: selected.length,
      query: {
        situation: situation?.toLowerCase() ?? null,
        species: species?.toLowerCase() ?? null,
        status,
        center: hasCenter ? { latitude: lat, longitude: lng, radiusKm: radius } : null,
      },
      reports: selected.map((row) =>
        toStructured(row, byPost.get(row.id) ?? [], url.origin),
      ),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
