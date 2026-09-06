import { NextResponse, after } from 'next/server'
import { currentUser } from '@/lib/auth'
import { crossOriginResponse, readJson, sameOrigin } from '@/lib/http'
import { giveThanks, type ThanksTarget } from '@/lib/people'
import { notifyThanked } from '@/lib/push'

/**
 * Il grazie: un cuoricino da chi ha pubblicato a chi ha aiutato.
 *
 * Una rotta sola per le due cose che si possono ringraziare - una
 * segnalazione, o una richiesta di contatto accettata - perche' il gesto e'
 * lo stesso e le regole pure: solo l'autore dell'annuncio, una volta sola.
 * Chi lo riceve lo sa subito, sul telefono, se ha le notifiche: e' la
 * ricompensa che questo sito ammette, l'unica.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const body = await readJson<{ sightingId?: unknown; contactRequestId?: unknown }>(request)
  let target: ThanksTarget
  if (typeof body.sightingId === 'string' && body.sightingId) {
    target = { sightingId: body.sightingId }
  } else if (typeof body.contactRequestId === 'string' && body.contactRequestId) {
    target = { contactRequestId: body.contactRequestId }
  } else {
    return NextResponse.json({ error: 'Non so chi ringraziare.' }, { status: 400 })
  }

  const result = await giveThanks(target, user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  // Il secondo clic sullo stesso grazie non manda una seconda notifica.
  if (!result.already) {
    const { recipientId, postId, postTitle } = result
    after(() =>
      notifyThanked(recipientId, {
        title: '❤️ Ti hanno detto grazie',
        body: `Chi ha pubblicato «${postTitle.slice(0, 80)}» ti ringrazia per l'aiuto.`,
        url: `/annunci/${postId}`,
        tag: 'grazie',
      }).catch((error) => {
        console.error('Avviso di grazie non inviato:', error)
      }),
    )
  }

  return NextResponse.json({ ok: true, already: result.already })
}
