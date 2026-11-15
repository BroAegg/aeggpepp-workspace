'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2, ShieldCheck, Lock, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { BANK_PRESETS, BankLogo, type BankCategory, type BankPreset } from '@/lib/bank-registry'
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
  onSubmit: (formData: FormData) => Promise<void>
  saving: boolean
  defaultCategory?: BankCategory
}

export function AddSavingsModal({
  isOpen,
  onClose,
  onSubmit,
  saving,
  defaultCategory = 'digital_bank',
}: AddSavingsModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<BankCategory>(defaultCategory)
  const [selectedBank, setSelectedBank] = useState<BankPreset>(() => {
    return BANK_PRESETS.find((b) => b.category === defaultCategory) || BANK_PRESETS[0]
  })
  const [accountName, setAccountName] = useState(selectedBank.name)
  const [isLocked, setIsLocked] = useState(false)
  const [selectedScope, setSelectedScope] = useState<'aegg' | 'peppaa' | 'joint'>('aegg')

  if (!isOpen) return null

  const handleSelectBank = (preset: BankPreset) => {
    const prevBankName = selectedBank.name
    setSelectedBank(preset)
    if (accountName.startsWith(prevBankName)) {
      const suffix = accountName.slice(prevBankName.length)
      setAccountName(`${preset.name}${suffix}`)
    } else if (!accountName || accountName === prevBankName) {
      setAccountName(preset.name)
    }
  }

  const categoryPresets = BANK_PRESETS.filter((p) => p.category === selectedCategory)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-border/80 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">Tambah Kantong / Lokasi Uang</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pilih rekening bank, dompet digital, atau kantong kas untuk manajemen likuiditas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="bank_code" value={selectedBank.code} />
          <input type="hidden" name="icon" value={selectedBank.shortName} />
          <input
            type="hidden"
            name="type"
            value={
              selectedCategory === 'ewallet'
                ? 'ewallet'
                : selectedCategory === 'cash'
                ? 'cash'
                : selectedBank.code === 'friend_loan'
                ? 'friend_loan'
                : 'bank'
            }
          />
          <input type="hidden" name="is_locked" value={isLocked ? 'true' : 'false'} />

          {/* 1. Kategori Platform */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Kategori Layanan
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'digital_bank' as const, label: 'Digital' },
                { id: 'conventional_bank' as const, label: 'Bank' },
                { id: 'ewallet' as const, label: 'E-Wallet' },
                { id: 'cash' as const, label: 'Kas / Lain' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id)
                    const firstMatch = BANK_PRESETS.find((p) => p.category === cat.id)
                    if (firstMatch) handleSelectBank(firstMatch)
                  }}
                  className={cn(
                    'py-2 px-2 rounded-xl border text-xs font-semibold transition-all text-center',
                    selectedCategory === cat.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-border/70 hover:bg-secondary/60 text-muted-foreground'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Grid Logo Bank / E-Wallet Siap Pilih */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Pilih Platform (Logo Resmi)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-xl bg-secondary/20">
              {categoryPresets.map((preset) => {
                const isSelected = selectedBank.code === preset.code
                return (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleSelectBank(preset)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/40 font-bold'
                        : 'border-border/60 bg-card hover:bg-secondary/50 text-foreground'
                    )}
                  >
                    <BankLogo bankCode={preset.code} className="w-6 h-6 shrink-0" />
                    <span className="text-[11px] truncate font-medium">{preset.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Label Akun / Nama Kantong */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nama Rekening / Label Kantong
            </label>
            <input
              type="text"
              name="name"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. SeaBank - Operasional Harian"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-muted-foreground font-medium">Template Cepat:</span>
              {[
                { label: 'Operasional', locked: false },
                { label: 'Tabungan Nikah', locked: true },
                { label: 'Dana Darurat', locked: true },
                { label: 'Tabungan Impian', locked: true },
              ].map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    setAccountName(`${selectedBank.name} - ${tpl.label}`)
                    setIsLocked(tpl.locked)
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground font-medium border border-border/60 transition-colors"
                >
                  + {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <input type="hidden" name="scope" value={selectedScope} />
          <input type="hidden" name="is_locked" value={isLocked ? 'true' : 'false'} />

          {/* 4. Kepemilikan & Ruang (Multi-POV) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Kepemilikan / Ruang
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-secondary/70 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setSelectedScope('aegg')}
                className={cn(
                  'py-1.5 text-xs font-bold rounded-lg transition-all',
                  selectedScope === 'aegg'
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Aegg
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('peppaa')}
                className={cn(
                  'py-1.5 text-xs font-bold rounded-lg transition-all',
                  selectedScope === 'peppaa'
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Peppaa
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('joint')}
                className={cn(
                  'py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1',
                  selectedScope === 'joint'
                    ? 'bg-card text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>💍</span> Kas Bersama
              </button>
            </div>
          </div>

          {/* 5. Alokasi Status: Bebas vs Terkunci (Anti-Slop Design) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Alokasi Likuiditas
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsLocked(false)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
                  !isLocked
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'border-border/70 hover:bg-secondary/40 text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-foreground">Dana Bebas</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Operasional harian, belanja, makan, dan tagihan rutin.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLocked(true)
                  setSelectedScope('joint')
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1',
                  isLocked
                    ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/40'
                    : 'border-border/70 hover:bg-secondary/40 text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-foreground">Dana Terkunci</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Tabungan Nikah, DP Vendor, atau Dana Darurat bersama.
                </p>
              </button>
            </div>
          </div>

          {/* 5. Saldo Awal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Saldo Awal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                Rp
              </span>
              <CurrencyInput
                name="balance"
                placeholder="0"
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Kantong'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
