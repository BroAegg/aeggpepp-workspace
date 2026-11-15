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
  Download,
  ArrowLeftRight,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { BankLogo } from '@/lib/bank-registry'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { exportTransactionsToCsv } from '@/lib/export-utils'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

type TransactionTypeFilter = 'all' | 'income' | 'expense' | 'transfer' | 'adjustment'

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
            {[
              { id: 'all' as const, label: 'Semua' },
              { id: 'expense' as const, label: 'Pengeluaran' },
              { id: 'income' as const, label: 'Pemasukan' },
              { id: 'transfer' as const, label: 'Transfer' },
              { id: 'adjustment' as const, label: 'Koreksi' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setTypeFilter(type.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  typeFilter === type.id
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {type.label}
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTransactionsToCsv(filteredTransactions)}
            className="rounded-xl text-xs"
            title="Download Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
          </Button>
          <Button onClick={onAddTransaction} size="sm" className="rounded-xl text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Transaksi
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="divide-y divide-border/60">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              Belum ada transaksi di filter ini.
            </div>
          ) : (
            filteredTransactions.map((transaction, index) => {
              const isTransfer = transaction.type === 'transfer'
              const isAdjustment = transaction.type === 'adjustment'
              const isAdjustmentPos = isAdjustment && (transaction.sub_title?.includes('(+)') || transaction.description?.includes('(+)'))
              const iconText = isTransfer || isAdjustment
                ? null
                : categoryIcons[transaction.category] || '🧾'

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.2) }}
                  className="flex items-center justify-between p-3 md:p-4 hover:bg-secondary/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0',
                        isTransfer
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : isAdjustment
                          ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                          : 'bg-secondary'
                      )}
                    >
                      {isTransfer ? (
                        <ArrowLeftRight className="w-4 h-4" />
                      ) : isAdjustment ? (
                        <Settings className="w-4 h-4" />
                      ) : (
                        iconText
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {isTransfer ? (
                            <>
                              Transfer:{' '}
                              <span className="font-bold text-foreground">
                                {transaction.from_account?.name || 'Rekening Asal'}
                              </span>{' '}
                              →{' '}
                              <span className="font-bold text-foreground">
                                {transaction.to_account?.name || 'Rekening Tujuan'}
                              </span>
                            </>
                          ) : isAdjustment ? (
                            transaction.description || 'Penyesuaian Saldo'
                          ) : (
                            transaction.description || transaction.category
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {isTransfer ? (
                          <>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Transfer Internal</span>
                            {transaction.description && (
                              <>
                                <span>·</span>
                                <span>{transaction.description}</span>
                              </>
                            )}
                          </>
                        ) : isAdjustment ? (
                          <>
                            <span className="text-zinc-600 dark:text-zinc-400 font-medium">Penyesuaian Saldo</span>
                            {transaction.account && (
                              <>
                                <span>·</span>
                                <span className="font-medium text-foreground/80 flex items-center gap-1">
                                  <BankLogo bankCode={transaction.account.bank_code} className="w-3.5 h-3.5 inline-block" />
                                  {transaction.account.name}
                                </span>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="capitalize">{transaction.category.replace(/_/g, ' ')}</span>
                            {transaction.account && (
                              <>
                                <span>·</span>
                                <span className="font-medium text-foreground/80 flex items-center gap-1">
                                  <BankLogo bankCode={transaction.account.bank_code} className="w-3.5 h-3.5 inline-block" />
                                  {transaction.account.name}
                                </span>
                              </>
                            )}
                          </>
                        )}
                        <span>·</span>
                        <span className="tabular-nums">
                          {new Date(transaction.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
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
                        isTransfer
                          ? 'text-blue-600 dark:text-blue-400'
                          : isAdjustment
                          ? 'text-zinc-600 dark:text-zinc-400'
                          : transaction.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {isTransfer
                        ? '⇄ '
                        : isAdjustment
                        ? (isAdjustmentPos ? '+ ' : '- ')
                        : transaction.type === 'income'
                        ? '+ '
                        : '- '}
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
                      ) : !isTransfer ? (
                        <button
                          onClick={() => onOpenReceiptModal(transaction)}
                          className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          title="Upload Struk"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => onEditTransaction(transaction)}
                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        title="Edit Transaksi"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(transaction.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-500"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
