# Cosa è cambiato, e cosa abbiamo deciso

Una sezione per ogni pubblicazione, dalla più recente. Sotto «Scelte» stanno
le decisioni prese lungo la strada, con il motivo: sono quelle che vale la
pena rileggere prima di cambiarle. Lo legge chi modera, dalla scheda «Novità»
di `/admin`; il file viene spezzato in schede a ogni build.

## 5 settembre 2026 · un mockup da votare, e via le idee fuori contesto

- In «Idee» c'è «L'ingresso a zampa»: sei tasti enormi, uno per schermata,
  SMARRITO, AVVISTATO, STALLO?, ADOZIONI, CANILE/GATTILE, AIUTO. Il mockup
  si guarda dal telefono, con due varianti: a scorrimento e impilati. Si
  vota prima di costruirlo.
- Via da IDEE.md le biciclette e le persone scomparse: fuori dal contesto.

### Scelte

- **Prima il mockup, poi il codice.** Un'idea di interfaccia si decide
  guardandola sul telefono, non descrivendola.
- **Lo scorrimento nasconde le scelte**: è il dubbio scritto nell'idea, e
  la variante impilata serve a confrontare.

## 4 settembre 2026, notte · la home che capisce chiunque

- La home parte dall'app e dal perché: «Il sito lo apri quando ti serve.
  L'app ti avvisa da sola». Poi cinque tasti grandi: SEGNALAZIONE
  SMARRIMENTO, AVVISTAMENTO, ADOZIONE, STALLO, ASSOCIAZIONI CANILI E
  GATTILI. Sotto, la bacheca con gli ultimi sei annunci. Uguale per tutti,
  loggati o no.
- Il link di un annuncio incollato su Facebook, WhatsApp o Instagram mostra
  la foto dell'animale e il titolo (Open Graph), non il logo del sito.

### Scelte

- **Pubblicare in automatico su Facebook e Instagram aspetta**: serve
  un'app Meta approvata e ogni associazione deve collegare la sua pagina.
  È in IDEE.md con il motivo. Intanto il link porta la foto, e il testo
  pronto sta in «Condividi». Il telefono non sarà mai nel testo condiviso.

## 4 settembre 2026, sera · meno cose in prima battuta

- La bacheca sono gli annunci: via la presentazione, in cima solo la ricerca e
  un tasto «Filtri» che apre tipi, specie e «solo vicino a me». Il primo
  annuncio si vede nella prima schermata del telefono.
- La home per chi non è loggato è una schermata: tre tasti, «Ho perso un
  animale», «Ne ho visto uno», «Cosa succede vicino a me». Chi è loggato va
  dritto in bacheca.
- Il «+» chiede prima cosa vuoi pubblicare, con quattro tasti grandi; il
  modulo parte già con il tipo.
- Il modulo ha tre livelli: foto, specie, nome dell'animale, dove, quando e
  descrizione sempre visibili; «Altri dettagli» e «Come vuoi essere
  contattato» chiusi. Il titolo si propone da solo («Gatto smarrito a
  Monselice») finché non lo tocchi. «Il tuo nome, per chi ti contatta» al
  posto di «Nome di riferimento».
- La pagina dell'annuncio parte dalla foto e mette il tasto per chiedere il
  contatto subito dopo la descrizione; le caratteristiche sono una riga di
  chip; «Portalo fuori di qui» e «Il volantino» sono una card «Condividi».
- La registrazione parte da «Una persona»; le altre scelte si aprono con una
  riga.
- Una colonia felina non prova chi è con un link: scrive dove è censita, il
  Comune o la ASL e il numero o la data se li ha. In «Richieste» la propria
  richiesta non ha più i tasti: la decide un altro moderatore. L'amministratore
  invece può approvarsi da solo: è lui che risponde del sito.
- Fra i tipi c'è «Balia»: chi accoglie a casa cuccioli o animali in
  difficoltà per un periodo. Vale come una persona, con l'etichetta dopo la
  verifica; la prova è con chi collabora.
- Nella guida «Ho perso il mio animale»: la denuncia all'ufficio competente
  della zona, anagrafe degli animali e polizia locale, e le unità cinofile con
  cani molecolari. In «Chi può aiutarti» la ricerca di quei servizi nella
  zona, su Google Maps perché su OpenStreetMap non ci sono.
- Gli avvisi: in cima un interruttore solo, «Avvisami quando succede qualcosa
  vicino a casa», con lo stato in una riga; sotto la zona con la ricerca del
  comune e il raggio; «Salva» che resta in basso. Il resto in «Altre
  impostazioni», chiuso. Accendere l'interruttore chiede subito il permesso
  del browser, perché va chiesto su un gesto.
- Il profilo: una card con nome, tipo, i tre numeri e «Come ti vedono gli
  altri»; poi un menu a righe: annunci, richieste di contatto con quelle in
  attesa, animali, inserimento rapido per gli enti, moderazione per chi
  modera. «Chi sei» chiuso salvo che ci sia qualcosa da fare; «Cancellare
  l'account» in fondo.

### Scelte

- **Chi spiega cosa è il sito è la home, non la bacheca.** Chi arriva in
  bacheca cerca un annuncio; la spiegazione se l'è già letta o non gli serve.
- **Il nome dell'animale e il nome della persona non stanno più vicini**, e
  le etichette dicono di chi si parla: era la confusione più segnalata.
- **Il titolo lo proponiamo noi.** È il campo su cui ci si blocca: si sa cosa
  è successo, non come si dice in una riga.

## 4 settembre 2026 · moderazione completa, app vera nel canale

- Chi rientra dopo un blocco viene riconosciuto da un gettone sul browser e
  dall'indirizzo di rete abbreviato, e **segnalato** a chi modera come «somiglia
  a…», con una push. Un moderatore può bloccare anche il dispositivo: da lì non
  ci si registra più.
- «Vedi il sito come…»: l'amministratore guarda il sito con gli occhi di
  un'altra persona, in sola lettura, per mezz'ora. Ogni apertura è nel registro.
- Alla registrazione si sceglie chi si è: persona, colonia felina, canile,
  gattile, associazione, veterinario. Chi entra con Google la prima volta lo
  sceglie subito dopo, nel profilo.
- Verifica degli enti: chi si dichiara ente dà un link che lo provi ed entra in
  coda in «Richieste»; fino all'approvazione conta come persona. Il rifiuto ha
  un motivo, e si può ripresentare.
- Scheda «Idee» in `/admin`: le sezioni di IDEE.md con il voto di chi modera e
  un campo per aggiungerne. Lo stato lo cambia solo l'amministratore.
- L'app vera, versione 1.1 con il dominio nuovo, è nel canale di download al
  posto della demo. La home non parla più di demo.
- Il logo per associazioni, canili e gattili, visibile agli altri solo dopo la
  verifica. Chi modera può toglierlo con un motivo.
- `/admin/persone` parte da chi è entrato per ultimo e dice se usa l'app o il
  sito. Il cambio di ruolo nel registro dice «da… a…» e ha un campo motivo.

### Scelte

- **Niente blocco automatico.** Chi somiglia a un bloccato viene mostrato a una
  persona, che decide. L'unico automatismo è il dispositivo bloccato da un
  moderatore. Chi aggiunge una soglia che blocca da sola cambia una decisione
  presa.
- **Niente fingerprinting.** Il gettone è un codice casuale che identifica il
  browser, non la persona; un'impronta ricavata da schermo e font sarebbe
  tracciamento, e sui telefoni non funziona nemmeno.
- **La chiave dell'app resta quella della demo, per ora.** Decisione presa per
  fare in fretta con i beta tester. Prima dell'apertura al pubblico si cambia,
  e chi ha installato la 1.1 dovrà disinstallare: è scritto in STATO.md.
- **Gli incontri fra animali della stessa zona aspettano.** Un meetup cambia
  cosa è il sito e va contro due regole difese nel codice: la posizione delle
  persone e le foto senza persone. È in IDEE.md con il motivo.
- **Il voto sulle idee non va nel registro**, lo stato sì: un voto è
  un'opinione, non un intervento.
- **«Vedi il sito come…» è in sola lettura**, e lo impone un livello sotto
  tutte le rotte: vedere cosa vede una persona va bene, agire a nome suo no.

## 3 settembre 2026 · dominio nuovo, posizione scritta a mano, moderazione

- Il sito trasloca su **amicipelosi.pet**, comprato su Cloudflare; il vecchio
  indirizzo rimanda lì. L'accesso con Google ha un progetto suo.
- La posizione del dispositivo si usa solo da telefono: da computer il browser
  la stima dall'indirizzo IP e sbaglia di decine di chilometri. Ovunque c'è una
  mappa si scrive un comune o un indirizzo; chi ha salvato la zona ha «La mia
  zona», anche per guardare casa da lontano.
- «Chi può aiutarti» mostra veterinari e rifugi veri da OpenStreetMap attorno
  al posto scelto, al posto degli esempi di Roma.
- Tasto «Segnala avvistamento» in home e bacheca. Icone dell'intestazione
  disegnate a mano; il logo è l'impronta con il cuore.
- Profilo pubblico con grazie ricevuti, annunci pubblicati, annunci a cui ha
  risposto. Il grazie lo dà chi ha pubblicato. «Titolare di una colonia felina»
  fra i tipi. Fra le frequenze degli avvisi c'è «1 minuto».
- Moderazione: ruoli, segnalazioni con motivo a scelta, chiudi, rimuovi,
  riapri, blocca, sblocca, registro. Lo scudo nell'intestazione e i riquadri di
  moderazione sopra annunci e profili.

### Scelte

- **Il ruolo si legge dal server, mai dal client.** Un componente che nasconde
  un tasto non è una protezione.
- **Rimuovere non è cancellare.** Un annuncio rimosso resta con il motivo,
  sparisce da tutte le query pubbliche, e si può riaprire.
- **Le chiavi non passano dalla conversazione.** Il secret di Google, finito in
  uno screenshot, è stato ruotato; i segreti li carica Federico dal terminale.
- **Il `.pet` invece di un `.it`**: Cloudflare non vende il `.it`, e
  «pawheart» o «comehome» erano buoni ma il nome che la gente conosce è questo.

## 2 settembre 2026 · revisione prima dei beta tester

- Chiusi i buchi della revisione: recapiti che uscivano da `/api/posts/[id]`,
  XSS nel JSON-LD, EXIF con il GPS di casa che passava nelle foto, Google che
  collegava email non verificate.
- Controllo dell'origine su tutte le rotte che scrivono, freno per IP, header
  di sicurezza, versione di sessione nel token.
- Push a lotti dopo la risposta, re‑iscrizione automatica se la chiave VAPID
  cambia, avviso all'autore per ogni avvistamento.
- `npm run pubblica` verifica i segreti remoti e che il build sia nuovo.

### Scelte

- **Le foto passano sempre dalla canvas**, anche quando pesano di più:
  è l'unico modo per essere sicuri che l'EXIF con le coordinate non esca.
- **La chiave Android è pubblica e va rifatta prima dell'app vera**: segnato
  in STATO.md come punto 4.
