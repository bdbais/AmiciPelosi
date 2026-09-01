'use client'

import { useCallback, useState } from 'react'

export type Coords = { lat: number; lng: number }

const MESSAGES: Record<number, string> = {
  1: 'Permesso negato: attiva la posizione per questo sito dalle impostazioni del browser.',
  2: 'Posizione non disponibile in questo momento.',
  3: 'Richiesta scaduta: riprova.',
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
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCoords(next)
          setLoading(false)
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

/** Traduce le coordinate in un indirizzo leggibile (best effort). */
export async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
    if (!response.ok) return null
    return (await response.json()) as { address: string; city: string; province: string }
  } catch {
    return null
  }
}
