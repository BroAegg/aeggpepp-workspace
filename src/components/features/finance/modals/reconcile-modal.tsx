'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, Loader2, ArrowUpRight, ArrowDownRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { BankLogo } from '@/lib/bank-registry'
import { reconcileAccountBalance } from '@/lib/actions/finance'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { SavingsAccount } from '@/types'

interface ReconcileModalProps {
  isOpen: boolean
  onClose: () => void
  account: SavingsAccount | null
  onSuccess: () => void
}

export function ReconcileModal({ isOpen, onClose, account, onSuccess }: ReconcileModalProps) {
  const [actualBalance, setActualBalance] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const isSubmittingRef = useRef(false)

  const currentBalance = Number(account?.balance) || 0
  const delta = actualBalance - currentBalance

  useEffect(() => {
    if (isOpen && account) {
      setActualBalance(Number(account.balance) || 0)
      setReason('')
      isSubmittingRef.current = false
    }
  }, [isOpen, account])

  if (!isOpen || !account) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaving(true)

    try {
      const res = await reconcileAccountBalance(account.id, actualBalance, reason)
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyesuaikan saldo', res.error)
      } else {
        if (delta === 0) {
          toast.info('Saldo rekening sudah sesuai', 'Tidak ada perubahan saldo')
        } else {
          toast.success(
            'Saldo berhasil disesuaikan',
            `Koreksi ${delta > 0 ? '+' : ''}${formatCurrency(delta)} tercatat`
          )
        }
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan', err?.message)
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <div className="flex items-center gap-3">
              <BankLogo bankCode={account.bank_code} className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-primary" />
                  Sesuaikan Saldo Riil
                </h3>
                <p className="text-xs text-muted-foreground truncate">{account.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Saldo Sistem Saat Ini */}
            <div className="p-3 bg-secondary/40 rounded-xl border border-border/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Saldo di Sistem
                </span>
                <span className="text-base font-bold text-foreground tabular-nums">
                  {formatCurrency(currentBalance)}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium bg-background/80 px-2 py-1 rounded-md border border-border/60">
                Data Aplikasi
              </span>
            </div>

            {/* Input Saldo Riil M-Banking */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Saldo Akhir di M-Banking / Dompet *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  Rp
                </span>
                <CurrencyInput
                  name="actual_balance"
                  required
                  value={actualBalance}
                  onChange={(val) => setActualBalance(val)}
                  placeholder="0"
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-base font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Ketik angka saldo bersih yang tertera di aplikasi bank saat ini.
              </p>
            </div>

            {/* Preview Selisih Live */}
            <div
              className={cn(
                'p-3.5 rounded-xl border transition-all flex items-center justify-between',
                delta === 0
                  ? 'bg-secondary/30 border-border/70 text-muted-foreground'
                  : delta > 0
                  ? 'bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/[0.08] border-amber-500/30 text-amber-700 dark:text-amber-400'
              )}
            >
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider block">
                  {delta === 0
                    ? 'Status Saldo'
                    : delta > 0
                    ? 'Koreksi Positif (Bunga / Top-up)'
                    : 'Koreksi Negatif (Biaya / Selisih)'}
                </span>
                <span className="text-sm font-black tabular-nums mt-0.5 block">
                  {delta === 0
                    ? 'Sudah sama persis (Rp 0)'
                    : `${delta > 0 ? '+' : ''}${formatCurrency(delta)}`}
                </span>
              </div>
              <div className="shrink-0">
                {delta === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : delta > 0 ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-amber-500" />
                )}
              </div>
            </div>

            {/* Catatan / Alasan Koreksi */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Keterangan Koreksi (Opsional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  delta > 0
                    ? 'Contoh: Bunga harian SeaBank, cashback...'
                    : 'Contoh: Biaya admin bulanan, selisih tunai...'
                }
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Tombol Simpan */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/70">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="rounded-xl text-xs font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Menyimpan...
                  </>
                ) : (
                  'Simpan Penyesuaian'
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
