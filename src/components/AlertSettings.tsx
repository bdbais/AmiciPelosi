'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LocationField } from './LocationField'
import { PermissionButton } from './PermissionButton'
import { type Coords } from '@/lib/useGeolocation'
import { ALERT_INTERVALS, RADIUS_OPTIONS } from '@/lib/constants'
import { thankYou } from '@/lib/messages'
import { readJson, type ApiError } from '@/lib/http'
import { readPermission, type PermissionState } from '@/lib/permissions'

type Initial = {
  alertsEnabled: boolean
  alertRadiusKm: number
  alertEveryMinutes: number
  alertLat: number | null
  alertLng: number | null
  alertCity: string | null
}

/**
 * Il valore con cui nasce ogni account (schema: alert_every_minutes). Se e'
 * ancora questo, «Ogni quanto» sta chiuso: chi non l'ha mai toccato non ha
 * bisogno di vederlo.
 */
const DEFAULT_EVERY_MINUTES = 30

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
  // Lo stato del permesso del browser: null finche' non lo abbiamo letto, per
  // non mostrare «manca il permesso» a chi ce l'ha gia'.
  const [permission, setPermission] = useState<PermissionState | null>(null)
  // «Ogni quanto» parte aperto solo se non e' piu' quello di default: vuol
  // dire che a questa persona interessa, e chiuderglielo sarebbe nasconderle
  // una scelta sua.
  const [moreOpen, setMoreOpen] = useState(initial.alertEveryMinutes !== DEFAULT_EVERY_MINUTES)

  useEffect(() => {
    let alive = true
    void readPermission('notifications').then((value) => {
      if (alive) setPermission(value)
    })
    return () => {
      alive = false
    }
  }, [])

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
    } finally {
      setPermission(await readPermission('notifications'))
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
      setMessage({
        kind: 'error',
        text: 'Senza il permesso il telefono non può avvisarti. Qui sotto trovi come rimetterlo.',
      })
      return
    }

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
        text: 'Questo dispositivo è pronto. Salva qui sotto e da ora ti avvisa quando un pelosetto ha bisogno vicino a te. 💛',
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

  /**
   * L'interruttore grande. Accenderlo e' anche il gesto con cui il browser
   * accetta di chiedere il permesso: senza un tocco della persona non lo
   * chiede, e un permesso chiesto al «Salva» arriverebbe come una sorpresa.
   */
  function toggle(on: boolean) {
    setEnabled(on)
    if (on) void enablePush()
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

  // Una riga che dice come stanno le cose adesso, non come staranno dopo il salva.
  const status = !enabled
    ? 'Spento'
    : coords
      ? `Attivo · ${city || 'zona scelta sulla mappa'} · ${radius} km`
      : 'Attivo · manca ancora la zona'
  const permissionMissing = permission !== null && permission !== 'granted'

  return (
    <div className="stack">
      {message && <div className={`alert ${message.kind}`}>{message.text}</div>}

      <div className="card">
        <label className="switch-row">
          <strong>Avvisami quando succede qualcosa vicino a casa</strong>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={enabled}
            onChange={(event) => toggle(event.target.checked)}
          />
        </label>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          {status}
          {pushState === 'on' && ' · questo dispositivo è registrato'}
        </p>
        {permissionMissing && (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <p className="small" style={{ margin: 0 }}>
              {permission === 'denied'
                ? 'Il browser ha negato il permesso di avvisarti: finché resta così, il telefono non suona.'
                : permission === 'unsupported'
                  ? 'Questo browser non sa mandare avvisi. Puoi salvare lo stesso la zona: varrà sugli altri dispositivi.'
                  : 'Il browser non ha ancora il permesso di avvisarti.'}
            </p>
            {/*
              Il tasto legge il permesso una volta, quando compare: se cambia
              per via dell'interruttore qui sopra, va rifatto da capo.
            */}
            {permission !== 'unsupported' && (
              <PermissionButton
                key={permission}
                kind="notifications"
                onGranted={() => void enablePush()}
              />
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Dove sta casa tua</h2>
        <p className="section-hint">
          Usiamo questo punto per capire cosa ti sta vicino. Non lo vede nessuno.
        </p>
        <div className="map-short">
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
        </div>
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
        <div className="field" style={{ marginTop: 14, marginBottom: 0 }}>
          <span className="label">A che distanza</span>
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
        </div>
      </div>

      <details
        className="fold"
        open={moreOpen}
        onToggle={(event) => setMoreOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            Altre impostazioni
            <span className="sub">Ogni quanto, questo dispositivo, i permessi</span>
          </span>
        </summary>
        <div className="fold-body stack">
          <div>
            <h3 style={{ margin: '0 0 6px' }}>Ogni quanto</h3>
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
              basta.
            </p>
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px' }}>Questo dispositivo</h3>
            <p className="section-hint">
              Il permesso va dato una volta per ogni dispositivo o browser che usi.
            </p>
            <div className="inline">
              <button type="button" className="btn secondary small" onClick={enablePush}>
                🔔 Attiva su questo dispositivo
              </button>
              <button type="button" className="btn ghost small" onClick={disablePush}>
                Disattiva
              </button>
              {pushState === 'on' && <span className="small muted">✓ Attive</span>}
            </div>
            <p className="small muted" style={{ margin: '10px 0 0' }}>
              Il telefono non ti avvisa?{' '}
              <Link href="/permessi" style={{ textDecoration: 'underline' }}>
                Controlla i permessi
              </Link>
              .
            </p>
          </div>
        </div>
      </details>

      <div className="save-bar">
        <button type="button" className="btn block" onClick={save} disabled={busy || !coords}>
          {busy ? 'Salvo…' : 'Salva'}
        </button>
        {!coords && <p className="hint" style={{ textAlign: 'center', margin: '6px 0 0' }}>Indica prima dove sta casa tua.</p>}
      </div>
    </div>
  )
}
