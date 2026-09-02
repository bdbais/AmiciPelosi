'use client'

const MAX_SIDE = 1400
const QUALITY = 0.82

/** Il messaggio da mostrare quando la foto non si riesce nemmeno a decodificare. */
export const UNREADABLE_PHOTO = 'Non riusciamo a leggere questa foto, prova con un’altra.'

/**
 * Riduce e ricomprime una foto direttamente nel browser prima dell'upload.
 *
 * Il motivo che si vede e' il peso: le immagini da cellulare passano da alcuni
 * MB a poche centinaia di KB. Il motivo che non si vede e' piu' importante:
 * ridisegnare la foto su una canvas butta via tutti i metadati EXIF, e dentro
 * l'EXIF di una foto scattata col telefono ci sono le coordinate GPS del punto
 * in cui e' stata fatta - che per un animale di casa e' casa. Un annuncio con
 * la foto originale pubblicherebbe l'indirizzo di chi l'ha scattata, anche se
 * la zona indicata e' il quartiere.
 *
 * Per questo si restituisce SEMPRE il file prodotto dalla canvas, anche quando
 * pesa piu' dell'originale (capita con i PNG piccoli o con le foto gia'
 * compresse): un tornare all'originale "perche' era piu' leggero" rimetterebbe
 * l'EXIF nel giro, e nessuno se ne accorgerebbe.
 *
 * L'unico caso in cui non c'e' niente da restituire e' quando il browser non
 * riesce a decodificare il file (formato che non conosce, file corrotto): allora
 * torna `null`, e chi chiama deve rifiutare la foto con `UNREADABLE_PHOTO`
 * invece di caricare l'originale. Chi legge il GPS dall'EXIF per proporre la
 * posizione (la segnalazione di avvistamento) lo fa PRIMA di passare di qui,
 * sull'originale: dopo, quel dato non esiste piu', ed e' giusto cosi'.
 */
export async function resizeImageFile(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return null
    }
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    )
    if (!blob) return null

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return null
  }
}
