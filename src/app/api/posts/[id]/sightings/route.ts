import { NextResponse, after } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, sightingPhotos, sightings } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { sightingSchema, firstIssue } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { deletePhoto, putPhoto } from '@/lib/photoStorage'
import { notifyPostAuthor } from '@/lib/push'
import { crossOriginResponse, sameOrigin } from '@/lib/http'
import { rateLimit } from '@/lib/ratelimit'

type Params = { params: Promise<{ id: string }> }

/**
 * Segnalazione di avvistamento su un annuncio.
 *
 * E' il gesto piu' importante di tutta l'app: qualcuno riceve l'avviso, si
 * guarda attorno, vede un animale che somiglia a quello della foto e dice
 * "guarda, qui c'e' un gatto che sembra il tuo". Per questo accetta sia JSON
 * sia un modulo con la foto, e la posizione viaggia con il messaggio: una
 * segnalazione senza il punto sulla mappa fa perdere ore.
 */
export async function POST(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Accedi per segnalare un avvistamento' }, { status: 401 })
  }
  const limited = await rateLimit(request, { key: 'sightings', limit: 10, windowSeconds: 3600 })
  if (limited) return limited

  const { id } = await params
  const db = await getDb()
  const found = await db
    .select({ id: posts.id, kind: posts.kind, authorId: posts.authorId, petName: posts.petName, title: posts.title })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1)
  const post = found[0]
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  const type = request.headers.get('content-type') ?? ''
  let raw: unknown
  let files: File[] = []

  if (type.includes('multipart/form-data') || type.includes('application/x-www-form-urlencoded')) {
    const form = await request.formData()
    raw = Object.fromEntries(
      Array.from(form.entries()).filter(([, value]) => typeof value === 'string'),
    )
    // Su una segnalazione senza vita non ci sono fotografie, nemmeno da chi
    // passa di la': il divieto e' dell'annuncio, non del modulo che lo compila.
    files =
      post.kind === 'FOUND_DEAD'
        ? []
        : form
            .getAll('photos')
            .filter((file): file is File => file instanceof File && file.size > 0)
            .slice(0, 2)
  } else {
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corpo della richiesta non leggibile' }, { status: 400 })
    }
  }

  const parsed = sightingSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const created = await db
    .insert(sightings)
    .values({
      postId: id,
      authorId: user.id,
      message: parsed.data.message,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      address: parsed.data.address || null,
    })
    .returning({ id: sightings.id, createdAt: sightings.createdAt })

  const sightingId = created[0].id
  const photoIds: string[] = []

  // Una foto che non arriva non deve far perdere il messaggio: la segnalazione
  // e' gia' salvata, e chi cerca ha comunque il punto sulla mappa.
  try {
    for (const file of files) {
      const processed = await processUpload(file)
      const photoId = crypto.randomUUID()
      const stored = await putPhoto(photoId, processed.data, processed.mimeType)
      try {
        await db.insert(sightingPhotos).values({
          id: photoId,
          sightingId,
          mimeType: processed.mimeType,
          width: processed.width,
          height: processed.height,
          storageKey: stored.storageKey,
          data: stored.data ? Buffer.from(stored.data) : null,
        })
      } catch (error) {
        await deletePhoto(stored.storageKey).catch(() => undefined)
        throw error
      }
      photoIds.push(photoId)
    }
  } catch {
    // Silenzio voluto: il messaggio vale piu' della fotografia.
  }

  // L'avviso a chi sta cercando parte dopo la risposta, su tutti i suoi
  // dispositivi, senza aspettare nessun riepilogo: e' la notifica per cui
  // esiste tutto il resto. Chi segnala sul proprio annuncio non si avvisa.
  if (post.authorId !== user.id) {
    const name = post.petName || post.title
    after(() =>
      notifyPostAuthor(post.authorId, {
        title: `👀 Qualcuno ha visto ${name}`,
        body: parsed.data.message.slice(0, 140),
        url: `/annunci/${id}`,
        tag: 'avvistamento',
      }).catch((error) => {
        console.error('Avviso di avvistamento non inviato:', error)
      }),
    )
  }

  return NextResponse.json(
    {
      sighting: {
        ...created[0],
        message: parsed.data.message,
        authorName: user.name,
        lat: parsed.data.lat ?? null,
        lng: parsed.data.lng ?? null,
        photoIds,
      },
    },
    { status: 201 },
  )
}
