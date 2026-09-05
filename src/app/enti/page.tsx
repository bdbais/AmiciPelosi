import { PLACES } from '@/lib/guidance'
import { currentUser } from '@/lib/auth'
import { NearbyPlaces } from '@/components/NearbyPlaces'

export const metadata = {
  title: 'Chi può aiutarti - Amici Pelosi',
  description:
    'Veterinari, canili, gattili, associazioni e guardie zoofile, con i recapiti e i siti di riferimento.',
}

export default async function PlacesPage() {
  const user = await currentUser()
  // La zona di avviso salvata nel profilo e' il posto migliore da cui partire:
  // chi ha perso un animale lo cerca quasi sempre attorno a casa.
  const home =
    user?.alertLat != null && user?.alertLng != null
      ? { lat: user.alertLat, lng: user.alertLng, label: user.alertCity }
      : null

  return (
    <div className="container stack">
      <header className="page-head">
        <h1 className="page-title">Chi può aiutarti qui vicino</h1>
        <p className="page-sub">
          I veterinari e i rifugi attorno al posto che scegli, e le associazioni che
          rispondono in tutta Italia.
        </p>
      </header>

      <NearbyPlaces home={home} />

      {PLACES.map((block) => (
        <div className="card" key={block.group}>
          <h2>{block.group}</h2>
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
                        <a key={link.label} href={link.href}>
                          {link.label}
                        </a>
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
        I luoghi vicini vengono da OpenStreetMap e li aggiorna chi ci abita: se ne manca uno, o
        un numero è cambiato, puoi correggerlo lì. Le associazioni nazionali sono reali.
      </p>
    </div>
  )
}
