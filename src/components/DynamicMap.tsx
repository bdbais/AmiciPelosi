'use client'

import dynamic from 'next/dynamic'

/** Leaflet tocca `window`: va caricato solo nel browser. */
export const DynamicMap = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="map-box">
      <div className="map-placeholder">Carico la mappa…</div>
    </div>
  ),
})
