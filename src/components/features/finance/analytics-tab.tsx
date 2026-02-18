'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import type { Transaction } from '@/types'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface AnalyticsTabProps {
    transactions: Transaction[]
    formatCurrency: (amount: number) => string
    formatShort: (amount: number) => string
}

export function AnalyticsTab({ transactions, formatCurrency, formatShort }: AnalyticsTabProps) {
    const [analyticsMonth, setAnalyticsMonth] = useState(() => {
        const now = new Date()
        return { month: now.getMonth(), year: now.getFullYear() }
    })

    const monthLabel = new Date(analyticsMonth.year, analyticsMonth.month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    const navigateMonth = (dir: -1 | 1) => {
        setAnalyticsMonth(prev => {
            let m = prev.month + dir, y = prev.year
            if (m < 0) { m = 11; y-- }
            if (m > 11) { m = 0; y++ }
            return { month: m, year: y }
        })
    }

    // Pivot table data
    const pivotData = useMemo(() => {
        const filtered = transactions.filter(t => {
            const d = new Date(t.date)
            return d.getMonth() === analyticsMonth.month && d.getFullYear() === analyticsMonth.year
        })
        const totalIn = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const totalOut = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

        // Group by category
        const grouped: Record<string, { income: number; expense: number }> = {}
        filtered.forEach(t => {
            if (!grouped[t.category]) grouped[t.category] = { income: 0, expense: 0 }
            if (t.type === 'income') grouped[t.category].income += t.amount
            else grouped[t.category].expense += t.amount
        })

        const allCats = ([...TRANSACTION_CATEGORIES.income.map(c => c.value), ...TRANSACTION_CATEGORIES.expense.map(c => c.value)] as string[])
        const catLabels: Record<string, string> = {}
        const catIcons: Record<string, string> = {}
        TRANSACTION_CATEGORIES.income.forEach(c => { catLabels[c.value] = c.label; catIcons[c.value] = c.icon })
        TRANSACTION_CATEGORIES.expense.forEach(c => { catLabels[c.value] = c.label; catIcons[c.value] = c.icon })

        const rows = Object.entries(grouped)
            .map(([cat, vals]) => ({
                category: cat,
                label: catLabels[cat] || cat,
                icon: catIcons[cat] || '💰',
                income: vals.income,
                expense: vals.expense,
                pctOfIncome: totalIn > 0 ? (vals.income / totalIn * 100) : 0,
                pctOfExpense: totalOut > 0 ? (vals.expense / totalOut * 100) : 0,
            }))
            .sort((a, b) => (b.expense + b.income) - (a.expense + a.income))

        return { rows, totalIn, totalOut, count: filtered.length }
    }, [transactions, analyticsMonth])

    // Top 5 biggest single expenses
    const topExpenses = useMemo(() => {
        return transactions
            .filter(t => {
                if (t.type !== 'expense') return false
                const d = new Date(t.date)
                return d.getMonth() === analyticsMonth.month && d.getFullYear() === analyticsMonth.year
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
    }, [transactions, analyticsMonth])

    // Monthly trend (last 6 months area chart)
    const trendData = useMemo(() => {
        const months: { name: string; income: number; expense: number; savings: number }[] = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date(analyticsMonth.year, analyticsMonth.month - i, 1)
            const m = d.getMonth(), y = d.getFullYear()
            const monthTx = transactions.filter(t => {
                const td = new Date(t.date)
                return td.getMonth() === m && td.getFullYear() === y
            })
            const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            months.push({
                name: d.toLocaleDateString('id-ID', { month: 'short' }),
                income: inc,
                expense: exp,
                savings: inc - exp,
            })
        }
        return months
    }, [transactions, analyticsMonth])

    // Person comparison
    const personComparison = useMemo(() => {
        const filtered = transactions.filter(t => {
            if (t.type !== 'expense') return false
            const d = new Date(t.date)
            return d.getMonth() === analyticsMonth.month && d.getFullYear() === analyticsMonth.year
        })
        const aegg = filtered.filter(t => (t as any).profiles?.role === 'aegg').reduce((s, t) => s + t.amount, 0)
        const peppaa = filtered.filter(t => (t as any).profiles?.role === 'peppaa').reduce((s, t) => s + t.amount, 0)
        const total = aegg + peppaa
        return { aegg, peppaa, total, aeggPct: total > 0 ? aegg / total * 100 : 50, peppaaPct: total > 0 ? peppaa / total * 100 : 50 }
    }, [transactions, analyticsMonth])

    const savingsRate = pivotData.totalIn > 0 ? ((pivotData.totalIn - pivotData.totalOut) / pivotData.totalIn * 100) : 0

    return (
        <div>
            {/* Header with Month Nav */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">Analytics</h3>
                </div>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-1 py-0.5">
                    <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-card rounded-md transition-colors">
                        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
                    <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-card rounded-md transition-colors">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pivotData.totalIn)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Expense</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(pivotData.totalOut)}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Savings Rate</p>
                    <p className={cn('text-lg font-bold', savingsRate >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400')}>
                        {savingsRate.toFixed(1)}%
                    </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Transaksi</p>
                    <p className="text-lg font-bold text-foreground">{pivotData.count}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Pivot Table */}
                <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
                    <h4 className="text-sm font-semibold text-foreground mb-3">📊 Breakdown per Kategori</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Kategori</th>
                                    <th className="text-right px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Income</th>
                                    <th className="text-right px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">Expense</th>
                                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">% of Total</th>
                                    <th className="px-3 py-2 text-xs font-semibold text-muted-foreground w-[120px]">Bar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {pivotData.rows.map((row, i) => (
                                    <motion.tr
                                        key={row.category}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-secondary/30"
                                    >
                                        <td className="px-3 py-2.5">
                                            <span className="flex items-center gap-2">
                                                <span>{row.icon}</span>
                                                <span className="font-medium text-foreground">{row.label}</span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                            {row.income > 0 ? formatCurrency(row.income) : '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-medium text-red-600 dark:text-red-400">
                                            {row.expense > 0 ? formatCurrency(row.expense) : '-'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-muted-foreground">
                                            {row.expense > 0 ? `${row.pctOfExpense.toFixed(1)}%` : row.income > 0 ? `${row.pctOfIncome.toFixed(1)}%` : '-'}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.max(row.pctOfExpense, row.pctOfIncome)}%` }}
                                                    transition={{ duration: 0.5, delay: i * 0.03 }}
                                                    className={cn('h-full rounded-full', row.expense > 0 ? 'bg-red-400' : 'bg-emerald-400')}
                                                />
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                            {pivotData.rows.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-border bg-secondary/30">
                                        <td className="px-3 py-2.5 font-bold text-foreground">TOTAL</td>
                                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pivotData.totalIn)}</td>
                                        <td className="px-3 py-2.5 text-right font-bold text-red-600 dark:text-red-400">{formatCurrency(pivotData.totalOut)}</td>
                                        <td className="px-3 py-2.5 text-right font-bold text-muted-foreground">100%</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    {pivotData.rows.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-8">Belum ada data di bulan ini</p>
                    )}
                </div>

                {/* Savings Trend Area Chart */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-foreground mb-3">📈 Trend 6 Bulan</h4>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                                <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="income" stroke="#22c55e" fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Column: Top Expenses + Person Comparison */}
                <div className="space-y-5">
                    {/* Top 5 Biggest Expenses */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-3">🔥 Top 5 Pengeluaran Terbesar</h4>
                        {topExpenses.length > 0 ? (
                            <div className="space-y-2.5">
                                {topExpenses.map((tx, i) => (
                                    <div key={tx.id} className="flex items-center gap-3">
                                        <span className={cn(
                                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                                            i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                                i === 1 ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                                                    'bg-secondary text-muted-foreground'
                                        )}>
                                            {i + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.category}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                                            {formatCurrency(tx.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                        )}
                    </div>

                    {/* Person Comparison */}
                    <div className="bg-card border border-border rounded-xl p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-3">👥 Perbandingan Pengeluaran</h4>
                        {personComparison.total > 0 ? (
                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-foreground">⭐ Aegg</span>
                                        <span className="text-sm font-medium text-foreground">{formatCurrency(personComparison.aegg)} ({personComparison.aeggPct.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${personComparison.aeggPct}%` }} className="h-full bg-blue-500 rounded-full" transition={{ duration: 0.5 }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-foreground">🌙 Peppaa</span>
                                        <span className="text-sm font-medium text-foreground">{formatCurrency(personComparison.peppaa)} ({personComparison.peppaaPct.toFixed(0)}%)</span>
                                    </div>
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${personComparison.peppaaPct}%` }} className="h-full bg-pink-500 rounded-full" transition={{ duration: 0.5 }} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
