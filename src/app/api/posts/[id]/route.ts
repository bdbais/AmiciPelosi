import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      photos: { select: { id: true }, orderBy: { position: 'asc' } },
      author: { select: { id: true, name: true } },
      sightings: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { name: true } } },
      },
    },
  })
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  return NextResponse.json({ post })
}

/** Chiude o riapre un annuncio (solo l'autore). */
export async function PATCH(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: 'Puoi modificare solo i tuoi annunci' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const status = body.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'

  const updated = await prisma.post.update({
    where: { id },
    data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null },
    select: { id: true, status: true },
  })
  return NextResponse.json({ post: updated })
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: 'Puoi eliminare solo i tuoi annunci' }, { status: 403 })
  }

  await prisma.post.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
