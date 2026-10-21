'use client'

import { motion } from 'framer-motion'
import { X, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'
import type { SavingsAccount } from '@/types'

interface SavingsTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSavingsAccount: SavingsAccount | null
  savingsTxType: 'deposit' | 'withdraw'
  setSavingsTxType: (type: 'deposit' | 'withdraw') => void
  onSubmit: (formData: FormData) => Promise<void>
  saving: boolean
  formatCurrency: (amount: number) => string
}

export function SavingsTransactionModal({
  isOpen,
  onClose,
  selectedSavingsAccount,
  savingsTxType,
  setSavingsTxType,
  onSubmit,
  saving,
  formatCurrency,
}: SavingsTransactionModalProps) {
  if (!isOpen || !selectedSavingsAccount) return null

  const isFriendLoan =
    selectedSavingsAccount.bank_code === 'friend_loan' || selectedSavingsAccount.type === 'friend_loan'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {savingsTxType === 'deposit' ? 'Deposit ke' : 'Tarik dari'} {selectedSavingsAccount.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-4">
          <div
            className={cn(
              'rounded-xl p-3.5 mb-2 border flex items-center gap-3',
              isFriendLoan ? 'bg-amber-500/10 border-amber-500/30' : 'bg-secondary/50 border-border'
            )}
          >
            <span className="text-2xl">{selectedSavingsAccount.icon || (isFriendLoan ? '🤝' : '💰')}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground text-sm truncate">{selectedSavingsAccount.name}</p>
                {isFriendLoan && (
                  <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                    Piutang Teman
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFriendLoan ? 'Sisa yang belum lunas:' : 'Saldo saat ini:'}{' '}
                <span className={cn('font-bold', isFriendLoan ? 'text-amber-600 dark:text-amber-400' : 'text-foreground')}>
                  {formatCurrency(selectedSavingsAccount.balance)}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              {isFriendLoan ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSavingsTxType('withdraw')}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                      savingsTxType === 'withdraw'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    ✓ Terima Pelunasan
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsTxType('deposit')}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                      savingsTxType === 'deposit'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    + Tambah Pinjaman
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSavingsTxType('deposit')}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                      savingsTxType === 'deposit'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" /> Deposit (Masuk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsTxType('withdraw')}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                      savingsTxType === 'withdraw'
                        ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw (Keluar)
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {isFriendLoan && savingsTxType === 'withdraw' ? 'Jumlah Pelunasan' : 'Nominal Transaksi'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
              <CurrencyInput
                name="amount"
                required
                placeholder="0"
                defaultValue={isFriendLoan && savingsTxType === 'withdraw' ? selectedSavingsAccount.balance : 0}
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            {isFriendLoan && savingsTxType === 'withdraw' && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Bisa diisi sebagian jika teman melunasi dengan cara dicicil.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Keterangan / Catatan
            </label>
            <input
              type="text"
              name="description"
              placeholder={
                isFriendLoan
                  ? savingsTxType === 'withdraw'
                    ? 'e.g. Ditransfer pelunasan via SeaBank'
                    : 'e.g. Tambahan pinjam lagi'
                  : 'e.g. Nabung bulanan, sisa belanja'
              }
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isFriendLoan ? (
                savingsTxType === 'withdraw'
                  ? 'Terima Pelunasan'
                  : 'Catat Tambahan'
              ) : savingsTxType === 'deposit' ? (
                'Simpan Deposit'
              ) : (
                'Simpan Penarikan'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
