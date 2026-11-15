'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { getBillingCycle, isDateInBillingCycle, type BillingCycle } from '@/lib/cycle-utils'
import type { Transaction, Scope } from '@/types'

interface FinanceChartsProps {
  transactions: Transaction[] // Filtered by active POV
  cycle: BillingCycle
  startDay?: number
  scope?: Scope | 'all'
}

const DONUT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#a855f7', // violet
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

export function FinanceCharts({
  transactions,
  cycle,
  startDay = 25,
  scope = 'all',
}: FinanceChartsProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // -------------------------------------------------------------
  // 1. DATA KATEGORI PENGELUARAN (SIKLUS GAJIAN AKTIF)
  // -------------------------------------------------------------
  const categoryChartData = useMemo(() => {
    // Filter active cycle expense transactions (exclude transfer & adjustment)
    const cycleExpenses = transactions.filter(
      (t) =>
        isDateInBillingCycle(t.date, cycle) &&
        t.type === 'expense'
    )

    const totalExpense = cycleExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    // Lookup table from TRANSACTION_CATEGORIES
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
          label: labelMap[cat] || cat,
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

  // -------------------------------------------------------------
  // 2. DATA TREN ARUS KAS 6 SIKLUS TERAKHIR
  // -------------------------------------------------------------
  const trend6CyclesData = useMemo(() => {
    const cyclesData: Array<{
      key: string
      shortLabel: string
      fullLabel: string
      income: number
      expense: number
      net: number
    }> = []

    // Build 6 consecutive billing cycles backwards (i = 5 down to 0)
    for (let i = 5; i >= 0; i--) {
      // Step backwards month by month from cycle.startDate
      const refDate = new Date(
        cycle.startDate.getFullYear(),
        cycle.startDate.getMonth() - i,
        cycle.startDate.getDate()
      )
      const c = getBillingCycle(startDay, refDate)

      // Strict filter: active POV transactions strictly in cycle c, excluding transfer & adjustment
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

      const startDayStr = c.startDate.getDate()
      const startMonthStr = c.startDate.toLocaleDateString('id-ID', { month: 'short' })

      cyclesData.push({
        key: c.startStr,
        shortLabel: `${startDayStr} ${startMonthStr}`,
        fullLabel: c.label,
        income: inc,
        expense: exp,
        net: inc - exp,
      })
    }

    const hasData = cyclesData.some((c) => c.income > 0 || c.expense > 0)
    return {
      cyclesData,
      hasData,
    }
  }, [transactions, cycle, startDay])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ========================================================= */}
      {/* GRAFIK 1: PENGELUARAN PER KATEGORI (SIKLUS AKTIF) */}
      {/* ========================================================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Pengeluaran per Kategori
              </h4>
              <p className="text-xs text-muted-foreground">
                Siklus {cycle.label}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-foreground tabular-nums bg-secondary px-2.5 py-1 rounded-lg border border-border/60">
            {formatRupiah(categoryChartData.totalExpense)}
          </span>
        </div>

        {/* Content */}
        {!isMounted || categoryChartData.items.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-secondary/15 rounded-xl border border-dashed border-border/70">
            <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-semibold text-foreground">
              Belum ada pengeluaran di siklus ini
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
              Catat pengeluaran lewat tombol Catat Pengeluaran atau WhatsApp bot Nanang.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Donut Chart (5 cols) */}
            <div className="sm:col-span-5 relative h-[210px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-popover border border-border/80 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-foreground">
                            <span>{data.icon}</span>
                            <span>{data.label}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-muted-foreground text-[11px]">
                            <span className="font-semibold text-foreground tabular-nums">
                              {formatRupiah(data.amount)}
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
                    data={categoryChartData.items}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="transparent"
                  >
                    {categoryChartData.items.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xs font-black text-foreground tabular-nums">
                  {formatShort(categoryChartData.totalExpense)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {categoryChartData.count} transaksi
                </span>
              </div>
            </div>

            {/* Category Ranking List (7 cols) */}
            <div className="sm:col-span-7 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {categoryChartData.items.slice(0, 5).map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="font-medium text-foreground truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums bg-secondary px-1.5 py-0.5 rounded">
                      {item.percentage}%
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {formatRupiah(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
              {categoryChartData.items.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border/40">
                  + {categoryChartData.items.length - 5} kategori lainnya
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* GRAFIK 2: TREN ARUS KAS 6 SIKLUS TERAKHIR */}
      {/* ========================================================= */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Tren Arus Kas 6 Siklus
              </h4>
              <p className="text-xs text-muted-foreground">
                Pemasukan vs Pengeluaran murni
              </p>
            </div>
          </div>

          {/* Legend Chips */}
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Masuk
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              Keluar
            </span>
          </div>
        </div>

        {/* Content */}
        {!isMounted || !trend6CyclesData.hasData ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-secondary/15 rounded-xl border border-dashed border-border/70">
            <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-semibold text-foreground">
              Belum ada riwayat arus kas 6 siklus
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
              Data historis akan otomatis terkumpul seiring berjalannya siklus gajian.
            </p>
          </div>
        ) : (
          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trend6CyclesData.cyclesData}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                barGap={3}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(150, 150, 150, 0.15)"
                />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-muted-foreground font-medium"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShort}
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-muted-foreground font-medium"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload
                    const isSurplus = data.net >= 0
                    return (
                      <div className="bg-popover border border-border/80 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[170px]">
                        <p className="font-bold text-foreground border-b border-border/40 pb-1">
                          Siklus {data.fullLabel}
                        </p>
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Pemasukan:</span>
                          <span className="font-bold tabular-nums">
                            {formatRupiah(data.income)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                          <span>Pengeluaran:</span>
                          <span className="font-bold tabular-nums">
                            {formatRupiah(data.expense)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                          <span className="text-muted-foreground">Net Tabungan:</span>
                          <span
                            className={cn(
                              'font-extrabold tabular-nums',
                              isSurplus
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            )}
                          >
                            {isSurplus ? '+' : ''}
                            {formatRupiah(data.net)}
                          </span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Pemasukan"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="expense"
                  name="Pengeluaran"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
