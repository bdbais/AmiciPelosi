import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession, verifyPassword } from '@/lib/auth'
import { loginSchema } from '@/lib/validators'

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  // Messaggio unico per non rivelare quali email sono registrate.
  const invalid = NextResponse.json({ error: 'Email o password non corretti' }, { status: 401 })
  if (!user) return invalid
  if (!(await verifyPassword(password, user.passwordHash))) return invalid

  await createSession(user.id)
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
