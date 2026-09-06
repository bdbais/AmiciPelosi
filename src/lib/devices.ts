/**
 * Riconoscere il browser da cui si entra, per accorgersi di chi e' stato
 * bloccato e rientra con un'altra email.
 *
 * Niente impronte del telefono: si lascia un codice casuale in un cookie
 * (ap_dev) e si ricorda quali account l'hanno usato, piu' l'indirizzo di
 * rete abbreviato per 30 giorni. Il confronto si fa una volta, quando ci si
 * registra o si accede, e l'esito e' un sospetto per chi modera: "somiglia
 * a…". Bloccare, da qui, non lo fa nessuno da solo. L'unica porta chiusa in
 * automatico e' quella di un dispositivo che una persona ha gia' bloccato.
 *
 * L'app Android e' Chrome a schermo intero e condivide i cookie con Chrome:
 * lo stesso codice vale per l'app e per il sito.
 *
 * Solo server. Non importa moderation.ts, che a sua volta importa questo
 * file: il registro lo scrive da se'.
 */
import { cookies } from 'next/headers'
import { after } from 'next/server'
import { and, desc, eq, gt, inArray, isNotNull, lt, ne, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { devices, moderationLog, userDevices, userIps, users } from '@/db/schema'
import type { SuspectOf } from './moderation-types'
import { notifyModerators } from './push'

const COOKIE_NAME = 'ap_dev'
/** 400 giorni: il tetto che Chrome accetta per un cookie. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400
/** Quanto restano gli indirizzi di rete. Dopo, chi era sulla stessa rete di un bloccato non e' piu' sospetto. */
const IP_DAYS = 30
/**
 * Quanto indietro si guarda per dire "questo browser e' suo": un telefono
 * cambiato un anno fa non deve chiudere la porta a chi lo usa oggi.
 */
export const DEVICE_DAYS = 90

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

export type DeviceToken = { token: string; isNew: boolean }

/**
 * Il codice del browser: quello nel cookie, oppure uno nuovo se manca o e'
 * stato manomesso. Chi chiama lo mette nella risposta con setDeviceCookie
 * quando isNew, e ricorda che un codice nuovo non puo' essere bloccato.
 */
export function deviceToken(request: Request): DeviceToken {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name !== COOKIE_NAME) continue
    const value = rest.join('=').trim()
    if (/^[0-9a-f]{32}$/.test(value)) return { token: value, isNew: false }
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { token, isNew: true }
}

/** Funziona solo dentro una rotta API o un'azione server: i componenti non scrivono cookie. */
export async function setDeviceCookie(token: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

/** L'indirizzo di chi chiama, come lo passa Cloudflare; null se non si sa. */
export function clientIp(request: Request): string | null {
  const ip =
    request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return ip || null
}

/**
 * L'indirizzo abbreviato: i primi 32 caratteri dell'hash con il segreto di
 * firma. Senza il segreto non si torna all'indirizzo, e senza il segreto
 * non si scrive niente. Web Crypto, perche' gira sul Worker.
 */
export async function hashIp(ip: string): Promise<string | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${ip}`))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

/** Un dispositivo bloccato da chi modera: da li' non si entra e non ci si registra. */
export async function isDeviceBanned(token: string): Promise<boolean> {
  const db = await getDb()
  const rows = await db
    .select({ bannedAt: devices.bannedAt })
    .from(devices)
    .where(eq(devices.id, token))
    .limit(1)
  return Boolean(rows[0]?.bannedAt)
}

/**
 * "Questo account e' passato da questo browser, da questo indirizzo, adesso."
 * Restituisce l'hash dell'indirizzo, che serve subito dopo al confronto.
 */
export async function recordDevice(userId: string, token: string, ip: string | null): Promise<string | null> {
  const db = await getDb()
  const now = new Date()

  await db.insert(devices).values({ id: token }).onConflictDoNothing()
  await db
    .insert(userDevices)
    .values({ userId, deviceId: token, firstSeenAt: now, lastSeenAt: now })
    .onConflictDoUpdate({ target: [userDevices.userId, userDevices.deviceId], set: { lastSeenAt: now } })

  const ipHash = ip ? await hashIp(ip) : null
  if (!ipHash) return null

  await db
    .insert(userIps)
    .values({ userId, ipHash, lastSeenAt: now })
    .onConflictDoUpdate({ target: [userIps.userId, userIps.ipHash], set: { lastSeenAt: now } })
  // La pulizia si fa qui, a ogni scrittura: e' una DELETE su un indice e non
  // c'e' un cron. Trenta giorni sono la promessa dei termini d'uso.
  await db.delete(userIps).where(lt(userIps.lastSeenAt, daysAgo(IP_DAYS)))
  return ipHash
}

/**
 * C'e' un bloccato che ha usato lo stesso browser, o la stessa rete negli
 * ultimi 30 giorni? Se si', l'account viene segnato come "somiglia a…", la
 * cosa finisce nel registro e chi modera riceve un avviso. Il browser vale
 * piu' della rete: una rete la condividono un condominio o un bar.
 */
export async function findSuspects(userId: string, token: string, ipHash: string | null): Promise<SuspectOf | null> {
  const db = await getDb()
  const bannedFields = { id: users.id, name: users.name, bannedReason: users.bannedReason }

  let reason = 'stesso dispositivo'
  let match = (
    await db
      .select(bannedFields)
      .from(userDevices)
      .innerJoin(users, eq(users.id, userDevices.userId))
      .where(and(eq(userDevices.deviceId, token), ne(userDevices.userId, userId), isNotNull(users.bannedAt)))
      .orderBy(desc(users.bannedAt))
      .limit(1)
  )[0]

  if (!match && ipHash) {
    reason = `stesso indirizzo di rete negli ultimi ${IP_DAYS} giorni`
    match = (
      await db
        .select(bannedFields)
        .from(userIps)
        .innerJoin(users, eq(users.id, userIps.userId))
        .where(
          and(
            eq(userIps.ipHash, ipHash),
            ne(userIps.userId, userId),
            isNotNull(users.bannedAt),
            gt(userIps.lastSeenAt, daysAgo(IP_DAYS)),
          ),
        )
        .orderBy(desc(users.bannedAt))
        .limit(1)
    )[0]
  }
  if (!match) return null

  const suspect: SuspectOf = { id: match.id, name: match.name, bannedReason: match.bannedReason ?? null }
  const me = (await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1))[0]
  const myName = me?.name ?? userId

  await db
    .update(users)
    .set({ suspectOf: suspect.id, suspectReason: reason, suspectAt: new Date() })
    .where(eq(users.id, userId))
  // Nel registro l'autore e' l'account stesso: non l'ha fatto nessuno, l'ha
  // fatto entrando. Chi legge il registro capisce da dove viene la riga.
  await db.insert(moderationLog).values({
    actorId: userId,
    action: 'user.suspect',
    targetType: 'USER',
    targetId: userId,
    targetLabel: myName.slice(0, 120),
    reason: `${reason}: ${suspect.name}`,
  })

  afterResponse(() =>
    notifyModerators(
      'Un account somiglia a una persona bloccata',
      `${myName} somiglia a ${suspect.name} (${reason}). Decidi tu.`,
      `/persone/${userId}`,
    ),
  )
  return suspect
}

/**
 * Tutto quello che va fatto quando una persona entra: il cookie se manca, la
 * riga del browser e dell'indirizzo, e il confronto con i bloccati. Il
 * confronto si fa solo finche' l'account non e' gia' segnato: rifarlo a
 * ogni accesso sarebbe lavoro buttato e un avviso in piu' a chi modera.
 */
export async function noteEntry(request: Request, user: { id: string; suspectOf: string | null }, device: DeviceToken) {
  if (device.isNew) await setDeviceCookie(device.token)
  const ipHash = await recordDevice(user.id, device.token, clientIp(request))
  if (user.suspectOf === null) await findSuspects(user.id, device.token, ipHash)
}

/**
 * Blocca i browser da cui questa persona e' entrata negli ultimi 90 giorni e
 * butta fuori chiunque li abbia usati nello stesso periodo: la sessione
 * aperta non ricontrolla il dispositivo a ogni pagina (costerebbe una query
 * in piu' a tutti), quindi si alza la versione e il token smette di valere.
 * Restituisce i codici bloccati, per il registro.
 */
export async function banDevicesOf(userId: string, reason: string, actorId: string): Promise<string[]> {
  const db = await getDb()
  const since = daysAgo(DEVICE_DAYS)
  const rows = await db
    .select({ deviceId: userDevices.deviceId })
    .from(userDevices)
    .where(and(eq(userDevices.userId, userId), gt(userDevices.lastSeenAt, since)))
  const ids = rows.map((row) => row.deviceId)
  if (ids.length === 0) return []

  await db
    .update(devices)
    .set({ bannedAt: new Date(), bannedReason: reason, bannedBy: actorId })
    .where(inArray(devices.id, ids))

  const seenOnThem = db
    .select({ userId: userDevices.userId })
    .from(userDevices)
    .where(and(inArray(userDevices.deviceId, ids), gt(userDevices.lastSeenAt, since)))
  await db
    .update(users)
    .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(inArray(users.id, seenOnThem))

  return ids
}

/** Riapre tutti i browser di questa persona, anche quelli vecchi. Restituisce i codici riaperti. */
export async function unbanDevicesOf(userId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db
    .select({ deviceId: userDevices.deviceId })
    .from(userDevices)
    .innerJoin(devices, eq(devices.id, userDevices.deviceId))
    .where(and(eq(userDevices.userId, userId), isNotNull(devices.bannedAt)))
  const ids = rows.map((row) => row.deviceId)
  if (ids.length === 0) return []

  await db
    .update(devices)
    .set({ bannedAt: null, bannedReason: null, bannedBy: null })
    .where(inArray(devices.id, ids))
  return ids
}

/** Come afterResponse in moderation.ts: dentro una richiesta si aspetta la risposta, fuori si parte subito. */
function afterResponse(task: () => Promise<unknown>) {
  const run = () => task().catch((error) => console.error('Avviso ai moderatori non inviato:', error))
  try {
    after(run)
  } catch {
    void run()
  }
}
