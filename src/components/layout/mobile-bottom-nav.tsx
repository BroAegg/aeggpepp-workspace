'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Home,
    Calendar,
    Target,
    CheckSquare,
    Wallet,
    Zap,
    Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuickExpenseDrawer } from '@/components/features/finance/quick-expense-drawer'

export function MobileBottomNav() {
    const pathname = usePathname()
    const [quickDrawerOpen, setQuickDrawerOpen] = useState(false)

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
                <div className="flex items-center justify-around px-2 py-1.5 relative">
                    {/* 1. Home */}
                    <Link
                        href="/"
                        className={cn(
                            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                            pathname === '/'
                                ? 'text-primary'
                                : 'text-muted-foreground active:text-foreground'
                        )}
                    >
                        <Home className={cn('w-5 h-5', pathname === '/' && 'stroke-[2.5]')} />
                        <span className={cn('text-[10px] font-medium truncate', pathname === '/' && 'font-semibold')}>
                            Home
                        </span>
                    </Link>

                    {/* 2. Calendar */}
                    <Link
                        href="/calendar"
                        className={cn(
                            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                            pathname === '/calendar'
                                ? 'text-primary'
                                : 'text-muted-foreground active:text-foreground'
                        )}
                    >
                        <Calendar className={cn('w-5 h-5', pathname === '/calendar' && 'stroke-[2.5]')} />
                        <span className={cn('text-[10px] font-medium truncate', pathname === '/calendar' && 'font-semibold')}>
                            Kalender
                        </span>
                    </Link>

                    {/* 3. Center Elevated Quick Button */}
                    <div className="flex flex-col items-center px-1 -mt-4">
                        <button
                            type="button"
                            onClick={() => setQuickDrawerOpen(true)}
                            className="flex items-center justify-center w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/25 border-2 border-background active:scale-95 transition-transform"
                            title="Catat Pengeluaran"
                        >
                            <Plus className="w-5 h-5 stroke-[2.5]" />
                        </button>
                        <span className="text-[9px] font-semibold text-primary mt-0.5">Catat</span>
                    </div>

                    {/* 4. Todos */}
                    <Link
                        href="/todos"
                        className={cn(
                            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                            pathname === '/todos'
                                ? 'text-primary'
                                : 'text-muted-foreground active:text-foreground'
                        )}
                    >
                        <CheckSquare className={cn('w-5 h-5', pathname === '/todos' && 'stroke-[2.5]')} />
                        <span className={cn('text-[10px] font-medium truncate', pathname === '/todos' && 'font-semibold')}>
                            Todos
                        </span>
                    </Link>

                    {/* 5. Finance */}
                    <Link
                        href="/finance"
                        className={cn(
                            'flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 flex-1',
                            pathname === '/finance'
                                ? 'text-primary'
                                : 'text-muted-foreground active:text-foreground'
                        )}
                    >
                        <Wallet className={cn('w-5 h-5', pathname === '/finance' && 'stroke-[2.5]')} />
                        <span className={cn('text-[10px] font-medium truncate', pathname === '/finance' && 'font-semibold')}>
                            Finance
                        </span>
                    </Link>
                </div>
            </nav>

            {/* Quick Expense Drawer */}
            <QuickExpenseDrawer
                isOpen={quickDrawerOpen}
                onClose={() => setQuickDrawerOpen(false)}
            />
        </>
    )
}
