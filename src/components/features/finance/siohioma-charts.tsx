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
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { getBillingCycle, isDateInBillingCycle, type BillingCycle } from '@/lib/cycle-utils'
import type { Transaction } from '@/types'

const CATEGORY_COLORS = [
  '#f59e0b', // amber
  '#0d9488', // teal
  '#84cc16', // lime
  '#3b82f6', // blue
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
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
// 1. TREN ARUS KAS 6 SIKLUS (Grouped Bar Chart: Pemasukan vs Pengeluaran)
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
      net: number
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
        net: inc - exp,
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
        <div className="space-y-0.5">
          <h4 className="text-base font-bold text-foreground">Tren Arus Kas</h4>
          <p className="text-xs text-muted-foreground">Histori pemasukan vs pengeluaran 6 siklus terakhir</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 dark:bg-emerald-600" />
            <span className="text-muted-foreground">Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-500" />
            <span className="text-muted-foreground">Pengeluaran</span>
          </div>
        </div>
      </div>

      {/* Main Metric Value & Trend */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
          {formatRupiah(trendData.currentIncome)}
        </span>
        {trendData.growthPercent !== 0 && (
          <span
            className={cn(
              'text-xs font-bold flex items-center gap-0.5',
              trendData.growthPercent > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-500'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {trendData.growthPercent > 0 ? `+${trendData.growthPercent}%` : `${trendData.growthPercent}%`} vs siklus lalu
          </span>
        )}
      </div>

      {/* Grouped Bar Chart */}
      {!isMounted || !trendData.hasData ? (
        <div className="h-[180px] flex flex-col items-center justify-center text-center p-4 bg-secondary/15 rounded-xl border border-dashed border-border/70">
          <BarChart3 className="w-6 h-6 text-muted-foreground/40 mb-1.5" />
          <p className="text-xs font-semibold text-foreground">Belum ada riwayat grafik</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Grafik 6 siklus akan otomatis terbentuk dari transaksi yang tercatat.
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
                      <p className="font-bold text-foreground">Siklus {data.fullLabel}</p>
                      <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400 text-[11px]">
                        <span>Pemasukan:</span>
                        <span className="font-bold tabular-nums">+{formatRupiah(data.income)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-lime-600 dark:text-lime-400 text-[11px]">
                        <span>Pengeluaran:</span>
                        <span className="font-bold tabular-nums">-{formatRupiah(data.expense)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="income"
                name="Pemasukan"
                fill="#047857"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="expense"
                name="Pengeluaran"
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
// 2. KATEGORI PENGELUARAN TERBESAR (Horizontal Progress Breakdown)
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
      items: items.slice(0, 4), // Top 4 categories
      totalExpense,
      maxAmount,
    }
  }, [transactions, cycle])

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-foreground">Kategori Belanja Terbesar</h4>
          <p className="text-xs text-muted-foreground">Distribusi pengeluaran di siklus {cycle.label}</p>
        </div>
      </div>

      {categoryData.items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground bg-secondary/15 rounded-xl border border-dashed border-border/70">
          Belum ada transaksi pengeluaran di siklus ini
        </div>
      ) : (
        <div className="space-y-3.5">
          {categoryData.items.map((item, idx) => {
            const widthPct = Math.max(8, Math.min(100, Math.round((item.amount / categoryData.maxAmount) * 100)))
            return (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">
                    {item.label} <span className="text-muted-foreground font-normal">({item.percentage}%)</span>
                  </span>
                  <span className="text-foreground tabular-nums font-bold">
                    {formatRupiah(item.amount)}
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-secondary/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      idx === 0
                        ? 'bg-lime-500'
                        : idx === 1
                        ? 'bg-lime-400'
                        : idx === 2
                        ? 'bg-teal-500'
                        : 'bg-amber-500/80'
                    )}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            )
          })}

          {/* Scale Axis Markers */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40 font-mono">
            <span>0</span>
            <span>{formatShort(categoryData.maxAmount * 0.33)}</span>
            <span>{formatShort(categoryData.maxAmount * 0.66)}</span>
            <span>{formatShort(categoryData.maxAmount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// 3. ALOKASI ANGGARAN BELANJA (Donut Chart + Total Belanja)
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
  const [activeTab, setActiveTab] = useState<'nominal' | 'persen'>('nominal')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const data = useMemo(() => {
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
      const cat = t.category || 'other'
      grouped[cat] = (grouped[cat] || 0) + (Number(t.amount) || 0)
    })

    const items = Object.entries(grouped)
      .map(([cat, amount], idx) => {
        const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
        return {
          name: labelMap[cat] || cat.replace(/_/g, ' '),
          value: amount,
          percentage: Math.round(pct),
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
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
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-foreground">Alokasi Anggaran</h4>
          <p className="text-xs text-muted-foreground">Proporsi belanja siklus ini</p>
        </div>

        {/* Toggle Nominal vs Persen */}
        <div className="inline-flex p-0.5 bg-secondary/80 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab('nominal')}
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold rounded transition-all',
              activeTab === 'nominal'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Rp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('persen')}
            className={cn(
              'px-2 py-0.5 text-[10px] font-bold rounded transition-all',
              activeTab === 'persen'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            %
          </button>
        </div>
      </div>

      {/* Donut Chart with Center Total Belanja */}
      <div className="relative h-[190px] flex items-center justify-center">
        {!isMounted || data.items.length === 0 ? (
          <div className="w-36 h-36 rounded-full border-4 border-dashed border-border/80 flex flex-col items-center justify-center text-center p-2">
            <span className="text-[10px] text-muted-foreground font-semibold">Total Belanja</span>
            <span className="text-lg font-black text-foreground">Rp 0</span>
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
                  innerRadius={60}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {data.items.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Hole: Total Belanja */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Belanja
              </span>
              <span className="text-xl font-black text-foreground tabular-nums tracking-tight">
                {formatShort(data.totalExpense)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {data.count} transaksi
              </span>
            </div>
          </>
        )}
      </div>

      {/* Top 3 Category Breakdown Pills */}
      {data.items.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          {data.items.slice(0, 3).map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-foreground font-medium">{item.name}</span>
              </div>
              <span className="font-bold tabular-nums text-foreground shrink-0">
                {activeTab === 'nominal' ? formatRupiah(item.value) : `${item.percentage}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Budget Summary & CTA */}
      <div className="pt-2 border-t border-border/40 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sisa Anggaran Belanja:</span>
          <span className="font-bold text-foreground tabular-nums">
            {formatRupiah(data.remaining)}
          </span>
        </div>

        <button
          type="button"
          onClick={onViewBudgetDetails}
          className="w-full py-2 px-3 rounded-xl border border-border/80 hover:bg-secondary text-xs font-bold text-foreground transition-colors flex items-center justify-center gap-1.5 shadow-xs"
        >
          <span>Kelola Target Anggaran</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
