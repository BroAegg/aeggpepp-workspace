'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gem,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  Check,
  X,
  Users,
  Clock,
  DollarSign,
  Phone,
  Calendar,
  MapPin,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type {
  WeddingBudgetItem,
  WeddingCategory,
  WeddingItemStatus,
  WeddingGuest,
  WeddingGuestGroup,
  WeddingRsvpStatus,
  WeddingRundownItem,
} from '@/types'
import {
  getWeddingBudgetItems,
  createWeddingBudgetItem,
  updateWeddingBudgetItem,
  deleteWeddingBudgetItem,
  getWeddingGuests,
  createWeddingGuest,
  updateWeddingGuest,
  updateWeddingGuestRsvp,
  deleteWeddingGuest,
  getWeddingRundown,
  createWeddingRundownItem,
  updateWeddingRundownItem,
  deleteWeddingRundownItem,
} from '@/lib/actions/wedding'

type WeddingTab = 'budget' | 'guests' | 'rundown'

const TARGET_BUDGET = 25000000 // Rp 25.000.000 Target Intimate Wedding

const CATEGORY_CONFIG: Record<WeddingCategory, { label: string; color: string; badge: string }> = {
  kua: { label: 'KUA & Berkas', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', badge: 'KUA' },
  venue: { label: 'Venue & Tempat', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', badge: 'Venue' },
  catering: { label: 'Katering / Makan', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', badge: 'Katering' },
  attire_mua: { label: 'MUA & Busana', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20', badge: 'MUA/Busana' },
  documentation: { label: 'Dokumentasi', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', badge: 'Dokumentasi' },
  decor: { label: 'Dekorasi Backdrop', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20', badge: 'Dekorasi' },
  invitation_souvenir: { label: 'Undangan & Souvenir', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', badge: 'Undangan' },
  ring: { label: 'Cincin Kawin', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', badge: 'Cincin' },
  other: { label: 'Lainnya / Cadangan', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20', badge: 'Lainnya' },
}

const GUEST_GROUP_CONFIG: Record<WeddingGuestGroup, { label: string; color: string }> = {
  family_aegg: { label: 'Keluarga Aegg', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  family_peppaa: { label: 'Keluarga Peppaa', color: 'bg-pink-500/15 text-pink-500 border-pink-500/30' },
  friends_aegg: { label: 'Teman Aegg', color: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30' },
  friends_peppaa: { label: 'Teman Peppaa', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  vip: { label: 'VIP / Tamu Khusus', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  other: { label: 'Lainnya / Umum', color: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30' },
}

const RSVP_CONFIG: Record<WeddingRsvpStatus, { label: string; color: string; icon: any }> = {
  attending: { label: 'Hadir', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 },
  pending: { label: 'Menunggu', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: Clock },
  declined: { label: 'Berhalangan', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: X },
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatShort = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
  return amount.toString()
}

const cleanPhoneForWa = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  return cleaned
}

export default function WeddingPage() {
  const {
    weddingBudgetItems: cachedBudget,
    weddingGuests: cachedGuests,
    weddingRundown: cachedRundown,
    weddingLoaded,
    setWeddingData,
    toggleGuestRSVPOptimistic,
    removeWeddingBudgetItemOptimistic,
    removeWeddingGuestOptimistic,
    removeWeddingRundownOptimistic,
  } = useWorkspaceStore()

  // Local states
  const [activeTab, setActiveTab] = useState<WeddingTab>('budget')
  const [budgetItems, setBudgetItems] = useState<WeddingBudgetItem[]>(cachedBudget)
  const [guests, setGuests] = useState<WeddingGuest[]>(cachedGuests)
  const [rundown, setRundown] = useState<WeddingRundownItem[]>(cachedRundown)
  const hasCachedData = cachedBudget.length > 0 || cachedGuests.length > 0 || cachedRundown.length > 0
  const [loading, setLoading] = useState(!weddingLoaded && !hasCachedData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters
  const [budgetSearch, setBudgetSearch] = useState('')
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState<string>('all')
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>('all')

  const [guestSearch, setGuestSearch] = useState('')
  const [guestGroupFilter, setGuestGroupFilter] = useState<string>('all')
  const [guestRsvpFilter, setGuestRsvpFilter] = useState<string>('all')

  // Modals
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingBudgetItem, setEditingBudgetItem] = useState<WeddingBudgetItem | null>(null)

  const [showGuestModal, setShowGuestModal] = useState(false)
  const [editingGuest, setEditingGuest] = useState<WeddingGuest | null>(null)

  const [showRundownModal, setShowRundownModal] = useState(false)
  const [editingRundownItem, setEditingRundownItem] = useState<WeddingRundownItem | null>(null)

  // Sync from store when hydrated
  useEffect(() => {
    if (cachedBudget.length > 0) {
      setBudgetItems(cachedBudget)
      setLoading(false)
    }
  }, [cachedBudget])

  useEffect(() => {
    if (cachedGuests.length > 0) {
      setGuests(cachedGuests)
      setLoading(false)
    }
  }, [cachedGuests])

  useEffect(() => {
    if (cachedRundown.length > 0) {
      setRundown(cachedRundown)
      setLoading(false)
    }
  }, [cachedRundown])

  // Fetch data
  const fetchData = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false)
      return
    }

    if (!weddingLoaded && !hasCachedData) setLoading(true)
    try {
      const [budgetRes, guestsRes, rundownRes] = await Promise.all([
        getWeddingBudgetItems(),
        getWeddingGuests(),
        getWeddingRundown(),
      ])

      setBudgetItems(budgetRes)
      setGuests(guestsRes)
      setRundown(rundownRes)

      setWeddingData({
        budgetItems: budgetRes,
        guests: guestsRes,
        rundown: rundownRes,
      })
    } catch (err) {
      console.error('Error fetching wedding data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBudget = async () => {
    try {
      const budgetRes = await getWeddingBudgetItems()
      setBudgetItems(budgetRes)
      setWeddingData({ budgetItems: budgetRes })
    } catch (err) {
      console.error('Error fetching budget:', err)
    }
  }

  const fetchGuests = async () => {
    try {
      const guestsRes = await getWeddingGuests()
      setGuests(guestsRes)
      setWeddingData({ guests: guestsRes })
    } catch (err) {
      console.error('Error fetching guests:', err)
    }
  }

  const fetchRundown = async () => {
    try {
      const rundownRes = await getWeddingRundown()
      setRundown(rundownRes)
      setWeddingData({ rundown: rundownRes })
    } catch (err) {
      console.error('Error fetching rundown:', err)
    }
  }

  useEffect(() => {
    fetchData()

    const handleOnline = () => {
      fetchData()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // ========================================================
  // CALCULATIONS
  // ========================================================

  // Budget Calculations
  const totalEstimated = useMemo(() => {
    return budgetItems.reduce((acc, item) => acc + (item.estimated_cost || 0), 0)
  }, [budgetItems])

  const totalActual = useMemo(() => {
    return budgetItems.reduce((acc, item) => {
      const cost = item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost
      return acc + (cost || 0)
    }, 0)
  }, [budgetItems])

  const totalPaid = useMemo(() => {
    return budgetItems.reduce((acc, item) => acc + (item.paid_amount || 0), 0)
  }, [budgetItems])

  const totalUnpaid = useMemo(() => {
    return Math.max(0, totalActual - totalPaid)
  }, [totalActual, totalPaid])

  const remainingBudget = useMemo(() => {
    return TARGET_BUDGET - totalActual
  }, [totalActual])

  const percentUsed = Math.min(100, Math.round((totalActual / TARGET_BUDGET) * 100))
  const percentPaid = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0

  // Guest Calculations
  const guestStats = useMemo(() => {
    const totalRecords = guests.length
    const totalPax = guests.reduce((sum, g) => sum + (g.pax || 1), 0)
    const confirmedGuests = guests.filter((g) => g.rsvp_status === 'attending')
    const confirmedPax = confirmedGuests.reduce((sum, g) => sum + (g.pax || 1), 0)
    const pendingPax = guests.filter((g) => g.rsvp_status === 'pending').reduce((sum, g) => sum + (g.pax || 1), 0)
    const declinedPax = guests.filter((g) => g.rsvp_status === 'declined').reduce((sum, g) => sum + (g.pax || 1), 0)

    return {
      totalRecords,
      totalPax,
      confirmedPax,
      pendingPax,
      declinedPax,
    }
  }, [guests])

  // ========================================================
  // FILTERED LISTS
  // ========================================================

  const filteredBudgetItems = useMemo(() => {
    return budgetItems.filter((item) => {
      const matchSearch = item.title.toLowerCase().includes(budgetSearch.toLowerCase()) ||
        (item.vendor_name && item.vendor_name.toLowerCase().includes(budgetSearch.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(budgetSearch.toLowerCase()))

      const matchCat = budgetCategoryFilter === 'all' || item.category === budgetCategoryFilter
      const matchStatus = budgetStatusFilter === 'all' || item.status === budgetStatusFilter

      return matchSearch && matchCat && matchStatus
    })
  }, [budgetItems, budgetSearch, budgetCategoryFilter, budgetStatusFilter])

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchSearch = g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
        (g.phone && g.phone.includes(guestSearch)) ||
        (g.notes && g.notes.toLowerCase().includes(guestSearch.toLowerCase()))

      const matchGroup = guestGroupFilter === 'all' || g.group_type === guestGroupFilter
      const matchRsvp = guestRsvpFilter === 'all' || g.rsvp_status === guestRsvpFilter

      return matchSearch && matchGroup && matchRsvp
    })
  }, [guests, guestSearch, guestGroupFilter, guestRsvpFilter])

  // ========================================================
  // HANDLERS: BUDGET
  // ========================================================

  const handleSaveBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      if (editingBudgetItem) {
        await updateWeddingBudgetItem(editingBudgetItem.id, formData)
      } else {
        await createWeddingBudgetItem(formData)
      }
      setShowBudgetModal(false)
      setEditingBudgetItem(null)
      await fetchBudget()
    } catch (err) {
      console.error('Failed to save budget item:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Hapus pos anggaran ini?')) return
    // Optimistic removal
    setBudgetItems((prev) => prev.filter((i) => i.id !== id))
    removeWeddingBudgetItemOptimistic(id)

    try {
      await deleteWeddingBudgetItem(id)
    } catch (err) {
      console.error('Failed to delete budget item:', err)
      fetchBudget()
    }
  }

  // ========================================================
  // HANDLERS: GUEST
  // ========================================================

  const handleSaveGuest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      if (editingGuest) {
        await updateWeddingGuest(editingGuest.id, formData)
      } else {
        await createWeddingGuest(formData)
      }
      setShowGuestModal(false)
      setEditingGuest(null)
      await fetchGuests()
    } catch (err) {
      console.error('Failed to save guest:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleRsvp = async (guestId: string, currentStatus: WeddingRsvpStatus) => {
    const nextStatus: WeddingRsvpStatus =
      currentStatus === 'attending' ? 'declined' : currentStatus === 'declined' ? 'pending' : 'attending'

    // Optimistic UI 0ms
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, rsvp_status: nextStatus } : g)))
    toggleGuestRSVPOptimistic(guestId, nextStatus)

    try {
      await updateWeddingGuestRsvp(guestId, nextStatus)
    } catch (err) {
      console.error('Failed to update RSVP:', err)
      fetchGuests()
    }
  }

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Hapus tamu ini dari daftar undangan?')) return
    // Optimistic removal
    setGuests((prev) => prev.filter((g) => g.id !== id))
    removeWeddingGuestOptimistic(id)

    try {
      await deleteWeddingGuest(id)
    } catch (err) {
      console.error('Failed to delete guest:', err)
      fetchGuests()
    }
  }

  // ========================================================
  // HANDLERS: RUNDOWN
  // ========================================================

  const handleSaveRundown = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      if (editingRundownItem) {
        await updateWeddingRundownItem(editingRundownItem.id, formData)
      } else {
        await createWeddingRundownItem(formData)
      }
      setShowRundownModal(false)
      setEditingRundownItem(null)
      await fetchRundown()
    } catch (err) {
      console.error('Failed to save rundown item:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRundown = async (id: string) => {
    if (!confirm('Hapus sesi susunan acara ini?')) return
    // Optimistic removal
    setRundown((prev) => prev.filter((r) => r.id !== id))
    removeWeddingRundownOptimistic(id)

    try {
      await deleteWeddingRundownItem(id)
    } catch (err) {
      console.error('Failed to delete rundown item:', err)
      fetchRundown()
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Gem className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Wedding Preparation Hub</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Rencana Pernikahan Intimate Aegg & Peppaa • Target Anggaran Rp 25.000.000
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'budget' && (
              <Button
                onClick={() => {
                  setEditingBudgetItem(null)
                  setShowBudgetModal(true)
                }}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Pos Anggaran
              </Button>
            )}
            {activeTab === 'guests' && (
              <Button
                onClick={() => {
                  setEditingGuest(null)
                  setShowGuestModal(true)
                }}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Tamu Undangan
              </Button>
            )}
            {activeTab === 'rundown' && (
              <Button
                onClick={() => {
                  setEditingRundownItem(null)
                  setShowRundownModal(true)
                }}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium h-9 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah Sesi Acara
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-2">
          <button
            onClick={() => setActiveTab('budget')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'budget'
                ? 'bg-secondary text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <DollarSign className="w-4 h-4" />
            Budget & Vendor (25 Jt)
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-secondary-foreground/10 text-muted-foreground">
              {budgetItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'guests'
                ? 'bg-secondary text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <Users className="w-4 h-4" />
            Daftar Tamu & RSVP
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-secondary-foreground/10 text-muted-foreground">
              {guestStats.confirmedPax}/{guestStats.totalPax} Pax
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rundown')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
              activeTab === 'rundown'
                ? 'bg-secondary text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <Clock className="w-4 h-4" />
            Rundown Hari-H
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-secondary-foreground/10 text-muted-foreground">
              {rundown.length} Sesi
            </span>
          </button>
        </div>

        {/* Loading Spinner only for initial empty state */}
        {loading && budgetItems.length === 0 && guests.length === 0 && rundown.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm">Memuat data persiapan pernikahan...</p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: BUDGET & VENDOR                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'budget' && (
          <div className="space-y-6">
            {/* Budget Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Target Anggaran
                </span>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(TARGET_BUDGET)}</div>
                <div className="text-xs text-muted-foreground">Intimate wedding 70 pax</div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Estimasi / Realisasi
                </span>
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalActual)}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{percentUsed}% dari target</span>
                  <span>Est: {formatShort(totalEstimated)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Sudah Dibayar (DP/Lunas)
                </span>
                <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalPaid)}</div>
                <div className="text-xs text-muted-foreground">{percentPaid}% dari total kebutuhan</div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Sisa Tagihan Pelunasan
                </span>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    totalUnpaid > 0 ? 'text-amber-500' : 'text-emerald-500'
                  )}
                >
                  {formatCurrency(totalUnpaid)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {remainingBudget >= 0 ? `Sisa saldo budget: ${formatShort(remainingBudget)}` : `Over budget: ${formatShort(Math.abs(remainingBudget))}`}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Terbayar: {formatCurrency(totalPaid)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Belum Dibayar: {formatCurrency(totalUnpaid)}
                  </span>
                </div>
                <span>Target: {formatCurrency(TARGET_BUDGET)}</span>
              </div>
              <div className="h-3 w-full bg-secondary/60 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${(totalPaid / TARGET_BUDGET) * 100}%` }}
                />
                <div
                  className="bg-amber-500/80 transition-all duration-300"
                  style={{ width: `${(totalUnpaid / TARGET_BUDGET) * 100}%` }}
                />
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari pos pengeluaran / vendor..."
                  value={budgetSearch}
                  onChange={(e) => setBudgetSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <select
                  value={budgetCategoryFilter}
                  onChange={(e) => setBudgetCategoryFilter(e.target.value)}
                  className="bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Kategori</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>

                <select
                  value={budgetStatusFilter}
                  onChange={(e) => setBudgetStatusFilter(e.target.value)}
                  className="bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Status</option>
                  <option value="planned">Direncanakan</option>
                  <option value="booked_dp">Sudah DP</option>
                  <option value="paid_off">Lunas</option>
                </select>
              </div>
            </div>

            {/* Budget Items List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBudgetItems.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  Tidak ada pos anggaran yang cocok dengan filter.
                </div>
              ) : (
                filteredBudgetItems.map((item) => {
                  const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
                  const effectiveCost = item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost
                  const unpaid = Math.max(0, effectiveCost - (item.paid_amount || 0))

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-all flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                  catCfg.color
                                )}
                              >
                                {catCfg.label}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                                  item.status === 'paid_off'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : item.status === 'booked_dp'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                    : 'bg-secondary text-muted-foreground border-border'
                                )}
                              >
                                {item.status === 'paid_off'
                                  ? 'Lunas'
                                  : item.status === 'booked_dp'
                                  ? 'Sudah DP'
                                  : 'Direncanakan'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-base text-foreground leading-snug">{item.title}</h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingBudgetItem(item)
                                setShowBudgetModal(true)
                              }}
                              className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBudget(item.id)}
                              className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                              title="Hapus item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {item.notes && <p className="text-xs text-muted-foreground leading-relaxed">{item.notes}</p>}

                        {item.vendor_name && (
                          <div className="flex items-center gap-2 text-xs text-foreground/80 bg-secondary/40 px-2.5 py-1.5 rounded-lg">
                            <span className="font-medium">Vendor: {item.vendor_name}</span>
                            {item.vendor_contact && (
                              <a
                                href={`https://wa.me/${cleanPhoneForWa(item.vendor_contact)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-auto text-emerald-500 hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <Phone className="w-3 h-3" />
                                {item.vendor_contact}
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cost Details Footer */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-muted-foreground">Kebutuhan: </span>
                          <span className="font-semibold text-foreground">{formatCurrency(effectiveCost)}</span>
                          {item.actual_cost && item.actual_cost > 0 && item.actual_cost !== item.estimated_cost && (
                            <span className="text-[10px] text-muted-foreground ml-1">
                              (Est: {formatShort(item.estimated_cost)})
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          {unpaid > 0 ? (
                            <span className="text-amber-500 font-medium">Sisa: {formatCurrency(unpaid)}</span>
                          ) : (
                            <span className="text-emerald-500 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GUEST LIST                                                         */}
        {/* ========================================================================= */}
        {activeTab === 'guests' && (
          <div className="space-y-6">
            {/* Guest Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Target Undangan
                </span>
                <div className="text-2xl font-bold text-foreground">50–100 Pax</div>
                <div className="text-xs text-muted-foreground">Total terdata: {guestStats.totalPax} Pax</div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Konfirmasi Hadir
                </span>
                <div className="text-2xl font-bold text-emerald-500">{guestStats.confirmedPax} Pax</div>
                <div className="text-xs text-muted-foreground">
                  {guestStats.totalPax > 0
                    ? `${Math.round((guestStats.confirmedPax / guestStats.totalPax) * 100)}% kehadiran`
                    : '0%'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Menunggu Konfirmasi
                </span>
                <div className="text-2xl font-bold text-amber-500">{guestStats.pendingPax} Pax</div>
                <div className="text-xs text-muted-foreground">Perlu di-follow up</div>
              </div>

              <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Berhalangan
                </span>
                <div className="text-2xl font-bold text-rose-500">{guestStats.declinedPax} Pax</div>
                <div className="text-xs text-muted-foreground">Tidak dapat hadir</div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari nama tamu / no hp..."
                  value={guestSearch}
                  onChange={(e) => setGuestSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <select
                  value={guestGroupFilter}
                  onChange={(e) => setGuestGroupFilter(e.target.value)}
                  className="bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Kelompok</option>
                  {Object.entries(GUEST_GROUP_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>

                <select
                  value={guestRsvpFilter}
                  onChange={(e) => setGuestRsvpFilter(e.target.value)}
                  className="bg-background border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Status RSVP</option>
                  <option value="attending">Hadir</option>
                  <option value="pending">Menunggu</option>
                  <option value="declined">Berhalangan</option>
                </select>
              </div>
            </div>

            {/* Guest Table */}
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/40 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nama Tamu</th>
                      <th className="py-3 px-4">Kelompok</th>
                      <th className="py-3 px-4 text-center">Pax</th>
                      <th className="py-3 px-4">Kontak / WA</th>
                      <th className="py-3 px-4">RSVP Status</th>
                      <th className="py-3 px-4">Catatan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredGuests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                          Belum ada daftar tamu yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredGuests.map((guest) => {
                        const groupCfg = GUEST_GROUP_CONFIG[guest.group_type] || GUEST_GROUP_CONFIG.family_aegg
                        const rsvpCfg = RSVP_CONFIG[guest.rsvp_status] || RSVP_CONFIG.pending
                        const RsvpIcon = rsvpCfg.icon

                        return (
                          <tr key={guest.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">{guest.name}</td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                  groupCfg.color
                                )}
                              >
                                {groupCfg.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-semibold px-2 py-0.5 rounded-md bg-secondary text-xs">
                                {guest.pax || 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {guest.phone ? (
                                <a
                                  href={`https://wa.me/${cleanPhoneForWa(
                                    guest.phone
                                  )}?text=${encodeURIComponent(
                                    `Halo ${guest.name}, kami mengundang Anda untuk menghadiri pernikahan kami. Mohon konfirmasi kehadirannya ya!`
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-500 hover:underline flex items-center gap-1"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  {guest.phone}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleRsvp(guest.id, guest.rsvp_status)}
                                className={cn(
                                  'text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer',
                                  rsvpCfg.color
                                )}
                                title="Klik untuk ubah status RSVP (0ms)"
                              >
                                <RsvpIcon className="w-3.5 h-3.5" />
                                {rsvpCfg.label}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                              {guest.notes || '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setEditingGuest(guest)
                                    setShowGuestModal(true)
                                  }}
                                  className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
                                  title="Edit tamu"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGuest(guest.id)}
                                  className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                                  title="Hapus tamu"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RUNDOWN HARI-H                                                     */}
        {/* ========================================================================= */}
        {activeTab === 'rundown' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Susunan Acara (Rundown) Akad & Resepsi</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jadwal terstruktur beserta PIC penanggung jawab per sesi agar acara Hari-H berjalan lancar.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{rundown.length} Sesi Acara</span>
              </div>
            </div>

            {/* Rundown Timeline */}
            <div className="relative border-l-2 border-primary/30 ml-4 sm:ml-6 space-y-6 pb-4">
              {rundown.length === 0 ? (
                <div className="ml-6 py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                  Belum ada sesi rundown. Klik tombol Tambah Sesi Acara di atas.
                </div>
              ) : (
                rundown.map((item, idx) => (
                  <div key={item.id} className="relative ml-6 group">
                    {/* Circle Node on Timeline */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>

                    {/* Rundown Item Card */}
                    <div className="p-4 rounded-xl border border-border/50 bg-card hover:border-border transition-all space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs font-semibold">
                            {item.time_start} {item.time_end ? `– ${item.time_end}` : ''}
                          </span>
                          <h4 className="font-semibold text-foreground text-base">{item.title}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.pic && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-foreground/80 font-medium">
                              PIC: {item.pic}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingRundownItem(item)
                              setShowRundownModal(true)
                            }}
                            className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground"
                            title="Edit sesi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRundown(item.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
                            title="Hapus sesi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {item.notes && <p className="text-xs text-muted-foreground leading-relaxed">{item.notes}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: BUDGET ITEM MODAL                                                */}
      {/* ========================================================================= */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingBudgetItem ? 'Edit Pos Anggaran' : 'Tambah Pos Anggaran (25jt)'}
              </h3>
              <button
                onClick={() => setShowBudgetModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nama Pos Pengeluaran *
                </label>
                <input
                  name="title"
                  required
                  defaultValue={editingBudgetItem?.title || ''}
                  placeholder="Contoh: Katering 70 Pax, Cincin Kawin..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Kategori</label>
                  <select
                    name="category"
                    defaultValue={editingBudgetItem?.category || 'catering'}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Status Pembayaran</label>
                  <select
                    name="status"
                    defaultValue={editingBudgetItem?.status || 'planned'}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="planned">Direncanakan</option>
                    <option value="booked_dp">Sudah DP</option>
                    <option value="paid_off">Lunas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Estimasi (Rp)</label>
                  <CurrencyInput
                    name="estimated_cost"
                    defaultValue={editingBudgetItem?.estimated_cost || 0}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Realisasi (Rp)</label>
                  <CurrencyInput
                    name="actual_cost"
                    defaultValue={editingBudgetItem?.actual_cost || 0}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Terbayar (Rp)</label>
                  <CurrencyInput
                    name="paid_amount"
                    defaultValue={editingBudgetItem?.paid_amount || 0}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Nama Vendor (Opsional)</label>
                  <input
                    name="vendor_name"
                    defaultValue={editingBudgetItem?.vendor_name || ''}
                    placeholder="Nama vendor..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">No Kontak / WA Vendor</label>
                  <input
                    name="vendor_contact"
                    defaultValue={editingBudgetItem?.vendor_contact || ''}
                    placeholder="0812xxxx"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan / Rincian</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingBudgetItem?.notes || ''}
                  placeholder="Detail paket, rincian barang, dll..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBudgetModal(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: GUEST MODAL                                                      */}
      {/* ========================================================================= */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingGuest ? 'Edit Tamu Undangan' : 'Tambah Tamu Undangan'}
              </h3>
              <button
                onClick={() => setShowGuestModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Nama Tamu / Keluarga *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingGuest?.name || ''}
                  placeholder="Contoh: Om Joko & Tante Rina..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Kelompok</label>
                  <select
                    name="group_type"
                    defaultValue={editingGuest?.group_type || 'family_aegg'}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(GUEST_GROUP_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Jumlah Pax</label>
                  <input
                    type="number"
                    min="1"
                    name="pax"
                    defaultValue={editingGuest?.pax || 1}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Status RSVP</label>
                  <select
                    name="rsvp_status"
                    defaultValue={editingGuest?.rsvp_status || 'pending'}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="attending">Hadir</option>
                    <option value="pending">Menunggu</option>
                    <option value="declined">Berhalangan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">No WhatsApp</label>
                  <input
                    name="phone"
                    defaultValue={editingGuest?.phone || ''}
                    placeholder="0812xxxx"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan Tambahan</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={editingGuest?.notes || ''}
                  placeholder="Perlu kirim undangan fisik / titip kado..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGuestModal(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Tamu'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RUNDOWN MODAL                                                    */}
      {/* ========================================================================= */}
      {showRundownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingRundownItem ? 'Edit Sesi Acara' : 'Tambah Sesi Acara'}
              </h3>
              <button
                onClick={() => setShowRundownModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRundown} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Nama Sesi Acara *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingRundownItem?.title || ''}
                  placeholder="Contoh: Ijab Qabul & Pembacaan Shighat..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Jam Mulai *</label>
                  <input
                    name="time_start"
                    required
                    defaultValue={editingRundownItem?.time_start || '08:00'}
                    placeholder="08:00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Jam Selesai</label>
                  <input
                    name="time_end"
                    defaultValue={editingRundownItem?.time_end || '09:00'}
                    placeholder="09:00"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Penanggung Jawab (PIC)
                </label>
                <input
                  name="pic"
                  defaultValue={editingRundownItem?.pic || ''}
                  placeholder="Contoh: Aegg, Peppaa, WO, Kakak..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan / Checklist Sesi</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingRundownItem?.notes || ''}
                  placeholder="Rincian checklist, persiapan mikrofon, mahar..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRundownModal(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Sesi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
