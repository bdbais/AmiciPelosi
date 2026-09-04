# Cosa è cambiato, e cosa abbiamo deciso

Una sezione per ogni pubblicazione, dalla più recente. Sotto «Scelte» stanno
le decisioni prese lungo la strada, con il motivo: sono quelle che vale la
pena rileggere prima di cambiarle. Lo legge chi modera, dalla scheda «Novità»
di `/admin`; il file viene spezzato in schede a ogni build.

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
