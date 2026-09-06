'use client'

/** Stampa, o «Salva come PDF»: il browser sa gia farlo, non serve altro. */
export function PrintButton() {
  return (
    <button type="button" className="btn small" onClick={() => window.print()}>
      🖨️ Stampa
    </button>
  )
}
