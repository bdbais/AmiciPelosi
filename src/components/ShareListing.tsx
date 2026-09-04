'use client'

import Link from 'next/link'
import { useState } from 'react'

/**
 * Portare l'annuncio fuori di qui.
 *
 * Un'adozione la vede chi apre l'app; la stessa adozione su una pagina Facebook
 * di quartiere la vedono in tremila. Il collegamento riporta qui, dove ci sono
 * le foto, la zona e il modo di segnalare - e dove l'annuncio si chiude quando
 * la storia finisce, cosa che un post su un social non fa mai.
 *
 * Il testo lo prepariamo noi perche' scriverlo venti volte e' il motivo per cui
 * poi non lo si scrive nessuna volta.
 *
 * Il volantino sta qui con gli altri tasti: e' lo stesso gesto, portare
 * l'annuncio dove sta la gente, solo che il palo non ha un'app. I due
 * paragrafi che spiegavano il perche' stanno chiusi sotto: chi ha fretta vede
 * quattro tasti e basta.
 */
export function ShareListing({
  title,
  url,
  city,
  kindLabel,
  posterHref,
  social,
}: {
  title: string
  url: string
  city: string
  kindLabel: string
  /** La pagina della locandina da stampare. */
  posterHref: string
  social?: { facebook?: string | null; instagram?: string | null }
}) {
  const [copied, setCopied] = useState(false)

  const text = `${kindLabel}: ${title}${city ? ` — zona ${city}` : ''}\n\nTutte le informazioni, le foto e come segnalare:\n${url}\n\n#AmiciPelosi`

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 4000)
    } catch {
      // Alcuni browser non lo permettono senza permesso: il testo resta a video.
      setCopied(false)
    }
  }

  return (
    <div className="card">
      <h2>Condividi</h2>
      <p className="section-hint">
        Su una pagina di quartiere lo vedono in mille; sul palo lo vede chi porta fuori il cane
        alle sette.
      </p>

      <div className="inline">
        <button type="button" className="btn small" onClick={copy}>
          {copied ? '✓ Copiato' : 'Copia il testo'}
        </button>
        <a
          className="btn secondary small"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener"
        >
          Facebook
        </a>
        <a
          className="btn secondary small"
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener"
        >
          WhatsApp
        </a>
        <Link href={posterHref} className="btn secondary small">
          🖨️ Locandina
        </Link>
      </div>

      <details className="share-why">
        <summary>Perché conviene, e cosa viene condiviso</summary>
        <p>
          Il collegamento riporta qui, dove ci sono le foto e il modo di segnalare — e dove
          l&apos;annuncio si chiude quando la storia finisce, cosa che un post su un social non
          fa mai.
        </p>
        <p>
          La locandina è un foglio A4 da attaccare al palo, con il codice da inquadrare che
          riporta qui. Chi porta fuori il cane alle sette di mattina è esattamente la persona
          che potrebbe averlo incrociato, e non aprirà mai un&apos;app per caso.
        </p>
        <pre className="share-text">{text}</pre>
      </details>

      {(social?.facebook || social?.instagram) && (
        <p className="section-hint" style={{ marginTop: 12, marginBottom: 0 }}>
          Le vostre pagine, per non dimenticarle:{' '}
          {social.facebook && <strong>{social.facebook}</strong>}
          {social.facebook && social.instagram && ' · '}
          {social.instagram && <strong>{social.instagram}</strong>}
        </p>
      )}
    </div>
  )
}
