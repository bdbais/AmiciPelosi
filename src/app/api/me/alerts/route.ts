import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
import { alertSettingsSchema } from '@/lib/validators'

/** Salva zona e raggio per le notifiche di prossimita. */
export async function PATCH(request: Request) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const parsed = alertSettingsSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dati non validi' },
      { status: 400 },
    )
  }
  const data = parsed.data

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      alertsEnabled: data.alertsEnabled,
      alertRadiusKm: data.alertRadiusKm,
      alertLat: data.alertLat ?? null,
      alertLng: data.alertLng ?? null,
      alertCity: data.alertCity || null,
    },
    select: {
      alertsEnabled: true,
      alertRadiusKm: true,
      alertLat: true,
      alertLng: true,
      alertCity: true,
    },
  })

  return NextResponse.json({ settings: updated })
}
