import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth'
import { PawHeartIcon } from '@/components/Icons'

/**
 * La pagina che si apre scrivendo l'indirizzo.
 *
 * Chi arriva qui di solito ha appena perso un animale, o ne ha appena visto
 * uno: la prima schermata del telefono deve dargli una cosa sola da fare,
 * non un testo da leggere. Titolo, una riga, tre tasti. Tutto il resto -
 * le spiegazioni, l'app da scaricare - sta sotto la piega.
 *
 * Chi e' gia' dentro non ha bisogno della presentazione: va dritto alla
 * bacheca.
 */

const APK = 'https://github.com/bdbais/AmiciPelosi/raw/releases/AmiciPelosi.apk'
const REPO = 'https://github.com/bdbais/AmiciPelosi'
const CANALE = 'https://github.com/bdbais/AmiciPelosi/tree/releases'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Amici Pelosi - aiutiamoli a tornare a casa',
  description:
    'Un’app per ritrovare un animale perduto e per trovare una famiglia a chi non ha casa. Annunci con foto e zona, e un avviso a chi vive lì vicino.',
}

export default async function LandingPage() {
  const user = await currentUser()
  if (user) redirect('/bacheca')

  return (
    <div className="container landing">
      <section className="landing-hero">
        <h1>
          Aiutiamoli a tornare a casa&nbsp;
          <PawHeartIcon size={30} className="paw-inline" />
        </h1>
        <p className="lede">
          Un annuncio con la zona, un avviso a chi sta vicino, una segnalazione di chi passa di
          là.
        </p>
        <div className="big-actions">
          <Link className="btn" href="/nuovo?tipo=LOST">
            🔎 Ho perso un animale
          </Link>
          <Link className="btn secondary" href="/nuovo?tipo=FOUND">
            👀 Ne ho visto uno
          </Link>
          <Link className="btn secondary" href="/vicino">
            📍 Cosa succede vicino a me
          </Link>
        </div>
      </section>

      <section className="landing-cols" style={{ marginTop: 26 }}>
        <div className="landing-card">
          <h3>🔎 Hai perso qualcuno</h3>
          <p>Le prime ventiquattro ore contano più di tutte: pubblichi foto e zona, e i telefoni del quartiere si accendono.</p>
        </div>
        <div className="landing-card">
          <h3>🐾 Ne hai trovato uno</h3>
          <p>L’annuncio arriva a chi lo sta cercando, spesso a poche centinaia di metri da lì.</p>
        </div>
        <div className="landing-card">
          <h3>🏡 Cerchi o offri una casa</h3>
          <p>Adozioni, e anche stalli: una casa per un periodo, mentre si cerca quella definitiva.</p>
        </div>
      </section>

      <section className="get-app">
        <div className="qr-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qr-app.svg" alt="Codice da inquadrare per scaricare l’app" width={190} height={190} />
          <p className="qr-hint">Inquadralo con il telefono</p>
        </div>
        <div className="get-text">
          <h2>Prendi l’app</h2>
          <p>
            È un file da installare a mano: Android chiederà il permesso di installare da questa
            fonte, perché non passa dal Play Store. Si fa una volta sola. Da lì in poi{' '}
            <strong>l’app si aggiorna da sola</strong>, ti avvisa quando esce una versione nuova e
            riparte da dove eravate.
          </p>
          <div className="actions">
            <a className="btn" href={APK}>
              Scarica l’app per Android
            </a>
            <a className="btn secondary" href={REPO} target="_blank" rel="noopener">
              Il progetto su GitHub
            </a>
          </div>
          <p className="small muted">
            Le versioni stanno <a href={CANALE}>nel canale pubblico</a>, dove c’è sempre e solo
            l’ultima.
          </p>
          <p className="get-warn">
            <strong>È l’app vera, in fase di prova.</strong> Dentro c’è tutto quello che c’è
            sul sito, con gli avvisi sul telefono. Se avevi la demo, questa la sostituisce:
            basta installarla sopra. Entri con lo stesso account del sito.
          </p>
        </div>
      </section>

      <p className="landing-note">
        Fase di prova: gli annunci sono veri, e li vedono gli altri. Nelle foto solo l’animale,
        e qui non si scambia denaro: le <Link href="/regole">regole</Link> e i{' '}
        <Link href="/termini">termini d’uso</Link>. Se hai un animale davanti adesso:{' '}
        <Link href="/aiuto">cosa fare in caso di</Link> e <Link href="/enti">chi può aiutarti</Link>.
      </p>
    </div>
  )
}
