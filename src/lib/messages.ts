/**
 * Le parole che l'app usa per ringraziare. Ogni gesto - un annuncio, una
 * segnalazione, una telefonata a chi cerca - e tempo che qualcuno regala a un
 * animale: vale la pena dirlo con calore, e senza ripetersi sempre uguale.
 */

const THANKS = {
  postLost: [
    'Grazie per averci affidato la sua storia. Da adesso non lo stai cercando piu da solo. 🐾',
    'Ci siamo. Il tuo annuncio e in viaggio verso chi vive in quella zona: teniamo gli occhi aperti insieme. 💛',
  ],
  postFound: [
    'Grazie di cuore: ti sei fermato quando potevi tirare dritto. Ora cerchiamo insieme la sua famiglia. 🐾',
    'Che bel gesto. Qualcuno stanotte dormira meglio sapendo che il suo pelosetto e al sicuro con te. 💛',
  ],
  postAdoption: [
    'Grazie per dargli una possibilita. Da qualche parte c e una famiglia che lo sta aspettando senza saperlo. 🏡',
    'Grazie: ogni adozione raccontata bene e una cuccia in meno vuota. 💛',
  ],
  postFoster: [
    "Grazie per aver chiesto aiuto invece di arrenderti. Uno stallo e una casa prestata, e vale quanto una definitiva. 🛏️",
    'Grazie: qualcuno legge questo annuncio e pensa "per qualche settimana ce la faccio". E spesso e proprio cosi. 💛',
  ],
  resolvedFoster: [
    'Grazie a chi gli ha aperto casa per un po. Non e poco: e stato tutto, per il tempo che serviva. 🛏️',
  ],
  sighting: [
    'Grazie per la segnalazione: un paio di occhi in piu possono cambiare tutto. 🐾',
    'Grazie di cuore, avvisiamo subito chi lo sta cercando. Sono i dettagli come il tuo che riportano a casa. 💛',
  ],
  welcome: [
    'Benvenuto tra gli Amici Pelosi. Grazie per esserci: qui ogni persona in piu e una speranza in piu. 🐾',
  ],
  alerts: [
    'Grazie per aver acceso le orecchie sul tuo quartiere: ti avviseremo solo quando serve davvero. 💛',
  ],
  resolvedLost: [
    'Che bella notizia! Grazie per avercelo detto: e per momenti come questo che esiste Amici Pelosi. 🎉',
  ],
  resolvedFound: [
    'Grazie per aver chiuso il cerchio. Sei stato il ponte tra un animale smarrito e casa sua. 💛',
  ],
  resolvedAdoption: [
    'Una cuccia in meno vuota. Grazie per averlo accompagnato fino alla sua famiglia. 🏡',
  ],
  contact: [
    'Grazie per la mano che stai tendendo: chi ha pubblicato questo annuncio ti sta aspettando. 💛',
  ],
} as const

export type ThankKey = keyof typeof THANKS

/** Un ringraziamento, scelto fra le varianti disponibili. */
export function thankYou(key: ThankKey): string {
  const options = THANKS[key]
  return options[Math.floor(Math.random() * options.length)]
}

/** Ringraziamento giusto per il tipo di annuncio appena pubblicato. */
export function thankYouForPost(kind: string): string {
  if (kind === 'FOUND') return thankYou('postFound')
  if (kind === 'FOSTER') return thankYou('postFoster')
  if (kind === 'ADOPTION') return thankYou('postAdoption')
  return thankYou('postLost')
}

export function thankYouForResolved(kind: string): string {
  if (kind === 'FOUND') return thankYou('resolvedFound')
  if (kind === 'FOSTER') return thankYou('resolvedFoster')
  if (kind === 'ADOPTION') return thankYou('resolvedAdoption')
  return thankYou('resolvedLost')
}
