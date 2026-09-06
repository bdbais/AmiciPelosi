import Link from 'next/link'
import { listPosts } from '@/lib/queries'
import { PostCard } from '@/components/PostCard'
import { PawHeartIcon } from '@/components/Icons'

/**
 * La pagina che si apre scrivendo l'indirizzo.
 *
 * E' la stessa per tutti, loggati o no: prima c'era un rimando alla bacheca
 * per chi era dentro, ma la bacheca sono gli annunci e basta, e la cosa che
 * conta davvero - l'app che avvisa da sola - da li' non si vedeva mai. Chi
 * ha gia' l'app la riconosce e passa oltre in un secondo; chi non ce l'ha la
 * trova in cima ogni volta, finche' non la installa.
 *
 * Sotto, cinque tasti grandi che dicono con parole di tutti i giorni cosa si
 * puo' fare qui, poi gli ultimi annunci: chi arriva vede subito che il sito
 * e' vivo, senza dover leggere una presentazione.
 */

const APK = 'https://github.com/bdbais/AmiciPelosi/raw/releases/AmiciPelosi.apk'
const CANALE = 'https://github.com/bdbais/AmiciPelosi/tree/releases'

/** Quanti annunci mostrare in home: una griglia piena, non tutta la bacheca. */
const IN_HOME = 6

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Amici Pelosi - aiutiamoli a tornare a casa',
  description:
    'Un’app per ritrovare un animale perduto e per trovare una famiglia a chi non ha casa. Annunci con foto e zona, e un avviso a chi vive lì vicino.',
}

/*
  Le cinque cose che si fanno qui, nell'ordine in cui capitano: prima chi ha
  perso, poi chi ha visto, poi chi cerca o offre una casa, in fondo chi puo'
  dare una mano. L'etichetta e' in maiuscolo perche' e' un cartello, non una
  frase; la riga sotto spiega a chi non conosce la parola.
*/
const MACRO = [
  { emoji: '🔎', label: 'Segnalazione smarrimento', hint: 'Il tuo animale non è tornato', href: '/nuovo?tipo=LOST' },
  { emoji: '👀', label: 'Avvistamento', hint: 'Hai visto un animale che non conosci', href: '/nuovo?tipo=FOUND' },
  { emoji: '🏡', label: 'Adozione', hint: 'Cerca una famiglia, o trovala', href: '/bacheca?tipo=ADOPTION' },
  { emoji: '🛏️', label: 'Stallo', hint: 'Una casa per un periodo', href: '/bacheca?tipo=FOSTER' },
  { emoji: '🤝', label: 'Associazioni, canili e gattili', hint: 'Chi può aiutarti vicino a te', href: '/enti' },
]

export default async function LandingPage() {
  const posts = await listPosts({ status: 'OPEN', take: IN_HOME })

  return (
    <div className="container landing">
      <h1 className="sr-only">Amici Pelosi</h1>

      {/*
        L'app prima di tutto. Il sito lo apri quando ti serve; l'app ti
        cerca lei, ed e' questo che fa tornare a casa un animale in pochi
        minuti invece che in giorni. Su un telefono il codice QR non serve -
        sei gia' li' - e sparisce sotto i 640px lasciando il tasto grande.
      */}
      <section className="get-app landing-app">
        <div className="qr-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qr-app.svg" alt="Codice da inquadrare per scaricare l’app" width={190} height={190} />
          <p className="qr-hint">Inquadra con il telefono</p>
        </div>
        <div className="get-text">
          <h2>
            Prendi l’app&nbsp;
            <PawHeartIcon size={26} className="paw-inline" />
          </h2>
          <p>
            Il sito lo apri quando ti serve. <strong>L’app ti avvisa da sola</strong>: quando un
            animale si perde vicino a casa tua, il telefono suona, e chi lo trova lo sa in pochi
            minuti.
          </p>
          <div className="actions">
            <a className="btn app-download" href={APK}>
              📲 Scarica l’app
            </a>
          </div>
          <p className="small muted">
            Per Android, da installare a mano: si fa una volta sola, poi si aggiorna da sé. Le
            versioni stanno <a href={CANALE}>nel canale pubblico</a>.
          </p>
        </div>
      </section>

      <nav className="macro-grid" aria-label="Cosa vuoi fare">
        {MACRO.map((item) => (
          <Link key={item.href} href={item.href} className="macro">
            <span className="kp-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="macro-text">
              <strong>{item.label}</strong>
              <em>{item.hint}</em>
            </span>
          </Link>
        ))}
      </nav>

      <section className="landing-board">
        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2>Bacheca animali</h2>
          <Link href="/bacheca" className="small">
            Vedi tutta la bacheca →
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="muted">Nessun annuncio aperto in questo momento: buona notizia.</p>
        ) : (
          <div className="grid" style={{ marginTop: 14 }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <Link href="/bacheca" className="btn secondary">
            Vedi tutta la bacheca
          </Link>
        </div>
      </section>

      <p className="landing-note">
        Fase di prova: gli annunci sono veri, e li vedono gli altri. Nelle foto solo l’animale,
        e qui non si scambia denaro: le <Link href="/regole">regole</Link> e i{' '}
        <Link href="/termini">termini d’uso</Link>. Se hai un animale davanti adesso:{' '}
        <Link href="/aiuto">cosa fare in caso di</Link>.
      </p>
    </div>
  )
}
