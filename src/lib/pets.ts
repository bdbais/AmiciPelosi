import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { petEvents, petPhotos, pets, trustedPeople, users } from '@/db/schema'

/**
 * Chi puo vedere la scheda di un animale.
 *
 * Solo due categorie di persone, e nessun'altra: il proprietario, e chi lui ha
 * messo fra le persone fidate - e soltanto se ha deciso di condividere quella
 * scheda. Tutto il resto del mondo non deve nemmeno sapere che esiste, per
 * questo l'esito negativo e sempre "non trovato" e mai "non ti e permesso".
 */
export async function canSeePet(petId: string, viewerId: string | null) {
  if (!viewerId) return null

  const db = await getDb()
  const rows = await db.select().from(pets).where(eq(pets.id, petId)).limit(1)
  const pet = rows[0]
  if (!pet) return null

  if (pet.ownerId === viewerId) return { pet, isOwner: true, scope: 'ALL' as const }
  if (!pet.sharedWithCircle) return null

  const trusted = await db
    .select({ id: trustedPeople.id, scope: trustedPeople.scope })
    .from(trustedPeople)
    .where(and(eq(trustedPeople.ownerId, pet.ownerId), eq(trustedPeople.personId, viewerId)))
    .limit(1)

  if (!trusted[0]) return null
  return {
    pet,
    isOwner: false,
    scope: trusted[0].scope === 'MEDICAL' ? ('MEDICAL' as const) : ('ALL' as const),
  }
}

/** Gli animali di una persona, con la foto del muso per l'elenco. */
export async function listPetsOf(ownerId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(pets)
    .where(eq(pets.ownerId, ownerId))
    .orderBy(asc(pets.name))

  if (rows.length === 0) return []

  const photoRows = await db
    .select({ id: petPhotos.id, petId: petPhotos.petId, slot: petPhotos.slot })
    .from(petPhotos)
    .where(inArray(petPhotos.petId, rows.map((row) => row.id)))

  return rows.map((pet) => ({
    ...pet,
    photos: photoRows.filter((photo) => photo.petId === pet.id),
  }))
}

/** Gli animali che qualcuno ha condiviso con me. */
export async function listPetsSharedWith(viewerId: string) {
  const db = await getDb()
  const rows = await db
    .select({
      pet: pets,
      ownerName: users.name,
    })
    .from(trustedPeople)
    .innerJoin(pets, eq(pets.ownerId, trustedPeople.ownerId))
    .innerJoin(users, eq(users.id, trustedPeople.ownerId))
    .where(and(eq(trustedPeople.personId, viewerId), eq(pets.sharedWithCircle, true)))
    .orderBy(asc(pets.name))

  if (rows.length === 0) return []

  const photoRows = await db
    .select({ id: petPhotos.id, petId: petPhotos.petId, slot: petPhotos.slot })
    .from(petPhotos)
    .where(inArray(petPhotos.petId, rows.map((row) => row.pet.id)))

  return rows.map((row) => ({
    ...row.pet,
    ownerName: row.ownerName,
    photos: photoRows.filter((photo) => photo.petId === row.pet.id),
  }))
}

export async function getPetDetail(petId: string) {
  const db = await getDb()
  const [photoRows, eventRows] = await Promise.all([
    db.select({ id: petPhotos.id, slot: petPhotos.slot }).from(petPhotos).where(eq(petPhotos.petId, petId)),
    db
      .select()
      .from(petEvents)
      .where(eq(petEvents.petId, petId))
      .orderBy(desc(petEvents.happenedAt)),
  ])
  return { photos: photoRows, events: eventRows }
}

/** Le persone a cui ho dato la chiave. */
export async function listTrustedOf(ownerId: string) {
  const db = await getDb()
  return db
    .select({
      id: trustedPeople.id,
      personId: trustedPeople.personId,
      name: users.name,
      email: users.email,
      scope: trustedPeople.scope,
      primaryVet: trustedPeople.primaryVet,
      accountType: users.accountType,
    })
    .from(trustedPeople)
    .innerJoin(users, eq(users.id, trustedPeople.personId))
    .where(eq(trustedPeople.ownerId, ownerId))
    .orderBy(asc(users.name))
}

/**
 * Quanti giorni mancano al prossimo ritorno di una data che torna ogni anno.
 * Restituisce null se la data non si legge.
 */
export function daysUntilNextAnniversary(isoDate: string, today = new Date()) {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null

  const year = today.getFullYear()
  let next = new Date(year, parsed.getMonth(), parsed.getDate())
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (next < startOfToday) next = new Date(year + 1, parsed.getMonth(), parsed.getDate())

  return Math.round((next.getTime() - startOfToday.getTime()) / 86_400_000)
}
