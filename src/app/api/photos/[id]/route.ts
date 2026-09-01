import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos } from '@/db/schema'
import { getPhoto } from '@/lib/photoStorage'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const db = await getDb()

  const rows = await db
    .select({ data: photos.data, mimeType: photos.mimeType, storageKey: photos.storageKey })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1)

  const photo = rows[0]
  if (!photo) return new Response('Foto non trovata', { status: 404 })

  const bytes = await getPhoto(
    photo.storageKey,
    photo.data ? new Uint8Array(photo.data) : null,
  )
  if (!bytes) return new Response('Foto non disponibile', { status: 404 })

  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': photo.mimeType,
      // Le foto sono immutabili: si possono cachare a lungo.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
