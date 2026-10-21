'use client'

import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import type { Budget } from '@/types'

interface AddBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  editingBudget: Budget | null
  onSubmit: (formData: FormData) => Promise<void>
  saving: boolean
  formRef?: React.Ref<HTMLFormElement>
}

export function AddBudgetModal({
  isOpen,
  onClose,
  editingBudget,
  onSubmit,
  saving,
  formRef,
}: AddBudgetModalProps) {
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
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {editingBudget ? 'Edit Target Anggaran' : 'Tambah Target Anggaran'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form ref={formRef} action={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Kategori Pengeluaran
            </label>
            <select
              name="category"
              defaultValue={editingBudget?.category || 'food'}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {TRANSACTION_CATEGORIES.expense.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Batas Anggaran
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                Rp
              </span>
              <CurrencyInput
                name="amount"
                required
                defaultValue={editingBudget?.amount || 0}
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Periode
            </label>
            <select
              name="period"
              defaultValue={editingBudget?.period || 'monthly'}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="weekly">Mingguan</option>
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingBudget ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
