'use client'

import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'

export type PocketCategory = 'bank' | 'ewallet' | 'cash' | 'friend_loan' | 'investment'

export interface PocketOption {
  code: string
  label: string
  icon: string
  category: PocketCategory
  categoryLabel: string
  color: string
}

interface AddSavingsModalProps {
  isOpen: boolean
  onClose: () => void
  savingsCategory: PocketCategory
  setSavingsCategory: (cat: PocketCategory) => void
  savingsBankCode: string
  setSavingsBankCode: (code: string) => void
  savingsIcon: string
  setSavingsIcon: (icon: string) => void
  pocketOptions: PocketOption[]
  onSubmit: (formData: FormData) => Promise<void>
  saving: boolean
}

export function AddSavingsModal({
  isOpen,
  onClose,
  savingsCategory,
  setSavingsCategory,
  savingsBankCode,
  setSavingsBankCode,
  savingsIcon,
  setSavingsIcon,
  pocketOptions,
  onSubmit,
  saving,
}: AddSavingsModalProps) {
  if (!isOpen) return null

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
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Tambah Lokasi Uang / Akun</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Kategori Lokasi Uang
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'bank' as const, label: 'Bank', icon: '🏦' },
                { id: 'ewallet' as const, label: 'E-Wallet', icon: '📱' },
                { id: 'cash' as const, label: 'Tunai', icon: '💵' },
                { id: 'friend_loan' as const, label: 'Di Teman', icon: '🤝' },
                { id: 'investment' as const, label: 'Investasi', icon: '📈' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSavingsCategory(cat.id)
                    const firstOpt = pocketOptions.find((p) => p.category === cat.id)
                    if (firstOpt) {
                      setSavingsBankCode(firstOpt.code)
                      setSavingsIcon(firstOpt.icon)
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all gap-1',
                    savingsCategory === cat.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border/70 hover:bg-secondary/50 text-muted-foreground'
                  )}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-[11px] truncate w-full text-center">{cat.label}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="type" value={savingsCategory} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Platform / Layanan
            </label>
            <select
              name="bank_code"
              value={savingsBankCode}
              onChange={(e) => {
                setSavingsBankCode(e.target.value)
                const opt = pocketOptions.find((p) => p.code === e.target.value)
                if (opt) setSavingsIcon(opt.icon)
              }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {pocketOptions
                .filter((b) => b.category === savingsCategory)
                .map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.icon} {b.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {savingsCategory === 'friend_loan' ? 'Nama Peminjam & Keterangan' : 'Nama Akun / Lokasi'}
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder={
                savingsCategory === 'friend_loan'
                  ? 'e.g. Dipinjam Budi (Talangan Liburan)'
                  : savingsCategory === 'bank'
                  ? 'e.g. SeaBank Tabungan Bersama'
                  : savingsCategory === 'ewallet'
                  ? 'e.g. DANA Belanja Harian'
                  : 'e.g. Kas Dompet Harian'
              }
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {savingsCategory === 'friend_loan' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                💡 Uang ini akan dicatat sebagai piutang aktif yang belum kembali ke kantong kalian.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {savingsCategory === 'friend_loan' ? 'Jumlah Uang yang Dipinjam' : 'Saldo Awal'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                Rp
              </span>
              <CurrencyInput
                name="balance"
                placeholder="0"
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Icon (Emoji)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                name="icon"
                value={savingsIcon}
                onChange={(e) => setSavingsIcon(e.target.value)}
                className="w-16 text-center text-lg px-2 py-1.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="text-[11px] text-muted-foreground">Otomatis dipilih dari platform, bisa Anda ubah</span>
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Lokasi Uang'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
