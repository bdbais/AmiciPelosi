const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: Date | string) {
  return dateTimeFormatter.format(new Date(value))
}

/** "oggi", "3 giorni fa", ... per dare subito il senso dell'urgenza. */
export function timeAgo(value: Date | string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days <= 0) {
    const hours = Math.floor(diffMs / 3_600_000)
    if (hours <= 0) return 'poco fa'
    return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`
  }
  if (days === 1) return 'ieri'
  if (days < 30) return `${days} giorni fa`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'mese' : 'mesi'} fa`
  return formatDate(value)
}
