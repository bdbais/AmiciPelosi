import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
import { sightingSchema } from '@/lib/validators'

type Params = { params: Promise<{ id: string }> }

/** Segnalazione di avvistamento su un annuncio. */
export async function POST(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Accedi per segnalare un avvistamento' }, { status: 401 })
  }

  const { id } = await params
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } })
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  const parsed = sightingSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    )
  }

  const sighting = await prisma.sighting.create({
    data: {
      postId: id,
      authorId: user.id,
      message: parsed.data.message,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      address: parsed.data.address || null,
    },
    include: { author: { select: { name: true } } },
  })

  return NextResponse.json({ sighting }, { status: 201 })
}
