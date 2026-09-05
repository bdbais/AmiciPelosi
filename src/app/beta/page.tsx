import Link from 'next/link'

export const metadata = {
  title: 'La prova - Amici Pelosi',
  description: 'Cosa c’è da provare su Amici Pelosi, e come raccontare cosa non funziona.',
}

/**
 * La pagina per chi prova il sito prima degli altri.
 *
 * Un gruppo di prova senza una traccia prova tutti la stessa cosa - si iscrive,
 * guarda la bacheca e si ferma - e le parti che si rompono davvero non le tocca
 * nessuno. Qui c'e' l'elenco di cosa fare, in ordine, e come raccontare quello
 * che non va.
 */
const STEPS: { title: string; body: string; href?: string; label?: string }[] = [
  {
    title: 'Crea l’account e di’ chi sei',
    body: 'Se sei un canile, un gattile, un’associazione o un veterinario dillo nel profilo: cambia quello che il sito ti apre. Compila i dati dell’ente, salva, esci e rientra — devono essere ancora lì.',
    href: '/registrati',
    label: 'Registrati',
  },
  {
    title: 'Pubblica un annuncio, e poi correggilo',
    body: 'Metti foto, zona e caratteristiche. Poi torna sull’annuncio e cambia qualcosa: il colore, la via, una cifra del telefono. Le correzioni non devono far ripartire l’avviso di zona.',
    href: '/nuovo',
    label: 'Pubblica',
  },
  {
    title: 'Prova la richiesta di contatto',
    body: 'Da un altro account, apri un annuncio altrui e chiedi il contatto. Il numero non deve vedersi finché l’altro non accetta. Chi ha pubblicato trova la richiesta nel proprio profilo.',
    href: '/bacheca',
    label: 'Vai alla bacheca',
  },
  {
    title: 'Segnala un avvistamento',
    body: 'Sull’annuncio di qualcun altro, scrivi «l’ho visto qui» e allega una foto — dalla fotocamera o dalla galleria. Se la foto ha dentro le coordinate, il punto deve essere quello dello scatto e non quello dove sei adesso.',
  },
  {
    title: 'Accendi gli avvisi di zona',
    body: 'Imposta la zona, il raggio e ogni quanto vuoi essere avvisato. Poi fai pubblicare un annuncio lì vicino a qualcun altro e guarda se arriva. È la parte meno provata di tutte: se non arriva niente, scrivilo.',
    href: '/notifiche',
    label: 'Imposta gli avvisi',
  },
  {
    title: 'Compila la scheda di un animale tuo',
    body: 'Le tre foto, il microchip, il libretto fotografato — la lettura automatica del libretto propone microchip e data. Poi correggi la scheda e controlla che il diario resti dov’è. Questa scheda non la vede nessun altro: verificalo aprendo l’indirizzo da un altro account.',
    href: '/profilo/animali',
    label: 'Le tue schede',
  },
  {
    title: 'Guarda cosa succede senza permessi',
    body: 'Nega la posizione al browser e riprova «vicino a me»: deve dirti come sbloccarla, non lasciarti fermo. Con il GPS spento la ricerca deve comunque coprire tutta l’Italia.',
    href: '/permessi',
    label: 'Permessi',
  },
  {
    title: 'Chiudi un annuncio come è andata davvero',
    body: 'Anche male, se è andata male. Le chiusure tristi non devono fare festa: niente suono e niente coriandoli.',
  },
]

export default function BetaPage() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">🧪 La prova</h1>
      <p className="page-sub">
        Sei fra le prime persone che lo usano. Serve a trovare quello che si rompe adesso, mentre
        siamo in pochi e nessuno ci sta contando sopra per ritrovare il proprio cane.
      </p>

      <div className="alert info">
        <strong>Quello che scrivi è vero.</strong> Gli annunci si vedono, gli avvisi partono
        davvero a chi ha la zona impostata lì vicino. Se vuoi provare senza disturbare, scrivi
        nel titolo che è una prova e chiudi l’annuncio quando hai finito.
      </div>

      <div className="stack">
        {STEPS.map((step, index) => (
          <div className="card" key={step.title}>
            <h2 style={{ fontSize: '1.05rem' }}>
              {index + 1}. {step.title}
            </h2>
            <p className="section-hint">{step.body}</p>
            {step.href && (
              <Link href={step.href} className="btn secondary small">
                {step.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Come raccontare cosa non va</h2>
        <p className="section-hint">
          Tre righe bastano, e servono proprio queste: <strong>cosa stavi facendo</strong>,{' '}
          <strong>cosa ti aspettavi</strong>, <strong>cosa è successo invece</strong>. Se puoi,
          aggiungi il telefono che usi e il browser: metà dei problemi vive solo su un modello.
        </p>
        <p className="section-hint">
          Una schermata vale più di una descrizione. E se una cosa ti sembra stupida o brutta
          dillo lo stesso: è più facile cambiarla adesso che fra sei mesi.
        </p>
      </div>

      <div className="card">
        <h2>Cosa non c’è ancora, non serve segnalarlo</h2>
        <ul className="section-hint" style={{ paddingLeft: 18, margin: 0 }}>
          <li>L’app da scaricare è ancora la versione dimostrativa: gli annunci veri stanno qui.</li>
          <li>Il sito parla solo italiano.</li>
          <li>Non c’è ancora la messaggistica interna: il contatto accettato passa il numero vero.</li>
          <li>L’inserimento in blocco per canili e gattili è in arrivo.</li>
        </ul>
      </div>

      <p className="small muted">
        Dove finiscono i tuoi dati e chi li vede sta nei{' '}
        <Link href="/termini" style={{ textDecoration: 'underline' }}>
          termini d’uso
        </Link>
        . Puoi cancellare tutto dal tuo{' '}
        <Link href="/profilo" style={{ textDecoration: 'underline' }}>
          profilo
        </Link>
        , quando vuoi.
      </p>
    </div>
  )
}
