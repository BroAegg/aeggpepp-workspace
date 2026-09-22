'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Coffee, Utensils, Car, Heart, ShoppingBag, Check, Loader2 } from 'lucide-react'
import { createTransaction } from '@/lib/actions/finance'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'

interface QuickExpenseDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRESET_CATEGORIES = [
  { label: 'Kopi & Minum', category: 'food', icon: Coffee, defaultAmount: 25000 },
  { label: 'Makan', category: 'food', icon: Utensils, defaultAmount: 35000 },
  { label: 'Transportasi', category: 'transport', icon: Car, defaultAmount: 20000 },
  { label: 'Agenda Bersama', category: 'date', icon: Heart, defaultAmount: 100000 },
  { label: 'Belanja Harian', category: 'shopping', icon: ShoppingBag, defaultAmount: 50000 },
]

export function QuickExpenseDrawer({ isOpen, onClose, onSuccess }: QuickExpenseDrawerProps) {
  const [amount, setAmount] = useState<number>(0)
  const [category, setCategory] = useState<string>('food')
  const [description, setDescription] = useState<string>('')
  const [isShared, setIsShared] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [submitted, setSubmitted] = useState<boolean>(false)

  const handleSelectPreset = (preset: typeof PRESET_CATEGORIES[0]) => {
    setCategory(preset.category)
    if (amount === 0) {
      setAmount(preset.defaultAmount)
    }
    if (!description) {
      setDescription(preset.label)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('type', 'expense')
      formData.append('category', category)
      formData.append('amount', amount.toString())
      formData.append('description', description || 'Pengeluaran')
      formData.append('date', new Date().toISOString().split('T')[0])
      formData.append('is_shared', isShared ? 'true' : 'false')

      const res = await createTransaction(formData)
      if (res && 'error' in res && res.error) {
        alert(res.error)
      } else {
        setSubmitted(true)
        if (onSuccess) onSuccess()
        setTimeout(() => {
          setSubmitted(false)
          setAmount(0)
          setDescription('')
          onClose()
        }, 800)
      }
    } catch (err) {
      console.error('Error quick logging expense:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 shadow-xl z-10 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Catat Pengeluaran</h3>
                <p className="text-xs text-muted-foreground">Input cepat transaksi pengeluaran harian</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Transaksi Berhasil Disimpan</h4>
                <p className="text-xs text-muted-foreground">Data pengeluaran telah masuk ke sistem keuangan.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Nominal Transaksi
                  </label>
                  <CurrencyInput
                    value={amount}
                    onChange={(val) => setAmount(val)}
                    placeholder="Rp 0"
                    className="text-xl font-bold py-2.5 text-center"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Kategori Cepat:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {PRESET_CATEGORIES.map((preset) => {
                      const Icon = preset.icon
                      const isSelected = category === preset.category && description === preset.label
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={cn(
                            'flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all text-xs font-medium gap-1',
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-semibold'
                              : 'border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="truncate w-full text-[11px]">{preset.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Note Description */}
                <div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Keterangan transaksi (opsional)"
                    className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Pocket Selector: Personal vs Joint */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/60 border border-border">
                  <div className="text-xs">
                    <span className="font-medium text-foreground">Alokasi:</span>
                    <span className="ml-1 text-muted-foreground">
                      {isShared ? 'Dana Bersama' : 'Dana Pribadi'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShared(!isShared)}
                    className={cn(
                      'text-xs font-medium px-2.5 py-1 rounded-md border transition-all',
                      isShared
                        ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground'
                    )}
                  >
                    {isShared ? 'Beralih ke Pribadi' : 'Jadikan Dana Bersama'}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || amount <= 0}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Transaksi
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
