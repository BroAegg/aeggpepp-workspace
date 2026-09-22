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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/stores/sidebar-store'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/providers/auth-provider'
import { StatusIndicator } from '@/components/status-indicator'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: Home },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Goals', href: '/goals', icon: Target },
  { title: 'Tasks', href: '/todos', icon: CheckSquare },
]

const recordNavItems: NavItem[] = [
  { title: 'Finance', href: '/finance', icon: Wallet },
  { title: 'Wishlist', href: '/wishlist', icon: Gift },
  { title: 'Gallery', href: '/gallery', icon: Image },
  { title: 'Portfolio', href: '/portfolio', icon: Briefcase },
]

function NavLink({
  item,
  collapsed,
  pathname,
  onItemClick,
}: {
  item: NavItem
  collapsed: boolean
  pathname: string
  onItemClick?: () => void
}) {
  const isActive = pathname === item.href
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onItemClick}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-150 text-[13px] font-medium group',
        collapsed ? 'justify-center px-0' : '',
        isActive
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground'
      )}
      title={collapsed ? item.title : undefined}
    >
      <Icon
        className={cn(
          'w-4 h-4 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-sidebar-muted group-hover:text-foreground'
        )}
      />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, isCollapsed, toggle, setCollapsed } = useSidebarStore()
  const { profile } = useAuth()

  const displayName = profile?.display_name || (profile?.role === 'peppaa' ? 'Peppaa' : 'Aegg')
  const userInitial = displayName.charAt(0).toUpperCase()
  const userRole = profile?.role || 'Member'

  const handleMobileNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toggle()
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 56 : 240,
          x: isOpen ? 0 : typeof window !== 'undefined' && window.innerWidth < 768 ? -240 : 0,
        }}
        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          'fixed md:relative h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 select-none border-r border-sidebar-border',
          'md:translate-x-0'
        )}
      >
        {/* Workspace Brand Header */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-sidebar-border shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 shadow-xs">
                <span className="text-[11px] font-bold text-primary tracking-wider">AP</span>
              </div>
              <div className="min-w-0 leading-tight">
                <h2 className="text-xs font-bold text-foreground truncate tracking-tight">
                  AeggPepp
                </h2>
                <p className="text-[10px] text-sidebar-muted truncate font-medium">
                  Workspace
                </p>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shadow-xs">
                <span className="text-[11px] font-bold text-primary tracking-wider">AP</span>
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-hover text-sidebar-muted hover:text-foreground transition-colors ml-auto"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={toggle}
            className="md:hidden flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-hover text-sidebar-muted hover:text-foreground ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Main Section */}
          <div className="space-y-0.5">
            {!isCollapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider">
                Workspace
              </p>
            )}
            {mainNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={isCollapsed}
                pathname={pathname}
                onItemClick={handleMobileNavClick}
              />
            ))}
          </div>

          {/* Records & Finance Section */}
          <div className="space-y-0.5 pt-2">
            {!isCollapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-sidebar-muted uppercase tracking-wider">
                Finance & Records
              </p>
            )}
            {recordNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={isCollapsed}
                pathname={pathname}
                onItemClick={handleMobileNavClick}
              />
            ))}
          </div>
        </div>

        {/* Footer Area: Settings, Theme & Partner Status */}
        <div className="shrink-0 p-2 border-t border-sidebar-border space-y-1">
          <NavLink
            item={{ title: 'Settings', href: '/settings', icon: Settings }}
            collapsed={isCollapsed}
            pathname={pathname}
            onItemClick={handleMobileNavClick}
          />

          {!isCollapsed && (
            <>
              {/* Theme Switch Row */}
              <div className="flex items-center justify-between px-2.5 py-1 text-xs text-sidebar-muted">
                <span>Theme</span>
                <ThemeToggle />
              </div>

              {/* Partner Presence Bar */}
              <div className="mt-2 p-2 rounded-lg bg-sidebar-hover/60 border border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-sidebar-muted truncate capitalize">
                      {userRole}
                    </p>
                  </div>
                </div>
                <StatusIndicator />
              </div>
            </>
          )}

          {isCollapsed && (
            <div className="py-2 flex justify-center">
              <StatusIndicator />
            </div>
          )}
        </div>
      </motion.aside>
    </>
  )
}

export function MobileMenuButton() {
  const { toggle } = useSidebarStore()

  return (
    <button
      onClick={toggle}
      className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Toggle menu"
    >
      <Menu className="w-4 h-4" />
    </button>
  )
}
