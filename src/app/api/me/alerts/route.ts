import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { alertSettingsSchema, firstIssue } from '@/lib/validators'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'

/** Salva zona e raggio per le notifiche di prossimita. */
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const parsed = alertSettingsSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 },
    )
  }
  const data = parsed.data

  const db = await getDb()
  const updated = await db
    .update(users)
    .set({
      alertsEnabled: data.alertsEnabled,
      alertRadiusKm: data.alertRadiusKm,
      alertEveryMinutes: data.alertEveryMinutes ?? 30,
      alertLat: data.alertLat ?? null,
      alertLng: data.alertLng ?? null,
      alertCity: data.alertCity || null,
    })
    .where(eq(users.id, user.id))
    .returning({
      alertsEnabled: users.alertsEnabled,
      alertRadiusKm: users.alertRadiusKm,
      alertEveryMinutes: users.alertEveryMinutes,
      alertLat: users.alertLat,
      alertLng: users.alertLng,
      alertCity: users.alertCity,
    })

  return NextResponse.json({ settings: updated[0] })
}
