import Link from 'next/link'
import { GUIDES } from '@/lib/guidance'

export const metadata = {
  title: 'Cosa fare in caso di - Amici Pelosi',
  description:
    'Ho trovato un cane, un gatto, un animale ferito, dei cuccioli. Cosa fare, in che ordine, e cosa non fare.',
}

export default function HelpPage() {
  return (
    <div className="container stack">
      <header className="page-head">
        <h1 className="page-title">Cosa fare in caso di…</h1>
        <p className="page-sub">
          Se hai davanti un animale e non sai da che parte cominciare, comincia da qui. Sono
          poche righe, nell ordine giusto.
        </p>
      </header>

      {GUIDES.map((guide) => (
        <details className="howto" key={guide.title}>
          <summary>
            <span className="gg" aria-hidden="true">
              {guide.emoji}
            </span>
            <span>{guide.title}</span>
          </summary>
          <div className="howto-body">
            <p dangerouslySetInnerHTML={{ __html: guide.intro }} />
            <ol>
              {guide.steps.map((step, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: step }} />
              ))}
            </ol>
            <p className="howto-dont">
              <strong>Da non fare:</strong>{' '}
              <span dangerouslySetInnerHTML={{ __html: guide.dont }} />
            </p>
          </div>
        </details>
      ))}

      <div className="card">
        <h2>Qui non gira denaro</h2>
        <p className="section-hint">
          Su Amici Pelosi <strong>non si scambia denaro</strong>: niente ricompense per un
          ritrovamento, niente compensi per uno stallo, niente vendita di animali. Chi te lo chiede
          non sta aiutando nessuno: segnalalo e basta.
        </p>
      </div>

      <div className="card">
        <h2>Non sei da solo in questo</h2>
        <p className="section-hint">
          Ci sono persone che fanno questo da anni e sanno esattamente cosa fare. Vale sempre la
          pena chiamarle.
        </p>
        <Link href="/enti" className="btn secondary small">
          🏛️ Chi può aiutarti qui vicino
        </Link>
      </div>
    </div>
  )
}
