import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { createSession, verifyPassword } from '@/lib/auth'
import { loginSchema, firstIssue } from '@/lib/validators'
import { readJson } from '@/lib/http'

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data
  const db = await getDb()
  const found = await db
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  // Messaggio unico per non rivelare quali email sono registrate.
  const invalid = NextResponse.json({ error: 'Email o password non corretti' }, { status: 401 })
  const user = found[0]
  if (!user) return invalid

  if (!user.passwordHash) {
    return NextResponse.json(
      { error: 'Questo account usa l accesso con Google: entra con il pulsante Google' },
      { status: 401 },
    )
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid

  await createSession(user.id)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
