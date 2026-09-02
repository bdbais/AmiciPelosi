import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { trustedPeople, users } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { firstIssue, trustedPersonSchema } from '@/lib/validators'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

/**
 * Dare la chiave a qualcuno.
 *
 * Si cerca per email perche' e l'unica cosa che si sa a memoria di una persona
 * fidata. Se quell'email non ha un account non lo diciamo in modo da poterci
 * scoprire chi e iscritto e chi no: e un elenco che non riguarda chi chiede.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const parsed = trustedPersonSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }

  const db = await getDb()
  const found = await db
    .select({ id: users.id, name: users.name, accountType: users.accountType })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  const person = found[0]

  // La risposta e' la stessa che si ha per chi c'e' gia': chi chiede vede
  // "fatto" e non puo' usare questo modulo per scoprire chi e' iscritto. Se
  // quella persona si iscrivera' un giorno, la chiave la si rida' allora: il
  // costo e' un gesto in piu', il guadagno e' un elenco che non esce.
  if (!person) {
    return NextResponse.json(
      { person: { name: parsed.data.email, isVet: false }, scope: 'ALL' },
      { status: 201 },
    )
  }
  if (person.id === user.id) {
    return NextResponse.json({ error: 'I tuoi animali li vedi gia.' }, { status: 400 })
  }

  const already = await db
    .select({ id: trustedPeople.id })
    .from(trustedPeople)
    .where(and(eq(trustedPeople.ownerId, user.id), eq(trustedPeople.personId, person.id)))
    .limit(1)

  if (already[0]) {
    return NextResponse.json({ person: { name: person.name }, alreadyThere: true })
  }

  // A un veterinario si da di partenza la sola parte sanitaria: e' quella che
  // gli serve, ed e' l'unica che ha motivo di ricevere. Il proprietario puo'
  // sempre allargare, ma deve essere una sua scelta esplicita.
  const scope = person.accountType === 'VET' ? 'MEDICAL' : 'ALL'
  await db.insert(trustedPeople).values({ ownerId: user.id, personId: person.id, scope })
  return NextResponse.json(
    { person: { name: person.name, isVet: person.accountType === 'VET' }, scope },
    { status: 201 },
  )
}

/** Riprendersi la chiave. Da quel momento non vede piu niente. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Manca chi togliere' }, { status: 400 })

  const db = await getDb()
  await db
    .delete(trustedPeople)
    .where(and(eq(trustedPeople.id, id), eq(trustedPeople.ownerId, user.id)))

  return NextResponse.json({ ok: true })
}

/** Allarga o stringe quello che una persona fidata puo vedere. */
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as {
    id?: string
    scope?: string
    primaryVet?: boolean
  }
  if (!body.id) return NextResponse.json({ error: 'Manca chi cambiare' }, { status: 400 })

  const db = await getDb()

  // Il veterinario di riferimento e uno solo, e vede tutto: e il senso della
  // parola. Nominarne un altro toglie il titolo al precedente.
  if (body.primaryVet) {
    await db
      .update(trustedPeople)
      .set({ primaryVet: false })
      .where(eq(trustedPeople.ownerId, user.id))
    await db
      .update(trustedPeople)
      .set({ primaryVet: true, scope: 'ALL' })
      .where(and(eq(trustedPeople.id, body.id), eq(trustedPeople.ownerId, user.id)))
    return NextResponse.json({ scope: 'ALL', primaryVet: true })
  }

  const scope = body.scope === 'MEDICAL' ? 'MEDICAL' : 'ALL'
  await db
    .update(trustedPeople)
    .set({ scope, primaryVet: false })
    .where(and(eq(trustedPeople.id, body.id), eq(trustedPeople.ownerId, user.id)))

  return NextResponse.json({ scope, primaryVet: false })
}
