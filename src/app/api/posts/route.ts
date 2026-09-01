import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
import { postSchema, triState } from '@/lib/validators'
import { processUpload } from '@/lib/images'
import { notifyNearbyUsers } from '@/lib/push'
import { boundingBox, distanceKm } from '@/lib/geo'
import { MAX_PHOTOS } from '@/lib/constants'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')
  const species = url.searchParams.get('species')
  const status = url.searchParams.get('status') ?? 'OPEN'
  const query = url.searchParams.get('q')?.trim()
  const lat = url.searchParams.get('lat')
  const lng = url.searchParams.get('lng')
  const radius = Number(url.searchParams.get('radius') ?? 10)
  const take = Math.min(Number(url.searchParams.get('take') ?? 60), 100)

  const where: Record<string, unknown> = {}
  if (kind) where.kind = kind
  if (species) where.species = species
  if (status !== 'ALL') where.status = status
  if (query) {
    where.OR = [
      { title: { contains: query } },
      { description: { contains: query } },
      { city: { contains: query } },
      { breed: { contains: query } },
      { petName: { contains: query } },
    ]
  }

  const hasCenter = lat !== null && lng !== null && !Number.isNaN(Number(lat))
  if (hasCenter) {
    const box = boundingBox(Number(lat), Number(lng), radius)
    where.lat = { gte: box.minLat, lte: box.maxLat }
    where.lng = { gte: box.minLng, lte: box.maxLng }
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: hasCenter ? 300 : take,
    include: {
      photos: { select: { id: true }, orderBy: { position: 'asc' }, take: 1 },
      author: { select: { name: true } },
      _count: { select: { sightings: true } },
    },
  })

  const withDistance = posts.map((post) => ({
    ...post,
    distanceKm: hasCenter ? distanceKm(Number(lat), Number(lng), post.lat, post.lng) : null,
  }))

  // Il riquadro e approssimato: rifiniamo con la distanza reale e ordiniamo per vicinanza.
  const result = hasCenter
    ? withDistance
        .filter((p) => (p.distanceKm ?? Infinity) <= radius)
        .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
        .slice(0, take)
    : withDistance

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
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_PHOTOS)

  let processed
  try {
    processed = await Promise.all(files.map(processUpload))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Foto non valida' },
      { status: 400 },
    )
  }

  const post = await prisma.post.create({
    data: {
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
      photos: {
        create: processed.map((photo, index) => ({
          data: photo.data,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
          position: index,
        })),
      },
    },
    select: {
      id: true,
      kind: true,
      title: true,
      species: true,
      city: true,
      lat: true,
      lng: true,
      authorId: true,
    },
  })

  // Le notifiche non devono far fallire la pubblicazione.
  const notified = await notifyNearbyUsers(post).catch((error) => {
    console.error('Notifiche di prossimita non inviate:', error)
    return 0
  })

  return NextResponse.json({ post, notified }, { status: 201 })
}
