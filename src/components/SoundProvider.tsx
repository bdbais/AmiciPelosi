'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { playAnimalSound, playSuccessChime, startAmbient, stopAmbient } from '@/lib/audio'

const STORAGE_KEY = 'amici-pelosi:audio'

type SoundState = {
  enabled: boolean
  toggle: () => void
  playForSpecies: (species: string) => void
  playSuccess: () => void
}

const SoundContext = createContext<SoundState>({
  enabled: false,
  toggle: () => {},
  playForSpecies: () => {},
  playSuccess: () => {},
})

export function useSound() {
  return useContext(SoundContext)
}

/**
 * Stato dell'audio, ricordato sul dispositivo. Parte spento: la musica
 * si attiva solo se la persona la sceglie (ed e cosi che vogliono anche
 * i browser, che bloccano l'audio non richiesto).
 */
export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) === 'on')
    } catch {
      // Se lo storage non e disponibile restiamo con l'audio spento.
    }
  }, [])

  useEffect(() => {
    if (enabled) startAmbient()
    else stopAmbient()
    return () => stopAmbient()
  }, [enabled])

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
      } catch {
        // Preferenza non memorizzabile: vale solo per questa visita.
      }
      return next
    })
  }, [])

  const playForSpecies = useCallback(
    (species: string) => {
      if (enabled) playAnimalSound(species)
    },
    [enabled],
  )

  const playSuccess = useCallback(() => {
    if (enabled) playSuccessChime()
  }, [enabled])

  return (
    <SoundContext.Provider value={{ enabled, toggle, playForSpecies, playSuccess }}>
      {children}
    </SoundContext.Provider>
  )
}

/** Interruttore dell'audio, sempre raggiungibile dall'intestazione. */
export function SoundToggle() {
  const { enabled, toggle } = useSound()

  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? 'Disattiva musica e versi' : 'Attiva musica e versi'}
      aria-label={enabled ? 'Disattiva musica e versi' : 'Attiva musica e versi'}
    >
      <span aria-hidden="true">{enabled ? '🔊' : '🔇'}</span>
    </button>
  )
}

/** Fa sentire il verso della specie quando si apre un annuncio. */
export function SpeciesSound({ species }: { species: string }) {
  const { playForSpecies } = useSound()

  useEffect(() => {
    const timer = setTimeout(() => playForSpecies(species), 400)
    return () => clearTimeout(timer)
  }, [species, playForSpecies])

  return null
}
