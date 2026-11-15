'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Settings,
  Calendar,
  Wallet,
  Lock,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { BankLogo } from '@/lib/bank-registry'
import { getAccountMutations } from '@/lib/actions/finance'
import { cn } from '@/lib/utils'
import type { SavingsAccount, AccountMutationItem } from '@/types'

interface AccountLedgerDrawerProps {
  isOpen: boolean
  onClose: () => void
  account: SavingsAccount | null
}

export function AccountLedgerDrawer({ isOpen, onClose, account }: AccountLedgerDrawerProps) {
  const [mutations, setMutations] = useState<AccountMutationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'in' | 'out' | 'transfer'>('all')

  const fetchMutations = async () => {
    if (!account) return
    setLoading(true)
    setError(null)
    try {
      const data = await getAccountMutations(account.id)
      setMutations(data)
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat riwayat mutasi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && account) {
      fetchMutations()
    } else {
      setMutations([])
      setError(null)
      setFilter('all')
    }
  }, [isOpen, account?.id])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const formatDateTime = (dateStr: string, createdAtStr?: string) => {
    try {
      const d = new Date(createdAtStr || dateStr)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: createdAtStr ? '2-digit' : undefined,
        minute: createdAtStr ? '2-digit' : undefined,
      })
    } catch {
      return dateStr
    }
  }

  const filteredMutations = useMemo(() => {
    if (filter === 'all') return mutations
    if (filter === 'in') {
      return mutations.filter((m) => m.type === 'credit' || m.type === 'transfer_in')
    }
    if (filter === 'out') {
      return mutations.filter((m) => m.type === 'debit' || m.type === 'transfer_out')
    }
    if (filter === 'transfer') {
      return mutations.filter((m) => m.type === 'transfer_in' || m.type === 'transfer_out')
    }
    return mutations
  }, [mutations, filter])

  if (!isOpen || !account) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-xs">
        {/* Backdrop click */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Slide-over panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg bg-card h-full shadow-2xl border-l border-border/80 flex flex-col z-10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-border/70 bg-card space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <BankLogo bankCode={account.bank_code} className="w-10 h-10 shrink-0 shadow-2xs" />
                <div>
                  <h3 className="text-base font-bold text-foreground leading-tight">
                    {account.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {account.is_locked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <Lock className="w-3 h-3" />
                        Dana Terkunci
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <Wallet className="w-3 h-3" />
                        Dana Operasional
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Display */}
            <div className="p-3.5 bg-secondary/30 rounded-xl border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Saldo Saat Ini
                </span>
                <span className="text-xl font-bold text-foreground tabular-nums">
                  {formatCurrency(Number(account.balance) || 0)}
                </span>
              </div>
              <button
                onClick={fetchMutations}
                disabled={loading}
                title="Segarkan Mutasi"
                className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin text-primary')} />
              </button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { id: 'all' as const, label: 'Semua' },
                { id: 'in' as const, label: 'Masuk (+)' },
                { id: 'out' as const, label: 'Keluar (-)' },
                { id: 'transfer' as const, label: 'Transfer (⇄)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border',
                    filter === f.id
                      ? 'bg-primary text-primary-foreground border-primary font-semibold'
                      : 'bg-background hover:bg-secondary text-muted-foreground border-border/70'
                  )}
                >
                  {f.label}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-muted-foreground font-medium">
                {filteredMutations.length} entri
              </span>
            </div>
          </div>

          {/* Mutation List Body */}
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-border/40 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Memuat mutasi rekening...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-xs text-rose-500 space-y-2">
                <p>{error}</p>
                <button
                  onClick={fetchMutations}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-foreground font-medium text-xs"
                >
                  Coba Lagi
                </button>
              </div>
            ) : filteredMutations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">Belum ada mutasi</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Transaksi masuk, keluar, atau transfer yang menggunakan rekening ini akan muncul otomatis di sini.
                </p>
              </div>
            ) : (
              filteredMutations.map((m) => {
                const isCredit = m.type === 'credit'
                const isDebit = m.type === 'debit'
                const isTransferIn = m.type === 'transfer_in'
                const isTransferOut = m.type === 'transfer_out'
                const isAdjustment = m.type === 'adjustment'

                return (
                  <div key={m.id} className="py-3 flex items-start justify-between gap-3 group">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border',
                          isCredit && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                          isDebit && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                          (isTransferIn || isTransferOut) &&
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                          isAdjustment && 'bg-secondary text-muted-foreground border-border/70'
                        )}
                      >
                        {isCredit && <ArrowDownRight className="w-4 h-4" />}
                        {isDebit && <ArrowUpRight className="w-4 h-4" />}
                        {(isTransferIn || isTransferOut) && <ArrowLeftRight className="w-4 h-4" />}
                        {isAdjustment && <Settings className="w-4 h-4" />}
                      </div>

                      {/* Description & metadata */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {m.description || 'Transaksi'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(m.date, m.created_at)}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground">
                            {m.category}
                          </span>
                          {m.counterpart_account && (
                            <>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 truncate max-w-[140px]">
                                {isTransferOut
                                  ? `ke ${m.counterpart_account.name}`
                                  : `dari ${m.counterpart_account.name}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          'text-xs font-bold tabular-nums block',
                          (isCredit || isTransferIn) && 'text-emerald-600 dark:text-emerald-400',
                          (isDebit || isTransferOut) && 'text-rose-600 dark:text-rose-400',
                          isAdjustment && 'text-muted-foreground'
                        )}
                      >
                        {isCredit || isTransferIn ? '+' : isDebit || isTransferOut ? '-' : ''}
                        {formatCurrency(m.amount)}
                      </span>
                      {isAdjustment && (
                        <span className="text-[9px] text-muted-foreground block uppercase font-medium">
                          Penyesuaian
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
