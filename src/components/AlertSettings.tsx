'use client'

import { useState } from 'react'
import { LocationField } from './LocationField'
import { PermissionButton } from './PermissionButton'
import { reverseGeocode, type Coords } from '@/lib/useGeolocation'
import { ALERT_INTERVALS, RADIUS_OPTIONS } from '@/lib/constants'
import { thankYou } from '@/lib/messages'
import { readJson, type ApiError } from '@/lib/http'

type Initial = {
  alertsEnabled: boolean
  alertRadiusKm: number
  alertEveryMinutes: number
  alertLat: number | null
  alertLng: number | null
  alertCity: string | null
}

/** Converte la chiave VAPID base64url nel formato richiesto da PushManager. */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

/** Confronto byte a byte: due chiavi uguali come stringa lo sono anche qui, ma il contrario no. */
function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return false
  const bytes = new Uint8Array(a)
  if (bytes.length !== b.length) return false
  return bytes.every((value, index) => value === b[index])
}

/**
 * Il service worker "pronto" puo' non arrivare mai: un browser con i service
 * worker spenti, una registrazione fallita in silenzio. Senza un tetto il
 * pulsante resta a girare per sempre.
 */
function serviceWorkerReady(ms: number): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('service worker non pronto')), ms),
    ),
  ])
}

export function AlertSettings({
  initial,
  vapidPublicKey,
}: {
  initial: Initial
  vapidPublicKey: string
}) {
  const [enabled, setEnabled] = useState(initial.alertsEnabled)
  const [radius, setRadius] = useState(initial.alertRadiusKm)
  const [every, setEvery] = useState(initial.alertEveryMinutes)
  const [city, setCity] = useState(initial.alertCity ?? '')
  const [coords, setCoords] = useState<Coords | null>(
    initial.alertLat != null && initial.alertLng != null
      ? { lat: initial.alertLat, lng: initial.alertLng }
      : null,
  )
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [pushState, setPushState] = useState<'unknown' | 'on' | 'off'>('unknown')
  const [denied, setDenied] = useState(false)

  /** Chiede il permesso e registra il dispositivo per le push. */
  async function enablePush() {
    try {
      await enablePushOrThrow()
    } catch (error) {
      console.error('Attivazione delle notifiche non riuscita:', error)
      setMessage({
        kind: 'error',
        text: 'Non sono riuscito ad attivare le notifiche su questo dispositivo. Riprova fra poco; se continua, prova a chiudere e riaprire il browser.',
      })
    }
  }

  async function enablePushOrThrow() {
    if (!vapidPublicKey) {
      setMessage({ kind: 'info', text: 'Le push non sono configurate su questo server.' })
      return
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMessage({ kind: 'error', text: 'Questo browser non supporta le notifiche push.' })
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setDenied(true)
      setMessage({
        kind: 'error',
        text: 'Senza il permesso il telefono non può avvisarti. Qui sotto trovi come rimetterlo.',
      })
      return
    }
    setDenied(false)

    let registration: ServiceWorkerRegistration
    try {
      registration = await serviceWorkerReady(10_000)
    } catch {
      setMessage({
        kind: 'error',
        text: 'Il browser non ha finito di prepararsi per le notifiche. Ricarica la pagina e riprova.',
      })
      return
    }

    // Un'iscrizione fatta con una chiave VAPID precedente non serve piu':
    // il server la firmerebbe con quella nuova e il servizio push la
    // rifiuterebbe, per sempre e in silenzio. Se la chiave e' cambiata si
    // butta e si rifa'.
    const serverKey = urlBase64ToUint8Array(vapidPublicKey)
    let subscription = await registration.pushManager.getSubscription()
    if (subscription && !sameKey(subscription.options.applicationServerKey, serverKey)) {
      await subscription.unsubscribe().catch(() => undefined)
      subscription = null
    }
    subscription ??= await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: serverKey,
    })

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })

    if (response.ok) {
      setPushState('on')
      setMessage({
        kind: 'success',
        text: 'Grazie: da ora questo dispositivo ti avvisera quando un pelosetto ha bisogno vicino a te. 💛',
      })
    } else {
      setMessage({ kind: 'error', text: 'Non sono riuscito a registrare il dispositivo.' })
    }
  }

  async function disablePush() {
    try {
      const registration = await serviceWorkerReady(10_000)
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setPushState('off')
      setMessage({ kind: 'info', text: 'Notifiche disattivate su questo dispositivo.' })
    } catch (error) {
      console.error('Disattivazione delle notifiche non riuscita:', error)
      setMessage({ kind: 'error', text: 'Non sono riuscito a disattivare le notifiche: riprova.' })
    }
  }

  async function save() {
    setBusy(true)
    setMessage(null)

    const response = await fetch('/api/me/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertsEnabled: enabled,
        alertRadiusKm: radius,
        alertEveryMinutes: every,
        alertLat: coords?.lat,
        alertLng: coords?.lng,
        alertCity: city,
      }),
    })

    setBusy(false)
    if (response.ok) {
      setMessage({ kind: 'success', text: thankYou('alerts') })
    } else {
      const json = await readJson<ApiError>(response)
      setMessage({ kind: 'error', text: json.error ?? 'Salvataggio non riuscito.' })
    }
  }

  return (
    <div className="stack">
      {message && <div className={`alert ${message.kind}`}>{message.text}</div>}
      {denied && <PermissionButton kind="notifications" onGranted={() => void enablePush()} />}

      <div className="card">
        <h2>1. Attiva le notifiche sul dispositivo</h2>
        <p className="section-hint">
          Il permesso va dato una volta per ogni dispositivo o browser che usi.
        </p>
        <div className="inline">
          <button type="button" className="btn" onClick={enablePush}>
            🔔 Attiva su questo dispositivo
          </button>
          <button type="button" className="btn ghost small" onClick={disablePush}>
            Disattiva
          </button>
          {pushState === 'on' && <span className="small muted">✓ Attive</span>}
        </div>
      </div>

      <div className="card">
        <h2>2. La tua zona</h2>
        <p className="section-hint">
          Di solito casa tua: usiamo questo punto per capire cosa ti sta vicino.
        </p>
        <LocationField
          value={coords}
          onChange={setCoords}
          radiusKm={radius}
          emoji="🏠"
          onAddressResolved={(resolved) => {
            if (resolved.city) setCity(resolved.city)
          }}
          hint="Tocca la mappa per spostare il centro della tua zona."
        />
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="alertCity">Comune</label>
          <input
            id="alertCity"
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Es. Roma"
          />
        </div>
      </div>

      <div className="card">
        <h2>3. Raggio degli avvisi</h2>
        <p className="section-hint">Riceverai una notifica per gli annunci entro questa distanza.</p>
        <div className="chips">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`chip ${radius === option ? 'active' : ''}`}
              onClick={() => setRadius(option)}
            >
              {option} km
            </button>
          ))}
        </div>
        <label className="checkbox" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Ricevi avvisi per i nuovi annunci nella mia zona
        </label>
      </div>

      <div className="card">
        <h2>4. Ogni quanto</h2>
        <p className="section-hint">
          Non arriva un avviso per ogni annuncio. Quello che succede nella tua zona viene messo
          insieme, e <strong>te ne arriva uno solo</strong> al massimo ogni:
        </p>
        <div className="chips">
          {ALERT_INTERVALS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              className={`chip ${every === option.minutes ? 'active' : ''}`}
              onClick={() => setEvery(option.minutes)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {ALERT_INTERVALS.filter((option) => 'hint' in option).map((option) => (
          <p key={option.minutes} className="hint" style={{ marginBottom: 0 }}>
            <strong>{option.label}</strong>: {option.hint}
          </p>
        ))}
        <p className="section-hint" style={{ marginTop: 12, marginBottom: 0 }}>
          Più corto se vuoi essere fra i primi a saperlo, più lungo se preferisci un riepilogo e
          basta. Un avviso per ogni annuncio, in una città grande, è una sveglia ogni pochi
          minuti: chi la riceve spegne le notifiche dopo due giorni e non le riaccende più.
        </p>
      </div>

      <button type="button" className="btn block" onClick={save} disabled={busy || !coords}>
        {busy ? 'Salvo…' : 'Salva preferenze'}
      </button>
      {!coords && <p className="hint" style={{ textAlign: 'center' }}>Indica prima la tua zona.</p>}
    </div>
  )
}
