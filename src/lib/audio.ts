'use client'

/**
 * Suoni dell'app generati con Web Audio: una melodia dolce di sottofondo e un
 * verso per ogni specie. Sono sintetizzati sul momento, quindi non serve
 * scaricare file audio e l'app resta leggera anche con la rete lenta.
 */

let context: AudioContext | null = null
let masterGain: GainNode | null = null
let ambientTimer: ReturnType<typeof setTimeout> | null = null

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
    masterGain = context.createGain()
    masterGain.gain.value = 0.5
    masterGain.connect(context.destination)
  }
  // I browser sospendono l'audio finche non c'e un gesto dell'utente.
  if (context.state === 'suspended') void context.resume()
  return context
}

/* ---------- Melodia di sottofondo ---------- */

// Scala pentatonica maggiore: qualunque sequenza suona consonante e serena.
const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5]

/** Una nota morbida, tipo carillon. */
function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency

  filter.type = 'lowpass'
  filter.frequency.value = 2200

  // Attacco dolce e coda lunga: niente spigoli.
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.12)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain ?? ctx.destination)

  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.05)
}

/** Programma qualche nota e si richiama da sola: melodia sempre diversa. */
function scheduleAmbientPhrase() {
  const ctx = ensureContext()
  if (!ctx) return

  const now = ctx.currentTime
  const noteCount = 3 + Math.floor(Math.random() * 3)
  let offset = 0

  for (let i = 0; i < noteCount; i++) {
    const frequency = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]
    playTone(ctx, frequency, now + offset, 2.4, 0.055)
    // Ogni tanto una quinta sotto, per dare corpo senza appesantire.
    if (Math.random() < 0.35) playTone(ctx, frequency / 2, now + offset, 3.2, 0.03)
    offset += 0.9 + Math.random() * 0.8
  }

  ambientTimer = setTimeout(scheduleAmbientPhrase, (offset + 1.5) * 1000)
}

export function startAmbient() {
  if (ambientTimer) return
  scheduleAmbientPhrase()
}

export function stopAmbient() {
  if (ambientTimer) {
    clearTimeout(ambientTimer)
    ambientTimer = null
  }
}

/* ---------- Versi degli animali ---------- */

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1
  return buffer
}

/** Abbaio: rumore filtrato con una breve caduta di tono. */
function bark(ctx: AudioContext, at: number) {
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx, 0.25)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 4
  filter.frequency.setValueAtTime(900, at)
  filter.frequency.exponentialRampToValueAtTime(320, at + 0.18)

  const body = ctx.createOscillator()
  body.type = 'sawtooth'
  body.frequency.setValueAtTime(260, at)
  body.frequency.exponentialRampToValueAtTime(120, at + 0.16)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.28, at + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)

  source.connect(filter)
  filter.connect(gain)
  body.connect(gain)
  gain.connect(masterGain ?? ctx.destination)

  source.start(at)
  body.start(at)
  body.stop(at + 0.25)
}

/** Miagolio: tono che sale e ridiscende, con un filtro che imita la bocca. */
function meow(ctx: AudioContext, at: number) {
  const oscillator = ctx.createOscillator()
  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(420, at)
  oscillator.frequency.linearRampToValueAtTime(720, at + 0.18)
  oscillator.frequency.linearRampToValueAtTime(430, at + 0.55)

  const formant = ctx.createBiquadFilter()
  formant.type = 'bandpass'
  formant.Q.value = 6
  formant.frequency.setValueAtTime(700, at)
  formant.frequency.linearRampToValueAtTime(1500, at + 0.2)
  formant.frequency.linearRampToValueAtTime(800, at + 0.55)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.18, at + 0.08)
  gain.gain.setValueAtTime(0.16, at + 0.35)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)

  oscillator.connect(formant)
  formant.connect(gain)
  gain.connect(masterGain ?? ctx.destination)

  oscillator.start(at)
  oscillator.stop(at + 0.65)
}

/** Cinguettio: brevi note acute che salgono in fretta. */
function chirp(ctx: AudioContext, at: number, index: number) {
  const oscillator = ctx.createOscillator()
  oscillator.type = 'sine'
  const base = 2100 + index * 260
  oscillator.frequency.setValueAtTime(base, at)
  oscillator.frequency.exponentialRampToValueAtTime(base * 1.6, at + 0.05)
  oscillator.frequency.exponentialRampToValueAtTime(base * 0.9, at + 0.11)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.12, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13)

  oscillator.connect(gain)
  gain.connect(masterGain ?? ctx.destination)
  oscillator.start(at)
  oscillator.stop(at + 0.15)
}

/** Coniglio: il battito delle zampe sul terreno, sordo e breve. */
function thump(ctx: AudioContext, at: number) {
  const oscillator = ctx.createOscillator()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(160, at)
  oscillator.frequency.exponentialRampToValueAtTime(55, at + 0.12)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.3, at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)

  oscillator.connect(gain)
  gain.connect(masterGain ?? ctx.destination)
  oscillator.start(at)
  oscillator.stop(at + 0.18)
}

/** Verso caratteristico della specie mostrata. */
export function playAnimalSound(species: string) {
  const ctx = ensureContext()
  if (!ctx) return
  const now = ctx.currentTime + 0.05

  switch (species) {
    case 'DOG':
      bark(ctx, now)
      bark(ctx, now + 0.32)
      break
    case 'CAT':
      meow(ctx, now)
      break
    case 'BIRD':
      for (let i = 0; i < 4; i++) chirp(ctx, now + i * 0.14, i)
      break
    case 'RABBIT':
      thump(ctx, now)
      thump(ctx, now + 0.22)
      break
    default:
      playTone(ctx, 659.25, now, 1.4, 0.09)
      playTone(ctx, 880, now + 0.18, 1.4, 0.07)
  }
}

/** Piccola conferma sonora, per esempio dopo aver pubblicato un annuncio. */
export function playSuccessChime() {
  const ctx = ensureContext()
  if (!ctx) return
  const now = ctx.currentTime + 0.03
  playTone(ctx, 659.25, now, 1.2, 0.09)
  playTone(ctx, 880, now + 0.14, 1.4, 0.08)
  playTone(ctx, 1046.5, now + 0.28, 1.8, 0.06)
}

export function setVolume(value: number) {
  ensureContext()
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, value))
}
