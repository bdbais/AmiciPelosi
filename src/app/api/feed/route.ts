import { NextResponse } from 'next/server'
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, posts } from '@/db/schema'
import { boundingBox, distanceKm } from '@/lib/geo'
import { toStructured } from '@/lib/structured'

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
  const limit = Math.min(Number(params.get('limit') ?? 100), 500)

  const lat = params.get('lat')
  const lng = params.get('lng')
  const radius = Number(params.get('radius') ?? 25)
  const hasCenter = lat !== null && lng !== null && !Number.isNaN(Number(lat))

  const conditions = []
  if (situation) conditions.push(eq(posts.kind, situation))
  if (species) conditions.push(eq(posts.species, species))
  if (status !== 'all') {
    conditions.push(eq(posts.status, status === 'resolved' ? 'RESOLVED' : 'OPEN'))
  }
  if (hasCenter) {
    const box = boundingBox(Number(lat), Number(lng), radius)
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
    .orderBy(desc(posts.createdAt))
    .limit(hasCenter ? 500 : limit)

  const selected = hasCenter
    ? rows
        .filter((row) => distanceKm(Number(lat), Number(lng), row.lat, row.lng) <= radius)
        .slice(0, limit)
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
        center: hasCenter ? { latitude: Number(lat), longitude: Number(lng), radiusKm: radius } : null,
      },
      reports: selected.map((row) =>
        toStructured(row, byPost.get(row.id) ?? [], url.origin),
      ),
    },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  )
}
