import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { petPhotos } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { canSeePet } from '@/lib/pets'
import { getPhoto } from '@/lib/photoStorage'

type Params = { params: Promise<{ id: string }> }

/**
 * Le foto degli animali di casa non passano dalla via pubblica delle immagini.
 *
 * Ogni richiesta ricontrolla chi sta guardando: il proprietario, o una persona
 * fidata se la scheda e stata condivisa. A tutti gli altri rispondiamo che non
 * esiste, perche' un "non ti e permesso" direbbe comunque che esiste.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const user = await currentUser()
  if (!user) return new Response('Foto non trovata', { status: 404 })

  const db = await getDb()
  const rows = await db
    .select({
      petId: petPhotos.petId,
      data: petPhotos.data,
      mimeType: petPhotos.mimeType,
      storageKey: petPhotos.storageKey,
    })
    .from(petPhotos)
    .where(eq(petPhotos.id, id))
    .limit(1)

  const photo = rows[0]
  if (!photo) return new Response('Foto non trovata', { status: 404 })

  const access = await canSeePet(photo.petId, user.id)
  if (!access) return new Response('Foto non trovata', { status: 404 })

  const bytes = await getPhoto(photo.storageKey, photo.data ? new Uint8Array(photo.data) : null)
  if (!bytes) return new Response('Foto non disponibile', { status: 404 })

  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': photo.mimeType,
      // Privata: nessuna cache condivisa, solo il browser di chi ha il permesso.
      'Cache-Control': 'private, max-age=600',
    },
  })
}
