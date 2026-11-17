'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ShoppingBag } from 'lucide-react'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { isDateInBillingCycle, type BillingCycle } from '@/lib/cycle-utils'
import type { Transaction } from '@/types'

interface NevBankDonutChartProps {
  transactions: Transaction[]
  cycle: BillingCycle
  formatCurrency: (amount: number) => string
}

const DONUT_COLORS = [
  '#f43f5e', // rose-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#3b82f6', // blue-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#6366f1', // indigo-500
  '#a855f7', // violet-500
]

export function NevBankDonutChart({
  transactions,
  cycle,
  formatCurrency,
}: NevBankDonutChartProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const categoryData = useMemo(() => {
    // Filter active cycle expense transactions (exclude transfer & adjustment)
    const cycleExpenses = transactions.filter(
      (t) =>
        isDateInBillingCycle(t.date, cycle) &&
        t.type === 'expense'
    )

    const totalExpense = cycleExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const labelMap: Record<string, string> = {}
    const iconMap: Record<string, string> = {}
    TRANSACTION_CATEGORIES.expense.forEach((cat) => {
      labelMap[cat.value] = cat.label
      iconMap[cat.value] = cat.icon
    })

    const grouped: Record<string, number> = {}
    cycleExpenses.forEach((t) => {
      const cat = t.category || 'other_expense'
      grouped[cat] = (grouped[cat] || 0) + (Number(t.amount) || 0)
    })

    const items = Object.entries(grouped)
      .map(([cat, amount], index) => {
        const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        return {
          category: cat,
          label: labelMap[cat] || cat.replace(/_/g, ' '),
          icon: iconMap[cat] || '💳',
          amount,
          percentage: Number(pct.toFixed(1)),
          color: DONUT_COLORS[index % DONUT_COLORS.length],
        }
      })
      .sort((a, b) => b.amount - a.amount)

    return {
      items,
      totalExpense,
      count: cycleExpenses.length,
    }
  }, [transactions, cycle])

  const activeItem = activeIndex !== null ? categoryData.items[activeIndex] : null

  if (!isMounted) {
    return <div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground">Memuat grafik...</div>
  }

  if (categoryData.items.length === 0) {
    return (
      <div className="h-[210px] flex flex-col items-center justify-center text-center p-6 bg-secondary/15 rounded-xl border border-dashed border-border/70">
        <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-xs font-semibold text-foreground">Belum ada pengeluaran di siklus ini</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Catat pengeluaran lewat tombol Catat Transaksi atau WhatsApp bot Nanang.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
      {/* Donut Chart with Center Hole Highlight (NevBank Style) */}
      <div className="sm:col-span-6 relative h-[210px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0].payload
                return (
                  <div className="bg-popover border border-border/80 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1 z-30">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <span>{data.icon}</span>
                      <span>{data.label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-muted-foreground text-[11px]">
                      <span className="font-semibold text-foreground tabular-nums">
                        {formatCurrency(data.amount)}
                      </span>
                      <span className="font-bold text-primary tabular-nums">
                        {data.percentage}%
                      </span>
                    </div>
                  </div>
                )
              }}
            />
            <Pie
              data={categoryData.items}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              paddingAngle={3}
              stroke="transparent"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {categoryData.items.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Dynamic Center Hole (NevBank interactive center) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-[100px]">
            {activeItem ? activeItem.label : 'Total Siklus'}
          </span>
          <span className="text-xs sm:text-sm font-black text-foreground tabular-nums tracking-tight mt-0.5">
            {activeItem ? formatCurrency(activeItem.amount) : formatCurrency(categoryData.totalExpense)}
          </span>
          <span className="text-[9px] text-primary font-bold">
            {activeItem ? `${activeItem.percentage}%` : `${categoryData.count} transaksi`}
          </span>
        </div>
      </div>

      {/* Side Legend (NevBank style clean list) */}
      <div className="sm:col-span-6 space-y-1.5 max-h-[210px] overflow-y-auto pr-1">
        {categoryData.items.slice(0, 5).map((item, idx) => {
          const isSelected = activeIndex === idx
          return (
            <div
              key={item.category}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSelected ? 'bg-secondary text-foreground' : 'hover:bg-secondary/50 text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs shrink-0">{item.icon}</span>
                <span className="font-medium truncate max-w-[90px] text-foreground">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-right">
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums bg-secondary/80 px-1 py-0.5 rounded">
                  {item.percentage}%
                </span>
                <span className="font-bold text-foreground tabular-nums text-[11px]">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          )
        })}
        {categoryData.items.length > 5 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border/40">
            + {categoryData.items.length - 5} kategori lainnya
          </p>
        )}
      </div>
    </div>
  )
}
