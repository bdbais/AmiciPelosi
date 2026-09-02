import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { petPhotos, pets } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { firstIssue, petSchema } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { putPhoto } from '@/lib/photoStorage'
import { PET_PHOTO_SLOTS, type PetPhotoSlot } from '@/lib/constants'

/** Aggiunge un animale di casa. Nasce privato: nessuno lo vede tranne chi lo scrive. */
export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi per aggiungere un animale' }, { status: 401 })

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
  const created = await db
    .insert(pets)
    .values({
      ownerId: user.id,
      name: data.name,
      species: data.species,
      breed: data.breed || null,
      sex: data.sex || null,
      birthDate: data.birthDate || null,
      color: data.color || null,
      microchip: data.microchip || null,
      notes: data.notes || null,
    })
    .returning({ id: pets.id })

  const petId = created[0].id

  // Una foto che non arriva non deve far perdere la scheda: si riaggiunge dopo.
  for (const slot of Object.keys(PET_PHOTO_SLOTS) as PetPhotoSlot[]) {
    const file = form.get(`photo_${slot}`)
    if (!(file instanceof File) || file.size === 0) continue
    try {
      const processed = await processUpload(file)
      const id = crypto.randomUUID()
      const stored = await putPhoto(id, processed.data, processed.mimeType)
      await db.insert(petPhotos).values({
        id,
        petId,
        slot,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
        storageKey: stored.storageKey,
        data: stored.data ? Buffer.from(stored.data) : null,
      })
    } catch (error) {
      console.error('Foto dell animale non salvata:', error)
    }
  }

  return NextResponse.json({ pet: { id: petId, name: data.name } }, { status: 201 })
}
