'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapMarker = { lat: number; lng: number; emoji?: string; color?: string }

/** Marker disegnato in HTML: evita di dipendere dalle immagini di Leaflet. */
function pinIcon(emoji = '🐾', color = '#e07a3f') {
  return L.divIcon({
    className: '',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid ${color};display:grid;place-items:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.25)">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], zoom ?? map.getZoom())
  }, [lat, lng, zoom, map])
  return null
}

type Props = {
  center: { lat: number; lng: number }
  zoom?: number
  markers?: MapMarker[]
  radiusKm?: number
  onPick?: (lat: number, lng: number) => void
  className?: string
}

export default function MapView({
  center,
  zoom = 14,
  markers = [],
  radiusKm,
  onPick,
  className = 'map-box',
}: Props) {
  const points = useMemo(
    () => (markers.length > 0 ? markers : [{ lat: center.lat, lng: center.lng }]),
    [markers, center.lat, center.lng],
  )

  return (
    <div className={className}>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={center.lat} lng={center.lng} zoom={zoom} />
        {onPick && <ClickHandler onPick={onPick} />}
        {radiusKm ? (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#e07a3f', fillColor: '#e07a3f', fillOpacity: 0.12 }}
          />
        ) : null}
        {points.map((marker, index) => (
          <Marker
            key={`${marker.lat}-${marker.lng}-${index}`}
            position={[marker.lat, marker.lng]}
            icon={pinIcon(marker.emoji, marker.color)}
          />
        ))}
      </MapContainer>
    </div>
  )
}
