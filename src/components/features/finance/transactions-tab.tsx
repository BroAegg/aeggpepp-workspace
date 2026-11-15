'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Zap,
  ChevronDown,
  Wallet,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { toast } from '@/components/ui/toast'
import { BankLogo } from '@/lib/bank-registry'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { exportTransactionsToCsv } from '@/lib/export-utils'
import { quickUpdateTransaction } from '@/lib/actions/finance'
import { cn } from '@/lib/utils'
import type { Transaction, SavingsAccount } from '@/types'

type TransactionTypeFilter = 'all' | 'income' | 'expense' | 'transfer' | 'adjustment'

interface TransactionsTabProps {
  transactions: Transaction[]
  accounts?: SavingsAccount[]
  formatCurrency: (amount: number) => string
  onAddTransaction: () => void
  onEditTransaction: (tx: Transaction) => void
  onDeleteTransaction: (id: string) => void
  onOpenReceiptModal: (tx: Transaction) => void
  onRefresh?: () => void
}

export function TransactionsTab({
  transactions,
  accounts = [],
  formatCurrency,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenReceiptModal,
  onRefresh,
}: TransactionsTabProps) {
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [quickEditTx, setQuickEditTx] = useState<{ id: string; type: 'category' | 'account' } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

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

  const handleQuickUpdateCategory = async (txId: string, newCategory: string) => {
    setIsUpdating(true)
    try {
      const res = await quickUpdateTransaction(txId, { category: newCategory })
      if (res && 'error' in res && res.error) {
        toast.error('Gagal memperbarui kategori', res.error)
      } else {
        toast.success('Kategori berhasil diperbarui')
        setQuickEditTx(null)
        onRefresh?.()
      }
    } catch (err: any) {
      toast.error('Error saat update kategori', err?.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleQuickUpdateAccount = async (txId: string, newAccountId: string | null) => {
    setIsUpdating(true)
    try {
      const res = await quickUpdateTransaction(txId, { account_id: newAccountId })
      if (res && 'error' in res && res.error) {
        toast.error('Gagal memindahkan rekening', res.error)
      } else {
        toast.success('Rekening diperbarui & saldo disinkronkan')
        setQuickEditTx(null)
        onRefresh?.()
      }
    } catch (err: any) {
      toast.error('Error saat update rekening', err?.message)
    } finally {
      setIsUpdating(false)
    }
  }

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
              const isAdjustmentPos =
                isAdjustment &&
                (transaction.sub_title?.includes('(+)') || transaction.description?.includes('(+)'))
              const iconText =
                isTransfer || isAdjustment
                  ? null
                  : categoryIcons[transaction.category] || '🧾'

              const relevantCategories =
                transaction.type === 'income'
                  ? TRANSACTION_CATEGORIES.income
                  : TRANSACTION_CATEGORIES.expense

              const isQuickEditing = quickEditTx?.id === transaction.id

              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.2) }}
                  className="flex flex-col"
                >
                  <div className="flex items-center justify-between p-3 md:p-4 hover:bg-secondary/40 transition-colors group">
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
                          {/* Source Badge (WA vs Web) */}
                          {transaction.source === 'whatsapp' ? (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider inline-flex items-center"
                              title="Dicatat otomatis lewat WhatsApp Nanang"
                            >
                              WA
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/50 uppercase tracking-wider"
                              title="Dicatat lewat Web Dashboard"
                            >
                              Web
                            </span>
                          )}

                          <span>·</span>

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
                              {/* 1-Tap Category Quick-Edit Trigger */}
                              <button
                                type="button"
                                onClick={() =>
                                  setQuickEditTx(
                                    isQuickEditing && quickEditTx?.type === 'category'
                                      ? null
                                      : { id: transaction.id, type: 'category' }
                                  )
                                }
                                className="capitalize hover:text-foreground hover:bg-secondary px-1 py-0.5 rounded transition-colors flex items-center gap-0.5 font-medium text-foreground/90 cursor-pointer"
                                title="Klik untuk ubah kategori cepat"
                              >
                                <span>{transaction.category.replace(/_/g, ' ')}</span>
                                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                              </button>

                              {/* 1-Tap Account Quick-Edit Trigger */}
                              <span>·</span>
                              {transaction.account ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuickEditTx(
                                      isQuickEditing && quickEditTx?.type === 'account'
                                        ? null
                                        : { id: transaction.id, type: 'account' }
                                    )
                                  }
                                  className="font-medium text-foreground/80 hover:text-foreground hover:bg-secondary px-1 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Klik untuk ubah rekening sumber cepat"
                                >
                                  <BankLogo bankCode={transaction.account.bank_code} className="w-3.5 h-3.5 inline-block" />
                                  <span>{transaction.account.name}</span>
                                  <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuickEditTx(
                                      isQuickEditing && quickEditTx?.type === 'account'
                                        ? null
                                        : { id: transaction.id, type: 'account' }
                                    )
                                  }
                                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 cursor-pointer font-medium"
                                  title="Pilih rekening sumber untuk sinkronisasi saldo"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>+ Rekening</span>
                                </button>
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
                          ? isAdjustmentPos
                            ? '+ '
                            : '- '
                          : transaction.type === 'income'
                          ? '+ '
                          : '- '}
                        {formatCurrency(transaction.amount)}
                      </p>

                      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {/* 1-Tap Quick-Edit Popover Button */}
                        {!isTransfer && !isAdjustment && (
                          <button
                            onClick={() =>
                              setQuickEditTx(
                                isQuickEditing ? null : { id: transaction.id, type: 'category' }
                              )
                            }
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              isQuickEditing
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                            )}
                            title="Ubah Cepat Kategori & Rekening"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )}

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
                          title="Edit Lengkap Transaksi"
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
                  </div>

                  {/* Inline 1-Tap Quick-Edit Drawer/Panel */}
                  <AnimatePresence>
                    {isQuickEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="bg-secondary/40 border-t border-border/60 p-3 md:p-4 space-y-3 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-card rounded-lg p-0.5 border border-border">
                            <button
                              type="button"
                              onClick={() => setQuickEditTx({ id: transaction.id, type: 'category' })}
                              className={cn(
                                'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                                quickEditTx?.type === 'category'
                                  ? 'bg-primary text-primary-foreground shadow-2xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              Ganti Kategori
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickEditTx({ id: transaction.id, type: 'account' })}
                              className={cn(
                                'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
                                quickEditTx?.type === 'account'
                                  ? 'bg-primary text-primary-foreground shadow-2xs'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              Ganti Rekening Sumber
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setQuickEditTx(null)}
                            className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
                            title="Tutup"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {quickEditTx?.type === 'category' ? (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Pilih Kategori Baru (1-Tap):
                            </p>
                            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-0.5">
                              {relevantCategories.map((cat) => {
                                const isSelected = transaction.category === cat.value
                                return (
                                  <button
                                    key={cat.value}
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleQuickUpdateCategory(transaction.id, cat.value)}
                                    className={cn(
                                      'px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer',
                                      isSelected
                                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                                        : 'bg-card border-border hover:border-foreground/30 text-foreground'
                                    )}
                                  >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    {isSelected && <Check className="w-3 h-3 ml-1" />}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-medium text-muted-foreground">
                              Pilih Rekening Sumber (Saldo akan disinkronkan otomatis tanpa drift):
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-0.5">
                              {accounts.map((acc) => {
                                const isSelected = transaction.account_id === acc.id
                                return (
                                  <button
                                    key={acc.id}
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleQuickUpdateAccount(transaction.id, acc.id)}
                                    className={cn(
                                      'p-2.5 rounded-xl text-xs text-left border transition-all flex items-center justify-between gap-2 cursor-pointer',
                                      isSelected
                                        ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-2xs ring-1 ring-primary/30'
                                        : 'bg-card border-border hover:border-foreground/30 text-foreground'
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <BankLogo bankCode={acc.bank_code} className="w-4 h-4 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-xs truncate">{acc.name}</p>
                                        <p className="text-[10px] text-muted-foreground tabular-nums">
                                          {formatCurrency(acc.balance)}
                                        </p>
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                  </button>
                                )
                              })}

                              {transaction.account_id && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleQuickUpdateAccount(transaction.id, null)}
                                  className="p-2.5 rounded-xl text-xs text-left border border-dashed border-red-500/30 hover:border-red-500 bg-red-500/5 text-red-600 dark:text-red-400 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Lepas Kantong (Tanpa Rekening)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
