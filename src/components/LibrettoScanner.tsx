'use client'

import { useState } from 'react'

/**
 * Legge il libretto sanitario e propone quello che ha capito.
 *
 * Il microchip sono quindici cifre: copiarle a mano da un libretto e' l'attrito
 * che fa abbandonare la scheda a meta', ed e' proprio il numero che riporta a
 * casa un animale piu' in fretta di qualunque annuncio.
 *
 * Tutto avviene dentro il telefono. La fotografia del libretto - che contiene
 * dati di una persona, non solo del suo cane - non viene mandata a nessuno, e
 * nemmeno a noi: il riconoscimento gira nel browser, e i file che gli servono
 * arrivano dal nostro sito e non da servizi altrui.
 *
 * Quello che legge e' una proposta, mai un dato salvato di nascosto: sui
 * caratteri stampati se la cava bene, sulla scrittura a mano quasi per niente,
 * e un microchip sbagliato e' peggio di un microchip mancante.
 */

export type LibrettoFindings = { microchip?: string; birthDate?: string; text: string }

/** Quindici cifre di fila, anche separate da spazi o punti. */
function findMicrochip(text: string): string | undefined {
  const candidates: string[] = []
  const compact = text.replace(/[ .–—-]/g, '')
  const re = /\d{15}/g
  let match: RegExpExecArray | null
  while ((match = re.exec(compact)) !== null) candidates.push(match[0])
  if (candidates.length === 0) return undefined
  // In Italia i codici cominciano per 380: se ce n'e' uno, e quasi certamente lui.
  return candidates.find((value) => value.startsWith('380')) ?? candidates[0]
}

/** Una data in forma europea, riscritta come la vuole il campo del modulo. */
function findBirthDate(text: string): string | undefined {
  const match = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b/)
  if (!match) return undefined
  const [, day, month, year] = match
  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return undefined
  // Una data futura, o di trent'anni fa, non e una nascita: e un errore di lettura.
  const years = (Date.now() - parsed.getTime()) / (365.25 * 24 * 3600 * 1000)
  if (years < 0 || years > 30) return undefined
  return iso
}

export function LibrettoScanner({
  file,
  onFound,
}: {
  file: File | null
  onFound: (found: LibrettoFindings) => void
}) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [found, setFound] = useState<LibrettoFindings | null>(null)

  async function read() {
    if (!file) return
    setState('working')
    setProgress(0)

    try {
      // Caricato solo adesso: sono cinque megabyte che non devono pesare
      // sull'apertura dell'app a chi non usa questa cosa.
      const { createWorker } = await import('tesseract.js')

      // Il motore lo scegliamo noi invece di lasciarglielo indovinare: da solo
      // chiede varianti che non abbiamo, e la richiesta fallisce a meta strada.
      // Il primo e piu veloce, il secondo va ovunque.
      const cores = ['/ocr/tesseract-core-simd-lstm.wasm.js', '/ocr/tesseract-core-lstm.wasm.js']

      const options = (corePath: string) => ({
        workerPath: '/ocr/worker.min.js',
        corePath,
        langPath: '/ocr',
        gzip: true,
        logger: (message: { status: string; progress: number }) => {
          if (message.status === 'recognizing text') setProgress(Math.round(message.progress * 100))
        },
      })

      let result
      let lastError: unknown
      for (const corePath of cores) {
        try {
          const worker = await createWorker('eng', 1, options(corePath))
          result = await worker.recognize(file)
          await worker.terminate()
          break
        } catch (error) {
          lastError = error
        }
      }
      if (!result) throw lastError ?? new Error('Nessun motore utilizzabile')

      const text = result.data.text ?? ''
      const findings: LibrettoFindings = {
        microchip: findMicrochip(text),
        birthDate: findBirthDate(text),
        text,
      }
      setFound(findings)
      setState('done')
    } catch {
      setState('failed')
    }
  }

  if (!file) return null

  return (
    <div className="ocr-box">
      {state === 'idle' && (
        <>
          <button type="button" className="btn secondary small" onClick={read}>
            🔎 Leggi i dati dal libretto
          </button>
          <p className="ocr-note">
            La foto resta sul tuo telefono: la lettura avviene qui dentro, non la mandiamo a
            nessuno. Il primo utilizzo scarica cinque megabyte.
          </p>
        </>
      )}

      {state === 'working' && (
        <p className="ocr-note">
          Sto leggendo… {progress > 0 ? `${progress}%` : 'ci vuole qualche secondo'}
        </p>
      )}

      {state === 'failed' && (
        <p className="ocr-note">
          Non sono riuscito a leggerla. Non fa niente: i dati si scrivono a mano, e la foto del
          libretto resta comunque salvata.
        </p>
      )}

      {state === 'done' && found && (
        <div className="ocr-found">
          {found.microchip || found.birthDate ? (
            <>
              <p className="ocr-note">
                <strong>Controlla prima di accettare.</strong> Sui caratteri stampati ci prende,
                sulla scrittura a mano quasi mai — e un microchip sbagliato è peggio di un
                microchip mancante.
              </p>
              {found.microchip && (
                <div className="ocr-row">
                  <span>
                    Microchip: <strong>{found.microchip}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => onFound({ microchip: found.microchip, text: found.text })}
                  >
                    Usa
                  </button>
                </div>
              )}
              {found.birthDate && (
                <div className="ocr-row">
                  <span>
                    Data trovata: <strong>{found.birthDate}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => onFound({ birthDate: found.birthDate, text: found.text })}
                  >
                    Usa come nascita
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="ocr-note">
              Non ho trovato né un microchip né una data. Capita spesso con i libretti scritti a
              mano: scrivili tu, la foto resta comunque salvata.
            </p>
          )}

          <details className="ocr-raw">
            <summary>Tutto quello che ho letto</summary>
            <pre>{found.text.trim() || '(niente)'}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
