import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { createSession, hashPassword } from '@/lib/auth'
import { registerSchema, firstIssue } from '@/lib/validators'
import { readJson } from '@/lib/http'

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 },
    )
  }

  const { name, email, phone, password } = parsed.data
  const db = await getDb()

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing[0]) {
    return NextResponse.json({ error: 'Esiste gia un account con questa email' }, { status: 409 })
  }

  const created = await db
    .insert(users)
    .values({
      name,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
    })
    .returning({ id: users.id, name: users.name, email: users.email })

  await createSession(created[0].id)
  return NextResponse.json({ user: created[0] }, { status: 201 })
}
