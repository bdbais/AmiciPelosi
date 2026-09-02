import { PLACES } from '@/lib/guidance'

export const metadata = {
  title: 'Chi può aiutarti - Amici Pelosi',
  description:
    'Veterinari, canili, gattili, associazioni e guardie zoofile, con i recapiti e i siti di riferimento.',
}

export default function PlacesPage() {
  return (
    <div className="container stack">
      <header className="page-head">
        <h1 className="page-title">Chi può aiutarti qui vicino</h1>
        <p className="page-sub">
          Veterinari, canili, gattili e associazioni, con il numero da chiamare.
        </p>
      </header>

      {PLACES.map((block) => (
        <div className="card" key={block.group}>
          <h2>
            {block.group}
            {block.demo && <span className="badge-demo">esempi</span>}
          </h2>
          {block.items.map((item) => (
            <div className="place" key={item.name}>
              <div className="pg" aria-hidden="true">
                {item.emoji}
              </div>
              <div className="pb">
                <div className="pn">{item.name}</div>
                <div className="pd">{item.detail}</div>
                {item.links.length > 0 && (
                  <div className="pl">
                    {item.links.map((link) =>
                      link.href.startsWith('http') ? (
                        <a key={link.label} href={link.href} target="_blank" rel="noopener">
                          {link.label} ↗
                        </a>
                      ) : (
                        <span key={link.label}>{link.label}</span>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      <p className="muted small" style={{ textAlign: 'center' }}>
        Le voci locali sono esempi: il numero sbagliato di un canile vero è peggio di nessun
        numero. Le associazioni nazionali sono reali.
      </p>
    </div>
  )
}
