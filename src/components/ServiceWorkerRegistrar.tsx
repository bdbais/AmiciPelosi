'use client'

import { useEffect } from 'react'

/** Registra il service worker che riceve le notifiche push. */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker non registrato:', error)
    })
  }, [])

  return null
}
