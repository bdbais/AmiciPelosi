import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { currentUser } from '@/lib/auth'
import { crossOriginResponse, sameOrigin } from '@/lib/http'
import { deletePhoto, putLogo } from '@/lib/photoStorage'
import { sniffLogoType } from '@/lib/logo'

/** Dopo il ridimensionamento nel browser (256x256) un logo pesa pochi KB: un MB e' gia' un errore. */
const MAX_LOGO_BYTES = 1024 * 1024

/**
 * Caricare il logo del proprio ente.
 *
 * Non serve essere gia' verificati: chi e' in attesa lo carica adesso e lo
 * vedranno gli altri quando una persona avra' approvato l'account. Serve
 * pero' aver dichiarato di essere un ente: per una persona non esiste un
 * logo, e non esiste un posto in cui mostrarlo.
 *
 * Il formato lo si legge dai primi byte, non da quello che dice il browser:
 * il tipo del file lo scrive il client, i byte no.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })
  if (user.accountType === 'PERSON') {
    return NextResponse.json(
      { error: 'Il logo è per canili, gattili e associazioni: scegli prima chi sei, e salva.' },
      { status: 400 },
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invia il modulo come multipart/form-data.' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Scegli un file.' }, { status: 400 })
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: 'Il logo è troppo pesante: al massimo 1 MB.' }, { status: 400 })
  }

  const data = new Uint8Array(await file.arrayBuffer())
  const mimeType = sniffLogoType(data)
  if (!mimeType) {
    return NextResponse.json({ error: 'Formato non supportato: usa un PNG o un JPEG.' }, { status: 400 })
  }

  // Prima si scrive il nuovo, poi si cancella il vecchio: se qualcosa va
  // storto a meta', al peggio restano due file, mai nessuno.
  const stored = await putLogo(user.id, data, mimeType)
  const now = new Date()
  const db = await getDb()
  await db
    .update(users)
    .set({ orgLogoKey: stored.storageKey, orgLogoData: stored.data ? Buffer.from(stored.data) : null, orgLogoAt: now })
    .where(eq(users.id, user.id))
  if (user.orgLogoKey && user.orgLogoKey !== stored.storageKey) await deletePhoto(user.orgLogoKey)

  return NextResponse.json({ ok: true, updatedAt: now.toISOString() })
}

/** Togliere il proprio logo. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return crossOriginResponse()
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'Accedi' }, { status: 401 })

  const db = await getDb()
  await db
    .update(users)
    .set({ orgLogoKey: null, orgLogoData: null, orgLogoAt: null })
    .where(eq(users.id, user.id))
  await deletePhoto(user.orgLogoKey)

  return NextResponse.json({ ok: true })
}
