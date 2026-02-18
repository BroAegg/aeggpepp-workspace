'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Transaction, Budget } from '@/types'

const categoryIcons: Record<string, string> = {
    food: '🍔', daily_needs: '🏪', shopping: '🛒', transport: '🚗', clothing: '👕',
    treatment: '💆', sedekah: '🤲', gift_giving: '🎀', vacation: '✈️',
    entertainment: '🎮', bills: '📄', utilities: '💡', internet: '📶',
    health: '🏥', vehicle: '🔧', furniture: '🪑', education: '📚',
    saving: '🐷', ewallet: '📱', date: '❤️', other_expense: '💸',
}

interface BudgetsTabProps {
    budgets: Budget[]
    transactions: Transaction[]
    formatCurrency: (amount: number) => string
    onAddBudget: () => void
    onEditBudget: (budget: Budget) => void
    onDeleteBudget: (id: string) => void
}

export function BudgetsTab({ budgets, transactions, formatCurrency, onAddBudget, onEditBudget, onDeleteBudget }: BudgetsTabProps) {
    const [budgetMonth, setBudgetMonth] = useState(() => {
        const now = new Date()
        return { month: now.getMonth(), year: now.getFullYear() }
    })

    const monthLabel = new Date(budgetMonth.year, budgetMonth.month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    const navigateMonth = (dir: -1 | 1) => {
        setBudgetMonth(prev => {
            let m = prev.month + dir, y = prev.year
            if (m < 0) { m = 11; y-- }
            if (m > 11) { m = 0; y++ }
            return { month: m, year: y }
        })
    }

    const budgetData = useMemo(() => {
        const rows = budgets.map(budget => {
            const spent = transactions
                .filter(t => {
                    if (t.type !== 'expense' || t.category !== budget.category) return false
                    const d = new Date(t.date)
                    return d.getMonth() === budgetMonth.month && d.getFullYear() === budgetMonth.year
                })
                .reduce((sum, t) => sum + t.amount, 0)
            const selisih = budget.amount - spent
            const percentage = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
            const isOver = spent > budget.amount
            return { ...budget, spent, selisih, percentage, isOver }
        })

        const totalBudget = rows.reduce((s, r) => s + r.amount, 0)
        const totalRealisasi = rows.reduce((s, r) => s + r.spent, 0)
        const totalSelisih = totalBudget - totalRealisasi

        return { rows, totalBudget, totalRealisasi, totalSelisih }
    }, [budgets, transactions, budgetMonth])

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">Budget vs Realisasi</h3>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary rounded-lg px-1 py-0.5">
                        <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-card rounded-md transition-colors">
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
                        <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-card rounded-md transition-colors">
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                    <Button size="sm" onClick={onAddBudget}>
                        <Plus className="w-4 h-4 mr-1" /> Budget
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {budgets.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Total Budget</p>
                        <p className="text-base font-bold text-foreground">{formatCurrency(budgetData.totalBudget)}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Realisasi</p>
                        <p className="text-base font-bold text-red-600 dark:text-red-400">{formatCurrency(budgetData.totalRealisasi)}</p>
                    </div>
                    <div className={cn('border rounded-xl p-3', budgetData.totalSelisih >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20')}>
                        <p className="text-xs text-muted-foreground mb-0.5">Selisih</p>
                        <p className={cn('text-base font-bold', budgetData.totalSelisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                            {formatCurrency(budgetData.totalSelisih)}
                        </p>
                    </div>
                </div>
            )}

            {/* Budget Table */}
            {budgets.length > 0 ? (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-secondary/50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kategori</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Budget</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Realisasi</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selisih</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">Progress</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[60px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {budgetData.rows.map((row, i) => (
                                    <motion.tr
                                        key={row.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-secondary/30 transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-2">
                                                <span>{categoryIcons[row.category] || '💰'}</span>
                                                <span className="font-medium text-foreground capitalize">{row.category.replace(/_/g, ' ')}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(row.amount)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(row.spent)}</td>
                                        <td className={cn('px-4 py-3 text-right font-bold', row.selisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                            {formatCurrency(row.selisih)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${row.percentage}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className={cn('h-full rounded-full', row.isOver ? 'bg-red-500' : row.percentage > 80 ? 'bg-yellow-500' : 'bg-emerald-500')}
                                                    />
                                                </div>
                                                <span className={cn('text-xs font-medium min-w-[36px] text-right', row.isOver ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                                                    {row.percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => onEditBudget(row)} className="p-1 hover:bg-secondary rounded transition-colors">
                                                    <Edit2 className="w-3 h-3 text-muted-foreground" />
                                                </button>
                                                <button onClick={() => onDeleteBudget(row.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors">
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-border bg-secondary/30">
                                    <td className="px-4 py-3 font-bold text-foreground">TOTAL</td>
                                    <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(budgetData.totalBudget)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(budgetData.totalRealisasi)}</td>
                                    <td className={cn('px-4 py-3 text-right font-bold', budgetData.totalSelisih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                        {formatCurrency(budgetData.totalSelisih)}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-3">Belum ada budget</p>
                    <Button onClick={onAddBudget}>
                        <Plus className="w-4 h-4 mr-2" /> Tambah Budget
                    </Button>
                </div>
            )}
        </div>
    )
}
