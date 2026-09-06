import { requireModerator } from '@/lib/moderation'
import { listIdeas, syncIdeasFromFile } from '@/lib/ideas'
import { IDEA_STATUSES, IDEA_VOTES, type IdeaItem, type IdeaVoteValue } from '@/lib/moderation-types'
import { renderMarkdownLite } from '@/lib/markdown-lite'
import { formatDate } from '@/lib/format'
import { IdeaNew } from '@/components/IdeaNew'
import { IdeaVote } from '@/components/IdeaVote'
import { IdeaStatus } from '@/components/IdeaStatus'
import { IdeaBody } from '@/components/IdeaBody'

export const dynamic = 'force-dynamic'

/**
 * Le idee tenute da parte, da votare.
 *
 * Quelle di IDEE.md entrano da sole aprendo questa pagina; quelle scritte da
 * qui restano qui. Ognuno di chi modera dice «la farei», «non ora» o «mai»
 * con una riga sua; lo stato lo cambia solo l'amministratore. Niente di
 * tutto questo e' pubblico.
 */
export default async function AdminIdeasPage() {
  // Il layout ferma chi non modera, ma la pagina non si fida: si ricontrolla.
  const viewer = await requireModerator()
  if (!viewer) return null

  await syncIdeasFromFile()
  const ideas = await listIdeas(viewer.id)
  const toVote = ideas.filter((idea) => idea.status === 'OPEN' && !idea.myVote).length

  return (
    <>
      <div className="inline" style={{ justifyContent: 'space-between', margin: '16px 0 10px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Idee ({ideas.length})</h2>
        <IdeaNew />
      </div>
      <p className="small muted" style={{ margin: '0 0 12px' }}>
        Quelle «dal file» vengono da IDEE.md e si aggiornano da sole.{' '}
        {toVote > 0
          ? toVote === 1
            ? 'Ce n’è una in attesa che non hai ancora votato.'
            : `Ce ne sono ${toVote} in attesa che non hai ancora votato.`
          : 'Hai votato tutte quelle in attesa.'}
      </p>

      {ideas.length === 0 ? (
        <p className="muted small">Nessuna idea, per ora.</p>
      ) : (
        <div className="stack">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} isAdmin={viewer.role === 'ADMIN'} />
          ))}
        </div>
      )}
    </>
  )
}

/** Sei righe di testo, piu' o meno: oltre, il corpo si chiude con «Leggi tutto». */
function isLong(body: string) {
  const lines = body.split('\n').filter((line) => line.trim()).length
  return lines > 6 || body.length > 520
}

function IdeaCard({ idea, isAdmin }: { idea: IdeaItem; isAdmin: boolean }) {
  return (
    <div className="card" id={`idea-${idea.id}`}>
      <div className="inline" style={{ justifyContent: 'space-between' }}>
        <span>
          <strong>{idea.title}</strong>{' '}
          <span className={`badge idea-${idea.status}`}>{IDEA_STATUSES[idea.status]}</span>{' '}
          <span className="badge idea-source">
            {idea.source === 'FILE' ? 'dal file' : `dal sito · ${idea.authorName ?? 'account cancellato'}`}
          </span>
        </span>
        <span className="small muted">{formatDate(idea.createdAt)}</span>
      </div>

      <div style={{ margin: '8px 0 0' }}>
        <IdeaBody long={isLong(idea.body)}>{renderMarkdownLite(idea.body)}</IdeaBody>
      </div>

      <p className="small" style={{ margin: '8px 0 0' }}>
        {(Object.keys(IDEA_VOTES) as IdeaVoteValue[]).map((value, index) => (
          <span key={value}>
            {index > 0 && ' · '}
            <strong>{idea.counts[value]}</strong> {IDEA_VOTES[value].toLowerCase()}
          </span>
        ))}
      </p>

      <IdeaVote ideaId={idea.id} myVote={idea.myVote} />

      {idea.votes.length > 0 && (
        <ul className="small" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
          {idea.votes.map((vote) => (
            <li key={vote.userId}>
              <strong>{vote.userName}</strong>: {IDEA_VOTES[vote.value].toLowerCase()}
              {vote.comment && <span className="muted"> — «{vote.comment}»</span>}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && <IdeaStatus ideaId={idea.id} status={idea.status} />}
    </div>
  )
}
