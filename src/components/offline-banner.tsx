'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Floating badge indicator that alerts users when their device is offline,
 * clarifying that local cached data is being displayed.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-amber-950 font-medium text-xs shadow-lg backdrop-blur-md border border-amber-400/40 select-none pointer-events-none"
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Mode Offline — Menampilkan data tersimpan di perangkat</span>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/90 text-white font-medium text-xs shadow-lg backdrop-blur-md border border-emerald-400/40 select-none pointer-events-none"
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>Kembali Online — Menyinkronkan data terbaru...</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
