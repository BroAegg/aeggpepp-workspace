'use client'

import { useState, useEffect } from 'react'
import { MobileMenuButton } from './sidebar'
import { Bell } from 'lucide-react'
import { getUser } from '@/lib/actions/auth'
import { StatusIndicator } from '../status-indicator'

interface HeaderProps {
  title?: string
  emoji?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function Header({ title, icon: Icon }: HeaderProps) {
  const [userInitial, setUserInitial] = useState('U')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    getUser().then((user) => {
      if (user) {
        setUserInitial((user.display_name || 'U').charAt(0).toUpperCase())
        setAvatarUrl(user.avatar_url || null)
      }
    })
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 bg-background/80 backdrop-blur-md border-b border-border transition-all">
      <div className="flex items-center gap-2.5">
        <MobileMenuButton />
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        {title && (
          <h1 className="text-sm font-semibold text-foreground tracking-tight">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Partner Presence */}
        <StatusIndicator />

        {/* Notifications */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Profile Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-7 h-7 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
            {userInitial}
          </div>
        )}
      </div>
    </header>
  )
}
