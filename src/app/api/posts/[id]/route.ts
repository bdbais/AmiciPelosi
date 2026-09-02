import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, posts, sightingPhotos, sightings } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { getPostDetail } from '@/lib/queries'
import { deletePhoto } from '@/lib/photoStorage'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'
import { toStructured } from '@/lib/structured'
import { MAX_PHOTOS, OUTCOMES } from '@/lib/constants'
import { postSchema, triState, firstIssue } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { putPhoto } from '@/lib/photoStorage'
import { and, inArray } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

/**
 * L'annuncio in forma pubblica.
 *
 * Questa rotta restituiva la riga intera, telefono ed email compresi: e' il
 * quarto posto della stessa famiglia (dopo /api/feed, la locandina e i dati
 * passati alla pagina) da cui i recapiti uscivano senza che nessuno li
 * chiedesse. Da qui esce solo la forma strutturata, che i recapiti non li ha,
 * piu' le fotografie e le segnalazioni. Il telefono si chiede a chi ha
 * pubblicato, e lo decide lui.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const post = await getPostDetail(id)
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  const origin = new URL(request.url).origin
  return NextResponse.json({
    post: {
      ...toStructured(post, post.photos.map((photo) => photo.id), origin),
      author: { name: post.author.name },
      sightings: post.sightings.map((sighting) => ({
        id: sighting.id,
        message: sighting.message,
        address: sighting.address,
        latitude: sighting.lat,
        longitude: sighting.lng,
        createdAt: sighting.createdAt.toISOString(),
        authorName: sighting.authorName,
        photos: sighting.photoIds.map((photoId) => `${origin}/api/photos/${photoId}`),
      })),
    },
  })
}

/**
 * Cambia un annuncio: lo chiude, lo riapre, o ne corregge il contenuto.
 *
 * La correzione serve piu' di quanto sembri. Chi scrive un annuncio lo scrive
 * di corsa, spesso di notte e con le mani che tremano: sbaglia il colore,
 * dimentica il quartiere, scrive un numero di telefono con una cifra in meno.
 * Senza questa rotta l'unico rimedio era cancellare e ripubblicare, buttando
 * via le segnalazioni gia' arrivate - cioe' proprio le notizie che si cercavano.
 *
 * Due formati, perche' due cose diverse: JSON per aprire e chiudere, un modulo
 * multipart quando ci sono anche le fotografie.
 */
export async function PATCH(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const db = await getDb()
  const rows = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (rows[0].authorId !== user.id) {
    return NextResponse.json({ error: 'Puoi modificare solo i tuoi annunci' }, { status: 403 })
  }

  const type = request.headers.get('content-type') ?? ''
  if (type.includes('multipart/form-data')) return editContent(request, db, id)

  const body = await readJson<{ status?: string; outcome?: string }>(request)
  const status = body.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'
  const outcome =
    status === 'RESOLVED' && body.outcome && body.outcome in OUTCOMES ? body.outcome : null

  await db
    .update(posts)
    .set({
      status,
      outcome,
      resolvedAt: status === 'RESOLVED' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))

  return NextResponse.json({ post: { id, status, outcome } })
}

/** La riscrittura vera e propria, con le fotografie che entrano ed escono. */
async function editContent(request: Request, db: Awaited<ReturnType<typeof getDb>>, id: string) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Invia il modulo come multipart/form-data: le foto viaggiano con esso.' },
      { status: 400 },
    )
  }

  const raw = Object.fromEntries(
    Array.from(form.entries()).filter(([, value]) => typeof value === 'string'),
  )
  const parsed = postSchema.safeParse({
    ...raw,
    hasMicrochip: raw.hasMicrochip === 'on' || raw.hasMicrochip === 'true',
    hasCollar: raw.hasCollar === 'on' || raw.hasCollar === 'true',
  })
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }
  const data = parsed.data

  await db
    .update(posts)
    .set({
      kind: data.kind,
      title: data.title,
      species: data.species,
      breed: data.breed || null,
      petName: data.petName || null,
      sex: data.sex || null,
      ageRange: data.ageRange || null,
      size: data.size || null,
      color: data.color || null,
      hasMicrochip: Boolean(data.hasMicrochip),
      microchip: data.microchip || null,
      hasCollar: Boolean(data.hasCollar),
      neutered: triState(data.neutered),
      vaccinated: triState(data.vaccinated),
      goodWithKids: triState(data.goodWithKids),
      goodWithPets: triState(data.goodWithPets),
      description: data.description,
      extraNotes: data.extraNotes || null,
      fosterPeriod: data.kind === 'FOSTER' ? data.fosterPeriod || null : null,
      address: data.address,
      city: data.city,
      province: data.province || null,
      lat: data.lat,
      lng: data.lng,
      eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
      contactName: data.contactName,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      contactMode: data.contactOpen ? 'OPEN' : 'REQUEST',
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))

  // Le fotografie tolte spariscono anche dallo storage, non solo dall'elenco.
  const removed = form.getAll('removePhotos').filter((v): v is string => typeof v === 'string')
  if (removed.length > 0) {
    const stored = await db
      .select({ id: photos.id, storageKey: photos.storageKey })
      .from(photos)
      .where(and(eq(photos.postId, id), inArray(photos.id, removed)))
    await Promise.all(stored.map((photo) => deletePhoto(photo.storageKey)))
    if (stored.length > 0) {
      await db.delete(photos).where(inArray(photos.id, stored.map((photo) => photo.id)))
    }
  }

  // Il divieto di fotografie su una segnalazione senza vita vale anche qui:
  // altrimenti bastava pubblicare come smarrito e cambiare tipo dopo.
  const existing = await db.select({ id: photos.id }).from(photos).where(eq(photos.postId, id))
  const room = MAX_PHOTOS - existing.length
  const files =
    data.kind === 'FOUND_DEAD' || room <= 0
      ? []
      : form
          .getAll('photos')
          .filter((file): file is File => file instanceof File && file.size > 0)
          .slice(0, room)

  if (data.kind === 'FOUND_DEAD' && existing.length > 0) {
    const stored = await db
      .select({ id: photos.id, storageKey: photos.storageKey })
      .from(photos)
      .where(eq(photos.postId, id))
    await Promise.all(stored.map((photo) => deletePhoto(photo.storageKey)))
    await db.delete(photos).where(eq(photos.postId, id))
  }

  const processed = await Promise.all(files.map(processUpload))
  for (const [index, photo] of processed.entries()) {
    const photoId = crypto.randomUUID()
    const stored = await putPhoto(photoId, photo.data, photo.mimeType)
    await db.insert(photos).values({
      id: photoId,
      postId: id,
      mimeType: photo.mimeType,
      width: photo.width,
      height: photo.height,
      position: existing.length + index,
      storageKey: stored.storageKey,
      data: stored.data ? Buffer.from(stored.data) : null,
    })
  }

  return NextResponse.json({ post: { id } })
}

export async function DELETE(request: Request, { params }: Params) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const db = await getDb()
  const rows = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (rows[0].authorId !== user.id) {
    return NextResponse.json({ error: 'Puoi eliminare solo i tuoi annunci' }, { status: 403 })
  }

  // Le foto fuori dal database vanno rimosse a mano: quelle dell'annuncio e
  // quelle delle segnalazioni ricevute, che se ne vanno con lui.
  const stored = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .where(eq(photos.postId, id))
  const received = await db
    .select({ storageKey: sightingPhotos.storageKey })
    .from(sightingPhotos)
    .innerJoin(sightings, eq(sightings.id, sightingPhotos.sightingId))
    .where(eq(sightings.postId, id))
  await Promise.all([...stored, ...received].map((photo) => deletePhoto(photo.storageKey)))

  await db.delete(posts).where(eq(posts.id, id))
  return NextResponse.json({ ok: true })
}
