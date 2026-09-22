'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  PiggyBank,
  BookOpen,
  BarChart3,
  FileText,
} from 'lucide-react'

export type FinanceTab =
  | 'overview'
  | 'transactions'
  | 'budgets'
  | 'savings'
  | 'ledger'
  | 'analytics'
  | 'recap'

interface FinanceNavTabsProps {
  activeTab: FinanceTab
  onTabChange: (tab: FinanceTab) => void
}

const FINANCE_TABS = [
  { id: 'overview' as FinanceTab, label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'transactions' as FinanceTab, label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'budgets' as FinanceTab, label: 'Anggaran', icon: Target },
  { id: 'savings' as FinanceTab, label: 'Tabungan', icon: PiggyBank },
  { id: 'ledger' as FinanceTab, label: 'Buku Kas', icon: BookOpen },
  { id: 'analytics' as FinanceTab, label: 'Analisis', icon: BarChart3 },
  { id: 'recap' as FinanceTab, label: 'Rekap Bulanan', icon: FileText },
]

export function FinanceNavTabs({ activeTab, onTabChange }: FinanceNavTabsProps) {
  return (
    <div className="w-full bg-card/70 border-b border-border/80 backdrop-blur-md sticky top-14 z-20 px-4 md:px-8 py-2">
      <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {FINANCE_TABS.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
