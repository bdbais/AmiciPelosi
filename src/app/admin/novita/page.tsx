import releases from '@/lib/changelog.generated.json'
import { renderMarkdownLite } from '@/lib/markdown-lite'

export const metadata = { title: 'Novità - Moderazione - Amici Pelosi' }

/**
 * Cosa e' cambiato a ogni pubblicazione e cosa e' stato deciso lungo la
 * strada. Lo legge chi modera: e' il posto dove scoprire che una cosa che
 * sembra strana e' una scelta, con un motivo, e non una svista.
 *
 * Il contenuto arriva da CHANGELOG.md, spezzato a ogni build: qui non c'e'
 * niente da salvare, quindi niente database e niente pulsanti.
 */
export default function ChangelogPage() {
  return (
    <div className="stack" style={{ marginTop: 16 }}>
      <p className="small muted" style={{ margin: 0 }}>
        Una scheda per ogni pubblicazione, dalla più recente. Sotto «Scelte» le decisioni prese,
        con il motivo: da rileggere prima di cambiarle.
      </p>
      {releases.map((release) => (
        <article className="card" key={`${release.date}-${release.title}`}>
          <p className="small muted" style={{ margin: '0 0 4px' }}>
            {release.date}
          </p>
          <h2 style={{ marginTop: 0 }}>{release.title}</h2>
          <div className="idea-body">{renderMarkdownLite(release.body)}</div>
        </article>
      ))}
      {releases.length === 0 && <p className="muted">Nessuna pubblicazione ancora registrata.</p>}
    </div>
  )
}
