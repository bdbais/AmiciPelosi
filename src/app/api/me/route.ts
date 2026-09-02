import { NextResponse } from 'next/server'
import { eq, inArray, or } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  contactRequests,
  petEvents,
  petPhotos,
  pets,
  photos,
  posts,
  pushSubscriptions,
  sightingPhotos,
  sightings,
  trustedPeople,
  users,
} from '@/db/schema'
import { destroySession, currentUser } from '@/lib/auth'
import { deletePhoto } from '@/lib/photoStorage'
import { firstIssue, orgSchema } from '@/lib/validators'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

/**
 * Chi sono: una persona, un canile, un gattile, un'associazione, un veterinario.
 *
 * Cambia cosa l'app chiede e cosa apre. Un ente scrive i propri dati una volta
 * sola; un veterinario diventa scegliibile come destinatario della scheda
 * sanitaria degli animali di chi lo vuole.
 */
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = orgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }
  const data = parsed.data

  const db = await getDb()
  await db
    .update(users)
    .set({
      accountType: data.accountType,
      orgName: data.orgName || null,
      orgAddress: data.orgAddress || null,
      orgCity: data.orgCity || null,
      orgLat: data.orgLat ?? null,
      orgLng: data.orgLng ?? null,
      orgPhone: data.orgPhone || null,
      orgEmail: data.orgEmail || null,
      orgSite: data.orgSite || null,
      orgHours: data.orgHours || null,
      orgFacebook: data.orgFacebook || null,
      orgInstagram: data.orgInstagram || null,
    })
    .where(eq(users.id, user.id))

  return NextResponse.json({ accountType: data.accountType })
}


/**
 * Cancellare il proprio account, per davvero.
 *
 * Nei termini d'uso c'e' scritto che sparisce tutto e che non teniamo una copia
 * di cortesia: e' una promessa, e una promessa senza il pulsante che la
 * mantiene e' peggio che non averla fatta.
 *
 * Le righe se ne andrebbero anche da sole per via dei vincoli, ma le
 * fotografie vivono fuori dal database e nessun vincolo le raggiunge: vanno
 * raccolte e tolte a mano, prima, finche' si sa ancora dove sono.
 */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const db = await getDb()

  const myPosts = await db.select({ id: posts.id }).from(posts).where(eq(posts.authorId, user.id))
  const myPets = await db.select({ id: pets.id }).from(pets).where(eq(pets.ownerId, user.id))
  const mySightings = await db
    .select({ id: sightings.id })
    .from(sightings)
    .where(eq(sightings.authorId, user.id))

  const postIds = myPosts.map((row) => row.id)
  const petIds = myPets.map((row) => row.id)

  // Le segnalazioni scritte da me, e quelle ricevute sui miei annunci: le
  // seconde se ne vanno con gli annunci, e le loro foto con loro.
  const receivedSightings = postIds.length
    ? await db.select({ id: sightings.id }).from(sightings).where(inArray(sightings.postId, postIds))
    : []
  const sightingIds = [...new Set([...mySightings, ...receivedSightings].map((row) => row.id))]

  const keys: (string | null)[] = []
  if (postIds.length > 0) {
    const rows = await db
      .select({ storageKey: photos.storageKey })
      .from(photos)
      .where(inArray(photos.postId, postIds))
    keys.push(...rows.map((row) => row.storageKey))
  }
  if (petIds.length > 0) {
    const rows = await db
      .select({ storageKey: petPhotos.storageKey })
      .from(petPhotos)
      .where(inArray(petPhotos.petId, petIds))
    keys.push(...rows.map((row) => row.storageKey))
  }
  if (sightingIds.length > 0) {
    const rows = await db
      .select({ storageKey: sightingPhotos.storageKey })
      .from(sightingPhotos)
      .where(inArray(sightingPhotos.sightingId, sightingIds))
    keys.push(...rows.map((row) => row.storageKey))
  }
  await Promise.all(keys.map((key) => deletePhoto(key)))

  // In ordine, dal basso: i vincoli non sono garantiti ovunque e non voglio
  // scoprirlo lasciando in giro le briciole di qualcuno che se n'e' andato.
  if (sightingIds.length > 0) {
    await db.delete(sightingPhotos).where(inArray(sightingPhotos.sightingId, sightingIds))
  }
  await db.delete(sightings).where(eq(sightings.authorId, user.id))
  if (postIds.length > 0) await db.delete(photos).where(inArray(photos.postId, postIds))
  await db.delete(posts).where(eq(posts.authorId, user.id))
  if (petIds.length > 0) {
    await db.delete(petPhotos).where(inArray(petPhotos.petId, petIds))
    await db.delete(petEvents).where(inArray(petEvents.petId, petIds))
  }
  await db.delete(pets).where(eq(pets.ownerId, user.id))
  await db
    .delete(trustedPeople)
    .where(or(eq(trustedPeople.ownerId, user.id), eq(trustedPeople.personId, user.id)))
  await db
    .delete(contactRequests)
    .where(or(eq(contactRequests.fromUserId, user.id), eq(contactRequests.toUserId, user.id)))
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id))
  await db.delete(users).where(eq(users.id, user.id))

  await destroySession()
  return NextResponse.json({ ok: true })
}
