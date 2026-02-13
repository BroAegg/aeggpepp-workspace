'use client'

import { useState, useEffect } from 'react'
import { MobileMenuButton } from './sidebar'
import { Bell } from 'lucide-react'
import { getUser } from '@/lib/actions/auth'

interface HeaderProps {
  title?: string
  emoji?: string
}

export function Header({ title, emoji }: HeaderProps) {
  const [userInitial, setUserInitial] = useState('U')

  useEffect(() => {
    getUser().then(user => {
      if (user) {
        setUserInitial((user.display_name || 'U').charAt(0).toUpperCase())
      }
    })
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-sm border-b border-border transition-colors duration-300">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        {emoji && <span className="text-xl">{emoji}</span>}
        {title && (
          <h1 className="text-lg font-semibold text-foreground tracking-wide">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-md hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* User avatar */}
        <button className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20">
          <span className="text-sm font-medium text-primary">{userInitial}</span>
        </button>
      </div>
    </header>
  )
}
