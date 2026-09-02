import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { petPhotos, photos, posts } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'
import { getPhoto, putPhoto } from '@/lib/photoStorage'
import { notifyNearbyUsers } from '@/lib/push'
import { speciesLabel } from '@/lib/constants'

type Params = { params: Promise<{ id: string }> }

type Body = {
  address?: string
  city?: string
  lat?: number
  lng?: number
  description?: string
  contactName?: string
  contactPhone?: string
}

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
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const pet = access.pet
  const body = (await request.json().catch(() => ({}))) as Body

  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: 'Serve la zona da cui e sparito' }, { status: 400 })
  }

  const db = await getDb()
  const details = [
    pet.breed && `Razza: ${pet.breed}`,
    pet.color && `Colore: ${pet.color}`,
    pet.microchip && `Microchip: ${pet.microchip}`,
  ].filter(Boolean)

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
      city: body.city?.trim() || '',
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
      console.error('Copia della foto non riuscita:', error)
    }
  }

  const notified = await notifyNearbyUsers({
    id: postId,
    kind: 'LOST',
    title: `Smarrito ${pet.name}`,
    species: pet.species,
    city: body.city?.trim() || '',
    lat: body.lat,
    lng: body.lng,
    authorId: user.id,
  })

  return NextResponse.json({ post: { id: postId }, notified }, { status: 201 })
}
