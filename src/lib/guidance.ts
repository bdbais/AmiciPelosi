/**
 * I testi che l'app mostra quando qualcuno ha bisogno di sapere cosa fare.
 *
 * Sono nati nella demo e vivono qui perche' non sono decorazione: la guida su
 * come avvicinare un animale spaventato e' la cosa piu' utile che questa app
 * possieda, e va tenuta insieme al codice che la mostra.
 *
 * Gli enti qui sotto sono solo le associazioni nazionali, e sono reali: quegli
 * indirizzi vanno riconfermati a ogni rilascio. Veterinari e canili non stanno
 * piu' qui: c'erano esempi inventati ambientati a Roma, e chi vive a Monselice
 * li ha letti come «completamente fuori zona». Ora arrivano da OpenStreetMap
 * attorno al posto scelto (`/api/luoghi`, `NearbyPlaces`).
 */

export type PlaceLink = { label: string; href: string }
export type Place = { emoji: string; name: string; detail: string; links: PlaceLink[] }
export type PlaceGroup = { group: string; items: Place[] }
export type Guide = { emoji: string; title: string; intro: string; steps: string[]; dont: string }
export type TermsSection = { heading: string; paragraphs: string[] }

export const PLACES: PlaceGroup[] = [
  {
    "group": "Associazioni e guardie zoofile",
    "items": [
      {
        "emoji": "🐾",
        "name": "ENPA — Ente Nazionale Protezione Animali",
        "detail": "Sezioni in quasi tutte le province: canili, gattili, guardie zoofile.",
        "links": [
          {
            "label": "enpa.it",
            "href": "https://www.enpa.it"
          }
        ]
      },
      {
        "emoji": "🌍",
        "name": "OIPA Italia",
        "detail": "Guardie zoofile volontarie e segnalazioni di maltrattamento.",
        "links": [
          {
            "label": "oipa.org",
            "href": "https://www.oipa.org/italia/"
          }
        ]
      },
      {
        "emoji": "⚖️",
        "name": "LAV",
        "detail": "Tutela legale degli animali e campagne contro l'abbandono.",
        "links": [
          {
            "label": "lav.it",
            "href": "https://www.lav.it"
          }
        ]
      },
      {
        "emoji": "🐕",
        "name": "LNDC Animal Protection",
        "detail": "Lega Nazionale per la Difesa del Cane: rifugi e adozioni in tutta Italia.",
        "links": [
          {
            "label": "lndc.it",
            "href": "https://www.lndc.it"
          }
        ]
      },
      {
        "emoji": "☎️",
        "name": "112 — numero unico di emergenza",
        "detail": "Per un animale in pericolo immediato, o quando non sai chi altro chiamare.",
        "links": [
          {
            "label": "Chiama il 112",
            "href": "tel:112"
          }
        ]
      }
    ]
  }
]

export const GUIDES: Guide[] = [
  {
    "emoji": "●",
    "title": "Ho trovato un animale investito, o morto",
    "intro": "È la pagina che nessuno vorrebbe aprire. Ma da qualche parte c'è una famiglia che lo sta ancora cercando, e l'unica cosa che le manca è saperlo.",
    "steps": [
      "Se respira ancora, non è questa la pagina giusta: vai a «L'animale è ferito» e chiama subito un pronto soccorso veterinario.",
      "Mettiti in sicurezza prima di tutto. Su una strada trafficata non scendere dall'auto e chiama la Polizia Locale: togliere un corpo dalla carreggiata è compito loro, e nessuno deve rischiare la pelle per farlo.",
      "<b>Chiedi che leggano il microchip.</b> È la cosa più importante di tutta questa pagina: il chip si legge anche dopo, e il servizio veterinario della ASL può risalire alla famiglia e avvisarla. Senza quel passaggio, quelle persone continueranno a cercare per mesi.",
      "Segna dove sei, l'ora, e com'era fatto: tipo di animale, taglia, colore, razza se la riconosci, se aveva un collare.",
      "Pubblica qui una segnalazione. <b>Non servono fotografie</b>, e non si possono caricare: chi la legge sta cercando il proprio animale da giorni, e taglia, colore e il punto esatto gli bastano per capire se deve venire a controllare.",
      "La segnalazione arriva solo a chi ha un annuncio di smarrimento aperto lì vicino. Non va a tutta la zona: agli altri sarebbe soltanto una brutta notizia su un animale che non conoscono."
    ],
    "dont": "Non portarlo via da solo per «risolvere», e non seppellirlo: senza la lettura del microchip quella famiglia non saprà mai cosa è successo, e resterà a cercare. Non pubblicare fotografie da nessuna parte, nemmeno nei gruppi: qualcuno le vedrà senza essere pronto."
  },
  {
    "emoji": "🐕",
    "title": "Ho trovato un cane che gira da solo",
    "intro": "Quasi sempre ha una casa a poche centinaia di metri. Non è tuo, ma per la prossima ora sei l'unica persona che può aiutarlo.",
    "steps": [
      "Fermati e abbassati. Non corrergli dietro: un cane spaventato che viene inseguito scappa più lontano, spesso verso la strada.",
      "Chiamalo con voce bassa e porgi il dorso della mano. Se si avvicina, guarda se ha una medaglietta.",
      "Fallo leggere per il microchip: da qualsiasi veterinario o al servizio veterinario della ASL è gratuito e dura un minuto. Molto spesso finisce lì, e il padrone lo riabbracci stasera.",
      "Pubblica qui un annuncio «Ritrovato» con la zona e una foto: i telefoni del quartiere si accendono subito. È la strada più veloce dopo il microchip.",
      "Se hai un posto dove tenerlo mentre si cerca, tienilo. Puoi chiedere l'affido, e puoi chiedere qui uno stallo se tu non ce la fai: bastano pochi giorni, quasi mai di più.",
      "<b>Il canile è l'ultima cosa, non la prima.</b> Vacci solo se il microchip non c'era o non ha dato niente, se l'annuncio non ha portato nessuno, e se davvero non hai dove tenerlo. I canili sono pieni, e per un cane che ha appena perso casa non è un posto dolce."
    ],
    "dont": "Niente latte, cioccolato o avanzi. Acqua sì, sempre. Non caricarlo in auto da solo se ringhia o trema forte: aspetta chi ha il guinzaglio giusto. E non portarlo al canile lo stesso pomeriggio: dagli almeno il tempo di un microchip letto e di un annuncio pubblicato."
  },
  {
    "emoji": "🐈",
    "title": "Ho trovato un gatto",
    "intro": "La domanda giusta non è «è perso?» ma «è di qualcuno?». Moltissimi gatti che sembrano abbandonati vivono benissimo dove sono.",
    "steps": [
      "Guardalo: pulito, tranquillo, in carne vuol dire quasi sempre che ha una casa o una colonia che lo accudisce. Lascialo dov'è.",
      "Se è magro, sporco, ferito o miagola senza smettere, allora sì, ha bisogno di te.",
      "In Italia i gatti liberi sono protetti dalla legge 281 del 1991 e non si spostano dalla loro colonia. Prima di portarlo via, chiedi in giro.",
      "Fallo passare sotto il lettore del microchip da un veterinario: è gratuito e dura un minuto.",
      "Pubblica un annuncio «Ritrovato» con la foto e la via esatta."
    ],
    "dont": "Non portartelo a casa d'istinto. Un gatto che sembra smarrito a volte è semplicemente a cento metri dalla sua ciotola."
  },
  {
    "emoji": "🚑",
    "title": "L'animale è ferito",
    "intro": "Qui il tempo conta, e la calma conta di più.",
    "steps": [
      "Chiama subito un pronto soccorso veterinario. Se non sai chi chiamare, in Italia c'è il 112.",
      "Coprilo con una giacca o un asciugamano: il buio e il tepore riducono lo shock.",
      "Anche l'animale più dolce può mordere quando ha male. Usa un telo per sollevarlo, e per un cane grande aspetta aiuto.",
      "Niente acqua nè cibo se è incosciente o respira male.",
      "Se è un animale selvatico, cerca un centro recupero animali selvatici: sono attrezzati per quello."
    ],
    "dont": "Non provare a sistemare una zampa, non disinfettare con l'alcol, non dare antidolorifici da uomo: il paracetamolo uccide i gatti."
  },
  {
    "emoji": "😿",
    "title": "Ho perso il mio animale",
    "intro": "Le prime ventiquattro ore valgono più di tutte le altre messe insieme. Questo è l'ordine che funziona.",
    "steps": [
      "Cerca prima vicinissimo: sotto le auto, nelle cantine, nei box, dietro i cassonetti. La maggior parte è a meno di trecento metri.",
      "Pubblica qui l'annuncio con una foto chiara e la zona: i telefoni del quartiere si accendono subito.",
      "Denuncia lo smarrimento all'anagrafe degli animali o al servizio veterinario. Se qualcuno lo porta al canile, ti trovano.",
      "Lascia fuori dalla porta una sua coperta e la lettiera usata: l'odore è la strada di casa.",
      "Torna a cercarlo all'alba e a notte fonda, quando c'è silenzio. Chiamalo, poi stai zitto e ascolta."
    ],
    "dont": "Non urlare il suo nome in gruppo e non corrergli incontro appena lo vedi. Siediti a terra e lascia che sia lui ad avvicinarsi."
  },
  {
    "emoji": "🚨",
    "title": "Ho visto un animale abbandonato o maltrattato",
    "intro": "Segnalare non è fare la spia. È l'unica cosa che a volte cambia davvero la vita di quell'animale.",
    "steps": [
      "Se è in pericolo immediato, chiama il 112.",
      "Annota data, luogo e cosa hai visto. Una foto da lontano vale più di mille parole.",
      "Rivolgiti alle guardie zoofile della tua zona o a un'associazione: sanno come si scrive una segnalazione che regge.",
      "In Italia l'abbandono di animali è un reato, previsto dall'articolo 727 del codice penale. Non è una scortesia."
    ],
    "dont": "Non entrare in proprietà private e non affrontare da solo chi lo maltratta. Una segnalazione fatta bene arriva molto più lontano di una lite."
  },
  {
    "emoji": "🐣",
    "title": "Ho trovato dei cuccioli o un nido",
    "intro": "L'errore più comune, e più comprensibile, è raccoglierli. Quasi sempre la mamma è li' vicino e sta solo aspettando che tu vada via.",
    "steps": [
      "Allontanati e guarda da lontano per due o tre ore. Se la mamma torna, hai già fatto la cosa giusta.",
      "Se dopo ore non torna nessuno, o se i piccoli sono freddi e piangono senza sosta, allora serve aiuto.",
      "Tienili al caldo, non al caldissimo: una borraccia d'acqua tiepida sotto un panno.",
      "Mai latte di mucca: per i cuccioli è un veleno lento. Serve il latte in polvere apposta, da un veterinario.",
      "Per uccellini e animali selvatici chiama un centro recupero prima di toccarli."
    ],
    "dont": "Non portarli via «per sicurezza». Un nido spostato è un nido perso."
  },
  {
    "emoji": "🏡",
    "title": "Vorrei adottare, o fare da stallo",
    "intro": "Adottare è per sempre. Fare da stallo è per un pezzo di strada, e certe volte è proprio quello che serve.",
    "steps": [
      "Guarda gli annunci di adozione, e quelli che cercano uno stallo: sono animali che hanno bisogno di una casa per qualche settimana, non per sempre.",
      "Uno stallo serve mentre si cerca la famiglia definitiva, oppure mentre si aspetta che il padrone si faccia vivo.",
      "Chiedi tutto prima: carattere, salute, se va d'accordo con altri animali, e chi copre le spese veterinarie.",
      "Prepara una stanza tranquilla dove possa nascondersi nei primi giorni.",
      "Dai tempo. Le prime due settimane non sono l'animale che diventerà."
    ],
    "dont": "Non adottare di slancio in un pomeriggio, e non prendere uno stallo se non te la senti di restituirlo. Ci si affeziona, ed è giusto così: va solo messo in conto prima."
  }
]

export const TERMS: TermsSection[] = [
  {
    "heading": "In due righe",
    "paragraphs": [
      "Amici Pelosi serve a far tornare a casa un animale perduto e a trovarne una a chi non ce l'ha. Non vendiamo niente, non vendiamo te, e qui dentro non gira denaro.",
      "Quello che pubblichi lo vedono tutti. Il tuo recapito no: quello lo vede solo chi è entrato con il proprio nome."
    ]
  },
  {
    "heading": "Che cosa teniamo di te",
    "paragraphs": [
      "<b>Il tuo account.</b> Nome, indirizzo email e immagine del profilo, così come ce li passa Google quando entri. Non vediamo e non riceviamo la tua password di Google.",
      "<b>I tuoi annunci.</b> Il testo, le foto, la specie, e il punto sulla mappa che scegli tu — non la tua posizione istante per istante.",
      "<b>La tua zona di avviso.</b> Un punto e un raggio in chilometri, se accendi le notifiche. Serve a decidere quali annunci meritano di farti squillare il telefono.",
      "<b>L'indirizzo a cui mandarti gli avvisi.</b> Lo genera il tuo telefono, non contiene il tuo numero e serve solo a recapitarti la notifica.",
      "<b>Le segnalazioni che lasci</b> sugli annunci degli altri, con il nome che hai scelto."
    ]
  },
  {
    "heading": "Dove stanno, materialmente",
    "paragraphs": [
      "Su <b>Cloudflare</b>, che è l'infrastruttura su cui gira l'app. Il testo degli annunci e degli account sta in un database chiamato D1; le foto stanno in un archivio separato, chiamato KV.",
      "Non ci sono altre copie: niente fogli di calcolo, niente esportazioni verso terzi, nessuno strumento di statistiche che ti segue da una pagina all'altra.",
      "Prima di aprire a chiunque, va scritto qui chi è il titolare del trattamento e in quale paese stanno i server. Finché siamo in prova fra persone invitate, questa riga resta scoperta, ed è giusto che tu lo sappia."
    ]
  },
  {
    "heading": "Chi vede che cosa",
    "paragraphs": [
      "<b>Pubblico:</b> il titolo, la descrizione, le foto, la specie, la zona indicativa e il nome con cui firmi l'annuncio.",
      "<b>Solo a chi lo chiede e lo ottiene:</b> il numero di telefono e l'indirizzo email di chi ha pubblicato. Non si leggono da nessuna parte: si chiedono con due righe, e chi ha pubblicato legge chi glielo chiede e decide. Chi preferisce può scegliere, annuncio per annuncio, di mostrare il proprio numero a chi è entrato: è una scelta esplicita e non è quella di partenza.",
      "Il motivo è concreto: un numero in chiaro su una bacheca lo raccoglie chiunque passi, e da un elenco così comincia la telefonata di chi finge di aver trovato il tuo animale per chiederti dei soldi. Non mandare mai denaro a nessuno prima di aver visto l'animale: qui non si pagano ritrovamenti, stalli o adozioni.",
      "<b>Mai pubblico:</b> la tua posizione GPS reale, la tua zona di avviso e l'indirizzo tecnico delle notifiche."
    ]
  },
  {
    "heading": "Quanto restano, e come si cancellano",
    "paragraphs": [
      "Un annuncio resta finché lo tieni. Puoi chiuderlo quando la storia finisce bene, e puoi cancellarlo del tutto.",
      "Puoi cancellare il tuo account: spariscono i tuoi annunci, le tue foto, le tue segnalazioni e la tua zona di avviso. Non teniamo una copia di cortesia.",
      "Se ci scrivi per farlo cancellare, lo facciamo. Non ti chiediamo perché."
    ]
  },
  {
    "heading": "Le regole di chi pubblica",
    "paragraphs": [
      "<b>Nelle foto ci va solo l'animale.</b> Niente persone, neanche di spalle o sullo sfondo, niente targhe e niente numeri civici.",
      "<b>Niente denaro.</b> Nessuna ricompensa per un ritrovamento, nessun compenso per uno stallo, nessuna vendita di animali. Chi te lo chiede va segnalato.",
      "<b>Annunci veri.</b> Un annuncio inventato manda persone vere a cercare in strada per niente.",
      "Chi non rispetta queste tre righe viene tolto, senza discussioni."
    ]
  },
  {
    "heading": "Quello che stai usando adesso",
    "paragraphs": [
      "Questa è la <b>demo</b>. Gli annunci sono esempi, i nomi e i numeri sono inventati, e <b>niente esce dal tuo telefono</b>: quello che tocchi qui vive nella memoria della pagina e sparisce quando la chiudi.",
      "Serve a guardare le schermate e dire cosa non va, prima che ci siano dentro storie vere."
    ]
  }
]
