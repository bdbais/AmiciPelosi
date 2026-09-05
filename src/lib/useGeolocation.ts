'use client'

import { useCallback, useState } from 'react'

export type Coords = { lat: number; lng: number }

const MESSAGES: Record<number, string> = {
  1: 'Permesso negato: attiva la posizione per questo sito dalle impostazioni del browser.',
  2: 'Posizione non disponibile in questo momento.',
  3: 'Richiesta scaduta: riprova.',
}

/**
 * Oltre questa incertezza la posizione non viene da un GPS ma da una stima
 * sull'indirizzo IP, che e' quella che fa un computer senza sensori: puo'
 * mettere una persona di Monselice in Trentino. Meglio dirlo che accettarla.
 */
const MAX_ACCURACY_METERS = 2000

/**
 * Siamo su un telefono o un tablet? Li' la posizione viene dal GPS ed e'
 * affidabile; su un computer viene dall'IP e non lo e'. Va chiamata solo nel
 * browser (in un effetto), mai durante il rendering sul server.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  if (uaData?.mobile === true) return true
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true
  // iPad con Safari si presenta come un Mac: lo tradiscono il tocco e il puntatore grosso.
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches === true &&
    navigator.maxTouchPoints > 1
  )
}

/** Lettura della posizione GPS con stato di caricamento ed errori leggibili. */
export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locate = useCallback(() => {
    return new Promise<Coords | null>((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('Il tuo browser non supporta la geolocalizzazione.')
        resolve(null)
        return
      }
      setLoading(true)
      setError(null)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLoading(false)
          const accuracy = position.coords.accuracy
          if (Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_METERS) {
            setError(
              `La posizione che dà questo browser è approssimativa (circa ${Math.round(accuracy / 1000)} km): scrivi il comune o l’indirizzo, oppure tocca la mappa.`,
            )
            resolve(null)
            return
          }
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCoords(next)
          resolve(next)
        },
        (positionError) => {
          setError(MESSAGES[positionError.code] ?? 'Non riesco a leggere la posizione.')
          setLoading(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      )
    })
  }, [])

  return { coords, setCoords, locate, loading, error }
}

export type ResolvedAddress = { address: string; city: string; province: string }

/** Traduce le coordinate in un indirizzo leggibile (best effort). */
export async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
    if (!response.ok) return null
    return (await response.json()) as ResolvedAddress
  } catch {
    return null
  }
}

export type Place = ResolvedAddress & Coords & { label: string }

/**
 * Da un comune o un indirizzo scritto a mano al punto sulla mappa. Torna il
 * posto trovato, oppure un messaggio da mostrare: la differenza fra "non
 * esiste" e "il servizio non risponde" cambia cosa deve fare chi legge.
 */
export async function forwardGeocode(query: string): Promise<{ place: Place } | { error: string }> {
  try {
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
    const json = (await response.json().catch(() => ({}))) as Partial<Place> & { error?: string }
    if (!response.ok || typeof json.lat !== 'number' || typeof json.lng !== 'number') {
      return { error: json.error ?? 'Non trovo questo posto: tocca la mappa nel punto giusto.' }
    }
    return { place: json as Place }
  } catch {
    return { error: 'Non riesco a cercare l’indirizzo: controlla la connessione, o tocca la mappa.' }
  }
}
