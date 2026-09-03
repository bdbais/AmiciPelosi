import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { clientIp, deviceToken, recordDevice, setDeviceCookie } from '@/lib/devices'
import { crossOriginResponse, sameOrigin } from '@/lib/http'

/**
 * «Sono qui, e sono entrato da…». Il browser lo manda al massimo una volta
 * l'ora (vedi Presence.tsx): serve a chi modera per sapere chi usa il sito
 * davvero e da dove, non a tracciare nessuno. Da qui esce solo un'ora
 * arrotondata e la parola "app" o "sito".
 *
 * Il server non puo' distinguere l'app dal sito da solo: l'app e' Chrome a
 * schermo intero, con la stessa firma. Lo sa solo la pagina, che vede
 * `display-mode: standalone` e il referrer android-app://.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { client?: unknown }
  const client = body.client === 'APP' ? 'APP' : 'SITO'

  const db = await getDb()
  await db.update(users).set({ lastSeenAt: new Date(), lastClient: client }).where(eq(users.id, user.id))

  // Anche il browser: chi era gia' dentro prima che esistesse il cookie del
  // dispositivo lo riceve qui, alla prima pagina, senza dover riaccedere.
  // Il confronto con i bloccati no: quello si fa entrando, una volta sola.
  const device = deviceToken(request)
  if (device.isNew) await setDeviceCookie(device.token)
  await recordDevice(user.id, device.token, clientIp(request))
  return NextResponse.json({ ok: true })
}
