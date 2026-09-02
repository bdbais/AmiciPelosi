import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { pets } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'
import { PET_PHOTO_SLOTS, PET_STATUSES, type PetPhotoSlot } from '@/lib/constants'
import { firstIssue, petSchema, triState } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { putPhoto, deletePhoto } from '@/lib/photoStorage'
import { petPhotos } from '@/db/schema'
import { and } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

/** Cambia la scheda, o decide se condividerla con le persone fidate. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  // Solo il proprietario cambia la scheda: chi la vede per fiducia non la tocca.
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const type = request.headers.get('content-type') ?? ''
  if (type.includes('multipart/form-data')) return editCard(request, id)

  const body = (await request.json().catch(() => ({}))) as {
    sharedWithCircle?: boolean
    status?: string
    farewellDate?: string
  }

  const changes: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.sharedWithCircle === 'boolean') changes.sharedWithCircle = body.sharedWithCircle
  if (body.status && body.status in PET_STATUSES) {
    changes.status = body.status
    // La data del commiato si scrive solo quando ha senso, e si toglie se si
    // torna indietro: capita di premere il pulsante sbagliato in un giorno cosi.
    changes.farewellDate =
      body.status === 'DECEASED' ? body.farewellDate || new Date().toISOString().slice(0, 10) : null
  }

  const db = await getDb()
  await db.update(pets).set(changes).where(eq(pets.id, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const { id } = await params
  const access = await canSeePet(id, user.id)
  if (!access?.isOwner) return NextResponse.json({ error: 'Animale non trovato' }, { status: 404 })

  const db = await getDb()
  await db.delete(pets).where(eq(pets.id, id))
  return NextResponse.json({ ok: true })
}


/**
 * Correggere la scheda di casa.
 *
 * Una scheda si compila una volta e si rilegge per anni: il microchip con una
 * cifra sbagliata la rende inutile proprio il giorno in cui servirebbe, e il
 * diario che ci sta attaccato non e' una cosa da buttare e riscrivere.
 *
 * Le fotografie si sostituiscono una casella per volta: chi manda solo il
 * muso non perde i due fianchi.
 */
async function editCard(request: Request, id: string) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invia il modulo come multipart/form-data.' }, { status: 400 })
  }

  const raw = Object.fromEntries(
    Array.from(form.entries()).filter(([, value]) => typeof value === 'string'),
  )
  const parsed = petSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }
  const data = parsed.data

  const db = await getDb()
  await db
    .update(pets)
    .set({
      name: data.name,
      species: data.species,
      breed: data.breed || null,
      sex: data.sex || null,
      birthDate: data.birthDate || null,
      color: data.color || null,
      microchip: data.microchip || null,
      notes: data.notes || null,
      intakeDate: data.intakeDate || null,
      exitDate: data.exitDate || null,
      neutered: triState(data.neutered),
      vaccinated: triState(data.vaccinated),
      tested: data.tested || null,
      goodWithCats: triState(data.goodWithCats),
      goodWithDogs: triState(data.goodWithDogs),
      goodWithKids: triState(data.goodWithKids),
      careNotes: data.careNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(pets.id, id))

  for (const slot of Object.keys(PET_PHOTO_SLOTS) as PetPhotoSlot[]) {
    const file = form.get(`photo_${slot}`)
    if (!(file instanceof File) || file.size === 0) continue
    try {
      const processed = await processUpload(file)
      const photoId = crypto.randomUUID()
      const stored = await putPhoto(photoId, processed.data, processed.mimeType)

      // La nuova prende il posto della vecchia, che sparisce anche dallo storage.
      const old = await db
        .select({ id: petPhotos.id, storageKey: petPhotos.storageKey })
        .from(petPhotos)
        .where(and(eq(petPhotos.petId, id), eq(petPhotos.slot, slot)))
      await Promise.all(old.map((photo) => deletePhoto(photo.storageKey)))
      if (old.length > 0) {
        await db.delete(petPhotos).where(and(eq(petPhotos.petId, id), eq(petPhotos.slot, slot)))
      }

      await db.insert(petPhotos).values({
        id: photoId,
        petId: id,
        slot,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
        storageKey: stored.storageKey,
        data: stored.data ? Buffer.from(stored.data) : null,
      })
    } catch (error) {
      console.error('Foto dell animale non sostituita:', error)
    }
  }

  return NextResponse.json({ pet: { id } })
}
