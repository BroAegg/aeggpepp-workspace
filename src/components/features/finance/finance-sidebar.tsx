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
                animate={{ width: collapsed ? 64 : 240 }}
                transition={{ duration: 0.2 }}
                className="hidden md:flex flex-col border-r border-dashed border-border bg-card/30 sticky top-0 self-start h-[calc(100vh-4rem)] flex-shrink-0"
            >
                <div className={cn(
                    'flex items-center justify-between px-4 pt-6 pb-4',
                    collapsed && 'justify-center'
                )}>
                    {!collapsed && (
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-2">
                            Menu
                        </h3>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                <nav className="flex-1 px-3 py-2 space-y-1">
                    {FINANCE_NAV.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group',
                                    isActive
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="finance-active-bg"
                                        className="absolute inset-0 bg-primary/10 rounded-xl"
                                        transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                                    />
                                )}
                                <item.icon className={cn("w-5 h-5 flex-shrink-0 relative z-10 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                                {!collapsed && (
                                    <span className="truncate relative z-10">{item.label}</span>
                                )}
                            </button>
                        )
                    })}
                </nav>
            </motion.aside>

            {/* Mobile Tab Bar */}
            <div className="md:hidden w-full sticky top-[60px] z-20 bg-background/95 backdrop-blur-sm border-b border-border pb-1">
                <div className="flex items-center overflow-x-auto no-scrollbar py-3 px-4 gap-2">
                    {FINANCE_NAV.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border',
                                    isActive
                                        ? 'bg-primary/10 border-primary/20 text-primary shadow-sm'
                                        : 'bg-card border-border text-muted-foreground hover:bg-secondary/50'
                                )}
                            >
                                {isActive ? <item.icon className="w-3.5 h-3.5" /> : <span>{item.emoji}</span>}
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
