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
  async headers() {
    return [
      {
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
