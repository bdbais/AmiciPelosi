import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { photos, posts } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { postSchema, triState } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { putPhoto } from '@/lib/photoStorage'
import { notifyNearbyUsers } from '@/lib/push'
import { listPosts } from '@/lib/queries'
import { MAX_PHOTOS } from '@/lib/constants'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const lat = params.get('lat')
  const lng = params.get('lng')
  const hasCenter = lat !== null && lng !== null && !Number.isNaN(Number(lat))

  const result = await listPosts({
    kind: params.get('kind'),
    species: params.get('species'),
    status: params.get('status') ?? 'OPEN',
    query: params.get('q'),
    center: hasCenter ? { lat: Number(lat), lng: Number(lng) } : null,
    radiusKm: Number(params.get('radius') ?? 10),
    take: Number(params.get('take') ?? 60),
  })

  return NextResponse.json({ posts: result })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Accedi per pubblicare un annuncio' }, { status: 401 })
  }

  const form = await request.formData()
  const raw = Object.fromEntries(
    Array.from(form.entries()).filter(([, value]) => typeof value === 'string'),
  )
  const parsed = postSchema.safeParse({
    ...raw,
    hasMicrochip: raw.hasMicrochip === 'on' || raw.hasMicrochip === 'true',
    hasCollar: raw.hasCollar === 'on' || raw.hasCollar === 'true',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    )
  }
  const data = parsed.data

  const files = form
    .getAll('photos')
    .filter((file): file is File => file instanceof File && file.size > 0)
    .slice(0, MAX_PHOTOS)

  const db = await getDb()

  const created = await db
    .insert(posts)
    .values({
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
      address: data.address,
      city: data.city,
      province: data.province || null,
      lat: data.lat,
      lng: data.lng,
      eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
      contactName: data.contactName,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      authorId: user.id,
    })
    .returning({ id: posts.id })

  const postId = created[0].id

  try {
    const processed = await Promise.all(files.map(processUpload))
    for (const [index, photo] of processed.entries()) {
      // L'id serve prima della scrittura: e anche la chiave nello storage.
      const id = crypto.randomUUID()
      const stored = await putPhoto(id, photo.data, photo.mimeType)
      await db.insert(photos).values({
        id,
        postId,
        mimeType: photo.mimeType,
        width: photo.width,
        height: photo.height,
        position: index,
        storageKey: stored.storageKey,
        data: stored.data ? Buffer.from(stored.data) : null,
      })
    }
  } catch (error) {
    console.error('Salvataggio foto non riuscito:', error)
    // L'annuncio resta pubblicato: senza foto e meno utile, ma non inutile.
  }

  // Le notifiche non devono far fallire la pubblicazione.
  const notified = await notifyNearbyUsers({
    id: postId,
    kind: data.kind,
    title: data.title,
    species: data.species,
    city: data.city,
    lat: data.lat,
    lng: data.lng,
    authorId: user.id,
  }).catch((error) => {
    console.error('Notifiche di prossimita non inviate:', error)
    return 0
  })

  return NextResponse.json({ post: { id: postId }, notified }, { status: 201 })
}
