'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Calendar,
  Target,
  CheckSquare,
  Image,
  Briefcase,
  Gift,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { APP_NAME } from '@/lib/constants'
import { ThemeToggle } from '@/components/theme-toggle'
import { getUser } from '@/lib/actions/auth'
import { isRamadan } from '@/lib/ramadan'

const mainNavItems = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Todos', href: '/todos', icon: CheckSquare },
]

const privatePages = [
  { title: 'Gallery', href: '/gallery', icon: Image },
  { title: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { title: 'Wishlist', href: '/wishlist', icon: Gift },
  { title: 'Finance', href: '/finance', icon: Wallet },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, isCollapsed, toggle, setCollapsed } = useSidebarStore()
  const [userName, setUserName] = useState('')
  const [userInitial, setUserInitial] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userRole, setUserRole] = useState('')
  const [showRamadan, setShowRamadan] = useState(false)

  useEffect(() => {
    setShowRamadan(isRamadan())
    getUser().then(user => {
      if (user) {
        setUserName(user.display_name || 'User')
        setUserInitial((user.display_name || 'U').charAt(0).toUpperCase())
        setAvatarUrl(user.avatar_url || null)
        setUserRole(user.role || '')
      }
    })
  }, [])

  const NavLink = ({ item, collapsed }: { item: typeof mainNavItems[0]; collapsed: boolean }) => {
    const isActive = pathname === item.href
    const Icon = item.icon
    return (
      <Link
        href={item.href}
        onClick={() => { if (window.innerWidth < 768) toggle() }}
        className={cn(
          'flex items-center gap-2 px-2 py-[6px] rounded-md transition-colors duration-100 text-[14px]',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-sidebar-active text-sidebar-active-text font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active-text'
        )}
        title={collapsed ? item.title : undefined}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 48 : 240,
          x: isOpen ? 0 : -240,
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(
          'fixed md:relative h-screen',
          'bg-sidebar text-sidebar-foreground',
          'flex flex-col z-50',
          'md:translate-x-0',
          'select-none'
        )}
      >
        {/* Header - Workspace Switcher */}
        <div className="flex items-center justify-between px-3 py-2.5 min-h-[44px]">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">A</span>
              </div>
              <span className="font-semibold text-[14px] text-sidebar-active-text truncate">
                {APP_NAME}
              </span>
            </motion.div>
          )}

          {/* Desktop: Collapse */}
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded hover:bg-sidebar-hover transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-sidebar-foreground" />
            )}
          </button>

          {/* Mobile: Close */}
          <button
            onClick={toggle}
            className="md:hidden flex items-center justify-center w-6 h-6 rounded hover:bg-sidebar-hover"
          >
            <X className="w-4 h-4 text-sidebar-foreground" />
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Main Nav */}
          <nav className="px-2 pt-1 space-y-0.5">
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} collapsed={isCollapsed} />
            ))}
            {showRamadan && (
              <NavLink item={{ title: 'Ramadan 🌙', href: '/ramadan', icon: Moon }} collapsed={isCollapsed} />
            )}
          </nav>

          {/* Divider + Private Section */}
          <div className="px-2 mt-4">
            {!isCollapsed && (
              <div className="px-2 mb-1">
                <span className="text-[11px] font-semibold text-sidebar-muted uppercase tracking-wider">
                  Private
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {privatePages.map((item) => (
                <NavLink key={item.href} item={item} collapsed={isCollapsed} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section - Always visible */}
        <div className="shrink-0 px-2 py-2 space-y-0.5 border-t border-sidebar-border">
          {/* Settings */}
          <NavLink
            item={{ title: 'Settings', href: '/settings', icon: Settings }}
            collapsed={isCollapsed}
          />

          {/* Theme Toggle Row */}
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 py-[6px]">
              <span className="text-[13px] text-sidebar-muted">Theme</span>
              <ThemeToggle />
            </div>
          )}

          {/* User Profile */}
          {!isCollapsed && (
            <Link href="/settings" className="block mt-1 px-2 py-2 rounded-md hover:bg-sidebar-hover cursor-pointer transition-colors">
              <div className="flex items-center gap-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white">{userInitial || 'U'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-sidebar-active-text truncate">
                    {userName || 'Loading...'}
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </motion.aside>
    </>
  )
}

// Mobile menu button (untuk header)
export function MobileMenuButton() {
  const { toggle } = useSidebarStore()

  return (
    <button
      onClick={toggle}
      className="md:hidden flex items-center justify-center w-9 h-9 rounded-md hover:bg-secondary/80 transition-colors"
    >
      <Menu className="w-5 h-5 text-muted-foreground" />
    </button>
  )
}
