/**
 * Le icone dell'intestazione, disegnate a mano invece che prese dalle emoji.
 *
 * Le emoji cambiano faccia da un telefono all'altro: il tempio greco e il
 * punto di domanda rosso su Windows sembravano appiccicati li' per caso. Un
 * tratto solo, lo stesso spessore, il colore del testo: cosi' stanno insieme
 * e con il resto della pagina.
 */
type IconProps = { size?: number; className?: string }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

/** Altoparlante, con o senza onde: l'audio del sito. */
export function SpeakerIcon({ size = 20, className, muted = false }: IconProps & { muted?: boolean }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4z" />
      {muted ? (
        <path d="M16 9.5l4 5M20 9.5l-4 5" />
      ) : (
        <>
          <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M18 7a7 7 0 0 1 0 10" />
        </>
      )}
    </svg>
  )
}

/** Una croce dentro un cerchio: veterinari, rifugi, chi puo' aiutare. */
export function HelpNearbyIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  )
}

/** Un libretto aperto: cosa fare in caso di. */
export function GuideIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 6.5c-1.6-1.3-3.6-1.8-6.5-1.8v13c2.9 0 4.9.5 6.5 1.8 1.6-1.3 3.6-1.8 6.5-1.8v-13c-2.9 0-4.9.5-6.5 1.8z" />
      <path d="M12 6.5v13" />
    </svg>
  )
}

/** L'impronta con il cuore: il segno del sito, lo stesso dell'icona dell'app. */
export function PawHeartIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden className={className}>
      <path
        d="M256 424C150 352 96 296 96 232c0-48 37-82 82-82 30 0 58 16 78 44 20-28 48-44 78-44 45 0 82 34 82 82 0 64-54 120-160 192z"
        fill="currentColor"
      />
      <g fill="currentColor">
        <ellipse cx="128" cy="150" rx="36" ry="45" transform="rotate(-24 128 150)" />
        <ellipse cx="384" cy="150" rx="36" ry="45" transform="rotate(24 384 150)" />
        <ellipse cx="196" cy="86" rx="33" ry="42" transform="rotate(-10 196 86)" />
        <ellipse cx="316" cy="86" rx="33" ry="42" transform="rotate(10 316 86)" />
      </g>
    </svg>
  )
}
