import { TERMS } from '@/lib/guidance'

export const metadata = {
  title: "Termini d'uso - Amici Pelosi",
  description: 'Che cosa teniamo di te, dove sta, chi lo vede e come si cancella.',
}

export default function TermsPage() {
  return (
    <div className="container stack">
      <header className="page-head">
        <h1 className="page-title">Termini d uso</h1>
        <p className="page-sub">Che cosa teniamo di te, dove sta, e chi lo vede.</p>
      </header>

      {TERMS.map((section) => (
        <div className="card" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p
              key={index}
              className="section-hint"
              dangerouslySetInnerHTML={{ __html: paragraph }}
            />
          ))}
        </div>
      ))}

      <p className="muted small" style={{ textAlign: 'center' }}>
        Scritti per essere letti davvero. Se qualcosa non è chiaro, è colpa nostra: diccelo.
      </p>
    </div>
  )
}
