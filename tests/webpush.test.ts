/* Verifica: cifratura RFC 8291 decifrabile dal destinatario e JWT VAPID valido. */
import { encryptPayload, buildVapidHeader, bytesToB64url, b64urlToBytes } from '../src/lib/webpush'
import { jwtVerify, importSPKI } from 'jose'

const enc = new TextEncoder()
const dec = new TextDecoder()

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
    key, len * 8))
}

async function main() {
  // --- Lato destinatario: coppia di chiavi come farebbe il browser ---
  const clientKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const clientPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', clientKeys.publicKey))
  const authSecret = crypto.getRandomValues(new Uint8Array(16))

  const message = JSON.stringify({ title: 'Cane smarrito a 800 m da te', body: 'Pongo, Trastevere' })
  const { body } = await encryptPayload(message, bytesToB64url(clientPublicRaw), bytesToB64url(authSecret))

  // --- Decifratura come farebbe il browser ---
  const salt = body.slice(0, 16)
  const keyLen = body[20]
  const serverPublicRaw = body.slice(21, 21 + keyLen)
  const ciphertext = body.slice(21 + keyLen)

  const serverPublicKey = await crypto.subtle.importKey('raw', serverPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: serverPublicKey }, clientKeys.privateKey, 256))

  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), clientPublicRaw, serverPublicRaw), 32)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, ciphertext))
  const decoded = dec.decode(plain.slice(0, -1))
  const delimiter = plain[plain.length - 1]

  console.log('payload decifrato:', decoded)
  console.log('delimitatore record (atteso 2):', delimiter)
  if (decoded !== message) throw new Error('MISMATCH: il payload decifrato non corrisponde')
  if (delimiter !== 2) throw new Error('delimitatore errato')

  // --- VAPID: firma verificabile con la chiave pubblica dichiarata ---
  const vapidKeys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const vapidPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', vapidKeys.publicKey))
  const jwk = await crypto.subtle.exportKey('jwk', vapidKeys.privateKey)

  const header = await buildVapidHeader(
    'https://fcm.googleapis.com/fcm/send/abc123',
    'mailto:test@amicipelosi.it',
    bytesToB64url(vapidPublicRaw),
    jwk.d!,
  )
  const token = header.match(/t=([^,]+)/)![1]
  const publicKeyForVerify = await crypto.subtle.importKey('raw', vapidPublicRaw, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify'])
  const { payload: claims } = await jwtVerify(token, publicKeyForVerify as any, { algorithms: ['ES256'] })

  console.log('claims VAPID:', claims)
  if (claims.aud !== 'https://fcm.googleapis.com') throw new Error('audience errata')
  if (!header.includes('k=' + bytesToB64url(vapidPublicRaw))) throw new Error('chiave k assente')

  console.log('\n✅ Cifratura push e firma VAPID verificate.')
}

main().catch((e) => { console.error('❌', e); process.exit(1) })
