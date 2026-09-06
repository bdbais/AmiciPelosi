import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, sightingPhotos } from '@/db/schema'
import { getPhoto } from '@/lib/photoStorage'

type Params = { params: Promise<{ id: string }> }

/**
 * Serve una foto, che sia di un annuncio o di una segnalazione.
 *
 * Le due tabelle rispondono a domande diverse ma il lettore e' lo stesso: chi
 * mostra un'immagine non deve sapere da quale delle due arriva.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const db = await getDb()

  const fromPosts = await db
    .select({ data: photos.data, mimeType: photos.mimeType, storageKey: photos.storageKey })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1)

  const photo =
    fromPosts[0] ??
    (
      await db
        .select({
          data: sightingPhotos.data,
          mimeType: sightingPhotos.mimeType,
          storageKey: sightingPhotos.storageKey,
        })
        .from(sightingPhotos)
        .where(eq(sightingPhotos.id, id))
        .limit(1)
    )[0]

  if (!photo) return new Response('Foto non trovata', { status: 404 })

  const bytes = await getPhoto(photo.storageKey, photo.data ? new Uint8Array(photo.data) : null)
  if (!bytes) return new Response('Foto non disponibile', { status: 404 })

  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': photo.mimeType,
      // Le foto sono immutabili: si possono cachare a lungo.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
