'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, Coffee, Utensils, Car, Heart, ShoppingBag, Check, Loader2 } from 'lucide-react'
import { createTransaction } from '@/lib/actions/finance'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'

interface QuickExpenseDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRESET_CATEGORIES = [
  { label: 'Kopi / Jajan', category: 'food', icon: Coffee, defaultAmount: 25000, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { label: 'Makan', category: 'food', icon: Utensils, defaultAmount: 35000, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  { label: 'Transport / Bensin', category: 'transport', icon: Car, defaultAmount: 20000, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { label: 'Ngedate Berdua', category: 'date', icon: Heart, defaultAmount: 100000, color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
  { label: 'Belanja / Kebutuhan', category: 'shopping', icon: ShoppingBag, defaultAmount: 50000, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
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
      formData.append('description', description || 'Pengeluaran Cepat')
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
        }, 1000)
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
            className="relative w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl z-10 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Zap className="w-5 h-5 fill-current" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Catat Pengeluaran Kilat</h3>
                  <p className="text-xs text-muted-foreground">Isi cepat tanpa ribet dalam 5 detik</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-lg font-bold text-foreground">Tercatat Kilat! 🚀</h4>
                <p className="text-xs text-muted-foreground">Pengeluaran berhasil disimpan ke sistem.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Nominal (Rp)
                  </label>
                  <CurrencyInput
                    value={amount}
                    onChange={(val) => setAmount(val)}
                    placeholder="Contoh: 25.000"
                    className="text-2xl font-bold py-3 text-center"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Pilih Kategori Cepat:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {PRESET_CATEGORIES.map((preset) => {
                      const Icon = preset.icon
                      const isSelected = category === preset.category && description === preset.label
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={cn(
                            'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all text-xs font-medium gap-1',
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary'
                              : 'border-border hover:bg-secondary text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="truncate w-full">{preset.label}</span>
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
                    placeholder="Keterangan (misal: Kopi Kenangan, Bensin Shell)"
                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Pocket Selector: Personal vs Joint */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border">
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">Sumber Dana:</span>
                    <span className="ml-1 text-muted-foreground">
                      {isShared ? '💑 Bersama / Kencan' : '👤 Dompet Pribadi'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShared(!isShared)}
                    className={cn(
                      'text-xs font-semibold px-3 py-1 rounded-lg border transition-all',
                      isShared
                        ? 'bg-pink-500/10 text-pink-600 border-pink-500/30'
                        : 'bg-primary/10 text-primary border-primary/30'
                    )}
                  >
                    {isShared ? 'Ubah ke Pribadi' : 'Jadikan Patungan/Bersama'}
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || amount <= 0}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      Simpan Sekarang
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
