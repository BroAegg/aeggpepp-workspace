'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Gem, Plus, Users, Clock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type {
  WeddingBudgetItem,
  WeddingGuest,
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
import { WeddingSkeleton } from '@/components/features/wedding/wedding-skeleton'
import {
  CATEGORY_CONFIG,
  GUEST_GROUP_CONFIG,
  TARGET_PAX,
} from '@/components/features/wedding/wedding-config'
import { toast } from '@/components/ui/toast'

// Lazy-loaded Tabs (Dynamic Chunks for 0ms Perceived Transition)
const BudgetTab = dynamic(
  () => import('@/components/features/wedding/tabs/budget-tab').then((m) => m.BudgetTab),
  { loading: () => <WeddingSkeleton />, ssr: false }
)
const GuestsTab = dynamic(
  () => import('@/components/features/wedding/tabs/guests-tab').then((m) => m.GuestsTab),
  { loading: () => <WeddingSkeleton />, ssr: false }
)
const RundownTab = dynamic(
  () => import('@/components/features/wedding/tabs/rundown-tab').then((m) => m.RundownTab),
  { loading: () => <WeddingSkeleton />, ssr: false }
)

// Modals
import { BudgetItemModal } from '@/components/features/wedding/modals/budget-item-modal'
import { GuestModal } from '@/components/features/wedding/modals/guest-modal'
import { RundownModal } from '@/components/features/wedding/modals/rundown-modal'

type WeddingTab = 'budget' | 'guests' | 'rundown'

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

  // Modals state
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingBudgetItem, setEditingBudgetItem] = useState<WeddingBudgetItem | null>(null)

  const [showGuestModal, setShowGuestModal] = useState(false)
  const [editingGuest, setEditingGuest] = useState<WeddingGuest | null>(null)

  const [showRundownModal, setShowRundownModal] = useState(false)
  const [editingRundownItem, setEditingRundownItem] = useState<WeddingRundownItem | null>(null)

  const isSubmittingRef = useRef(false)

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

  // Fetch fresh data
  const fetchData = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false)
      return
    }

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
      console.error('Failed to load wedding data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const handleOnline = () => fetchData()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // Budget Handlers
  const handleSaveBudgetItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      let res: any
      if (editingBudgetItem) {
        res = await updateWeddingBudgetItem(editingBudgetItem.id, formData)
      } else {
        res = await createWeddingBudgetItem(formData)
      }
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan pos anggaran', res.error)
        return
      }
      toast.success(editingBudgetItem ? 'Pos anggaran diperbarui' : 'Pos anggaran baru ditambahkan')
      setShowBudgetModal(false)
      setEditingBudgetItem(null)
      const fresh = await getWeddingBudgetItems()
      setBudgetItems(fresh)
      setWeddingData({ budgetItems: fresh })
    } catch (err) {
      toast.error('Error menyimpan pos anggaran')
      console.error('Failed to save budget item:', err)
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Hapus pos anggaran ini?')) return
    setBudgetItems((prev) => prev.filter((item) => item.id !== id))
    removeWeddingBudgetItemOptimistic(id)
    try {
      await deleteWeddingBudgetItem(id)
      toast.success('Pos anggaran dihapus')
    } catch (err) {
      toast.error('Gagal menghapus pos anggaran')
      console.error('Failed to delete budget item:', err)
      const fresh = await getWeddingBudgetItems()
      setBudgetItems(fresh)
    }
  }

  // Guest Handlers
  const handleSaveGuest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      let res: any
      if (editingGuest) {
        res = await updateWeddingGuest(editingGuest.id, formData)
      } else {
        res = await createWeddingGuest(formData)
      }
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan data tamu', res.error)
        return
      }
      toast.success(editingGuest ? 'Data tamu diperbarui' : 'Tamu baru ditambahkan')
      setShowGuestModal(false)
      setEditingGuest(null)
      const fresh = await getWeddingGuests()
      setGuests(fresh)
      setWeddingData({ guests: fresh })
    } catch (err) {
      toast.error('Error menyimpan tamu')
      console.error('Failed to save guest:', err)
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
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
      const fresh = await getWeddingGuests()
      setGuests(fresh)
    }
  }

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Hapus tamu ini dari daftar undangan?')) return
    setGuests((prev) => prev.filter((g) => g.id !== id))
    removeWeddingGuestOptimistic(id)
    try {
      await deleteWeddingGuest(id)
      toast.success('Tamu dihapus dari daftar undangan')
    } catch (err) {
      toast.error('Gagal menghapus tamu')
      console.error('Failed to delete guest:', err)
      const fresh = await getWeddingGuests()
      setGuests(fresh)
    }
  }

  // Rundown Handlers
  const handleSaveRundown = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)

    try {
      let res: any
      if (editingRundownItem) {
        res = await updateWeddingRundownItem(editingRundownItem.id, formData)
      } else {
        res = await createWeddingRundownItem(formData)
      }
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan sesi acara', res.error)
        return
      }
      toast.success(editingRundownItem ? 'Sesi acara diperbarui' : 'Sesi acara baru ditambahkan')
      setShowRundownModal(false)
      setEditingRundownItem(null)
      const fresh = await getWeddingRundown()
      setRundown(fresh)
      setWeddingData({ rundown: fresh })
    } catch (err) {
      toast.error('Error menyimpan sesi acara')
      console.error('Failed to save rundown item:', err)
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  const handleDeleteRundown = async (id: string) => {
    if (!confirm('Hapus sesi acara ini dari rundown?')) return
    setRundown((prev) => prev.filter((item) => item.id !== id))
    removeWeddingRundownOptimistic(id)
    try {
      await deleteWeddingRundownItem(id)
    } catch (err) {
      console.error('Failed to delete rundown item:', err)
      const fresh = await getWeddingRundown()
      setRundown(fresh)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Gem className="w-6 h-6 text-primary" />
              Persiapan Pernikahan Aegg & Peppaa
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Rencana pernikahan intimate & sakral (Target Rp 25.000.000 · Skala {TARGET_PAX} Pax).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'budget' && (
              <Button
                onClick={() => {
                  setEditingBudgetItem(null)
                  setShowBudgetModal(true)
                }}
                className="bg-primary text-primary-foreground text-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Pos Anggaran
              </Button>
            )}
            {activeTab === 'guests' && (
              <Button
                onClick={() => {
                  setEditingGuest(null)
                  setShowGuestModal(true)
                }}
                className="bg-primary text-primary-foreground text-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Tamu Undangan
              </Button>
            )}
            {activeTab === 'rundown' && (
              <Button
                onClick={() => {
                  setEditingRundownItem(null)
                  setShowRundownModal(true)
                }}
                className="bg-primary text-primary-foreground text-xs rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Sesi Acara
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-secondary/50 rounded-2xl w-fit border border-border/40">
          <button
            onClick={() => setActiveTab('budget')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
              activeTab === 'budget'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Anggaran & Vendor (25jt)
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {budgetItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('guests')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
              activeTab === 'guests'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Daftar Tamu ({TARGET_PAX} Pax)
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {guests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rundown')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all',
              activeTab === 'rundown'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            Rundown Hari-H
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {rundown.length} Sesi
            </span>
          </button>
        </div>

        {/* Loading Skeleton only for initial empty state */}
        {loading && budgetItems.length === 0 && guests.length === 0 && rundown.length === 0 && (
          <WeddingSkeleton />
        )}

        {/* TAB 1: BUDGET & VENDOR */}
        {activeTab === 'budget' && (
          <BudgetTab
            budgetItems={budgetItems}
            onAddBudgetItem={() => {
              setEditingBudgetItem(null)
              setShowBudgetModal(true)
            }}
            onEditBudgetItem={(item) => {
              setEditingBudgetItem(item)
              setShowBudgetModal(true)
            }}
            onDeleteBudgetItem={handleDeleteBudget}
          />
        )}

        {/* TAB 2: GUEST LIST */}
        {activeTab === 'guests' && (
          <GuestsTab
            guests={guests}
            onAddGuest={() => {
              setEditingGuest(null)
              setShowGuestModal(true)
            }}
            onEditGuest={(guest) => {
              setEditingGuest(guest)
              setShowGuestModal(true)
            }}
            onDeleteGuest={handleDeleteGuest}
            onToggleRsvp={handleToggleRsvp}
          />
        )}

        {/* TAB 3: RUNDOWN HARI-H */}
        {activeTab === 'rundown' && (
          <RundownTab
            rundown={rundown}
            onAddRundown={() => {
              setEditingRundownItem(null)
              setShowRundownModal(true)
            }}
            onEditRundown={(item) => {
              setEditingRundownItem(item)
              setShowRundownModal(true)
            }}
            onDeleteRundown={handleDeleteRundown}
          />
        )}
      </main>

      {/* ========== MODALS ========== */}
      <BudgetItemModal
        isOpen={showBudgetModal}
        onClose={() => {
          setShowBudgetModal(false)
          setEditingBudgetItem(null)
        }}
        editingBudgetItem={editingBudgetItem}
        onSubmit={handleSaveBudgetItem}
        isSubmitting={isSubmitting}
        categoryConfig={CATEGORY_CONFIG}
      />

      <GuestModal
        isOpen={showGuestModal}
        onClose={() => {
          setShowGuestModal(false)
          setEditingGuest(null)
        }}
        editingGuest={editingGuest}
        onSubmit={handleSaveGuest}
        isSubmitting={isSubmitting}
        guestGroupConfig={GUEST_GROUP_CONFIG}
      />

      <RundownModal
        isOpen={showRundownModal}
        onClose={() => {
          setShowRundownModal(false)
          setEditingRundownItem(null)
        }}
        editingRundownItem={editingRundownItem}
        onSubmit={handleSaveRundown}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
