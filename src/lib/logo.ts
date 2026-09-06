/**
 * Il formato di un logo, letto dai byte e non dal nome del file o da quello
 * che dichiara il browser. Due formati soltanto, PNG e JPEG: bastano per un
 * logo e si riconoscono dalla prima riga. Null per tutto il resto.
 *
 * Sta in un file suo, senza import, perche' lo usano due rotte (chi carica
 * e chi serve) e nessuna delle due deve trascinarsi dietro l'altra.
 */
export function sniffLogoType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  if (bytes.length < 8) return null
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  return null
}

/**
 * «Ha un logo» in entrambi gli ambienti: in produzione c'e' la chiave, in
 * locale il blob, ma la data del caricamento c'e' sempre ed e' l'unica
 * cosa che si azzera quando lo si toglie.
 */
export function hasLogo(user: { orgLogoAt: Date | null }): boolean {
  return user.orgLogoAt != null
}
