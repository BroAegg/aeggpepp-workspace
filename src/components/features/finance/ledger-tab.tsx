'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

interface LedgerTabProps {
    transactions: Transaction[]
    formatCurrency: (amount: number) => string
}

export function LedgerTab({ transactions, formatCurrency }: LedgerTabProps) {
    const [ledgerMonth, setLedgerMonth] = useState(() => {
        const now = new Date()
        return { month: now.getMonth(), year: now.getFullYear() }
    })

    const monthLabel = new Date(ledgerMonth.year, ledgerMonth.month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    const navigateMonth = (dir: -1 | 1) => {
        setLedgerMonth(prev => {
            let m = prev.month + dir, y = prev.year
            if (m < 0) { m = 11; y-- }
            if (m > 11) { m = 0; y++ }
            return { month: m, year: y }
        })
    }

    const ledgerData = useMemo(() => {
        const filtered = transactions
            .filter(t => {
                const d = new Date(t.date)
                return d.getMonth() === ledgerMonth.month && d.getFullYear() === ledgerMonth.year
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        let balance = 0
        const rows = filtered.map(t => {
            const inAmt = t.type === 'income' ? t.amount : 0
            const outAmt = t.type === 'expense' ? t.amount : 0
            balance += inAmt - outAmt
            return { ...t, inAmt, outAmt, balance }
        })

        const totalIn = rows.reduce((s, r) => s + r.inAmt, 0)
        const totalOut = rows.reduce((s, r) => s + r.outAmt, 0)

        return { rows, totalIn, totalOut, finalBalance: balance }
    }, [transactions, ledgerMonth])

    return (
        <div>
            {/* Month Navigator */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">Ledger</h3>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-0.5">Total In</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(ledgerData.totalIn)}</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-0.5">Total Out</p>
                    <p className="text-base font-bold text-red-600 dark:text-red-400">{formatCurrency(ledgerData.totalOut)}</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                    <p className="text-xs text-primary mb-0.5">Saldo Akhir</p>
                    <p className="text-base font-bold text-primary">{formatCurrency(ledgerData.finalBalance)}</p>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tanggal</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keterangan</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tag</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">In</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Out</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-primary uppercase tracking-wider">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {ledgerData.rows.map((row, i) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.015 }}
                                    className={cn(
                                        'hover:bg-secondary/30 transition-colors',
                                        row.type === 'income' ? 'bg-emerald-500/[0.03]' : ''
                                    )}
                                >
                                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                        {new Date(row.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </td>
                                    <td className="px-4 py-2.5 text-foreground font-medium max-w-[200px] truncate">
                                        {row.description || row.category}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground capitalize">
                                            {row.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                        {row.inAmt > 0 ? formatCurrency(row.inAmt) : ''}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-red-600 dark:text-red-400">
                                        {row.outAmt > 0 ? formatCurrency(row.outAmt) : ''}
                                    </td>
                                    <td className={cn(
                                        'px-4 py-2.5 text-right font-bold',
                                        row.balance >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'
                                    )}>
                                        {formatCurrency(row.balance)}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                        {ledgerData.rows.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-border bg-secondary/30">
                                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-foreground">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(ledgerData.totalIn)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                                        {formatCurrency(ledgerData.totalOut)}
                                    </td>
                                    <td className={cn(
                                        'px-4 py-3 text-right font-bold',
                                        ledgerData.finalBalance >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'
                                    )}>
                                        {formatCurrency(ledgerData.finalBalance)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {ledgerData.rows.length === 0 && (
                    <div className="text-center py-16">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm">Belum ada transaksi di bulan ini</p>
                    </div>
                )}
            </div>
        </div>
    )
}
