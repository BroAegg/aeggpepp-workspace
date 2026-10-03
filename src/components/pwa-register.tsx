'use client'

import { useEffect } from 'react'

/**
 * Automatically registers the PWA Service Worker in supported browsers.
 * Enables offline shell access and static asset caching.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA ServiceWorker registered with scope:', registration.scope)
          })
          .catch((err) => {
            console.warn('PWA ServiceWorker registration failed:', err)
          })
      })
    }
  }, [])

  return null
}
