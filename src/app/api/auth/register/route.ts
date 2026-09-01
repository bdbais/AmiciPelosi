import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession, hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validators'

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    )
  }

  const { name, email, phone, password } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Esiste gia un account con questa email' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash: await hashPassword(password),
    },
    select: { id: true, name: true, email: true },
  })

  await createSession(user.id)
  return NextResponse.json({ user }, { status: 201 })
}
