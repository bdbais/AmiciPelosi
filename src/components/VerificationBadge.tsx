/**
 * A che punto e' la verifica di chi si e' dichiarato ente. Lo vede solo chi
 * modera: per tutti gli altri esiste il badge del tipo, e solo da verificati.
 */
const LABELS: Record<string, { className: string; label: string }> = {
  PENDING: { className: 'pending', label: 'in attesa' },
  VERIFIED: { className: 'verified', label: 'verificato' },
  REJECTED: { className: 'rejected', label: 'rifiutato' },
}

export function VerificationBadge({ status }: { status: string }) {
  const entry = LABELS[status]
  if (!entry) return null
  return <span className={`badge ${entry.className}`}>{entry.label}</span>
}
