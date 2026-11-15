'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  PiggyBank,
  CreditCard,
} from 'lucide-react'

export type FinanceTab =
  | 'overview'
  | 'transactions'
  | 'budgets'
  | 'savings'
  | 'subscriptions'

interface FinanceNavTabsProps {
  activeTab: FinanceTab
  onTabChange: (tab: FinanceTab) => void
}

export const FINANCE_TABS = [
  { id: 'overview' as FinanceTab, label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'transactions' as FinanceTab, label: 'Transaksi', icon: ArrowLeftRight },
  { id: 'budgets' as FinanceTab, label: 'Anggaran', icon: Target },
  { id: 'savings' as FinanceTab, label: 'Lokasi Uang', icon: PiggyBank },
  { id: 'subscriptions' as FinanceTab, label: 'Tagihan Rutin', icon: CreditCard },
]

export function FinanceNavTabs({ activeTab, onTabChange }: FinanceNavTabsProps) {
  return (
    <div className="w-full bg-background/95 border-b border-border/80 backdrop-blur-md sticky top-14 z-20 px-4 md:px-8 py-2">
      <div className="max-w-6xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {FINANCE_TABS.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                isActive
                  ? 'bg-foreground text-background font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-background' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
