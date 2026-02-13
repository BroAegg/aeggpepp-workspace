'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Calendar,
    Target,
    CheckSquare,
    Wallet,
    Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
    { title: 'Home', href: '/', icon: Home },
    { title: 'Calendar', href: '/calendar', icon: Calendar },
    { title: 'Goals', href: '/goals', icon: Target },
    { title: 'Todos', href: '/todos', icon: CheckSquare },
    { title: 'Finance', href: '/finance', icon: Wallet },
]

export function MobileBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
            <div className="flex items-center justify-around px-1 py-1.5">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-0',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground active:text-foreground'
                            )}
                        >
                            <Icon className={cn('w-5 h-5', isActive && 'stroke-[2.5]')} />
                            <span className={cn(
                                'text-[10px] font-medium truncate',
                                isActive && 'font-semibold'
                            )}>
                                {item.title}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
