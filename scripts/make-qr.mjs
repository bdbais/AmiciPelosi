/**
 * Disegna il codice a barre quadrato che porta all'ultima versione dell'app.
 *
 * Lo generiamo una volta e lo committiamo come SVG: la pagina non deve
 * dipendere da una libreria a runtime, e un'immagine vettoriale resta nitida
 * anche inquadrata da lontano con un telefono che non mette a fuoco.
 */
import { writeFileSync } from 'node:fs'
import QRCode from 'qrcode'

const TARGET = 'https://github.com/bdbais/AmiciPelosi/raw/releases/AmiciPelosi.apk'

const svg = await QRCode.toString(TARGET, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 1,
  color: { dark: '#3b2314', light: '#00000000' },
})

writeFileSync('public/qr-app.svg', svg)
console.log('public/qr-app.svg →', TARGET)
