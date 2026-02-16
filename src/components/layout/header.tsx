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

export function Header({ title, emoji, icon: Icon }: HeaderProps) {
  const [userInitial, setUserInitial] = useState('U')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    getUser().then(user => {
      if (user) {
        setUserInitial((user.display_name || 'U').charAt(0).toUpperCase())
        setAvatarUrl(user.avatar_url || null)
        setUserRole(user.role || '')
      }
    })
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 transition-all duration-300 shadow-sm">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        {!Icon && emoji && <span className="text-xl">{emoji}</span>}
        {title && (
          <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Active Status */}
        <StatusIndicator />

        {/* Notifications */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-md hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* User avatar */}
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
          />
        ) : (
          <button className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
            <span className="text-sm font-medium text-primary">{userInitial}</span>
          </button>
        )}
      </div>
    </header>
  )
}
