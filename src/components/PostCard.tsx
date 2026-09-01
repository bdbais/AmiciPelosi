import Link from 'next/link'
import { KINDS, SPECIES, type Kind, type Species } from '@/lib/constants'
import { formatDistance } from '@/lib/geo'
import { timeAgo } from '@/lib/format'

export type PostCardData = {
  id: string
  kind: string
  status: string
  title: string
  species: string
  city: string
  description: string
  createdAt: string | Date
  distanceKm?: number | null
  photos: { id: string }[]
}

export function PostCard({ post }: { post: PostCardData }) {
  const kind = KINDS[post.kind as Kind]
  const species = SPECIES[post.species as Species]
  const cover = post.photos[0]

  return (
    <Link href={`/annunci/${post.id}`} className="post-card">
      <div className="thumb">
        {cover ? (
          <img src={`/api/photos/${cover.id}`} alt={post.title} loading="lazy" />
        ) : (
          <span aria-hidden="true">{species?.emoji ?? '🐾'}</span>
        )}
        <span className={`badge ${post.kind}`}>
          {kind?.emoji} {kind?.label}
        </span>
      </div>
      <div className="body">
        <h3>{post.title}</h3>
        <div className="meta">
          <span>
            {species?.emoji} {species?.label}
          </span>
          <span>📍 {post.city}</span>
          {typeof post.distanceKm === 'number' && (
            <span className="badge distance">a {formatDistance(post.distanceKm)}</span>
          )}
        </div>
        <p className="excerpt">{post.description}</p>
        <div className="meta" style={{ marginTop: 'auto' }}>
          <span>{timeAgo(post.createdAt)}</span>
          {post.status === 'RESOLVED' && <span className="badge resolved">✓ Risolto</span>}
        </div>
      </div>
    </Link>
  )
}
