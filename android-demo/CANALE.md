# Amici Pelosi — versioni installabili

Qui non ci sono sorgenti: solo le versioni dell'app pronte da installare e il
manifesto che l'app legge per accorgersi da sola quando ne esce una nuova.

Il codice sta sul ramo principale dello stesso repository.

## Un solo indirizzo, sempre lo stesso

Questo link non cambia mai e scarica sempre l'ultima versione:

**https://github.com/bdbais/AmiciPelosi/raw/releases/AmiciPelosi.apk**

È quello da mandare a chi vuole provare l'app.

Nel canale c'è sempre e solo l'ultima versione: chi arriva non deve chiedersi
quale scaricare. Le versioni vecchie restano nella storia del ramo, per chi ha
bisogno di tornare indietro.

## Installare la prima volta

1. Apri il link qui sopra dal telefono.
2. Android chiederà il permesso di installare da questa fonte: è normale per
   un'app che non passa dal Play Store.
3. Da lì in poi non serve più tornare qui: l'app si aggiorna da sola.

## Come si aggiorna da sola

All'avvio l'app legge `latest.json`. Se il numero di versione è più alto di
quello installato, te lo dice, scarica il file, ne controlla l'impronta
SHA-256 e lo installa. Poi si riapre da sola. Niente browser, niente negozio.

Se sei senza rete, o se qualcosa va storto, l'app parte lo stesso e riprova la
volta dopo. Puoi sempre rispondere «più tardi».

## Il manifesto

```json
{
  "versionCode": 3,
  "versionName": "0.3",
  "apkUrl": "…/versions/AmiciPelosi-0.3.apk",
  "sha256": "impronta del file",
  "sizeBytes": 99200,
  "signingCertSha256": "impronta del certificato di firma",
  "minSdk": 21,
  "publishedAt": "2026-09-02",
  "notes": { "it": "…", "en": "…" }
}
```

`notes` è tradotto nelle lingue che l'app conosce; il telefono sceglie la sua.

## Verificare che sia davvero la nostra app

Tutte le versioni sono firmate con la stessa chiave. Android rifiuta un
aggiornamento firmato con una chiave diversa, e l'app scarica solo da
`github.com`. Se vuoi controllare a mano:

```
apksigner verify --print-certs AmiciPelosi-0.3.apk
```

L'impronta deve essere quella scritta in `signingCertSha256`.

## Questa è una demo

L'app che trovi qui è la versione dimostrativa: le schede degli animali sono
esempi, servono a provare navigazione, filtri, lingue e suoni su un telefono
vero. Non pubblicare qui annunci veri, non ci sono ancora.

## Perché esiste

Per aiutare un animale smarrito a tornare a casa, e uno senza casa a trovarne
una. Se stai leggendo questo file, sei già dalla parte giusta.
