'use client'

import { useState } from 'react'

export function Gallery({
  photos,
  fallbackEmoji,
  alt,
}: {
  photos: { id: string }[]
  fallbackEmoji: string
  alt: string
}) {
  const [active, setActive] = useState(0)

  if (photos.length === 0) {
    return (
      <div className="gallery">
        <div className="main">
          <span aria-hidden="true">{fallbackEmoji}</span>
        </div>
        <p className="hint">Nessuna foto allegata a questo annuncio.</p>
      </div>
    )
  }

  return (
    <div className="gallery">
      <div className="main">
        <img src={`/api/photos/${photos[active].id}`} alt={alt} />
      </div>
      {photos.length > 1 && (
        <div className="thumbs">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              className={index === active ? 'active' : ''}
              onClick={() => setActive(index)}
              aria-label={`Foto ${index + 1}`}
            >
              <img src={`/api/photos/${photo.id}`} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
