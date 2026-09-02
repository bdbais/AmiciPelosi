import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { PostForm } from '@/components/PostForm'
import { KINDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * Il tipo di annuncio puo' arrivare dall'indirizzo (`?tipo=FOUND`): e' cosi'
 * che il tasto «Segnala avvistamento» apre il modulo gia' sul verso giusto.
 * Chi ha visto un animale sconosciuto in giro, vivo o senza vita, non deve
 * prima capire che per noi e' un «annuncio».
 */
function kindFrom(value: string | undefined) {
  return value && value in KINDS ? value : undefined
}

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const [user, params] = await Promise.all([currentUser(), searchParams])
  const defaultKind = kindFrom(params.tipo)

  if (!user) {
    return (
      <div className="container center-narrow">
        <div className="card">
          <h2>Accedi per pubblicare</h2>
          <p className="section-hint">
            Serve un account per pubblicare un annuncio: cosi chi ha notizie puo contattarti.
          </p>
          <div className="inline">
            <Link href="/accedi" className="btn">
              Accedi
            </Link>
            <Link href="/registrati" className="btn secondary">
              Registrati
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const home =
    user.alertLat != null && user.alertLng != null
      ? { lat: user.alertLat, lng: user.alertLng, label: user.alertCity }
      : null
  const sighting = defaultKind === 'FOUND' || defaultKind === 'FOUND_DEAD'

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">{sighting ? 'Segnala un avvistamento' : 'Pubblica un annuncio'}</h1>
      <p className="page-sub">
        {sighting
          ? 'Un animale che non conosci, vivo o senza vita: di’ dove e com’è fatto, e chi lo cerca lo saprà.'
          : 'Bastano pochi campi: foto, zona e come riconoscerlo.'}
      </p>
      <PostForm
        defaultContact={{ name: user.name, phone: user.phone ?? '' }}
        defaultKind={defaultKind}
        home={home}
      />
    </div>
  )
}
