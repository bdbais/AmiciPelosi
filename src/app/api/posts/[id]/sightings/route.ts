import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, sightings } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { sightingSchema } from '@/lib/validators'
import { readJson } from '@/lib/http'

type Params = { params: Promise<{ id: string }> }

/** Segnalazione di avvistamento su un annuncio. */
export async function POST(request: Request, { params }: Params) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: 'Accedi per segnalare un avvistamento' }, { status: 401 })
  }

  const { id } = await params
  const db = await getDb()
  const found = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1)
  if (!found[0]) return NextResponse.json({ error: 'Annuncio non trovato' }, { status: 404 })

  const parsed = sightingSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    )
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

  return NextResponse.json(
    { sighting: { ...created[0], message: parsed.data.message, authorName: user.name } },
    { status: 201 },
  )
}
