/**
 * Le coordinate scritte dentro una fotografia.
 *
 * Servono a una cosa precisa: chi fotografa un gatto per strada e poi allega
 * la foto da casa, con la posizione del telefono manderebbe tutti a casa sua.
 * Il punto giusto e quello dove lo scatto e stato fatto, ed e li dentro.
 *
 * Lettura a mano invece di una libreria: servono quattro campi, il formato e
 * documentato da trent'anni, e ottanta righe pesano meno di una dipendenza che
 * poi va tenuta aggiornata.
 *
 * Legge i JPEG, che e quello che producono le fotocamere Android. Sui HEIC di
 * iPhone non trova niente e restituisce null: non e un errore, e un "non lo so".
 */

export type PhotoPlace = { lat: number; lng: number }

/** Un numero razionale EXIF: numeratore e denominatore, uno dopo l'altro. */
function rational(view: DataView, at: number, little: boolean) {
  const numerator = view.getUint32(at, little)
  const denominator = view.getUint32(at + 4, little)
  return denominator === 0 ? 0 : numerator / denominator
}

/** Gradi, primi e secondi diventano un numero solo. */
function toDegrees(view: DataView, at: number, little: boolean) {
  return (
    rational(view, at, little) +
    rational(view, at + 8, little) / 60 +
    rational(view, at + 16, little) / 3600
  )
}

export async function readPhotoPlace(file: File): Promise<PhotoPlace | null> {
  try {
    // Bastano i primi blocchi: l'EXIF sta all'inizio del file.
    const head = await file.slice(0, 256 * 1024).arrayBuffer()
    const view = new DataView(head)

    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null

    // Cerchiamo il blocco APP1, quello che contiene l'EXIF.
    let cursor = 2
    let exifStart = -1
    while (cursor + 4 < view.byteLength) {
      if (view.getUint8(cursor) !== 0xff) break
      const marker = view.getUint8(cursor + 1)
      const size = view.getUint16(cursor + 2)
      if (marker === 0xe1) {
        exifStart = cursor + 4
        break
      }
      // 0xDA e l'inizio dei dati veri e propri: oltre non c'e piu nulla da leggere.
      if (marker === 0xda) break
      cursor += 2 + size
    }
    if (exifStart < 0 || exifStart + 14 > view.byteLength) return null

    // "Exif\0\0", poi l'intestazione TIFF con l'ordine dei byte.
    if (view.getUint32(exifStart) !== 0x45786966) return null
    const tiff = exifStart + 6
    const order = view.getUint16(tiff)
    if (order !== 0x4949 && order !== 0x4d4d) return null
    const little = order === 0x4949

    const ifd0 = tiff + view.getUint32(tiff + 4, little)
    if (ifd0 + 2 > view.byteLength) return null

    // Nel primo indice cerchiamo il rimando all'indice GPS.
    let gpsIfd = -1
    const entries = view.getUint16(ifd0, little)
    for (let i = 0; i < entries; i++) {
      const entry = ifd0 + 2 + i * 12
      if (entry + 12 > view.byteLength) return null
      if (view.getUint16(entry, little) === 0x8825) {
        gpsIfd = tiff + view.getUint32(entry + 8, little)
        break
      }
    }
    if (gpsIfd < 0 || gpsIfd + 2 > view.byteLength) return null

    let lat: number | null = null
    let lng: number | null = null
    let latRef = 'N'
    let lngRef = 'E'

    const gpsEntries = view.getUint16(gpsIfd, little)
    for (let i = 0; i < gpsEntries; i++) {
      const entry = gpsIfd + 2 + i * 12
      if (entry + 12 > view.byteLength) return null
      const tag = view.getUint16(entry, little)
      const value = view.getUint32(entry + 8, little)

      // I riferimenti sono una lettera sola: sta dentro i quattro byte del campo.
      if (tag === 1) latRef = String.fromCharCode(view.getUint8(entry + 8))
      else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entry + 8))
      else if (tag === 2) lat = toDegrees(view, tiff + value, little)
      else if (tag === 4) lng = toDegrees(view, tiff + value, little)
    }

    if (lat == null || lng == null) return null
    if (latRef === 'S') lat = -lat
    if (lngRef === 'W') lng = -lng

    // Zero esatto vuol dire quasi sempre "campo presente ma vuoto".
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return null
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

    return { lat, lng }
  } catch {
    return null
  }
}
