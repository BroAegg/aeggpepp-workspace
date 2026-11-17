'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { getBillingCycle, isDateInBillingCycle, type BillingCycle } from '@/lib/cycle-utils'
import type { Transaction } from '@/types'

const DONUT_PALETTE = [
  '#f59e0b', // amber / orange (like 16% in Siohioma)
  '#0d9488', // dark teal (like 23% in Siohioma)
  '#84cc16', // lime green (like 68% in Siohioma)
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // purple
]

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

const formatShort = (amount: number) => {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')}M`
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}jt`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}rb`
  }
  return `${amount}`
}

// =========================================================================
// 1. SIOHIOMA REVENUE BAR CHART (Grouped Income vs Expense across 6 cycles)
// =========================================================================
interface SiohiomaRevenueChartProps {
  transactions: Transaction[]
  cycle: BillingCycle
  startDay?: number
}

export function SiohiomaRevenueChart({
  transactions,
  cycle,
  startDay = 25,
}: SiohiomaRevenueChartProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const trendData = useMemo(() => {
    const cyclesData: Array<{
      key: string
      shortLabel: string
      fullLabel: string
      income: number
      expense: number
    }> = []

    for (let i = 5; i >= 0; i--) {
      const refDate = new Date(
        cycle.startDate.getFullYear(),
        cycle.startDate.getMonth() - i,
        cycle.startDate.getDate()
      )
      const c = getBillingCycle(startDay, refDate)

      const cycleTxs = transactions.filter(
        (t) =>
          isDateInBillingCycle(t.date, c) &&
          t.type !== 'transfer' &&
          t.type !== 'adjustment'
      )

      const inc = cycleTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      const exp = cycleTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

      const startMonthStr = c.startDate.toLocaleDateString('id-ID', { month: 'short' })

      cyclesData.push({
        key: c.startStr,
        shortLabel: startMonthStr,
        fullLabel: c.label,
        income: inc,
        expense: exp,
      })
    }

    const currentCycleData = cyclesData[cyclesData.length - 1]
    const currentIncome = currentCycleData ? currentCycleData.income : 0
    const prevCycleData = cyclesData[cyclesData.length - 2]
    const prevIncome = prevCycleData ? prevCycleData.income : 0

    let growthPercent = 0
    if (prevIncome > 0) {
      growthPercent = Math.round(((currentIncome - prevIncome) / prevIncome) * 100)
    }

    const hasData = cyclesData.some((c) => c.income > 0 || c.expense > 0)

    return {
      cyclesData,
      currentIncome,
      growthPercent,
      hasData,
    }
  }, [transactions, cycle, startDay])

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
      {/* Header: Title on Left, Legend on Right */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-foreground">Revenue</h4>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 dark:bg-emerald-600" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
        </div>
      </div>

      {/* Main Metric Value & Trend */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
          {formatRupiah(trendData.currentIncome)}
        </span>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
          <TrendingUp className="w-3.5 h-3.5" />
          {trendData.growthPercent >= 0 ? `+${trendData.growthPercent}%` : `${trendData.growthPercent}%`} from last cycle
        </span>
      </div>

      {/* Grouped Bar Chart */}
      {!isMounted || !trendData.hasData ? (
        <div className="h-[180px] flex flex-col items-center justify-center text-center p-4 bg-secondary/15 rounded-xl border border-dashed border-border/70">
          <p className="text-xs font-semibold text-foreground">Belum ada histori grafik</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Data grafik akan terisi otomatis saat transaksi tercatat di siklus ini.
          </p>
        </div>
      ) : (
        <div className="h-[180px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trendData.cyclesData}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.4)"
              />
              <XAxis
                dataKey="shortLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(val) => formatShort(val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-popover border border-border/80 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
                      <p className="font-bold text-foreground">{data.fullLabel}</p>
                      <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400 text-[11px]">
                        <span>Income:</span>
                        <span className="font-bold tabular-nums">+{formatRupiah(data.income)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-lime-600 dark:text-lime-400 text-[11px]">
                        <span>Expenses:</span>
                        <span className="font-bold tabular-nums">-{formatRupiah(data.expense)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="income"
                name="Income"
                fill="#047857"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="expense"
                name="Expenses"
                fill="#84cc16"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// 2. SIOHIOMA SALES REPORT (Horizontal Category Progress Breakdown)
// =========================================================================
interface SiohiomaHorizontalReportProps {
  transactions: Transaction[]
  cycle: BillingCycle
}

export function SiohiomaHorizontalReport({
  transactions,
  cycle,
}: SiohiomaHorizontalReportProps) {
  const categoryData = useMemo(() => {
    const cycleExpenses = transactions.filter(
      (t) => isDateInBillingCycle(t.date, cycle) && t.type === 'expense'
    )

    const totalExpense = cycleExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const labelMap: Record<string, string> = {}
    TRANSACTION_CATEGORIES.expense.forEach((cat) => {
      labelMap[cat.value] = cat.label
    })

    const grouped: Record<string, number> = {}
    cycleExpenses.forEach((t) => {
      const cat = t.category || 'other_expense'
      grouped[cat] = (grouped[cat] || 0) + (Number(t.amount) || 0)
    })

    const items = Object.entries(grouped)
      .map(([cat, amount]) => {
        const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        return {
          category: cat,
          label: labelMap[cat] || cat.replace(/_/g, ' '),
          amount,
          percentage: Math.round(pct),
        }
      })
      .sort((a, b) => b.amount - a.amount)

    const maxAmount = items.length > 0 ? items[0].amount : 1000000

    return {
      items: items.slice(0, 3), // Top 3 matching Siohioma
      totalExpense,
      maxAmount,
    }
  }, [transactions, cycle])

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-base font-bold text-foreground">Sales Report</h4>
        <button
          type="button"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {categoryData.items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground bg-secondary/15 rounded-xl border border-dashed border-border/70">
          Belum ada transaksi kategori di siklus ini
        </div>
      ) : (
        <div className="space-y-4">
          {categoryData.items.map((item, idx) => {
            const widthPct = Math.max(8, Math.min(100, Math.round((item.amount / categoryData.maxAmount) * 100)))
            return (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">
                    {item.label} ({item.percentage}%)
                  </span>
                  <span className="text-foreground tabular-nums font-bold">
                    {formatRupiah(item.amount)}
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-secondary/80 rounded-full h-3 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      idx === 0
                        ? 'bg-lime-500'
                        : idx === 1
                        ? 'bg-lime-400'
                        : 'bg-amber-500/80'
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}

          {/* Scale Axis Markers (0, 25%, 50%, 75%, 100%) */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40 font-mono">
            <span>0</span>
            <span>{formatShort(categoryData.maxAmount * 0.25)}</span>
            <span>{formatShort(categoryData.maxAmount * 0.5)}</span>
            <span>{formatShort(categoryData.maxAmount * 0.75)}</span>
            <span>{formatShort(categoryData.maxAmount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// 3. SIOHIOMA TOTAL VIEW PERFORMANCE (Donut Chart + Central Count + 3 Pills)
// =========================================================================
interface SiohiomaDonutPerformanceProps {
  transactions: Transaction[]
  cycle: BillingCycle
  totalBudget?: number
  onViewBudgetDetails?: () => void
}

export function SiohiomaDonutPerformance({
  transactions,
  cycle,
  totalBudget = 5000000,
  onViewBudgetDetails,
}: SiohiomaDonutPerformanceProps) {
  const [activePill, setActivePill] = useState<'count' | 'percentage' | 'sales'>('count')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const data = useMemo(() => {
    const cycleExpenses = transactions.filter(
      (t) => isDateInBillingCycle(t.date, cycle) && t.type === 'expense'
    )
    const totalExpense = cycleExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const grouped: Record<string, number> = {}
    cycleExpenses.forEach((t) => {
      const cat = t.category || 'other'
      grouped[cat] = (grouped[cat] || 0) + (Number(t.amount) || 0)
    })

    const items = Object.entries(grouped)
      .map(([cat, amount], idx) => {
        const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        return {
          name: cat,
          value: amount,
          percentage: Math.round(pct),
          color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
        }
      })
      .sort((a, b) => b.value - a.value)

    return {
      items,
      totalExpense,
      count: cycleExpenses.length,
      remaining: Math.max(0, totalBudget - totalExpense),
    }
  }, [transactions, cycle, totalBudget])

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Title */}
      <h4 className="text-base font-bold text-foreground">Total View Performance</h4>

      {/* Donut Chart with Center Count */}
      <div className="relative h-[200px] flex items-center justify-center">
        {!isMounted || data.items.length === 0 ? (
          <div className="w-36 h-36 rounded-full border-4 border-dashed border-border/80 flex flex-col items-center justify-center text-center p-2">
            <span className="text-[10px] text-muted-foreground font-semibold">Total Count</span>
            <span className="text-lg font-black text-foreground">0</span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.items}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={85}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {data.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Siohioma Center Hole: Total Count & Big Number */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Total Count
              </span>
              <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                {activePill === 'count'
                  ? formatShort(data.totalExpense)
                  : activePill === 'percentage'
                  ? `${Math.min(100, Math.round((data.totalExpense / totalBudget) * 100))}%`
                  : `${data.count} Tx`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Advice Text */}
      <p className="text-xs text-muted-foreground text-center px-2">
        Here are some tips on how to improve your financial score and budget allocation.
      </p>

      {/* Guide Views CTA Button */}
      <button
        type="button"
        onClick={onViewBudgetDetails}
        className="w-full py-2 px-4 rounded-xl border border-border/80 hover:bg-secondary text-xs font-bold text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-xs"
      >
        <span>Guide Views</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {/* Siohioma Segmented Pills: [ View Count ] [ Percentage ] [ Sales ] */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/80 rounded-xl border border-border/60">
        <button
          type="button"
          onClick={() => setActivePill('count')}
          className={cn(
            'py-1.5 text-[11px] font-bold rounded-lg transition-all text-center',
            activePill === 'count'
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          View Count
        </button>
        <button
          type="button"
          onClick={() => setActivePill('percentage')}
          className={cn(
            'py-1.5 text-[11px] font-bold rounded-lg transition-all text-center',
            activePill === 'percentage'
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Percentage
        </button>
        <button
          type="button"
          onClick={() => setActivePill('sales')}
          className={cn(
            'py-1.5 text-[11px] font-bold rounded-lg transition-all text-center',
            activePill === 'sales'
              ? 'bg-card text-foreground shadow-xs border border-border/80'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sales
        </button>
      </div>
    </div>
  )
}
