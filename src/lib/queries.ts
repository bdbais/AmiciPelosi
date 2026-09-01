import { and, desc, eq, gte, inArray, like, lte, or, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, posts, sightings, users } from '@/db/schema'
import { boundingBox, distanceKm } from './geo'

export type PostFilters = {
  kind?: string | null
  species?: string | null
  status?: string | null
  query?: string | null
  center?: { lat: number; lng: number } | null
  radiusKm?: number
  authorId?: string | null
  take?: number
}

export type PostListItem = {
  id: string
  kind: string
  status: string
  title: string
  species: string
  city: string
  description: string
  lat: number
  lng: number
  createdAt: Date
  distanceKm: number | null
  photos: { id: string }[]
}

/** Elenco annunci con filtri, ricerca testuale e ordinamento per vicinanza. */
export async function listPosts(filters: PostFilters): Promise<PostListItem[]> {
  const db = await getDb()
  const take = Math.min(filters.take ?? 60, 100)
  const conditions: SQL[] = []

  if (filters.kind) conditions.push(eq(posts.kind, filters.kind))
  if (filters.species) conditions.push(eq(posts.species, filters.species))
  if (filters.authorId) conditions.push(eq(posts.authorId, filters.authorId))
  if (filters.status && filters.status !== 'ALL') conditions.push(eq(posts.status, filters.status))

  if (filters.query) {
    const term = `%${filters.query}%`
    const match = or(
      like(posts.title, term),
      like(posts.description, term),
      like(posts.city, term),
      like(posts.breed, term),
      like(posts.petName, term),
    )
    if (match) conditions.push(match)
  }

  const center = filters.center
  const radiusKm = filters.radiusKm ?? 10
  if (center) {
    // Pre-filtro rettangolare in SQL: la distanza esatta si calcola dopo.
    const box = boundingBox(center.lat, center.lng, radiusKm)
    conditions.push(
      gte(posts.lat, box.minLat),
      lte(posts.lat, box.maxLat),
      gte(posts.lng, box.minLng),
      lte(posts.lng, box.maxLng),
    )
  }

  const rows = await db
    .select({
      id: posts.id,
      kind: posts.kind,
      status: posts.status,
      title: posts.title,
      species: posts.species,
      city: posts.city,
      description: posts.description,
      lat: posts.lat,
      lng: posts.lng,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(center ? 300 : take)

  const covers = await coverPhotos(rows.map((row) => row.id))

  const withDistance = rows.map((row) => ({
    ...row,
    photos: covers.get(row.id) ?? [],
    distanceKm: center ? distanceKm(center.lat, center.lng, row.lat, row.lng) : null,
  }))

  if (!center) return withDistance

  return withDistance
    .filter((row) => (row.distanceKm ?? Infinity) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, take)
}

/** Prima foto di ciascun annuncio, per le anteprime in elenco. */
async function coverPhotos(postIds: string[]): Promise<Map<string, { id: string }[]>> {
  const result = new Map<string, { id: string }[]>()
  if (postIds.length === 0) return result

  const db = await getDb()
  const rows = await db
    .select({ id: photos.id, postId: photos.postId, position: photos.position })
    .from(photos)
    .where(inArray(photos.postId, postIds))
    .orderBy(photos.position)

  for (const row of rows) {
    const list = result.get(row.postId) ?? []
    if (list.length === 0) list.push({ id: row.id })
    result.set(row.postId, list)
  }
  return result
}

/** Conteggio degli annunci aperti per tipo, usato nei filtri della bacheca. */
export async function countOpenByKind(): Promise<Record<string, number>> {
  const db = await getDb()
  const rows = await db
    .select({ kind: posts.kind, total: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.status, 'OPEN'))
    .groupBy(posts.kind)

  return Object.fromEntries(rows.map((row) => [row.kind, Number(row.total)]))
}

/** Annuncio completo con foto, autore e avvistamenti. */
export async function getPostDetail(id: string) {
  const db = await getDb()
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1)
  const post = rows[0]
  if (!post) return null

  const [photoRows, authorRows, sightingRows] = await Promise.all([
    db
      .select({ id: photos.id })
      .from(photos)
      .where(eq(photos.postId, id))
      .orderBy(photos.position),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, post.authorId)).limit(1),
    db
      .select({
        id: sightings.id,
        message: sightings.message,
        address: sightings.address,
        createdAt: sightings.createdAt,
        authorName: users.name,
      })
      .from(sightings)
      .innerJoin(users, eq(sightings.authorId, users.id))
      .where(eq(sightings.postId, id))
      .orderBy(desc(sightings.createdAt)),
  ])

  return {
    ...post,
    photos: photoRows,
    author: authorRows[0] ?? { id: post.authorId, name: post.contactName },
    sightings: sightingRows,
  }
}
