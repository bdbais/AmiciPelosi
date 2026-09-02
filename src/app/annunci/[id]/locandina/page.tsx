import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { getPostDetail } from '@/lib/queries'
import { KINDS, SPECIES, type Kind, type Species } from '@/lib/constants'
import { PrintButton } from '@/components/PrintButton'
import { currentUser } from '@/lib/auth'
import { contactAccess } from '@/lib/contacts'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }
type Search = { tel?: string }

/**
 * La locandina da attaccare al palo.
 *
 * Un annuncio online lo vede chi apre l'app; un foglio A4 sul lampione lo vede
 * chi porta fuori il cane alle sette di mattina, che e' esattamente la persona
 * che potrebbe averlo incrociato. Le due cose non si sostituiscono: il QR sul
 * foglio riporta alla pagina, dove si puo' segnalare con foto e posizione.
 *
 * Il PDF lo fa il browser con la stampa: su workerd non c'e' modo di comporre
 * un PDF, e "Salva come PDF" e' un passaggio che tutti sanno gia' fare.
 */
export default async function PosterPage({
  params,
  searchParams,
}: {
  params: Params['params']
  searchParams: Promise<Search>
}) {
  const { id } = await params
  const { tel } = await searchParams
  const post = await getPostDetail(id)
  if (!post) notFound()

  /*
    La locandina si stampa e si attacca a un palo, quindi il numero ci puo'
    stare - ma solo se chi lo stampa aveva il diritto di vederlo. Questa pagina
    non chiede di entrare, e senza questo controllo bastava aprirla per leggere
    il recapito di chiunque saltando la richiesta di contatto.
  */
  const user = await currentUser()
  const access = await contactAccess(post, user?.id ?? null)
  const showPhone = tel !== '0' && Boolean(post.contactPhone) && access.visible
  const kind = KINDS[post.kind as Kind]
  const species = SPECIES[post.species as Species]
  const url = `https://amicipelosi.bais.info/annunci/${post.id}`

  const qr = await QRCode.toString(url, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#1a1a1a', light: '#00000000' },
  })

  const heading =
    post.kind === 'LOST' ? 'SMARRITO' : post.kind === 'FOUND' ? 'TROVATO' : post.kind === 'FOSTER' ? 'CERCA UNO STALLO' : 'CERCA CASA'

  return (
    <>
      <div className="poster-bar">
        <Link href={`/annunci/${post.id}`}>‹ Torna all&apos;annuncio</Link>
        <span className="spacer" />
        {post.contactPhone && access.visible && (
          <Link
            href={`/annunci/${post.id}/locandina${showPhone ? '?tel=0' : ''}`}
            className="btn ghost small"
          >
            {showPhone ? 'Togli il numero' : 'Metti il numero'}
          </Link>
        )}
        <PrintButton />
      </div>

      <div className="poster-note">
        Premi <strong>Stampa</strong> e scegli «Salva come PDF» se vuoi il file da portare in
        copisteria. Viene un A4.
        {showPhone && ' Il tuo numero sarà in chiaro sul foglio: è quello che serve a chi lo trova senza telefono in mano, ma finisce anche su un palo della luce.'}
      </div>

      <article className="poster">
        <header className="po-head">
          <span className="po-kind" style={{ background: kind?.color ?? '#333' }}>
            {heading}
          </span>
          <h1>{post.petName || post.title}</h1>
          <p className="po-species">
            {species?.emoji} {species?.label}
            {post.breed ? ` · ${post.breed}` : ''}
            {post.color ? ` · ${post.color}` : ''}
          </p>
        </header>

        {post.photos[0] && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="po-photo" src={`/api/photos/${post.photos[0].id}`} alt="" />
        )}

        <div className="po-where">
          <strong>Zona:</strong> {post.address}
          {post.city ? `, ${post.city}` : ''}
        </div>

        <p className="po-text">{post.description}</p>

        <div className="po-foot">
          <div className="po-qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="po-call">
            <p className="po-ask">Se l&apos;hai visto, segnalalo</p>
            {showPhone && <p className="po-tel">{post.contactPhone}</p>}
            <p className="po-url">
              Inquadra il codice, oppure scrivi
              <br />
              <strong>amicipelosi.bais.info</strong>
            </p>
            <p className="po-hint">
              Anche solo «era qui alle otto» aiuta: puoi mandare la tua posizione e una foto.
            </p>
          </div>
        </div>

        {post.photos.length > 1 && (
          <div className="po-extra">
            {post.photos.slice(1, 4).map((photo) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={photo.id} src={`/api/photos/${photo.id}`} alt="" />
            ))}
          </div>
        )}
      </article>
    </>
  )
}
