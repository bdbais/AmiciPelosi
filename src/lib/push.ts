import { and, eq, gte, inArray, lte, ne } from 'drizzle-orm'
import { getDb } from '@/db'
import { pushSubscriptions, users } from '@/db/schema'
import { boundingBox, distanceKm, formatDistance } from './geo'
import { KINDS, SPECIES, type Kind, type Species } from './constants'
import { sendPushNotification } from './webpush'

export function pushEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function vapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT || 'mailto:info@amicipelosi.it',
  }
}

type NearbyPost = {
  id: string
  kind: string
  title: string
  species: string
  city: string
  lat: number
  lng: number
  authorId: string
}

/** Raggio massimo selezionabile dagli utenti: limita il pre-filtro. */
const MAX_ALERT_RADIUS_KM = 100

/**
 * Avvisa chi ha attivato le notifiche e ha la zona di interesse entro il
 * proprio raggio dall'annuncio appena pubblicato.
 * Restituisce il numero di dispositivi raggiunti.
 */
export async function notifyNearbyUsers(post: NearbyPost): Promise<number> {
  const vapid = vapidConfig()
  if (!vapid) return 0

  const db = await getDb()
  const box = boundingBox(post.lat, post.lng, MAX_ALERT_RADIUS_KM)

  // Una sola query: utenti nel riquadro con i loro dispositivi registrati.
  const rows = await db
    .select({
      userId: users.id,
      alertLat: users.alertLat,
      alertLng: users.alertLng,
      alertRadiusKm: users.alertRadiusKm,
      subscriptionId: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(users)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.userId, users.id))
    .where(
      and(
        eq(users.alertsEnabled, true),
        ne(users.id, post.authorId),
        gte(users.alertLat, box.minLat),
        lte(users.alertLat, box.maxLat),
        gte(users.alertLng, box.minLng),
        lte(users.alertLng, box.maxLng),
      ),
    )

  const candidates = new Map<
    string,
    {
      alertLat: number | null
      alertLng: number | null
      alertRadiusKm: number
      subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[]
    }
  >()
  for (const row of rows) {
    const entry = candidates.get(row.userId) ?? {
      alertLat: row.alertLat,
      alertLng: row.alertLng,
      alertRadiusKm: row.alertRadiusKm,
      subscriptions: [],
    }
    entry.subscriptions.push({
      id: row.subscriptionId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    })
    candidates.set(row.userId, entry)
  }

  const kindMeta = KINDS[post.kind as Kind]
  const speciesMeta = SPECIES[post.species as Species]
  const staleSubscriptions: string[] = []
  let delivered = 0

  await Promise.all(
    [...candidates.values()].map(async (user) => {
      if (user.alertLat == null || user.alertLng == null) return
      if (user.subscriptions.length === 0) return

      const km = distanceKm(user.alertLat, user.alertLng, post.lat, post.lng)
      if (km > user.alertRadiusKm) return

      const payload = JSON.stringify({
        title: `${kindMeta?.emoji ?? '🐾'} ${kindMeta?.label ?? 'Annuncio'} a ${formatDistance(km)} da te`,
        body: `${speciesMeta?.label ?? 'Animale'} - ${post.title} (${post.city})`,
        url: `/annunci/${post.id}`,
        tag: `post-${post.id}`,
      })

      await Promise.all(
        user.subscriptions.map(async (subscription) => {
          try {
            const result = await sendPushNotification(subscription, payload, vapid)
            if (result.ok) delivered++
            else if (result.gone) staleSubscriptions.push(subscription.id)
          } catch (error) {
            console.error('Invio push fallito:', error)
          }
        }),
      )
    }),
  )

  // Le iscrizioni revocate dal browser non servono piu.
  if (staleSubscriptions.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, staleSubscriptions))
      .catch(() => undefined)
  }

  return delivered
}
