/**
 * Invio di notifiche Web Push con sole API Web Crypto, quindi utilizzabile
 * anche sul runtime Cloudflare Workers.
 *
 * Implementa la cifratura aes128gcm (RFC 8291) e l'autenticazione VAPID
 * (RFC 8292).
 */

export type PushSubscriptionKeys = { endpoint: string; p256dh: string; auth: string }

const encoder = new TextEncoder()

/* ---------- base64url ---------- */

export function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  return Uint8Array.from([...binary].map((char) => char.charCodeAt(0)))
}

export function bytesToB64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/* ---------- HKDF ---------- */

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  )
  return new Uint8Array(bits)
}

/* ---------- Cifratura del payload (RFC 8291) ---------- */

const RECORD_SIZE = 4096

export async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
): Promise<{ body: Uint8Array }> {
  const clientPublicRaw = b64urlToBytes(p256dh)
  const authSecret = b64urlToBytes(auth)

  // Coppia effimera del mittente.
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])
  const serverPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey),
  )

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicRaw as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeys.privateKey,
      256,
    ),
  )

  // PRK legata alle due chiavi pubbliche, come prescritto dalla specifica.
  const keyInfo = concat(
    encoder.encode('WebPush: info\0'),
    clientPublicRaw,
    serverPublicRaw,
  )
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const contentEncryptionKey = await hkdf(
    salt,
    ikm,
    encoder.encode('Content-Encoding: aes128gcm\0'),
    16,
  )
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey as BufferSource,
    'AES-GCM',
    false,
    ['encrypt'],
  )
  // 0x02 e il delimitatore di fine record previsto da RFC 8188.
  const plaintext = concat(encoder.encode(payload), new Uint8Array([2]))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce as BufferSource, tagLength: 128 },
      aesKey,
      plaintext as BufferSource,
    ),
  )

  // Intestazione: salt | record size | lunghezza chiave | chiave pubblica.
  const header = new Uint8Array(16 + 4 + 1 + serverPublicRaw.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, RECORD_SIZE, false)
  header[20] = serverPublicRaw.length
  header.set(serverPublicRaw, 21)

  return { body: concat(header, ciphertext) }
}

/* ---------- VAPID (RFC 8292) ---------- */

async function importVapidKey(publicKey: string, privateKey: string): Promise<CryptoKey> {
  const publicBytes = b64urlToBytes(publicKey)
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error('Chiave VAPID pubblica non valida')
  }

  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: bytesToB64url(publicBytes.slice(1, 33)),
      y: bytesToB64url(publicBytes.slice(33, 65)),
      d: privateKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

export async function buildVapidHeader(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Promise<string> {
  const audience = new URL(endpoint).origin
  const header = { typ: 'JWT', alg: 'ES256' }
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  }

  const signingInput = `${bytesToB64url(encoder.encode(JSON.stringify(header)))}.${bytesToB64url(
    encoder.encode(JSON.stringify(claims)),
  )}`

  const key = await importVapidKey(publicKey, privateKey)
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      encoder.encode(signingInput) as BufferSource,
    ),
  )

  const jwt = `${signingInput}.${bytesToB64url(signature)}`
  return `vapid t=${jwt}, k=${publicKey}`
}

/* ---------- Invio ---------- */

export type SendResult = { ok: boolean; status: number; gone: boolean }

export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string },
  ttlSeconds = 12 * 60 * 60,
): Promise<SendResult> {
  const { body } = await encryptPayload(payload, subscription.p256dh, subscription.auth)
  const authorization = await buildVapidHeader(
    subscription.endpoint,
    vapid.subject,
    vapid.publicKey,
    vapid.privateKey,
  )

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
    },
    body: body as BodyInit,
  })

  return {
    ok: response.ok,
    status: response.status,
    // 404/410: iscrizione non piu valida, va rimossa dal database.
    gone: response.status === 404 || response.status === 410,
  }
}
