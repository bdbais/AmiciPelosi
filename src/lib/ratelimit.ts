/// <reference types="@cloudflare/workers-types" />
/**
 * Un freno alle richieste ripetute, per indirizzo IP.
 *
 * Serve contro chi prova mille password, chi apre cento account in un minuto,
 * chi usa la geocodifica come servizio gratuito per altro. Finestra fissa:
 * dentro un intervallo di tempo si contano le richieste, e oltre la soglia si
 * risponde 429 dicendo quando riprovare.
 *
 * Il conteggio vive su KV quando l'app gira su Cloudflare, e in memoria in
 * locale. KV e' eventualmente consistente: due richieste vicine possono
 * leggere lo stesso conteggio e scriverlo entrambe, per cui il limite reale
 * e' un po' piu' largo di quello dichiarato. Va bene cosi': questo non e' un
 * contatore di fatturazione, e' un modo per rendere noioso un attacco.
 */

type Options = {
  /** Nome della rotta o dell'azione: ogni chiave ha il suo conteggio. */
  key: string
  limit: number
  windowSeconds: number
}

type Store = {
  get(key: string): Promise<number>
  set(key: string, count: number, ttlSeconds: number): Promise<void>
}

async function kvStore(): Promise<Store | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const kv = (env as { PHOTOS_KV?: KVNamespace } | undefined)?.PHOTOS_KV
    if (!kv) return null
    return {
      get: async (key) => Number((await kv.get(key, 'text')) ?? 0),
      // KV non accetta scadenze sotto i 60 secondi.
      set: (key, count, ttl) =>
        kv.put(key, String(count), { expirationTtl: Math.max(60, ttl) }),
    }
  } catch {
    return null
  }
}

/** In locale basta una mappa: sparisce al riavvio, e va bene. */
const memory = new Map<string, { count: number; expiresAt: number }>()
const memoryStore: Store = {
  async get(key) {
    const entry = memory.get(key)
    if (!entry || entry.expiresAt < Date.now()) return 0
    return entry.count
  },
  async set(key, count, ttl) {
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.expiresAt < Date.now()) memory.delete(k)
    }
    memory.set(key, { count, expiresAt: Date.now() + ttl * 1000 })
  },
}

function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'sconosciuto'
  )
}

/**
 * Restituisce la risposta 429 da rimandare al chiamante, oppure null se la
 * richiesta puo' passare. Se lo storage non risponde si lascia passare: un
 * contatore rotto non deve fermare chi sta cercando il proprio cane.
 */
export async function rateLimit(request: Request, options: Options): Promise<Response | null> {
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / options.windowSeconds)
  const key = `ratelimit/${options.key}/${clientIp(request)}/${window}`
  const retryAfter = (window + 1) * options.windowSeconds - now

  try {
    const store = (await kvStore()) ?? memoryStore
    const count = await store.get(key)
    if (count >= options.limit) {
      return Response.json(
        {
          error: `Troppi tentativi in poco tempo: riprova fra ${
            retryAfter >= 90 ? `${Math.ceil(retryAfter / 60)} minuti` : `${retryAfter} secondi`
          }.`,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }
    await store.set(key, count + 1, retryAfter + 1)
  } catch (error) {
    console.warn('Limitatore non disponibile:', error)
  }
  return null
}
