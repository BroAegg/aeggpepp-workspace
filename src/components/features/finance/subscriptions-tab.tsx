'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Check,
  AlertCircle,
  Trash2,
  Loader2,
  X,
  CreditCard,
  Wifi,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getSubscriptions,
  createSubscription,
  deleteSubscription,
  paySubscriptionNow,
} from '@/lib/actions/subscriptions'
import { toast } from '@/components/ui/toast'
import type { Subscription } from '@/types'

const PRESET_ICONS = [
  { label: 'WiFi / Internet', icon: '🌐' },
  { label: 'Listrik / PLN', icon: '⚡' },
  { label: 'Streaming Video', icon: '📺' },
  { label: 'Musik / Spotify', icon: '🎵' },
  { label: 'Kesehatan / BPJS', icon: '🏥' },
  { label: 'Cicilan / Sewa', icon: '🏠' },
]

export function SubscriptionsTab({
  formatCurrency,
  onRefreshFinance,
}: {
  formatCurrency: (amount: number) => string
  onRefreshFinance?: () => void
}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adding, setAdding] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('5')
  const [category, setCategory] = useState('bills')
  const [selectedIcon, setSelectedIcon] = useState('⚡')

  const fetchSubs = async () => {
    try {
      setLoading(true)
      const data = await getSubscriptions()
      setSubscriptions(data)
    } catch (err) {
      console.error('Error fetching subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubs()
  }, [])

  const now = new Date()
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const isPaidThisMonth = (lastPaidAt: string | null) => {
    if (!lastPaidAt) return false
    return lastPaidAt.startsWith(currentMonthYear)
  }

  const handlePay = async (sub: Subscription) => {
    setPayingId(sub.id)
    try {
      const res = await paySubscriptionNow(sub)
      if (res && 'error' in res && res.error) {
        toast.error('Gagal mencatat pembayaran tagihan', res.error)
      } else {
        toast.success(
          `Tagihan ${sub.name} Berhasil Dibayar! ✨`,
          `Pengeluaran ${formatCurrency(sub.amount)} otomatis tercatat di mutasi transaksi.`
        )
        await fetchSubs()
        if (onRefreshFinance) onRefreshFinance()
      }
    } catch (err: any) {
      toast.error('Gagal membayar tagihan', err?.message)
    } finally {
      setPayingId(null)
    }
  }

  const handleDelete = async (id: string, subName: string) => {
    if (!confirm(`Hapus langganan ${subName}?`)) return
    try {
      await deleteSubscription(id)
      setSubscriptions((prev) => prev.filter((s) => s.id !== id))
      toast.success('Langganan dihapus')
    } catch {
      toast.error('Gagal menghapus langganan')
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !amount) return

    setAdding(true)
    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('amount', amount)
      formData.set('due_day', dueDay)
      formData.set('category', category)
      formData.set('icon', selectedIcon)

      const res = await createSubscription(formData)
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menambah langganan', res.error)
      } else {
        toast.success('Langganan rutin berhasil ditambahkan!')
        setShowAddModal(false)
        setName('')
        setAmount('')
        await fetchSubs()
      }
    } catch (err: any) {
      toast.error('Gagal menambah langganan', err?.message)
    } finally {
      setAdding(false)
    }
  }

  const totalMonthlyCommitment = subscriptions.reduce((sum, s) => sum + s.amount, 0)
  const totalPaidThisMonth = subscriptions
    .filter((s) => isPaidThisMonth(s.last_paid_at))
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header & Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Total Komitmen Tagihan</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {formatCurrency(totalMonthlyCommitment)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{subscriptions.length} layanan aktif</p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs">
          <p className="text-xs text-muted-foreground font-medium">Sudah Dibayar Bulan Ini</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaidThisMonth)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {subscriptions.filter((s) => isPaidThisMonth(s.last_paid_at)).length} dari{' '}
            {subscriptions.length} lunas
          </p>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border/80 shadow-xs flex flex-col justify-between">
          <p className="text-xs text-muted-foreground font-medium">Sisa Tagihan Tertunda</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(Math.max(0, totalMonthlyCommitment - totalPaidThisMonth))}
          </p>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="w-full mt-3 text-xs bg-primary text-primary-foreground font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Tagihan Baru
          </Button>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-card rounded-2xl border border-border/80 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Daftar Tagihan & Langganan Rutin</h3>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-xs">Memuat tagihan...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Belum ada tagihan rutin tercatat</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Catat WiFi, Netflix, Spotify, Token Listrik, atau BPJS kalian agar tidak pernah telat bayar.
            </p>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="text-xs bg-primary text-primary-foreground"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Tagihan Sekarang
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {subscriptions.map((sub) => {
              const paid = isPaidThisMonth(sub.last_paid_at)
              const isPaying = payingId === sub.id

              return (
                <div
                  key={sub.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                      {sub.icon || '⚡'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{sub.name}</p>
                        {paid ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Lunas Bulan Ini
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Jatuh Tempo Tgl {sub.due_day}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(sub.amount)} · Siklus Bulanan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                    {!paid && (
                      <Button
                        size="sm"
                        disabled={isPaying}
                        onClick={() => handlePay(sub)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        {isPaying ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Mencatat...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5" /> Catat Bayar Bulan Ini
                          </>
                        )}
                      </Button>
                    )}

                    <button
                      onClick={() => handleDelete(sub.id, sub.name)}
                      className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Hapus langganan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-foreground">Tambah Tagihan / Langganan Rutin</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Nama Layanan / Tagihan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WiFi MyRepublic, Netflix, Listrik PLN"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Nominal Tagihan per Bulan (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 350000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Tanggal Jatuh Tempo
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Ikon
                    </label>
                    <select
                      value={selectedIcon}
                      onChange={(e) => setSelectedIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {PRESET_ICONS.map((p) => (
                        <option key={p.label} value={p.icon}>
                          {p.icon} {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setShowAddModal(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 text-xs" disabled={adding}>
                    {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Tagihan'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
