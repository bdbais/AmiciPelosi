/**
 * Gli header di sicurezza che ogni risposta porta con se'.
 *
 * Valgono per tutto il sito, e nessuna pagina e' pensata per stare dentro un
 * iframe altrui: la locandina si stampa, e l'app Android e' una Trusted Web
 * Activity, cioe' Chrome a tutto schermo e non una cornice — quindi DENY non
 * le toglie niente. Fotocamera e posizione restano permesse solo a noi stessi:
 * sono il cuore dell'app, ma nessuno script di terzi deve poterle chiedere.
 *
 * Attenzione: in produzione questi header arrivano al browser solo per le
 * risposte generate dal worker. I file statici in public/ li serve il binding
 * ASSETS prima ancora che il worker parta, e per quelli vale public/_headers.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '12mb' },
  },
  async rewrites() {
    return [
      // Il file di verifica per l'app Android deve stare su un percorso fisso.
      { source: '/.well-known/assetlinks.json', destination: '/api/assetlinks' },
      // Guida di lettura per assistenti e programmi.
      { source: '/llms.txt', destination: '/api/llms' },
    ]
  },
  // Il sito e' nato su amicipelosi.bais.info e ha vissuto li' per un po': chi ha
  // quel link (una locandina stampata, un messaggio inoltrato) deve arrivare
  // lo stesso. Il vecchio dominio resta agganciato al Worker e rimanda qui.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'amicipelosi.bais.info' }],
        destination: 'https://amicipelosi.pet/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Serve solo a `next dev`: online sw.js sta in public/ e lo serve il
        // binding ASSETS, che di questo blocco non sa niente. La stessa regola
        // sta in public/_headers, ed e' quella che conta in produzione.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
