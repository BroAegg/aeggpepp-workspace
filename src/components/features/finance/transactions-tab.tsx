'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Receipt,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

type TransactionTypeFilter = 'all' | 'income' | 'expense'

interface TransactionsTabProps {
  transactions: Transaction[]
  formatCurrency: (amount: number) => string
  onAddTransaction: () => void
  onEditTransaction: (tx: Transaction) => void
  onDeleteTransaction: (id: string) => void
  onOpenReceiptModal: (tx: Transaction) => void
}

export function TransactionsTab({
  transactions,
  formatCurrency,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenReceiptModal,
}: TransactionsTabProps) {
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')
  const [personFilter, setPersonFilter] = useState<string>('all')

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      if (personFilter !== 'all') {
        const txRole = (tx as any).profiles?.role
        if (txRole !== personFilter) return false
      }
      return true
    })
  }, [transactions, typeFilter, personFilter])

  const categoryIcons: Record<string, any> = useMemo(() => {
    const map: Record<string, any> = {}
    TRANSACTION_CATEGORIES.income.forEach((c) => {
      map[c.value] = c.icon
    })
    TRANSACTION_CATEGORIES.expense.forEach((c) => {
      map[c.value] = c.icon
    })
    return map
  }, [])

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(['all', 'income', 'expense'] as TransactionTypeFilter[]).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize',
                  typeFilter === type
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Semua Orang</option>
            <option value="aegg">Aegg</option>
            <option value="peppaa">Peppaa</option>
          </select>
        </div>
        <Button onClick={onAddTransaction} size="sm" className="rounded-xl">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Transaksi
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="divide-y divide-border/60">
          {filteredTransactions.map((transaction, index) => {
            const iconText = categoryIcons[transaction.category] || '🧾'
            return (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                className="flex items-center justify-between p-3 md:p-4 hover:bg-secondary/40 transition-colors group"
              >
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg shrink-0">
                    {iconText}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {transaction.description || transaction.category}
                      </p>
                      {transaction.is_split && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shrink-0">
                          Split
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{transaction.category.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>
                        {new Date(transaction.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      {transaction.sub_title && (
                        <>
                          <span>·</span>
                          <span className="text-primary font-medium flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" />
                            {transaction.sub_title}
                          </span>
                        </>
                      )}
                      {(transaction as any).profiles && (
                        <>
                          <span>·</span>
                          <OwnerBadge role={(transaction as any).profiles.role} compact />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  <p
                    className={cn(
                      'font-bold text-sm md:text-base tabular-nums',
                      transaction.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {transaction.receipt_url ? (
                      <button
                        onClick={() => onOpenReceiptModal(transaction)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-emerald-600 dark:text-emerald-400"
                        title="Lihat Struk"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                      </button>
                    ) : transaction.type === 'expense' ? (
                      <button
                        onClick={() => onOpenReceiptModal(transaction)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        title="Lampirkan Struk"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => onEditTransaction(transaction)}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(transaction.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-500"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-14">
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">Tidak ada transaksi ditemukan</p>
          </div>
        )}
      </div>
    </div>
  )
}
