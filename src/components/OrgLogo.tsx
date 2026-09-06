/**
 * Il logo di un ente accanto al suo nome.
 *
 * E' un <img> e basta, cosi' lo si usa da pagine server e da componenti
 * client senza pensarci. Si mette solo quando i dati dicono che l'ente e'
 * verificato e ha un logo (hasLogo): ma anche se qualcuno lo mettesse per
 * sbaglio, la rotta /api/logo risponde 404 a chi non deve essere visto, e
 * il browser non mostra niente.
 *
 * `version` cambia l'indirizzo a ogni caricamento nuovo: la rotta si cacha
 * per un'ora, e senza questo chi ha appena sostituito il logo vedrebbe
 * ancora quello vecchio.
 */
export function OrgLogo({
  userId,
  version,
  large = false,
}: {
  userId: string
  version?: string | number | null
  large?: boolean
}) {
  const src = version ? `/api/logo/${userId}?v=${encodeURIComponent(String(version))}` : `/api/logo/${userId}`
  return <img src={src} alt="" className={`org-logo${large ? ' large' : ''}`} width={large ? 96 : 28} height={large ? 96 : 28} />
}
