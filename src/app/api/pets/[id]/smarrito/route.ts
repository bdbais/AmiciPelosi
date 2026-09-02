import { NextResponse, after } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { petPhotos, photos, posts } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'
import { deletePhoto, getPhoto, putPhoto } from '@/lib/photoStorage'
import { nearbyRecipients, notifyNearbyUsers } from '@/lib/push'
import { speciesLabel } from '@/lib/constants'
import { firstIssue, lostPetSchema } from '@/lib/validators'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/**
 * Il giorno brutto: pubblica l'annuncio usando le foto gia pronte.
 *
 * E il motivo per cui si compila la scheda quando tutto va bene. Chi ha appena
 * visto uscire il cane dal cancello non e in condizione di cercare tre foto
 * buone, e quelle che troverebbe sul telefono sono di spalle, al buio, o con
 * mezza famiglia dentro.
 *
 * Le tre foto vengono copiate nell'annuncio, non spostate: la scheda resta
 * privata e integra. Ma da qui in poi quelle copie sono pubbliche, e chi preme
 * il pulsante deve saperlo prima.
 */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const pet = access.pet
  const parsed = lostPetSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }
  const body = parsed.data

  const db = await getDb()
  const details = [
    pet.breed && `Razza: ${pet.breed}`,
    pet.color && `Colore: ${pet.color}`,
    pet.microchip && `Microchip: ${pet.microchip}`,
  ].filter(Boolean)

  const city = body.city?.trim() || ''
  const created = await db
    .insert(posts)
    .values({
      kind: 'LOST',
      title: `Smarrito ${pet.name}, ${speciesLabel(pet.species).toLowerCase()}`,
      species: pet.species,
      breed: pet.breed,
      petName: pet.name,
      sex: pet.sex,
      color: pet.color,
      hasMicrochip: Boolean(pet.microchip),
      microchip: pet.microchip,
      description:
        (body.description?.trim() || `${pet.name} si e allontanato. Ogni segnalazione aiuta.`) +
        (details.length ? `\n\n${details.join('\n')}` : ''),
      address: body.address?.trim() || 'Zona da precisare',
      city,
      lat: body.lat,
      lng: body.lng,
      contactName: body.contactName?.trim() || user.name,
      contactPhone: body.contactPhone?.trim() || user.phone || null,
      contactEmail: user.email,
      authorId: user.id,
    })
    .returning({ id: posts.id })

  const postId = created[0].id

  // Solo le tre che servono a riconoscerlo: il libretto resta a casa, ha dentro
  // dati che non riguardano nessun altro.
  const sourceRows = await db
    .select()
    .from(petPhotos)
    .where(eq(petPhotos.petId, pet.id))

  let position = 0
  for (const source of sourceRows.filter((row) => row.slot !== 'DOCUMENT')) {
    try {
      const bytes = await getPhoto(source.storageKey, source.data ? new Uint8Array(source.data) : null)
      if (!bytes) continue
      const copyId = crypto.randomUUID()
      const stored = await putPhoto(copyId, bytes, source.mimeType)
      try {
        await db.insert(photos).values({
          id: copyId,
          postId,
          mimeType: source.mimeType,
          width: source.width,
          height: source.height,
          position: position++,
          storageKey: stored.storageKey,
          data: stored.data ? Buffer.from(stored.data) : null,
        })
      } catch (error) {
        await deletePhoto(stored.storageKey).catch(() => undefined)
        throw error
      }
    } catch (error) {
      console.error('Copia della foto non riuscita:', error)
    }
  }

  // Gli avvisi partono dopo la risposta; il numero restituito e' la stima di
  // chi li ricevera', calcolata prima.
  const announced = {
    id: postId,
    kind: 'LOST',
    title: `Smarrito ${pet.name}`,
    species: pet.species,
    city,
    lat: body.lat,
    lng: body.lng,
    authorId: user.id,
  }
  const recipients = await nearbyRecipients(announced).catch((error) => {
    console.error('Ricerca dei vicini non riuscita:', error)
    return []
  })
  after(() =>
    notifyNearbyUsers(announced, recipients).catch((error) => {
      console.error('Notifiche di prossimita non inviate:', error)
    }),
  )

  return NextResponse.json({ post: { id: postId }, notified: recipients.length }, { status: 201 })
}
