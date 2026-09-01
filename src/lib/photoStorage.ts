/// <reference types="@cloudflare/workers-types" />
/**
 * Le foto vivono nello storage oggetti di Cloudflare quando l'app gira li
 * (R2 se configurato, altrimenti KV) e come blob nel database in locale.
 * In questo modo lo stesso codice funziona in sviluppo e in produzione.
 */

type Bindings = {
  PHOTOS?: R2Bucket
  PHOTOS_KV?: KVNamespace
}

async function bindings(): Promise<Bindings | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    return (env ?? null) as Bindings | null
  } catch {
    return null
  }
}

export type StoredPhoto = {
  storageKey: string | null
  data: Uint8Array<ArrayBuffer> | null
}

/** Salva una foto e indica dove e finita. */
export async function putPhoto(
  id: string,
  data: Uint8Array<ArrayBuffer>,
  mimeType: string,
): Promise<StoredPhoto> {
  const env = await bindings()
  const key = `photos/${id}`

  if (env?.PHOTOS) {
    await env.PHOTOS.put(key, data as unknown as ArrayBuffer, {
      httpMetadata: { contentType: mimeType },
    })
    return { storageKey: key, data: null }
  }

  if (env?.PHOTOS_KV) {
    await env.PHOTOS_KV.put(key, data as unknown as ArrayBuffer, {
      metadata: { contentType: mimeType },
    })
    return { storageKey: key, data: null }
  }

  // Sviluppo locale: il binario resta nel database SQLite.
  return { storageKey: null, data }
}

/** Rilegge una foto dallo storage indicato al momento del salvataggio. */
export async function getPhoto(
  storageKey: string | null,
  fallback: Uint8Array<ArrayBuffer> | null,
): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!storageKey) return fallback

  const env = await bindings()

  if (env?.PHOTOS) {
    const object = await env.PHOTOS.get(storageKey)
    if (object) return new Uint8Array(await object.arrayBuffer())
  }

  if (env?.PHOTOS_KV) {
    const value = await env.PHOTOS_KV.get(storageKey, 'arrayBuffer')
    if (value) return new Uint8Array(value)
  }

  return fallback
}

export async function deletePhoto(storageKey: string | null): Promise<void> {
  if (!storageKey) return
  const env = await bindings()
  if (env?.PHOTOS) await env.PHOTOS.delete(storageKey)
  else if (env?.PHOTOS_KV) await env.PHOTOS_KV.delete(storageKey)
}
