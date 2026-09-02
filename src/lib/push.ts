import { and, eq, gt, gte, inArray, lte, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, pushSubscriptions, users } from '@/db/schema'
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
      alertEveryMinutes: users.alertEveryMinutes,
      alertLastSentAt: users.alertLastSentAt,
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
      id: string
      alertLat: number | null
      alertLng: number | null
      alertRadiusKm: number
      alertEveryMinutes: number
      alertLastSentAt: Date | null
      subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[]
    }
  >()
  for (const row of rows) {
    const entry = candidates.get(row.userId) ?? {
      id: row.userId,
      alertLat: row.alertLat,
      alertLng: row.alertLng,
      alertRadiusKm: row.alertRadiusKm,
      alertEveryMinutes: row.alertEveryMinutes,
      alertLastSentAt: row.alertLastSentAt,
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

  /*
   * Una segnalazione senza vita non va a tutta la zona.
   *
   * Serve a far smettere di cercare, quindi riguarda solo chi sta cercando: chi
   * ha un annuncio di smarrimento aperto li vicino. A tutti gli altri sarebbe
   * solo una brutta notizia su un animale che non conoscono.
   *
   * E non aspetta il turno del riepilogo: ogni ora in piu e un'ora di ricerca
   * che qualcuno spende per niente.
   */
  const quiet = post.kind === 'FOUND_DEAD'
  const searching = quiet ? await usersSearchingNearby(db, post) : null

  const staleSubscriptions: string[] = []
  const notifiedUsers: string[] = []
  const now = new Date()
  let delivered = 0

  await Promise.all(
    [...candidates.values()].map(async (user) => {
      if (user.alertLat == null || user.alertLng == null) return
      if (user.subscriptions.length === 0) return

      const km = distanceKm(user.alertLat, user.alertLng, post.lat, post.lng)
      if (km > user.alertRadiusKm) return

      if (quiet && !searching?.has(user.id)) return

      // Un avviso per ogni annuncio, in una citta grande, e una sveglia ogni
      // pochi minuti: dopo due giorni si spengono le notifiche e non si
      // riaccendono piu. Chi lo riceve sceglie il proprio ritmo, e nel
      // frattempo le novita si accumulano e partono insieme.
      const waited = user.alertLastSentAt
        ? now.getTime() - user.alertLastSentAt.getTime()
        : Number.POSITIVE_INFINITY
      if (!quiet && waited < user.alertEveryMinutes * 60_000) return

      const pending = quiet
        ? 1
        : user.alertLastSentAt
          ? await countNewNearby(db, user.alertLat, user.alertLng, user.alertRadiusKm, user.alertLastSentAt, user.id)
          : 1

      const payload = JSON.stringify(
        quiet
          ? {
              // Nessuna emoji allegra, nessun punto esclamativo, e la scelta di
              // aprire resta a chi legge.
              title: '● Segnalazione in zona',
              body: `È stato trovato un ${(speciesMeta?.label ?? 'animale').toLowerCase()} senza vita a ${formatDistance(km)} da te. Se stai cercando, forse vale la pena guardare.`,
              url: `/annunci/${post.id}`,
              tag: 'senza-vita',
            }
          : pending > 1
          ? {
              title: '🐾 Aggiornamenti in zona · Amici Pelosi',
              body: `${pending} novita entro ${Math.round(user.alertRadiusKm)} km, l ultima: ${post.title} (${post.city})`,
              url: '/bacheca',
              tag: 'zona',
            }
          : {
              title: `${kindMeta?.emoji ?? '🐾'} ${kindMeta?.label ?? 'Annuncio'} a ${formatDistance(km)} da te`,
              body: `${speciesMeta?.label ?? 'Animale'} - ${post.title} (${post.city})`,
              url: `/annunci/${post.id}`,
              tag: 'zona',
            },
      )

      if (!quiet) notifiedUsers.push(user.id)

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

  // Da adesso ricomincia il conto dell'attesa per chi e stato avvisato.
  if (notifiedUsers.length > 0) {
    await db
      .update(users)
      .set({ alertLastSentAt: now })
      .where(inArray(users.id, notifiedUsers))
      .catch(() => undefined)
  }

  // Le iscrizioni revocate dal browser non servono piu.
  if (staleSubscriptions.length > 0) {
    await db
      .delete(pushSubscriptions)
      .where(inArray(pushSubscriptions.id, staleSubscriptions))
      .catch(() => undefined)
  }

  return delivered
}

/**
 * Quante novita sono comparse nella zona di una persona da quando le abbiamo
 * scritto l'ultima volta. Serve a dire "3 novita" invece di svegliarla tre
 * volte: il riquadro fa da setaccio grossolano, la distanza esatta rifinisce.
 */
async function countNewNearby(
  db: Awaited<ReturnType<typeof getDb>>,
  lat: number,
  lng: number,
  radiusKm: number,
  since: Date,
  viewerId: string,
) {
  const box = boundingBox(lat, lng, radiusKm)
  const rows = await db
    .select({ lat: posts.lat, lng: posts.lng })
    .from(posts)
    .where(
      and(
        eq(posts.status, 'OPEN'),
        ne(posts.authorId, viewerId),
        gt(posts.createdAt, since),
        gte(posts.lat, box.minLat),
        lte(posts.lat, box.maxLat),
        gte(posts.lng, box.minLng),
        lte(posts.lng, box.maxLng),
      ),
    )
    .limit(50)

  return rows.filter((row) => distanceKm(lat, lng, row.lat, row.lng) <= radiusKm).length
}

/**
 * Chi ha un annuncio di smarrimento ancora aperto vicino a questo punto.
 *
 * E l'unica gente a cui una segnalazione senza vita serve davvero: agli altri
 * sarebbe una brutta notizia su un animale che non conoscono.
 */
async function usersSearchingNearby(
  db: Awaited<ReturnType<typeof getDb>>,
  post: NearbyPost,
): Promise<Set<string>> {
  const box = boundingBox(post.lat, post.lng, MAX_ALERT_RADIUS_KM)
  const rows = await db
    .select({ authorId: posts.authorId, lat: posts.lat, lng: posts.lng })
    .from(posts)
    .where(
      and(
        eq(posts.kind, 'LOST'),
        eq(posts.status, 'OPEN'),
        gte(posts.lat, box.minLat),
        lte(posts.lat, box.maxLat),
        gte(posts.lng, box.minLng),
        lte(posts.lng, box.maxLng),
      ),
    )

  const found = new Set<string>()
  for (const row of rows) {
    if (distanceKm(post.lat, post.lng, row.lat, row.lng) <= MAX_ALERT_RADIUS_KM) {
      found.add(row.authorId)
    }
  }
  return found
}
