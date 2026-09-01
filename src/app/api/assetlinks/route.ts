import { NextResponse } from 'next/server'

/**
 * Digital Asset Links: collega l'app Android al sito. Viene servita su
 * /.well-known/assetlinks.json tramite una riscrittura (vedi next.config.mjs).
 *
 * Quando l'impronta del certificato corrisponde a quella dell'APK installato,
 * l'app si apre a tutto schermo, senza la barra dell'indirizzo del browser.
 */
export async function GET() {
  const fingerprint = process.env.ANDROID_CERT_FINGERPRINT
  const packageName = process.env.ANDROID_PACKAGE_NAME || 'it.amicipelosi.app'

  // Senza impronta configurata rispondiamo con una lista vuota, che e valida.
  if (!fingerprint) return NextResponse.json([])

  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprint.split(',').map((value) => value.trim()),
      },
    },
  ])
}
