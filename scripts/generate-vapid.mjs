#!/usr/bin/env node
/** Genera la coppia di chiavi VAPID per le notifiche push (solo Web Crypto). */

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64url')
}

const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
])

const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey))
const privateJwk = await crypto.subtle.exportKey('jwk', keys.privateKey)

console.log('\nCopia queste righe nel tuo file .env (e negli secret di Cloudflare):\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${toBase64Url(publicRaw)}"`)
console.log(`VAPID_PRIVATE_KEY="${privateJwk.d}"`)
console.log('VAPID_SUBJECT="mailto:tua@email.it"\n')
