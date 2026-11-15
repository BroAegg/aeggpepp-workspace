'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, Loader2, Calendar, Wallet, Check } from 'lucide-react'
import { BankLogo } from '@/lib/bank-registry'
import { updateProfileFinanceSettings } from '@/lib/actions/finance'
import { getBillingCycle } from '@/lib/cycle-utils'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { SavingsAccount, User } from '@/types'

interface FinanceSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userProfile?: User | null
  accounts: SavingsAccount[]
  onSuccess: () => void
}

export function FinanceSettingsModal({
  isOpen,
  onClose,
  userProfile,
  accounts,
  onSuccess,
}: FinanceSettingsModalProps) {
  const [startDay, setStartDay] = useState<number>(25)
  const [defaultAccountId, setDefaultAccountId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setStartDay(userProfile?.billing_cycle_start_day ?? 25)
      setDefaultAccountId(userProfile?.default_account_id ?? '')
      isSubmittingRef.current = false
    }
  }, [isOpen, userProfile])

  if (!isOpen) return null

  // Compute live cycle preview based on selected startDay
  const previewCycle = getBillingCycle(startDay)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaving(true)

    try {
      const res = await updateProfileFinanceSettings({
        billingCycleStartDay: startDay,
        defaultAccountId: defaultAccountId || null,
      })

      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan pengaturan', res.error)
      } else {
        toast.success(
          'Pengaturan Finansial Tersimpan',
          `Siklus gajian dimulai tanggal ${startDay} setiap bulan`
        )
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
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Pengaturan Finansial Profil</h3>
                <p className="text-[11px] text-muted-foreground">Siklus gajian & rekening operasional utama</p>
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
            {/* 1. Tanggal Siklus Gajian */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tanggal Gajian / Awal Siklus Anggaran (1 – 28)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    min={1}
                    max={28}
                    required
                    value={startDay}
                    onChange={(e) => setStartDay(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="flex gap-1">
                  {[1, 25, 27].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setStartDay(day)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        startDay === day
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/60 hover:bg-secondary border-border/60 text-muted-foreground'
                      )}
                    >
                      Tgl {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cycle Live Preview */}
              <div className="mt-2.5 p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Rentang Siklus Aktif:</span>
                  <span className="font-bold text-foreground tabular-nums">{previewCycle.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Sisa Hari Menuju Gajian:</span>
                  <span className="font-bold text-primary tabular-nums">
                    {previewCycle.isTodayPayday ? 'Hari ini Gajian! 🎉' : `${previewCycle.daysRemaining} hari`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Rekening Operasional Default */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Rekening Belanja Utama (Default)
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setDefaultAccountId('')}
                  className={cn(
                    'w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between',
                    defaultAccountId === ''
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/40 font-semibold'
                      : 'border-border/60 hover:bg-secondary/40'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">Otomatis (Pilih Rekening Bebas Pertama)</span>
                  </div>
                  {defaultAccountId === '' && <Check className="w-4 h-4 text-primary" />}
                </button>

                {accounts.map((acc) => {
                  const isSelected = defaultAccountId === acc.id
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setDefaultAccountId(acc.id)}
                      className={cn(
                        'w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40 font-semibold'
                          : 'border-border/60 hover:bg-secondary/40'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BankLogo bankCode={acc.bank_code} className="w-6 h-6 shrink-0" />
                        <span className="text-foreground truncate">{acc.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Rekening ini akan otomatis terisi saat mencatat pengeluaran cepat atau membayar tagihan.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-2 px-3 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Pengaturan</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
