import { and, desc, eq, gte, inArray, isNotNull, like, lte, ne, notInArray, or, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, posts, sightingPhotos, sightings, users } from '@/db/schema'
import { approximateDistanceOrder, boundingBox, distanceKm } from './geo'
import { QUIET_KINDS } from './constants'
import type { Role } from './moderation-types'

type Db = Awaited<ReturnType<typeof getDb>>

/**
 * Gli annunci di chi e' stato bloccato non si vedono da fuori.
 *
 * E' una sottoquery e non un join, cosi' si aggiunge a qualunque WHERE senza
 * cambiare la forma delle righe che tornano: /api/feed fa `select()` intero
 * e un join gli cambierebbe il risultato.
 */
export function notByBannedAuthor(db: Db): SQL {
  return notInArray(
    posts.authorId,
    db.select({ id: users.id }).from(users).where(isNotNull(users.bannedAt)),
  )
}

/** Un annuncio rimosso dalla moderazione non e' in nessuna pagina pubblica. */
export function notRemoved(): SQL {
  return ne(posts.status, 'REMOVED')
}

/** Chi sta guardando, quando la risposta cambia con la persona. */
export type Viewer = { id: string; role: Role } | null | undefined

export function canModerate(viewer: Viewer): boolean {
  return viewer?.role === 'MODERATOR' || viewer?.role === 'ADMIN'
}

export type PostFilters = {
  kind?: string | null
  species?: string | null
  status?: string | null
  query?: string | null
  center?: { lat: number; lng: number } | null
  radiusKm?: number
  authorId?: string | null
  take?: number
  skip?: number
  /**
   * Gli annunci rimossi e quelli di chi e' bloccato restano fuori sempre,
   * anche con status 'ALL'. Solo il profilo di chi li ha scritti, o chi
   * modera, li chiede apposta.
   */
  includeRemoved?: boolean
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
  const take = Math.min(Math.max(1, Math.floor(filters.take ?? 60)), 100)
  const skip = Math.max(0, Math.floor(filters.skip ?? 0))
  const conditions: SQL[] = []

  if (filters.kind) conditions.push(eq(posts.kind, filters.kind))
  // Le segnalazioni senza vita si vedono solo se le si chiede. Chi sta cercando
  // il proprio gatto non deve trovarsele addosso mentre scorre la bacheca.
  else conditions.push(notInArray(posts.kind, QUIET_KINDS))
  if (filters.species) conditions.push(eq(posts.species, filters.species))
  if (filters.authorId) conditions.push(eq(posts.authorId, filters.authorId))
  if (filters.status && filters.status !== 'ALL') conditions.push(eq(posts.status, filters.status))
  if (!filters.includeRemoved) conditions.push(notRemoved(), notByBannedAuthor(db))

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
    // Con un centro si ordina per distanza gia' in SQL: cosi' il LIMIT taglia
    // i piu' lontani e non i piu' vecchi, e i 300 che restano sono quelli giusti.
    .orderBy(center ? approximateDistanceOrder(posts.lat, posts.lng, center.lat, center.lng) : desc(posts.createdAt))
    .limit(center ? 300 : take)
    .offset(center ? 0 : skip)

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
    .slice(skip, skip + take)
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
    .where(and(eq(posts.status, 'OPEN'), notByBannedAuthor(db)))
    .groupBy(posts.kind)

  return Object.fromEntries(rows.map((row) => [row.kind, Number(row.total)]))
}

/**
 * Annuncio completo con foto, autore e avvistamenti.
 *
 * Un annuncio rimosso, o di una persona bloccata, per il pubblico non esiste.
 * Chi l'ha scritto e chi modera lo ricevono lo stesso, con lo stato e il
 * motivo: a chi ha pubblicato va detto "e' stato rimosso, ecco perche'", non
 * mostrata una pagina che non si trova.
 */
export async function getPostDetail(id: string, viewer?: Viewer) {
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
    db
      .select({
        id: users.id,
        name: users.name,
        accountType: users.accountType,
        bannedAt: users.bannedAt,
      })
      .from(users)
      .where(eq(users.id, post.authorId))
      .limit(1),
    db
      .select({
        id: sightings.id,
        message: sightings.message,
        address: sightings.address,
        lat: sightings.lat,
        lng: sightings.lng,
        createdAt: sightings.createdAt,
        thankedAt: sightings.thankedAt,
        authorId: sightings.authorId,
        authorName: users.name,
      })
      .from(sightings)
      .innerJoin(users, eq(sightings.authorId, users.id))
      .where(eq(sightings.postId, id))
      .orderBy(desc(sightings.createdAt)),
  ])

  const hidden = post.status === 'REMOVED' || Boolean(authorRows[0]?.bannedAt)
  const privileged = Boolean(viewer && (viewer.id === post.authorId || canModerate(viewer)))
  if (hidden && !privileged) return null

  // Le foto delle segnalazioni: sono quelle che fanno dire "si, e lui".
  const ids = sightingRows.map((row) => row.id)
  const sightingPhotoRows = ids.length
    ? await db
        .select({ id: sightingPhotos.id, sightingId: sightingPhotos.sightingId })
        .from(sightingPhotos)
        .where(inArray(sightingPhotos.sightingId, ids))
    : []

  const author = authorRows[0]
  return {
    ...post,
    photos: photoRows,
    author: author
      ? { id: author.id, name: author.name, accountType: author.accountType, banned: Boolean(author.bannedAt) }
      : { id: post.authorId, name: post.contactName, accountType: 'PERSON', banned: false },
    sightings: sightingRows.map((row) => ({
      ...row,
      photoIds: sightingPhotoRows.filter((p) => p.sightingId === row.id).map((p) => p.id),
    })),
  }
}
