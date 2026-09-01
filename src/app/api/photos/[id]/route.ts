import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  })
  if (!photo) return new Response('Foto non trovata', { status: 404 })

  return new Response(new Uint8Array(photo.data), {
    headers: {
      'Content-Type': photo.mimeType,
      // Le foto sono immutabili: si possono cachare a lungo.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
