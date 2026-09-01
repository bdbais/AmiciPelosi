import Link from 'next/link'

export const metadata = { title: 'Regole e avvertenze - Amici Pelosi' }

export default function RulesPage() {
  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1 className="page-title">Regole e avvertenze</h1>
      <p className="page-sub">
        Poche regole, tutte con lo stesso scopo: proteggere gli animali e le persone.
      </p>

      <div className="card">
        <h2>📷 Nelle foto solo animali</h2>
        <p className="section-hint">
          Le immagini devono mostrare <strong>soltanto l animale</strong>. Non caricare foto in cui
          compaiono persone, neanche di spalle, sfocate o sullo sfondo: chi le vede non ha dato il
          consenso a finire in una bacheca pubblica, e i bambini vanno protetti in modo particolare.
        </p>
        <p className="section-hint">
          Evita anche i dettagli che rivelano dove abiti: targhe, numeri civici, citofoni, insegne
          del negozio sotto casa. Per far ritrovare un cane serve il muso del cane, non la tua porta.
        </p>
      </div>

      <div className="card">
        <h2>📍 La zona, non l indirizzo di casa</h2>
        <p className="section-hint">
          Il punto sulla mappa serve ad avvisare chi sta vicino: va benissimo la via, la piazza o il
          parco. Se l animale e a casa tua, sposta il segnaposto di qualche decina di metri.
        </p>
      </div>

      <div className="card">
        <h2>🩺 Animale ferito o in pericolo</h2>
        <p className="section-hint">
          Un annuncio non sostituisce i soccorsi. Se l animale e ferito, contatta subito un
          veterinario o il servizio veterinario della ASL. Per gli animali selvatici rivolgiti a un
          centro di recupero (CRAS).
        </p>
      </div>

      <div className="card">
        <h2>⚠️ Attenzione alle truffe</h2>
        <p className="section-hint">
          Chi ti dice di aver trovato il tuo animale e chiede soldi in anticipo, ricariche o
          spedizioni sta quasi sempre mentendo. Chiedi sempre una foto attuale e un dettaglio che
          solo chi lo ha davvero davanti puo conoscere. Gli incontri falli in un luogo pubblico.
        </p>
      </div>

      <div className="card">
        <h2>🏡 Adozioni responsabili</h2>
        <p className="section-hint">
          Un animale non e un oggetto da dare via in fretta. Racconta com e davvero: carattere,
          esigenze, terapie, con chi sta bene. Chi adotta deve poter scegliere con cognizione, e
          questo evita i ritorni in canile.
        </p>
        <p className="section-hint">
          Ricorda che cani e gatti vanno ceduti con microchip e passaggio di proprieta registrato.
        </p>
      </div>

      <div className="card">
        <h2>🤝 Come ci si comporta qui</h2>
        <p className="section-hint">
          Le segnalazioni di avvistamento servono ad aiutare, non a commentare. Se non hai visto
          l animale, non scrivere: ogni notifica inutile toglie attenzione a quelle vere.
        </p>
        <p className="section-hint">
          Quando un annuncio si chiude bene, ricordati di segnarlo come risolto: e il momento piu
          bello, e libera la bacheca per chi sta ancora cercando.
        </p>
      </div>

      <p style={{ textAlign: 'center', marginTop: 24 }}>
        <Link href="/nuovo" className="btn">
          Ho capito, pubblica un annuncio
        </Link>
      </p>
    </div>
  )
}
