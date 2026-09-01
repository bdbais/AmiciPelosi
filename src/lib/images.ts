import { MAX_UPLOAD_BYTES } from './constants'

export type ProcessedImage = {
  data: Uint8Array<ArrayBuffer>
  mimeType: string
  width: number
  height: number
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Il ridimensionamento avviene nel browser (vedi `resizeImageFile`): qui
 * validiamo soltanto, perche il runtime Cloudflare non ha librerie native.
 */
export async function processUpload(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('La foto supera i 10 MB')
  }
  if (file.type && !ACCEPTED.includes(file.type)) {
    throw new Error('Formato non supportato: usa JPG, PNG o WEBP')
  }

  return {
    data: new Uint8Array(await file.arrayBuffer()),
    mimeType: file.type || 'image/jpeg',
    width: 0,
    height: 0,
  }
}
