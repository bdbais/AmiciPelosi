# Idee tenute da parte

Cose dette a voce mentre costruivamo Amici Pelosi, che non stiamo facendo adesso
ma che non vanno perse. Qui restano scritte con il motivo per cui aspettano.

## Gli incontri fra animali della stessa zona

Detto il 4 settembre 2026: un meetup fra animali vicini, con foto ricordo
che vedono solo i partecipanti. Tenuto da parte per quello che cambia, non per
quello che costa.

- **Cambia cosa è il sito.** Ogni pagina serve a far tornare a casa un
  animale; eventi, adesioni e album sono un'altra app dentro la stessa, e chi
  ha appena perso il cane si trova davanti gli inviti alla passeggiata.
- **Va contro due regole difese nel codice.** Un incontro pubblica dove sarai
  e a che ora con il tuo animale; le foto ricordo hanno persone dentro, anche
  se private, e la prima che esce fa saltare «nelle foto solo l'animale».
- **Mette insieme sconosciuti di persona**, fuori dal contesto di un animale
  da riportare a casa: un altro livello di responsabilità e di moderazione.

La forma piccola che non rompe niente, se e quando: **le associazioni
verificate pubblicano un'iniziativa** (passeggiata di gruppo, giornata delle
adozioni) come annuncio speciale in bacheca, senza adesioni né album.

## L'ingresso a zampa: sei tasti enormi, uno per schermata

Detto il 5 settembre 2026: aprire l'app e trovarsi davanti un tasto enorme a
forma di zampa con scritto SMARRITO; scorrendo, AVVISTATO; poi STALLO? con una
cuccia calda, ADOZIONI con una casa e una famiglia, CANILE/GATTILE con tanti
animali e un edificio, AIUTO con veterinari e uffici. Meno «sito», più
strumento: una cosa sola per schermata, che chiunque capisce.

**Il mockup da guardare sul telefono**: https://amicipelosi.pet/mockup/ingresso.html
Ha due varianti da confrontare: «Scorri», con la scheda successiva che sbircia
dal bordo, e «Impilati», gli stessi sei tasti uno sotto l'altro.

Da decidere votando:

- **Lo scorrimento nasconde le scelte.** Chi non sa di dover scorrere vede un
  tasto solo. La scheda che sbircia e i puntini aiutano, ma la variante
  impilata non ha niente da scoprire. Vale la pena scegliere guardando, non
  immaginando.
- **Le illustrazioni vanno fatte a mano**, non con le emoji: sono quelle che
  fanno il «wow». Costano un disegnatore o qualche ora di lavoro a tasto.
- **Cosa succede dopo il tasto.** SMARRITO e AVVISTATO aprono il modulo;
  STALLO e ADOZIONI un elenco con la ricerca in cima; CANILE/GATTILE e AIUTO
  la pagina «Chi può aiutarti». Il resto dell'app resta com'è.

## Pubblicare in automatico su Facebook e Instagram

Detto il 4 settembre 2026, guardando un post dell'associazione Arca di Noè:
un annuncio scritto una volta che compaia sul sito, sulla pagina Facebook e
su Instagram, per far lavorare meno chi gestisce un gattile.

Si può fare, ma non con un pomeriggio: serve un'app Meta con la revisione
(`pages_manage_posts`, `instagram_content_publish`), e ogni associazione deve
collegare la propria pagina con un permesso che scade e va rinnovato. Il verso
contrario, leggere Facebook e importare da lì, non è permesso.

Quello che si fa subito, e che è già in parte fatto: il link dell'annuncio
mostra la foto dell'animale quando lo si incolla su Facebook, WhatsApp o nella
bio di Instagram (Open Graph), e il testo pronto da copiare sta nella card
«Condividi». Un passo in mezzo, se serve prima dell'automazione: «Incolla il
testo di un post» nel modulo, che riempie titolo e descrizione da solo.

Una cosa da tenere ferma: nel post di esempio il numero di telefono è
pubblico. Qui non lo sarà mai, nemmeno pubblicando altrove: il testo
condiviso porta al sito, dove il recapito si chiede.

## Il backup, e la questione più grossa di tutte

Due richieste arrivate insieme, che sembrano una sola cosa e invece sono due.

### Il file `.petpack`

Un archivio cifrato con una password, che contiene tutto di un animale: scheda,
foto, libretto, diario. Lo si tiene dove si vuole — una chiavetta, un drive, la
posta a se stessi — e se un giorno il sito non c'è più, i dati restano.

Serve anche a un'altra cosa, ed è la più bella: **due familiari che vogliono
condividere il gatto si passano il file**. Nessun server in mezzo, nessun
account da collegare.

Questo si può fare adesso e non rompe niente: cifratura dentro il browser con
Web Crypto (una chiave derivata dalla password, poi AES-GCM), il file esce dal
telefono già illeggibile. È scritto qui e non nel codice solo perché la
prossima voce cambia le carte in tavola, e conviene decidere insieme.

### Che il server non veda niente in chiaro, e che i familiari si sincronizzino

Questa è un'altra faccenda, e va guardata in faccia prima di cominciare.

Oggi il server legge i dati: è così che sa mostrare al veterinario la sola
parte sanitaria, che tiene le foto private dietro un controllo su chi guarda,
e che potrà un giorno cercare qualcosa. Cifrare tutto lato client vuol dire che
**quel controllo si sposta sul telefono**, e il server diventa un magazzino di
buste chiuse.

Cosa comporta, detto senza giri:

- **Se si perde la password, i dati sono persi.** Non "difficili da
  recuperare": persi. Non possiamo aiutare nessuno, ed è esattamente il punto.
- **La condivisione diventa scambio di chiavi.** Il `.petpack` con la password
  è già un modo onesto di farlo fra due persone che si conoscono; per tre o
  quattro serve qualcosa di più strutturato.
- **La sincronizzazione fra più familiari** vuole una regola per quando due
  persone scrivono sul diario dello stesso gatto nello stesso pomeriggio. Non è
  difficile, ma va decisa: l'ultimo vince, oppure si tengono entrambe.
- **La vista ristretta del veterinario andrebbe rifatta.** Il server non può
  più separare la parte clinica dal resto, perché non la legge: dovrebbe essere
  il telefono a cifrare due pacchetti diversi, oppure il veterinario riceve
  tutto.

È una direzione buona e coerente con quello che l'app dichiara nei termini
d'uso. Ma è una **riscrittura** della parte degli animali di casa, non
un'aggiunta, e va fatta di proposito e non di striscio.

### Il backup a pagamento sul server

Tecnicamente è la conseguenza naturale della cifratura: se il server tiene buste
chiuse, tenerne tante costa poco e non ci mette nella posizione di custodire i
dati sanitari di nessuno.

La domanda vera non è tecnica: è se questo progetto vuole avere clienti. Fino a
ieri la risposta era che qui non gira denaro, e vale la pena decidere se quella
frase riguarda solo i ritrovamenti o anche noi.

