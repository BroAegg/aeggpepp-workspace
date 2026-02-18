'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, ArrowLeftRight, BookOpen, BarChart3,
    Target, PiggyBank, ChevronLeft, ChevronRight, FileText,
} from 'lucide-react'
import { useState } from 'react'

export type FinanceTab = 'overview' | 'transactions' | 'ledger' | 'analytics' | 'budgets' | 'savings' | 'recap'

interface FinanceSidebarProps {
    activeTab: FinanceTab
    onTabChange: (tab: FinanceTab) => void
}

const FINANCE_NAV = [
    { id: 'overview' as FinanceTab, label: 'Overview', icon: LayoutDashboard, emoji: '📊' },
    { id: 'transactions' as FinanceTab, label: 'Transaksi', icon: ArrowLeftRight, emoji: '💳' },
    { id: 'ledger' as FinanceTab, label: 'Ledger', icon: BookOpen, emoji: '📒' },
    { id: 'analytics' as FinanceTab, label: 'Analytics', icon: BarChart3, emoji: '📈' },
    { id: 'budgets' as FinanceTab, label: 'Budget', icon: Target, emoji: '🎯' },
    { id: 'savings' as FinanceTab, label: 'Tabungan', icon: PiggyBank, emoji: '🐷' },
    { id: 'recap' as FinanceTab, label: 'Rekap', icon: FileText, emoji: '🗂️' },
]

export function FinanceSidebar({ activeTab, onTabChange }: FinanceSidebarProps) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <>
            {/* Desktop Sub-Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 56 : 200 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex flex-col border-r border-border bg-card/50 sticky top-0 self-start h-screen flex-shrink-0"
            >
                <div className={cn(
                    'flex items-center justify-between px-3 pt-4 pb-2',
                    collapsed && 'justify-center'
                )}>
                    {!collapsed && (
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Finance
                        </h3>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                    >
                        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                    </button>
                </div>

                <nav className="flex-1 px-2 py-1 space-y-0.5">
                    {FINANCE_NAV.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all relative',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="finance-active-bg"
                                        className="absolute inset-0 bg-primary/10 rounded-lg"
                                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                                    />
                                )}
                                <item.icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                                {!collapsed && (
                                    <span className="truncate relative z-10">{item.label}</span>
                                )}
                            </button>
                        )
                    })}
                </nav>
            </motion.aside>

            {/* Mobile Tab Bar */}
            <div className="md:hidden flex items-center gap-1 bg-secondary/50 rounded-xl p-1 mx-4 mt-3 mb-1 overflow-x-auto scrollbar-hide">
                {FINANCE_NAV.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                            activeTab === item.id
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground'
                        )}
                    >
                        <span>{item.emoji}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </>
    )
}
