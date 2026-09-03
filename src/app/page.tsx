import Link from 'next/link'
import { PawHeartIcon } from '@/components/Icons'

/**
 * La pagina che si apre scrivendo l'indirizzo.
 *
 * Non e la bacheca: qui si spiega di cosa si tratta e si consegna l'app, con
 * un quadrato da inquadrare per chi legge dal telefono.
 *
 * Finche' dura la prova pero' la porta d'ingresso deve essere in vista: chi
 * riceve l'indirizzo e arriva qui deve poter entrare, non solo leggere. Prima
 * questa pagina diceva "gli annunci stanno sul sito" senza un collegamento per
 * arrivarci, e chi non conosceva /bacheca a memoria si fermava qui.
 */

const APK = 'https://github.com/bdbais/AmiciPelosi/raw/releases/AmiciPelosi.apk'
const REPO = 'https://github.com/bdbais/AmiciPelosi'
const CANALE = 'https://github.com/bdbais/AmiciPelosi/tree/releases'

export const metadata = {
  title: 'Amici Pelosi - aiutiamoli a tornare a casa',
  description:
    'Un’app per ritrovare un animale perduto e per trovare una famiglia a chi non ha casa. Annunci con foto e zona, e un avviso a chi vive lì vicino.',
}

export default function LandingPage() {
  return (
    <div className="container landing">
      <section className="landing-hero">
        <p className="eyebrow">Animali smarriti, ritrovati, in cerca di casa</p>
        <h1>
          Aiutiamoli a tornare a casa&nbsp;
          <PawHeartIcon size={30} className="paw-inline" />
        </h1>
        <p className="lede">
          Amici Pelosi serve a due cose: <strong>ritrovare un animale perduto</strong> e{' '}
          <strong>trovare una famiglia a chi non ce l&apos;ha</strong>. Si pubblica un annuncio con una
          foto e una zona, e chi vive lì vicino riceve un avviso sul telefono. Da quel momento non
          si cerca più da soli.
        </p>
      </section>

      <section className="landing-try">
        <h2>Entra e prova&nbsp;🧪</h2>
        <p>
          Il sito è aperto e funziona: si pubblica, si cerca, si segnala un avvistamento e si
          ricevono gli avvisi di zona. Siamo nella <strong>fase di prova</strong> — gli annunci
          che scrivi sono veri e li vedono gli altri, quindi scrivi cose vere.
        </p>
        <div className="actions">
          <Link className="btn" href="/bacheca">
            Guarda la bacheca
          </Link>
          <Link className="btn secondary" href="/nuovo?tipo=FOUND">
            👀 Segnala avvistamento
          </Link>
          <Link className="btn secondary" href="/registrati">
            Crea un account
          </Link>
          <Link className="btn secondary" href="/beta">
            Cosa c’è da provare
          </Link>
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

      <section className="landing-cols">
        <div className="landing-card">
          <h3>🔎 Hai perso qualcuno</h3>
          <p>
            Le prime ventiquattro ore contano più di tutte le altre. Pubblichi foto e zona, e i
            telefoni del quartiere si accendono subito.
          </p>
        </div>
        <div className="landing-card">
          <h3>🐾 Ne hai trovato uno</h3>
          <p>
            Ti sei fermato quando potevi tirare dritto. L’annuncio arriva a chi lo sta cercando,
            spesso a poche centinaia di metri da lì.
          </p>
        </div>
        <div className="landing-card">
          <h3>🏡 Cerchi o offri una casa</h3>
          <p>
            Adozioni, e anche stalli: una casa per un periodo, mentre si cerca la famiglia
            definitiva o si aspetta che il padrone si faccia vivo.
          </p>
        </div>
      </section>

      <section className="landing-rules">
        <h2>Due regole, e sono serie</h2>
        <p>
          <strong>Nelle foto ci va solo l’animale.</strong> Niente persone, neanche di spalle o
          sullo sfondo, niente targhe e niente numeri civici.
        </p>
        <p>
          <strong>Qui non si scambia denaro.</strong> Nessuna ricompensa per un ritrovamento,
          nessun compenso per uno stallo, nessuna vendita di animali. Non è questo lo scopo del
          sito, e chi te lo chiede va segnalato.
        </p>
        <p className="small muted">
          Come funziona nel dettaglio, dove finiscono i tuoi dati e chi li vede sta nei{' '}
          <Link href="/termini">termini d’uso</Link>. Se hai davanti un animale adesso e non sai da
          dove cominciare, vai a <Link href="/aiuto">cosa fare in caso di</Link>.
        </p>
      </section>

      <section className="landing-more">
        <Link href="/aiuto" className="more-link">
          <span aria-hidden="true">❓</span>
          <span>
            <strong>Cosa fare in caso di</strong>
            <em>Ho trovato un cane, un gatto, un animale ferito…</em>
          </span>
        </Link>
        <Link href="/enti" className="more-link">
          <span aria-hidden="true">🏛️</span>
          <span>
            <strong>Chi può aiutarti</strong>
            <em>Veterinari, canili, gattili e associazioni</em>
          </span>
        </Link>
      </section>
    </div>
  )
}
