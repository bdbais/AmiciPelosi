import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { getPhoto } from '@/lib/photoStorage'
import { requireModerator } from '@/lib/moderation'
import { sniffLogoType } from '@/lib/logo'

type Params = { params: Promise<{ userId: string }> }

/**
 * Il logo di un ente, per chiunque guardi.
 *
 * Esce SOLO se l'account e' verificato, non e' bloccato e si e' dichiarato
 * ente: a tutti gli altri si risponde che non c'e', anche se il file esiste.
 * Chi e' in attesa lo ha gia' caricato, e proprio per questo il controllo
 * sta qui, a ogni richiesta, e non nella pagina che decide se mettere il
 * tag <img>: una pagina che lo nasconde non e' una protezione.
 *
 * L'eccezione e' chi modera: deve poter guardare un logo prima di approvare
 * l'account, o per decidere se toglierlo. A lui arriva senza cache
 * condivisa, cosi' quello che vede non finisce in una cache che poi lo
 * servirebbe a tutti.
 *
 * Non passa dalla rotta delle foto degli annunci: quella serve chiavi
 * immutabili e le cacha per un anno, e un logo tolto da chi modera deve
 * sparire in fretta. Un'ora di cache e' il compromesso.
 */
export async function GET(_request: Request, { params }: Params) {
  const { userId } = await params
  const db = await getDb()
  const rows = await db
    .select({
      storageKey: users.orgLogoKey,
      data: users.orgLogoData,
      accountType: users.accountType,
      accountStatus: users.accountStatus,
      bannedAt: users.bannedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const row = rows[0]
  if (!row || (!row.storageKey && !row.data)) return new Response('Logo non trovato', { status: 404 })

  const visibleToAll =
    row.accountStatus === 'VERIFIED' && row.accountType !== 'PERSON' && row.bannedAt == null
  if (!visibleToAll && !(await requireModerator())) return new Response('Logo non trovato', { status: 404 })

  const bytes = await getPhoto(row.storageKey, row.data ? new Uint8Array(row.data) : null)
  if (!bytes) return new Response('Logo non disponibile', { status: 404 })

  return new Response(bytes as BodyInit, {
    headers: {
      'Content-Type': sniffLogoType(bytes) ?? 'application/octet-stream',
      'Cache-Control': visibleToAll ? 'public, max-age=3600' : 'private, no-store',
    },
  })
}
