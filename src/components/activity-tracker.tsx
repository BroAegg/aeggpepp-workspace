'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { logActivity } from '@/lib/actions/activity'

const PAGE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/todos': 'Todos',
  '/goals': 'Goals',
  '/calendar': 'Calendar',
  '/finance': 'Finance',
  '/gallery': 'Gallery',
  '/wishlist': 'Wishlist',
  '/settings': 'Settings',
  '/portfolio': 'Portfolio',
  '/ramadan': 'Ramadan',
}

/**
 * Invisible component that logs page views.
 * Place this in the dashboard layout to track all page visits.
 */
export function ActivityTracker() {
  const pathname = usePathname()
  const lastLogged = useRef<string>('')

  useEffect(() => {
    // Don't log the same page twice in a row 
    if (pathname === lastLogged.current) return
    lastLogged.current = pathname

    const pageName = PAGE_NAMES[pathname] || pathname
    logActivity('page_view', pageName).catch(() => {
      // Silently fail
    })
  }, [pathname])

  return null // Invisible component
}
