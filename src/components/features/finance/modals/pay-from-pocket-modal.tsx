'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Lock,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { BankLogo } from '@/lib/bank-registry'
import { paySubscriptionNow } from '@/lib/actions/subscriptions'
import { payWeddingMilestone } from '@/lib/actions/wedding'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { SavingsAccount, Subscription } from '@/types'

export type PayTarget =
  | {
      type: 'subscription'
      subscription: Subscription
      title: string
      amount: number
      dueDateStr?: string
    }
  | {
      type: 'wedding_milestone'
      itemId: string
      itemName: string
      milestone: 'dp' | 'termin2' | 'pelunasan'
      milestoneLabel: string
      amount: number
      dueDateStr?: string
    }

interface PayFromPocketModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: SavingsAccount[]
  defaultAccountId?: string | null
  target: PayTarget | null
  onSuccess: () => void
}

export function PayFromPocketModal({
  isOpen,
  onClose,
  accounts,
  defaultAccountId,
  target,
  onSuccess,
}: PayFromPocketModalProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const isSubmittingRef = useRef(false)

  // Auto-select smart pocket based on target type
  useEffect(() => {
    if (!isOpen || !target || accounts.length === 0) return

    isSubmittingRef.current = false
    setSaving(false)

    if (target.type === 'wedding_milestone') {
      // Prioritize locked/wedding pocket
      const weddingAcc = accounts.find(
        (a) => a.is_locked || a.name.toLowerCase().includes('nikah') || a.name.toLowerCase().includes('wedding')
      )
      if (weddingAcc) {
        setSelectedAccountId(weddingAcc.id)
        return
      }
    }

    // Default to user's configured default_account_id or first operational account
    if (defaultAccountId && accounts.some((a) => a.id === defaultAccountId)) {
      setSelectedAccountId(defaultAccountId)
      return
    }

    const opAcc = accounts.find((a) => !a.is_locked)
    setSelectedAccountId(opAcc?.id || accounts[0].id)
  }, [isOpen, target, accounts, defaultAccountId])

  if (!isOpen || !target) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
  const selectedBalance = Number(selectedAccount?.balance) || 0
  const isInsufficient = selectedBalance < target.amount
  const remainingBalance = selectedBalance - target.amount

  const handlePay = async () => {
    if (isSubmittingRef.current) return
    if (!selectedAccountId) {
      toast.error('Pilih kantong pembayaran', 'Silakan pilih rekening sumber')
      return
    }

    isSubmittingRef.current = true
    setSaving(true)

    try {
      if (target.type === 'subscription') {
        const res = await paySubscriptionNow(target.subscription, selectedAccountId)
        if (res && 'error' in res && res.error) {
          toast.error('Gagal mencatat pembayaran', res.error)
        } else {
          toast.success(
            'Tagihan Berhasil Dibayar',
            `${target.title} sebesar ${formatCurrency(target.amount)} dipotong dari ${selectedAccount?.name}`
          )
          onSuccess()
          onClose()
        }
      } else {
        const res = await payWeddingMilestone({
          itemId: target.itemId,
          milestone: target.milestone,
          amount: target.amount,
          accountId: selectedAccountId,
        })
        if (res && 'error' in res && res.error) {
          toast.error('Gagal mencatat pembayaran termin', res.error)
        } else {
          toast.success(
            'Termin Vendor Berhasil Dibayar',
            `${target.itemName} (${target.milestoneLabel}) sebesar ${formatCurrency(target.amount)} dipotong dari ${selectedAccount?.name}`
          )
          onSuccess()
          onClose()
        }
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
          className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Bayar dari Kantong</h3>
                <p className="text-[11px] text-muted-foreground">Potong saldo & catat pengeluaran instan</p>
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

          {/* Target Bill / Milestone Card */}
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                  target.type === 'wedding_milestone'
                    ? 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20'
                    : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                )}
              >
                {target.type === 'wedding_milestone' ? 'Vendor Wedding' : 'Tagihan Rutin'}
              </span>
              {target.dueDateStr && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Jatuh tempo: {target.dueDateStr}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="min-w-0 pr-2">
                <h4 className="text-sm font-bold text-foreground truncate">
                  {target.type === 'wedding_milestone' ? target.itemName : target.title}
                </h4>
                {target.type === 'wedding_milestone' && (
                  <p className="text-xs text-muted-foreground">{target.milestoneLabel}</p>
                )}
              </div>
              <span className="text-lg font-extrabold text-foreground tabular-nums shrink-0">
                {formatCurrency(target.amount)}
              </span>
            </div>
          </div>

          {/* Pocket Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pilih Sumber Kantong / Rekening
            </label>

            {accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Belum ada rekening/kantong. Tambahkan rekening di tab Lokasi Uang terlebih dahulu.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {accounts.map((acc) => {
                  const isSelected = acc.id === selectedAccountId
                  const accBalance = Number(acc.balance) || 0
                  const hasEnough = accBalance >= target.amount

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={cn(
                        'w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-border/60 hover:bg-secondary/40'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BankLogo bankCode={acc.bank_code} className="w-7 h-7 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{acc.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {acc.is_locked ? (
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Terkunci
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                <Wallet className="w-2.5 h-2.5" /> Bebas
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            'text-xs font-bold tabular-nums block',
                            !hasEnough ? 'text-rose-500' : 'text-foreground'
                          )}
                        >
                          {formatCurrency(accBalance)}
                        </span>
                        {!hasEnough && (
                          <span className="text-[9px] text-rose-500 font-semibold block">
                            Saldo Kurang
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Balance Preview / Alert */}
          {selectedAccount && (
            <div
              className={cn(
                'p-3 rounded-xl border text-xs flex items-start gap-2.5',
                isInsufficient
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              )}
            >
              {isInsufficient ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <span className="font-semibold block">
                  {isInsufficient ? 'Saldo Tidak Mencukupi' : 'Saldo Cukup Untuk Pembayaran'}
                </span>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  {isInsufficient
                    ? `Perlu tambahan ${formatCurrency(Math.abs(remainingBalance))} di rekening ini.`
                    : `Sisa saldo setelah bayar: ${formatCurrency(remainingBalance)}`}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 px-3 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={saving || !selectedAccountId || isInsufficient}
              className={cn(
                'flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm',
                saving || !selectedAccountId || isInsufficient
                  ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border/60'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Konfirmasi & Bayar</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
