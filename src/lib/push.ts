import webpush from 'web-push'
import { prisma } from './prisma'
import { boundingBox, distanceKm, formatDistance } from './geo'
import { KINDS, SPECIES, type Kind, type Species } from './constants'

let configured: boolean | null = null

/** Configura le chiavi VAPID una sola volta; senza chiavi le push restano disattivate. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    configured = false
    return false
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:info@amicipelosi.it',
    publicKey,
    privateKey,
  )
  configured = true
  return true
}

export function pushEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
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

/**
 * Avvisa chi ha attivato le notifiche e ha la zona di interesse entro il
 * proprio raggio dall'annuncio appena pubblicato.
 * Restituisce il numero di destinatari raggiunti.
 */
export async function notifyNearbyUsers(post: NearbyPost): Promise<number> {
  if (!ensureConfigured()) return 0

  // Pre-filtro largo: il raggio massimo consentito e 100 km.
  const box = boundingBox(post.lat, post.lng, 100)

  const candidates = await prisma.user.findMany({
    where: {
      alertsEnabled: true,
      id: { not: post.authorId },
      alertLat: { gte: box.minLat, lte: box.maxLat },
      alertLng: { gte: box.minLng, lte: box.maxLng },
    },
    select: {
      id: true,
      alertLat: true,
      alertLng: true,
      alertRadiusKm: true,
      subscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } },
    },
  })

  const kindMeta = KINDS[post.kind as Kind]
  const speciesMeta = SPECIES[post.species as Species]
  let delivered = 0

  await Promise.all(
    candidates.map(async (user) => {
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
        user.subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
            )
            delivered++
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode
            // 404/410: iscrizione revocata dal browser, la rimuoviamo.
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription
                .delete({ where: { id: sub.id } })
                .catch(() => undefined)
            } else {
              console.error('Invio push fallito:', error)
            }
          }
        }),
      )
    }),
  )

  return delivered
}
