import Link from 'next/link'
import { currentUser } from '@/lib/auth'
import { PostForm } from '@/components/PostForm'
import { KINDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * Il tipo di annuncio arriva dall'indirizzo (`?tipo=FOUND`): e' cosi' che i
 * tasti della pagina di ingresso aprono il modulo gia' sul verso giusto.
 * Chi ha visto un animale sconosciuto in giro, vivo o senza vita, non deve
 * prima capire che per noi e' un «annuncio».
 */
function kindFrom(value: string | undefined) {
  return value && value in KINDS ? value : undefined
}

/** Una riga per tipo, per chi arriva dal «+» e deve ancora scegliere. */
const CHOICES: { kind: keyof typeof KINDS; hint: string }[] = [
  { kind: 'LOST', hint: 'Il tuo animale non è tornato a casa.' },
  { kind: 'FOUND', hint: 'Hai visto o raccolto un animale che non conosci.' },
  { kind: 'FOSTER', hint: 'Cerchi una casa per un periodo, non per sempre.' },
  { kind: 'ADOPTION', hint: 'Cerchi una famiglia a un animale che non ce l’ha.' },
]

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

  /*
    Senza un tipo il modulo non parte: prima si sceglie cosa si sta
    pubblicando, con quattro tasti grandi. Prima la scelta era una fila di
    bottoncini in cima a ventiquattro campi, e chi arrivava dal «+» della
    barra la saltava senza vederla.
  */
  if (!defaultKind) {
    return (
      <div className="container" style={{ maxWidth: 560 }}>
        <h1 className="page-title">Cosa vuoi pubblicare?</h1>
        <p className="page-sub">Scegli, e il modulo si apre già sul verso giusto.</p>
        <div className="kind-choice">
          {CHOICES.map(({ kind, hint }) => (
            <Link key={kind} href={`/nuovo?tipo=${kind}`} className="kind-pick">
              <span className="kp-emoji" aria-hidden="true">
                {KINDS[kind].emoji}
              </span>
              <span>
                <strong>{KINDS[kind].label}</strong>
                <em>{hint}</em>
              </span>
            </Link>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 18 }}>
          <Link href="/nuovo?tipo=FOUND_DEAD" style={{ textDecoration: 'underline' }}>
            <span className="quiet-dot" aria-hidden="true" />
            {KINDS.FOUND_DEAD.label}
          </Link>
          <br />
          Serve a una cosa sola: far smettere di cercare chi cerca da giorni. Senza fotografie.
        </p>
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
