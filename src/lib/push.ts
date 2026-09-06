import { and, eq, gt, gte, inArray, isNull, lte, ne } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts, pushSubscriptions, users } from '@/db/schema'
import { boundingBox, distanceKm, formatDistance } from './geo'
import { KINDS, SPECIES, type Kind, type Species } from './constants'
import { notByBannedAuthor, notRemoved } from './queries'
import { buildVapidHeader, sendPushNotification, type SendOptions } from './webpush'

export function pushEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

type Vapid = { publicKey: string; privateKey: string; subject: string }

function vapidConfig(): Vapid | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT || 'mailto:info@amicipelosi.it',
  }
}

type Db = Awaited<ReturnType<typeof getDb>>

export type NearbyPost = {
  id: string
  kind: string
  title: string
  species: string
  city: string
  lat: number
  lng: number
  authorId: string
  /** Manca per un annuncio appena scritto, che e' sempre OPEN. */
  status?: string
}

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string }

export type Recipient = {
  id: string
  alertLat: number
  alertLng: number
  alertRadiusKm: number
  alertEveryMinutes: number
  alertLastSentAt: Date | null
  /** Distanza fra la zona della persona e l'annuncio. */
  km: number
  subscriptions: Subscription[]
}

/** Raggio massimo selezionabile dagli utenti: limita il pre-filtro. */
const MAX_ALERT_RADIUS_KM = 100

/** Quanti invii alla volta: il runtime ha un tetto alle connessioni aperte insieme. */
const BATCH_SIZE = 6

/**
 * Il JWT VAPID e' legato all'origine dell'endpoint, non all'iscrizione: per
 * cento telefoni Android e' lo stesso servizio Google, e firmarlo cento volte
 * sono cento firme ECDSA buttate. Una per origine, dentro la stessa chiamata.
 */
function vapidHeaderCache(vapid: Vapid) {
  const byOrigin = new Map<string, Promise<string>>()
  return (endpoint: string) => {
    const origin = new URL(endpoint).origin
    let cached = byOrigin.get(origin)
    if (!cached) {
      cached = buildVapidHeader(endpoint, vapid.subject, vapid.publicKey, vapid.privateKey)
      byOrigin.set(origin, cached)
    }
    return cached
  }
}

/** Uno smarrimento e una segnalazione senza vita hanno fretta; il resto no. */
function urgencyFor(kind: string): SendOptions['urgency'] {
  return kind === 'LOST' || kind === 'FOUND_DEAD' ? 'high' : 'normal'
}

type Job = { subscription: Subscription; payload: string; options: SendOptions }

/**
 * Manda le notifiche a lotti e dice quali dispositivi sono stati raggiunti e
 * quali iscrizioni non valgono piu'. Un invio che fallisce non ferma gli
 * altri: Promise.allSettled, non Promise.all.
 */
async function deliver(
  jobs: Job[],
  vapid: Vapid,
): Promise<{ delivered: Set<string>; stale: string[] }> {
  const authorizationFor = vapidHeaderCache(vapid)
  const delivered = new Set<string>()
  const stale: string[] = []

  for (let start = 0; start < jobs.length; start += BATCH_SIZE) {
    const batch = jobs.slice(start, start + BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const authorization = await authorizationFor(job.subscription.endpoint)
        return sendPushNotification(job.subscription, job.payload, vapid, {
          ...job.options,
          authorization,
        })
      }),
    )
    results.forEach((result, index) => {
      const subscription = batch[index].subscription
      if (result.status === 'rejected') {
        console.error('Invio push fallito:', result.reason)
        return
      }
      if (result.value.ok) delivered.add(subscription.id)
      else if (result.value.gone) stale.push(subscription.id)
    })
  }

  return { delivered, stale }
}

/** Le iscrizioni revocate dal browser, o firmate con una chiave vecchia, non servono piu'. */
async function forgetStale(db: Db, stale: string[]) {
  if (stale.length === 0) return
  await db
    .delete(pushSubscriptions)
    .where(inArray(pushSubscriptions.id, stale))
    .catch(() => undefined)
}

/**
 * Chi ha attivato le notifiche, ha la zona entro il proprio raggio
 * dall'annuncio, e ha almeno un dispositivo registrato.
 *
 * E' separata dall'invio perche' l'invio parte dopo la risposta (after) e la
 * pagina vuole comunque dire "abbiamo avvisato N persone": questo numero e'
 * la stima, calcolata prima.
 */
export async function nearbyRecipients(post: NearbyPost): Promise<Recipient[]> {
  if (!vapidConfig()) return []

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
        // Il blocco cancella le iscrizioni, ma un dispositivo puo' averne
        // registrata una prima: a chi e' fuori non si manda niente.
        isNull(users.bannedAt),
        ne(users.id, post.authorId),
        gte(users.alertLat, box.minLat),
        lte(users.alertLat, box.maxLat),
        gte(users.alertLng, box.minLng),
        lte(users.alertLng, box.maxLng),
      ),
    )

  const candidates = new Map<string, Recipient>()
  for (const row of rows) {
    if (row.alertLat == null || row.alertLng == null) continue
    const km = distanceKm(row.alertLat, row.alertLng, post.lat, post.lng)
    if (km > row.alertRadiusKm) continue

    const entry = candidates.get(row.userId) ?? {
      id: row.userId,
      alertLat: row.alertLat,
      alertLng: row.alertLng,
      alertRadiusKm: row.alertRadiusKm,
      alertEveryMinutes: row.alertEveryMinutes,
      alertLastSentAt: row.alertLastSentAt,
      km,
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

  /*
   * Una segnalazione senza vita non va a tutta la zona.
   *
   * Serve a far smettere di cercare, quindi riguarda solo chi sta cercando: chi
   * ha un annuncio di smarrimento aperto li' vicino, della stessa specie. A
   * tutti gli altri sarebbe solo una brutta notizia su un animale che non
   * conoscono.
   */
  if (post.kind === 'FOUND_DEAD') {
    const searching = await usersSearchingNearby(db, post)
    return [...candidates.values()].filter((user) => searching.has(user.id))
  }

  return [...candidates.values()]
}

/**
 * Avvisa chi sta vicino all'annuncio appena pubblicato.
 *
 * Va chiamata dentro after() dal chiamante: la pubblicazione non deve
 * aspettare cento POST verso Google e Mozilla. Restituisce il numero di
 * dispositivi raggiunti, che a quel punto legge solo il log.
 */
export async function notifyNearbyUsers(
  post: NearbyPost,
  recipients?: Recipient[],
): Promise<number> {
  const vapid = vapidConfig()
  if (!vapid) return 0
  // Un annuncio rimosso non deve svegliare nessuno, nemmeno per sbaglio.
  if (post.status === 'REMOVED') return 0

  const db = await getDb()
  const candidates = recipients ?? (await nearbyRecipients(post))
  if (candidates.length === 0) return 0

  const kindMeta = KINDS[post.kind as Kind]
  const speciesMeta = SPECIES[post.species as Species]
  const quiet = post.kind === 'FOUND_DEAD'

  /*
   * Uno smarrimento non aspetta il turno del riepilogo, e nemmeno una
   * segnalazione senza vita: ogni ora in piu' e' un'ora di ricerca che
   * qualcuno spende per niente, o che non spende affatto.
   *
   * C'e' anche un motivo meno nobile: non esiste un cron che ripesca le
   * novita' rimaste indietro. Se lo smarrimento arrivasse dentro la finestra
   * di attesa di una persona, quella lo saprebbe solo al prossimo annuncio
   * pubblicato nella sua zona - fra un'ora o fra una settimana. Per gli
   * altri tipi (ritrovato, stallo, adozione) e' un ritardo accettabile; per
   * un cane sparito no.
   */
  const urgent = post.kind === 'LOST' || quiet
  const now = new Date()
  const tag = quiet ? 'senza-vita' : 'zona'

  const jobs: (Job & { userId: string })[] = []

  for (const user of candidates) {
    // Un avviso per ogni annuncio, in una citta' grande, e' una sveglia ogni
    // pochi minuti: dopo due giorni si spengono le notifiche e non si
    // riaccendono piu'. Chi lo riceve sceglie il proprio ritmo, e nel
    // frattempo le novita' si accumulano e partono insieme.
    const waited = user.alertLastSentAt
      ? now.getTime() - user.alertLastSentAt.getTime()
      : Number.POSITIVE_INFINITY
    if (!urgent && waited < user.alertEveryMinutes * 60_000) continue

    const pending =
      !urgent && user.alertLastSentAt
        ? await countNewNearby(db, user.alertLat, user.alertLng, user.alertRadiusKm, user.alertLastSentAt, user.id)
        : 1

    const payload = JSON.stringify(
      quiet
        ? {
            // Nessuna emoji allegra, nessun punto esclamativo, e la scelta di
            // aprire resta a chi legge.
            title: '● Segnalazione in zona',
            body: `È stato trovato un ${(speciesMeta?.label ?? 'animale').toLowerCase()} senza vita a ${formatDistance(user.km)} da te. Se stai cercando, forse vale la pena guardare.`,
            url: `/annunci/${post.id}`,
            tag,
          }
        : pending > 1
          ? {
              title: '🐾 Aggiornamenti in zona · Amici Pelosi',
              body: `${pending} novita entro ${Math.round(user.alertRadiusKm)} km, l ultima: ${post.title} (${post.city})`,
              url: '/bacheca',
              tag,
            }
          : {
              title: `${kindMeta?.emoji ?? '🐾'} ${kindMeta?.label ?? 'Annuncio'} a ${formatDistance(user.km)} da te`,
              body: `${speciesMeta?.label ?? 'Animale'} - ${post.title} (${post.city})`,
              url: `/annunci/${post.id}`,
              tag,
            },
    )

    for (const subscription of user.subscriptions) {
      jobs.push({
        userId: user.id,
        subscription,
        payload,
        options: { urgency: urgencyFor(post.kind), topic: tag },
      })
    }
  }

  const { delivered, stale } = await deliver(jobs, vapid)

  // Da adesso ricomincia il conto dell'attesa, ma solo per chi ha davvero
  // ricevuto qualcosa: segnare l'ora a chi non e' stato raggiunto vorrebbe
  // dire fargli perdere anche il riepilogo successivo.
  const reached = new Set(
    jobs.filter((job) => delivered.has(job.subscription.id)).map((job) => job.userId),
  )
  if (!quiet && reached.size > 0) {
    await db
      .update(users)
      .set({ alertLastSentAt: now })
      .where(inArray(users.id, [...reached]))
      .catch(() => undefined)
  }

  await forgetStale(db, stale)
  return delivered.size
}

/**
 * "Qualcuno ha visto Pongo": l'avviso a chi ha pubblicato, su tutti i suoi
 * dispositivi. E' la notifica che conta piu' di tutte, ed e' l'unica che non
 * passa da nessun riepilogo e da nessun raggio.
 */
export async function notifyPostAuthor(
  authorId: string,
  notification: { title: string; body: string; url: string; tag: string },
): Promise<number> {
  return notifyOneUser(authorId, notification, 'high')
}

/**
 * "Ti hanno detto grazie": l'avviso a chi ha aiutato.
 *
 * E' la gemella dell'avviso a chi ha pubblicato, con una differenza che conta:
 * non ha fretta. Un grazie che arriva quando il telefono si sveglia da solo
 * va benissimo, e chiedere al servizio push di forzare la consegna per un
 * cuoricino sarebbe rubare priorita' agli avvistamenti.
 */
export async function notifyThanked(
  userId: string,
  notification: { title: string; body: string; url: string; tag: string },
): Promise<number> {
  return notifyOneUser(userId, notification, 'normal')
}

/**
 * "Il tuo annuncio e' stato chiuso" o "rimosso", con il motivo.
 *
 * Senza questo avviso chi ha pubblicato scopre la cosa aprendo l'app e
 * trovando l'annuncio sparito, e la prima idea e' un guasto. Il motivo va
 * nel corpo, per intero: e' la parte che serve.
 */
export async function notifyModerated(
  authorId: string,
  post: { id: string; title: string },
  action: 'close' | 'remove',
  reason: string,
): Promise<number> {
  const what = action === 'remove' ? 'è stato rimosso' : 'è stato chiuso'
  return notifyOneUser(
    authorId,
    {
      title: `Il tuo annuncio ${what}`,
      body: `«${post.title.slice(0, 60)}» ${what} da chi modera. Motivo: ${reason}`,
      url: `/annunci/${post.id}`,
      tag: 'moderazione',
    },
    'normal',
  )
}

/**
 * "Sei verificato come Gattile", oppure "la verifica e' stata rifiutata" con
 * il motivo. Senza avviso la persona scopre l'esito riaprendo il profilo,
 * magari fra un mese, e nel frattempo pubblica come privato senza sapere
 * perche' non le si apre l'inserimento in blocco.
 */
export async function notifyVerification(
  userId: string,
  approved: boolean,
  note: string | null,
  typeLabel: string,
): Promise<number> {
  return notifyOneUser(
    userId,
    approved
      ? {
          title: `Sei verificato come ${typeLabel}`,
          body: note ? `Chi modera ha approvato la tua richiesta. ${note}` : 'Chi modera ha approvato la tua richiesta.',
          url: '/profilo',
          tag: 'verifica',
        }
      : {
          title: 'La verifica è stata rifiutata',
          body: `Motivo: ${note ?? 'non indicato'}. Puoi ripresentare la richiesta con un altro link, dal profilo.`,
          url: '/profilo',
          tag: 'verifica',
        },
    'normal',
  )
}

/**
 * A chi modera: "c'e' qualcosa da guardare". Tutti i moderatori e gli
 * amministratori che hanno le notifiche accese, in una volta. Chi modera ma
 * e' stato bloccato non le riceve: le sue iscrizioni sono gia' sparite.
 */
/** Chi modera ha tolto il logo: la persona legge il motivo e, se vuole, ne carica un altro. */
export async function notifyLogoRemoved(userId: string, reason: string): Promise<number> {
  return notifyOneUser(
    userId,
    {
      title: 'Il tuo logo è stato tolto',
      body: `Chi modera lo ha tolto. Motivo: ${reason}. Puoi caricarne un altro dal profilo.`,
      url: '/profilo#tipo',
      tag: 'moderazione',
    },
    'normal',
  )
}

export async function notifyModerators(title: string, body: string, url: string): Promise<number> {
  const vapid = vapidConfig()
  if (!vapid) return 0

  const db = await getDb()
  const subscriptions = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(and(inArray(users.role, ['MODERATOR', 'ADMIN']), isNull(users.bannedAt)))

  if (subscriptions.length === 0) return 0

  const payload = JSON.stringify({ title, body, url, tag: 'moderazione' })
  const { delivered, stale } = await deliver(
    subscriptions.map((subscription) => ({
      subscription,
      payload,
      options: { urgency: 'normal' as const, topic: 'moderazione' },
    })),
    vapid,
  )
  await forgetStale(db, stale)
  return delivered.size
}

/** Tutti i dispositivi di una persona, senza riepilogo e senza raggio. */
async function notifyOneUser(
  userId: string,
  notification: { title: string; body: string; url: string; tag: string },
  urgency: SendOptions['urgency'],
): Promise<number> {
  const vapid = vapidConfig()
  if (!vapid) return 0

  const db = await getDb()
  const subscriptions = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  if (subscriptions.length === 0) return 0

  const payload = JSON.stringify(notification)
  const { delivered, stale } = await deliver(
    subscriptions.map((subscription) => ({
      subscription,
      payload,
      options: { urgency, topic: notification.tag },
    })),
    vapid,
  )
  await forgetStale(db, stale)
  return delivered.size
}

/**
 * Quante novita sono comparse nella zona di una persona da quando le abbiamo
 * scritto l'ultima volta. Serve a dire "3 novita" invece di svegliarla tre
 * volte: il riquadro fa da setaccio grossolano, la distanza esatta rifinisce.
 */
async function countNewNearby(
  db: Db,
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
        notByBannedAuthor(db),
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
 * Chi ha un annuncio di smarrimento ancora aperto vicino a questo punto, per
 * lo stesso tipo di animale.
 *
 * E' l'unica gente a cui una segnalazione senza vita serve davvero: agli altri
 * sarebbe una brutta notizia su un animale che non conoscono. E chi cerca un
 * gatto non ha bisogno di sapere di un cane.
 */
async function usersSearchingNearby(db: Db, post: NearbyPost): Promise<Set<string>> {
  const box = boundingBox(post.lat, post.lng, MAX_ALERT_RADIUS_KM)
  const rows = await db
    .select({ authorId: posts.authorId, lat: posts.lat, lng: posts.lng })
    .from(posts)
    .where(
      and(
        eq(posts.kind, 'LOST'),
        eq(posts.status, 'OPEN'),
        notRemoved(),
        eq(posts.species, post.species),
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
