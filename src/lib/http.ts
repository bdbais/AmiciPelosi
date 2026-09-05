/** Legge un corpo JSON in modo tipizzato, restituendo un oggetto vuoto se non e valido. */
export async function readJson<T>(source: Request | Response): Promise<Partial<T>> {
  try {
    return ((await source.json()) as T) ?? {}
  } catch {
    return {}
  }
}

export type ApiError = { error?: string }

/**
 * La richiesta parte da una nostra pagina?
 *
 * Il cookie di sessione e' SameSite=Lax, che nei browser recenti ferma gia' i
 * POST partiti da un altro sito. Ma un livello solo e' poco per rotte che
 * cancellano un account o un annuncio, e i browser vecchi e le WebView non
 * lo rispettano tutti. Se il browser dichiara da dove parte la richiesta
 * (Origin, oppure Sec-Fetch-Site) e non e' da qui, non e' partita da noi.
 *
 * Chi non manda nessuno dei due header (curl, uno script) passa: questa
 * difesa serve contro il browser di una persona usato a tradimento, non
 * contro chi chiama l'API a mano con le proprie credenziali.
 */
export function sameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') return false

  const origin = request.headers.get('origin')
  if (!origin) return true
  // "null" e' quello che manda un iframe sandbox o una pagina file://: non e' nostro.
  if (origin === 'null') return false

  const requestHost = request.headers.get('host') ?? new URL(request.url).host
  try {
    return new URL(origin).host === requestHost
  } catch {
    return false
  }
}

/** La risposta a chi arriva da un altro sito: 403, e detto in italiano. */
export function crossOriginResponse(): Response {
  return Response.json(
    { error: 'Questa richiesta non arriva da Amici Pelosi: ricarica la pagina e riprova.' },
    { status: 403 },
  )
}
