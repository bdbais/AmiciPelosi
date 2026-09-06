/**
 * I permessi del browser, spiegati bene.
 *
 * Quando la posizione o le notifiche sono negate, dire "attivale dalle
 * impostazioni del browser" non serve a nessuno: quelle impostazioni stanno in
 * un posto diverso su ogni telefono. Qui teniamo lo stato vero del permesso e
 * i passi precisi per il browser che si sta usando davvero.
 *
 * Una cosa che vale la pena dire chiaro: da una pagina web non si puo' aprire
 * il pannello dei permessi con un comando - i browser lo vietano apposta, e
 * ogni trucco che gira in rete o non funziona piu' o porta in un vicolo cieco.
 * Quello che si puo' fare, e che facciamo, e' due cose: se il permesso non e'
 * ancora stato chiesto lo chiediamo noi con un tocco solo, e se e' stato negato
 * mostriamo i due o tre passi giusti indicando l'icona che si vede davvero.
 */

export type PermissionKey = 'geolocation' | 'notifications'
export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported'

export type Browser =
  | 'chrome-android'
  | 'samsung'
  | 'firefox-android'
  | 'safari-ios'
  | 'chrome-desktop'
  | 'firefox-desktop'
  | 'safari-desktop'
  | 'edge'
  | 'other'

export function detectBrowser(): Browser {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  const android = /Android/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)

  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/EdgA?\//i.test(ua)) return 'edge'
  if (ios) return 'safari-ios'
  if (/Firefox|FxiOS/i.test(ua)) return android ? 'firefox-android' : 'firefox-desktop'
  if (/Chrome|CriOS/i.test(ua)) return android ? 'chrome-android' : 'chrome-desktop'
  if (/Safari/i.test(ua)) return 'safari-desktop'
  return android ? 'chrome-android' : 'other'
}

/** Vero quando la pagina gira come app aggiunta alla schermata home. */
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

/**
 * Lo stato vero del permesso.
 *
 * Per le notifiche `Notification.permission` e' affidabile ovunque. Per la
 * posizione serve l'API Permissions, che manca su Safari: li' non si puo'
 * sapere niente finche' non si prova, e "prompt" e' la risposta onesta.
 */
export async function readPermission(key: PermissionKey): Promise<PermissionState> {
  if (typeof window === 'undefined') return 'unsupported'

  if (key === 'notifications') {
    if (!('Notification' in window)) return 'unsupported'
    const value = Notification.permission
    return value === 'default' ? 'prompt' : value
  }

  if (!('geolocation' in navigator)) return 'unsupported'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' })
    return status.state as PermissionState
  } catch {
    return 'prompt'
  }
}

const LABELS: Record<PermissionKey, { title: string; why: string }> = {
  geolocation: {
    title: 'Posizione',
    why: 'Serve per vedere cosa succede vicino a te e per allegare il punto a una segnalazione.',
  },
  notifications: {
    title: 'Notifiche',
    why: 'Servono per avvisarti quando un animale ha bisogno nella tua zona.',
  },
}

export function permissionLabel(key: PermissionKey) {
  return LABELS[key]
}

/**
 * I passi per sbloccare un permesso gia' negato, sul browser che si sta usando.
 *
 * Nominiamo l'icona come si vede: su Android a sinistra dell'indirizzo c'e' un
 * lucchetto sui browser vecchi e due cursori su quelli nuovi, e chi cerca il
 * lucchetto e trova i cursori si ferma li'.
 */
export function unlockSteps(key: PermissionKey, browser = detectBrowser()): string[] {
  const what = key === 'geolocation' ? 'Posizione' : 'Notifiche'

  switch (browser) {
    case 'chrome-android':
    case 'edge':
      return [
        'Tocca l’icona a sinistra dell’indirizzo, in alto: è un lucchetto oppure due cursori.',
        'Apri «Autorizzazioni».',
        `Metti «${what}» su Consenti.`,
        'Torna qui e ricarica la pagina.',
        key === 'geolocation'
          ? 'Se non basta: Impostazioni di Android ▸ App ▸ Chrome ▸ Autorizzazioni ▸ Posizione.'
          : 'Se non basta: Impostazioni di Android ▸ Notifiche ▸ Chrome.',
      ]
    case 'samsung':
      return [
        'Tocca l’icona a sinistra dell’indirizzo.',
        'Apri «Autorizzazioni» o «Impostazioni sito».',
        `Metti «${what}» su Consenti.`,
        'Ricarica la pagina.',
      ]
    case 'firefox-android':
      return [
        'Tocca l’icona a sinistra dell’indirizzo.',
        'Apri «Impostazioni sito» o «Cancella autorizzazioni».',
        `Rimetti «${what}» su Consenti, oppure azzera e riprova qui sotto.`,
      ]
    case 'safari-ios':
      return key === 'geolocation'
        ? [
            'Apri Impostazioni di iPhone ▸ Safari ▸ Posizione e scegli Chiedi o Consenti.',
            'Controlla anche Impostazioni ▸ Privacy e sicurezza ▸ Localizzazione ▸ Safari.',
            'Torna qui e ricarica la pagina.',
          ]
        : [
            'Su iPhone le notifiche funzionano solo se aggiungi Amici Pelosi alla schermata Home.',
            'Tocca Condividi ▸ «Aggiungi a Home», poi apri l’app da lì e riprova.',
            'Serve iOS 16.4 o più recente.',
          ]
    case 'chrome-desktop':
      return [
        'Clicca l’icona a sinistra dell’indirizzo (lucchetto o cursori).',
        `Metti «${what}» su Consenti.`,
        'Ricarica la pagina.',
      ]
    case 'firefox-desktop':
      return [
        'Clicca l’icona a sinistra dell’indirizzo.',
        `Togli il blocco accanto a «${what}».`,
        'Ricarica la pagina.',
      ]
    case 'safari-desktop':
      return [
        'Menu Safari ▸ Impostazioni ▸ Siti web.',
        `Scegli «${what}» nell’elenco a sinistra e metti amicipelosi su Consenti.`,
        'Ricarica la pagina.',
      ]
    default:
      return [
        'Apri le impostazioni del sito dal tuo browser, di solito dall’icona accanto all’indirizzo.',
        `Metti «${what}» su Consenti.`,
        'Ricarica la pagina.',
      ]
  }
}

export function browserName(browser = detectBrowser()) {
  const names: Record<Browser, string> = {
    'chrome-android': 'Chrome su Android',
    samsung: 'Samsung Internet',
    'firefox-android': 'Firefox su Android',
    'safari-ios': 'Safari su iPhone',
    'chrome-desktop': 'Chrome',
    'firefox-desktop': 'Firefox',
    'safari-desktop': 'Safari',
    edge: 'Edge',
    other: 'questo browser',
  }
  return names[browser]
}
