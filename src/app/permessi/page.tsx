import Link from 'next/link'
import { PermissionStatus } from '@/components/PermissionStatus'

export const metadata = { title: 'Permessi - Amici Pelosi' }

/**
 * Una pagina sola dove si vede cosa e' concesso e cosa no.
 *
 * Chi ha negato un permesso per sbaglio, di solito mesi fa, non ricorda di
 * averlo fatto: vede solo che il sito "non trova la posizione". Qui lo legge
 * scritto, e ha i passi per rimetterlo a posto.
 */
export default function PermissionsPage() {
  return (
    <div className="container" style={{ maxWidth: 620 }}>
      <h1 className="page-title">🔐 Permessi</h1>
      <p className="page-sub">
        Amici Pelosi chiede due cose sole al telefono, e le chiede quando servono. Qui vedi cosa hai
        concesso e come cambiare idea.
      </p>

      <PermissionStatus kind="geolocation" />
      <PermissionStatus kind="notifications" />

      <div className="card">
        <h2>Cosa non chiediamo</h2>
        <p className="section-hint" style={{ margin: 0 }}>
          Niente rubrica, niente microfono, niente galleria intera: le foto le scegli tu una per
          una. La posizione non viene mai letta di nascosto — solo quando tocchi «allega la
          posizione» o apri «vicino a me» — e se una foto porta con sé le coordinate usiamo quelle,
          perché sono il punto giusto.
        </p>
      </div>

      <p className="small muted">
        Come trattiamo questi dati sta scritto nei{' '}
        <Link href="/termini" style={{ textDecoration: 'underline' }}>
          termini d’uso
        </Link>
        .
      </p>
    </div>
  )
}
