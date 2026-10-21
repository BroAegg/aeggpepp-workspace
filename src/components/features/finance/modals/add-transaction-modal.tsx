'use client'

import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import type { Transaction } from '@/types'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  editingTransaction: Transaction | null
  selectedType: 'income' | 'expense'
  setSelectedType: (type: 'income' | 'expense') => void
  onSubmit: (formData: FormData) => Promise<void>
  saving: boolean
  formRef?: React.Ref<HTMLFormElement>
}

export function AddTransactionModal({
  isOpen,
  onClose,
  editingTransaction,
  selectedType,
  setSelectedType,
  onSubmit,
  saving,
  formRef,
}: AddTransactionModalProps) {
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
          <h2 className="text-lg font-bold text-foreground">
            {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form ref={formRef} action={onSubmit} className="space-y-4" encType="multipart/form-data">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedType('income')}
                className={cn(
                  'px-4 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all flex items-center justify-center gap-2',
                  selectedType === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-border hover:border-emerald-500/50 text-muted-foreground'
                )}
              >
                <TrendingUp className="w-4 h-4" /> Income
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('expense')}
                className={cn(
                  'px-4 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all flex items-center justify-center gap-2',
                  selectedType === 'expense'
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                    : 'border-border hover:border-red-500/50 text-muted-foreground'
                )}
              >
                <TrendingDown className="w-4 h-4" /> Expense
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nominal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                Rp
              </span>
              <CurrencyInput
                name="amount"
                required
                defaultValue={editingTransaction?.amount || 0}
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Keterangan
            </label>
            <input
              type="text"
              name="description"
              required
              placeholder="e.g. Beli makan siang, Kopi susu"
              defaultValue={editingTransaction?.description ?? ''}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Kategori
              </label>
              <select
                name="category"
                defaultValue={editingTransaction?.category || (selectedType === 'income' ? 'salary' : 'food')}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {TRANSACTION_CATEGORIES[selectedType].map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tanggal
              </label>
              <input
                type="date"
                name="date"
                defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Sub Judul / Label Grup
                <span className="text-[10px] text-muted-foreground font-normal lowercase">(opsional)</span>
              </span>
            </label>
            <input
              type="text"
              name="sub_title"
              placeholder="e.g. Belanja Nov 2025, Trip Bali, Bulanan"
              defaultValue={editingTransaction?.sub_title ?? ''}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Foto Struk (Opsional)
            </label>
            <input
              type="file"
              name="receipt_file"
              accept="image/*"
              className="w-full text-xs text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
            />
            {editingTransaction?.receipt_url && (
              <p className="mt-1 text-[11px] text-emerald-500">✓ Struk sudah ada (upload baru untuk mengganti)</p>
            )}
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingTransaction ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
