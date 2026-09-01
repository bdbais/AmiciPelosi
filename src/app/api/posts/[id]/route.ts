import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { photos, posts } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { getPostDetail } from '@/lib/queries'
import { deletePhoto } from '@/lib/photoStorage'
import { readJson } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const post = await getPostDetail(id)
  if (!post) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  return NextResponse.json({ post })
}

/** Chiude o riapre un annuncio (solo l'autore). */
export async function PATCH(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const db = await getDb()
  const rows = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (rows[0].authorId !== user.id) {
    return NextResponse.json({ error: 'Puoi modificare solo i tuoi annunci' }, { status: 403 })
  }

  const body = await readJson<{ status?: string }>(request)
  const status = body.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'

  await db
    .update(posts)
    .set({
      status,
      resolvedAt: status === 'RESOLVED' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))

  return NextResponse.json({ post: { id, status } })
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const db = await getDb()
  const rows = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!rows[0]) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })
  if (rows[0].authorId !== user.id) {
    return NextResponse.json({ error: 'Puoi eliminare solo i tuoi annunci' }, { status: 403 })
  }

  // Le foto fuori dal database vanno rimosse a mano.
  const stored = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .where(eq(photos.postId, id))
  await Promise.all(stored.map((photo) => deletePhoto(photo.storageKey)))

  await db.delete(posts).where(eq(posts.id, id))
  return NextResponse.json({ ok: true })
}
