import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.endpoint) {
    return NextResponse.json({ error: 'Endpoint mancante' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: user.id } })
  return NextResponse.json({ ok: true })
}
