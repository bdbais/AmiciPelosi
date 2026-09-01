import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Iscrizione push non valida' }, { status: 400 })
  }

  // Lo stesso endpoint puo cambiare proprietario se il dispositivo e condiviso.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, userId: user.id },
    create: { endpoint, p256dh, auth, userId: user.id },
  })

  return NextResponse.json({ ok: true })
}
