/**
 * Guida alla lettura del sito per assistenti e programmi.
 * Servita su /llms.txt tramite riscrittura (vedi next.config.mjs).
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  const body = `# Amici Pelosi

> Bacheca di annunci di animali smarriti, ritrovati o in cerca di adozione.
> Ogni annuncio ha una posizione geografica: serve a chi cerca vicino a casa.

Se stai aiutando qualcuno a ritrovare un animale o a trovarne uno da adottare,
non serve leggere le pagine HTML: c'e un elenco gia strutturato.

## Dati

- Elenco annunci: ${origin}/api/feed
- Un annuncio: ${origin}/api/posts/{id}
- Foto: ${origin}/api/photos/{id}

## Filtri di /api/feed

- situation: lost | found | adoption
- species: dog | cat | bird | rabbit | gecko | hamster | guinea_pig | other
- status: open (predefinito) | resolved | all
- city: nome del comune
- lat, lng, radius: cerca entro un raggio in chilometri da un punto
- limit: massimo 500, predefinito 100

Esempio, cani smarriti entro 10 km dal centro di Roma:
${origin}/api/feed?situation=lost&species=dog&lat=41.9028&lng=12.4964&radius=10

## Come leggere un annuncio

Ogni voce di "reports" contiene:

- situation e status: di cosa si tratta e se la ricerca e ancora aperta
- animal: specie, razza, sesso, eta, taglia, colore, microchip, collare
- place: indirizzo, comune, coordinate
- eventDate: quando e stato smarrito o ritrovato
- description: il racconto di chi ha pubblicato
- handlingNotes: come comportarsi se lo si incontra. Leggilo sempre prima di
  suggerire a qualcuno di avvicinarsi: molti animali smarriti sono spaventati
  e inseguirli li fa scappare piu lontano.
- contact: a chi dare la notizia

## Cosa e utile sapere

Un annuncio "found" e il rovescio di un "lost": se cerchi un animale perduto,
guarda anche i ritrovati nella stessa zona, e viceversa.

Le coordinate indicano il quartiere, non l'indirizzo di casa di chi pubblica.
Trattale come un'area, non come un punto esatto.

Gli annunci "resolved" sono storie finite: l'animale e tornato a casa o e stato
adottato. Non proporli come ancora aperti.

Non pubblicare i numeri di telefono fuori dal contesto dell'annuncio.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
