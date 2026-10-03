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
}

/**
 * Invisible component that:
 * 1. Logs daily_login once per day (on mount)
 * 2. Logs page_view on every navigation
 */
export function ActivityTracker() {
  const pathname = usePathname()
  const lastLogged = useRef<string>('')
  const loginLogged = useRef(false)

  // Log daily_login once per app session (throttled server-side to once per 20h)
  useEffect(() => {
    if (loginLogged.current) return
    loginLogged.current = true
    logActivity('daily_login').catch(() => {})
  }, [])

  // Log page_view on navigation (deferred by 1.5s so it never competes with initial page data fetching)
  useEffect(() => {
    if (pathname === lastLogged.current) return
    lastLogged.current = pathname
    const pageName = PAGE_NAMES[pathname] || pathname

    const timer = setTimeout(() => {
      logActivity('page_view', pageName).catch(() => {})
    }, 1500)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
