'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Heart,
  TrendingDown,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Building2,
  Calendar,
  Settings,
  Sparkles,
  CreditCard,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  MoreVertical,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  Tag,
  X,
  ExternalLink,
  Zap,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react'
import type { Transaction, Budget, SavingsAccount, Subscription, WeddingBudgetItem, Scope } from '@/types'
import { cn } from '@/lib/utils'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { BankLogo, getBankPreset } from '@/lib/bank-registry'
import { toast } from '@/components/ui/toast'
import { quickUpdateTransaction } from '@/lib/actions/finance'
import { getBillingCycle, isDateInBillingCycle, calculateDailySafeToSpend } from '@/lib/cycle-utils'
import { PayFromPocketModal, type PayTarget } from '@/components/features/finance/modals/pay-from-pocket-modal'
import { FinanceSettingsModal } from '@/components/features/finance/modals/finance-settings-modal'
import { AccountLedgerDrawer } from '@/components/features/finance/modals/account-ledger-drawer'
import { ReconcileModal } from '@/components/features/finance/modals/reconcile-modal'
import { getSubscriptions } from '@/lib/actions/subscriptions'
import { getWeddingBudgetItems } from '@/lib/actions/wedding'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import {
  SiohiomaRevenueChart,
  SiohiomaHorizontalReport,
  SiohiomaDonutPerformance,
} from '@/components/features/finance/siohioma-charts'

export interface FinanceOverviewProps {
  transactions: Transaction[]
  allTransactions?: Transaction[]
  budgets: Budget[]
  savings: SavingsAccount[]
  scope?: Scope | 'all'
  viewMode?: 'me' | 'partner' | 'combined'
  onOpenQuickExpense: () => void
  onOpenAddTransaction?: (type?: 'expense' | 'income' | 'transfer') => void
  onOpenTransfer?: () => void
  onSwitchToAdvanced: () => void
  onSwitchToBudgets?: () => void
  onSwitchToSavings?: () => void
  userRole?: string
  userProfile?: {
    id: string
    role: string
    billing_cycle_start_day?: number
    default_account_id?: string | null
    joint_default_account_id?: string | null
  } | null
  onRefresh?: () => void
}

interface TimelineCommitmentItem {
  id: string
  title: string
  subtitle: string
  category: string
  amount: number
  dueDate: Date
  dueDateStr: string
  isOverdue: boolean
  relativeDays: number
  target: PayTarget
}

export function FinanceOverview({
  transactions,
  allTransactions,
  budgets,
  savings,
  scope,
  viewMode,
  onOpenQuickExpense,
  onOpenAddTransaction,
  onOpenTransfer,
  onSwitchToAdvanced,
  onSwitchToBudgets,
  onSwitchToSavings,
  userRole = 'aegg',
  userProfile,
  onRefresh,
}: FinanceOverviewProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [ledgerAccount, setLedgerAccount] = useState<SavingsAccount | null>(null)
  const [reconcileAccount, setReconcileAccount] = useState<SavingsAccount | null>(null)
  const [openMenuAccountId, setOpenMenuAccountId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Inline Quick-Edit State
  const [quickEditTx, setQuickEditTx] = useState<{ id: string; type: 'category' | 'account' } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [weddingItems, setWeddingItems] = useState<WeddingBudgetItem[]>([])

  const { weddingBudgetItems: cachedWedding } = useWorkspaceStore()
  const activeScope: Scope | 'all' = scope || (viewMode === 'combined' ? 'all' : (userRole as Scope))

  // Load subscriptions & wedding items
  useEffect(() => {
    getSubscriptions().then(setSubscriptions).catch(() => {})
    if (cachedWedding && cachedWedding.length > 0) {
      setWeddingItems(cachedWedding)
    } else {
      getWeddingBudgetItems().then(setWeddingItems).catch(() => {})
    }
  }, [cachedWedding])

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenMenuAccountId(null)
      setQuickEditTx(null)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleCopy = (text: string, id: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Nomor rekening berhasil disalin')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // 1. Dynamic Billing Cycle & Calculations
  const startDay = userProfile?.billing_cycle_start_day ?? 25
  const cycle = useMemo(() => getBillingCycle(startDay), [startDay])

  const cycleElapsedDays = useMemo(() => {
    const today = new Date()
    const start = new Date(cycle.startDate)
    const diffTime = today.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, Math.min(31, diffDays))
  }, [cycle])

  // Filter transactions strictly within active salary billing cycle and current POV
  const cycleTx = useMemo(() => {
    return transactions.filter((t) => isDateInBillingCycle(t.date, cycle))
  }, [transactions, cycle])

  const stats = useMemo(() => {
    const expense = cycleTx
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const income = cycleTx
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0) || 5000000
    const remainingBudget = Math.max(0, totalBudget - expense)
    const budgetPercent = Math.min(Math.round((expense / totalBudget) * 100), 100)

    const totalSavingsAmount = savings.reduce((s, a) => s + (Number(a.balance) || 0), 0)
    const operationalSavings = savings
      .filter((s) => !s.is_locked)
      .reduce((s, a) => s + (Number(a.balance) || 0), 0)
    const lockedSavings = savings
      .filter(
        (s) =>
          !!s.is_locked ||
          s.name.toLowerCase().includes('nikah') ||
          s.name.toLowerCase().includes('wedding')
      )
      .reduce((s, a) => s + (Number(a.balance) || 0), 0)

    const safeToSpend = calculateDailySafeToSpend(remainingBudget, cycle.daysRemaining)

    let totalUnpaidVendor = 0
    weddingItems.forEach((item) => {
      if (item.is_sponsored) return

      let milestoneSum = 0
      let hasMilestone = false
      if (item.dp_amount && item.dp_amount > 0) {
        hasMilestone = true
        if (!item.dp_paid) milestoneSum += item.dp_amount
      }
      if (item.termin2_amount && item.termin2_amount > 0) {
        hasMilestone = true
        if (!item.termin2_paid) milestoneSum += item.termin2_amount
      }
      if (item.pelunasan_amount && item.pelunasan_amount > 0) {
        hasMilestone = true
        if (!item.pelunasan_paid) milestoneSum += item.pelunasan_amount
      }

      if (hasMilestone) {
        totalUnpaidVendor += milestoneSum
      } else {
        const cost = item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost || 0
        totalUnpaidVendor += Math.max(0, cost - (item.paid_amount || 0))
      }
    })

    const weddingLiquidityDelta = lockedSavings - totalUnpaidVendor

    // Recent 6 transactions for Siohioma Transaction list
    const recent = (cycleTx.length > 0 ? cycleTx : allTransactions || transactions).slice(0, 6)

    return {
      expense,
      income,
      totalBudget,
      remainingBudget,
      budgetPercent,
      safeToSpend,
      operationalSavings,
      lockedSavings,
      totalSavingsAmount,
      totalUnpaidVendor,
      weddingLiquidityDelta,
      recentTransactions: recent,
    }
  }, [transactions, allTransactions, budgets, savings, cycle, cycleTx, weddingItems])

  // Active Main/Default Account
  const mainAccount = useMemo(() => {
    if (activeScope === 'joint') {
      if (userProfile?.joint_default_account_id) {
        const found = savings.find((s) => s.id === userProfile.joint_default_account_id)
        if (found) return found
      }
      return savings.find((s) => s.is_locked || s.scope === 'joint') || savings[0] || null
    }

    if (userProfile?.default_account_id) {
      const found = savings.find((s) => s.id === userProfile.default_account_id)
      if (found) return found
    }
    return savings.find((s) => !s.is_locked && s.scope !== 'joint') || savings[0] || null
  }, [savings, userProfile, activeScope])

  // 14-Day Upcoming Commitments Timeline
  const upcomingCommitments = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 14)
    maxDate.setHours(23, 59, 59, 999)

    const list: TimelineCommitmentItem[] = []
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    subscriptions.forEach((sub) => {
      if (!sub.is_active) return
      if (sub.last_paid_at && sub.last_paid_at.startsWith(currentMonthYear)) return

      const dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day)
      const diffMs = dueDate.getTime() - today.getTime()
      const relativeDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      if (relativeDays >= -7 && relativeDays <= 14) {
        list.push({
          id: `sub-${sub.id}`,
          title: sub.name,
          subtitle: `Tagihan Rutin (${sub.category})`,
          category: 'subscription',
          amount: sub.amount,
          dueDate,
          dueDateStr: dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          isOverdue: relativeDays < 0,
          relativeDays,
          target: {
            type: 'subscription',
            subscription: sub,
            title: sub.name,
            amount: sub.amount,
            dueDateStr: dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          },
        })
      }
    })

    weddingItems.forEach((item) => {
      const checkMilestone = (
        milestone: 'dp' | 'termin2' | 'pelunasan',
        label: string,
        amount?: number | null,
        dueDateStr?: string | null,
        paid?: boolean | null
      ) => {
        if (!amount || amount <= 0 || paid || !dueDateStr) return
        const d = new Date(dueDateStr)
        const diffMs = d.getTime() - today.getTime()
        const relativeDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

        if (relativeDays >= -30 && relativeDays <= 14) {
          list.push({
            id: `wedding-${item.id}-${milestone}`,
            title: item.title,
            subtitle: `${label} • Vendor: ${item.vendor_name || 'Vendor Nikah'}`,
            category: 'wedding',
            amount,
            dueDate: d,
            dueDateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            isOverdue: relativeDays < 0,
            relativeDays,
            target: {
              type: 'wedding_milestone',
              itemId: item.id,
              itemName: item.title,
              milestone,
              milestoneLabel: label,
              amount,
              dueDateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            },
          })
        }
      }

      checkMilestone('dp', 'Uang Muka (DP)', item.dp_amount, item.dp_due_date, item.dp_paid)
      checkMilestone('termin2', 'Termin 2', item.termin2_amount, item.termin2_due_date, item.termin2_paid)
      checkMilestone('pelunasan', 'Pelunasan', item.pelunasan_amount, item.pelunasan_due_date, item.pelunasan_paid)
    })

    list.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    return list
  }, [subscriptions, weddingItems])

  // Quick updates
  const handleQuickUpdateCategory = async (txId: string, newCategory: string) => {
    setIsUpdating(true)
    try {
      const res = await quickUpdateTransaction(txId, { category: newCategory })
      if (res && 'error' in res && res.error) {
        toast.error('Gagal memperbarui kategori', res.error)
      } else {
        toast.success('Kategori berhasil diperbarui')
        setQuickEditTx(null)
        onRefresh?.()
      }
    } catch (err: any) {
      toast.error('Error saat update kategori', err?.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleQuickUpdateAccount = async (txId: string, newAccountId: string | null) => {
    setIsUpdating(true)
    try {
      const res = await quickUpdateTransaction(txId, { account_id: newAccountId })
      if (res && 'error' in res && res.error) {
        toast.error('Gagal mengalihkan rekening', res.error)
      } else {
        toast.success('Rekening dialihkan & saldo disinkronkan')
        setQuickEditTx(null)
        onRefresh?.()
      }
    } catch (err: any) {
      toast.error('Error saat update rekening', err?.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatTxDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Hari ini'
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  }

  const getCategoryIcon = (category: string) => {
    const found = TRANSACTION_CATEGORIES.expense.find((c) => c.value === category)
    return found ? found.icon : '💳'
  }

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SIOHIOMA ASYMMETRIC GRID: CENTER-LEFT (8 COLS) + RIGHT SIDEBAR (4 COLS)   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================= */}
        {/* KOLOM KIRI / UTAMA (lg:col-span-8)                        */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* ------------------------------------------------------------- */}
          {/* BARIS 1: 3 HERO METRIC CARDS (Spotlight + Net Income + Return) */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* 1. Aman Jajan Hari Ini / Likuiditas Kas Bersama */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  {activeScope === 'joint' ? (
                    <>
                      <Heart className="w-3.5 h-3.5 text-primary" />
                      Likuiditas Nikah
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Aman Jajan Hari Ini
                    </>
                  )}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                    activeScope === 'joint'
                      ? stats.weddingLiquidityDelta >= 0
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : stats.safeToSpend.status === 'safe'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : stats.safeToSpend.status === 'warning'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  )}
                >
                  {activeScope === 'joint'
                    ? stats.weddingLiquidityDelta >= 0
                      ? '🟢 Aman'
                      : '🔴 Defisit'
                    : stats.safeToSpend.status === 'safe'
                    ? '🟢 Aman'
                    : stats.safeToSpend.status === 'warning'
                    ? '🟡 Tipis'
                    : '🔴 Defisit'}
                </span>
              </div>

              <div className="my-1">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
                  {activeScope === 'joint'
                    ? `${stats.weddingLiquidityDelta >= 0 ? '+' : ''}${formatRupiah(stats.weddingLiquidityDelta)}`
                    : formatRupiah(stats.safeToSpend.dailyAmount)}
                  {activeScope !== 'joint' && (
                    <span className="text-xs font-medium text-muted-foreground ml-1">/ hari</span>
                  )}
                </h3>
              </div>

              <p className="text-xs text-muted-foreground truncate">
                {activeScope === 'joint'
                  ? `Sisa komitmen vendor: ${formatRupiah(stats.totalUnpaidVendor)}`
                  : `${cycle.daysRemaining} hari ke gajian (${cycle.nextPaydayLabel})`}
              </p>
            </motion.div>

            {/* 2. Pemasukan Siklus Ini */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  Pemasukan Siklus Ini
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {cycleTx.filter((t) => t.type === 'income').length} Tx Masuk
                </span>
              </div>

              <div className="my-1">
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
                  {formatRupiah(stats.income)}
                </h3>
              </div>

              <p className="text-xs text-muted-foreground truncate">
                Total arus kas masuk tercatat
              </p>
            </motion.div>

            {/* 3. Pengeluaran Siklus Ini */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  Pengeluaran Siklus Ini
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground">
                  {stats.budgetPercent}% Anggaran
                </span>
              </div>

              <div className="my-1">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
                  {formatRupiah(stats.expense)}
                </h3>
              </div>

              <p className="text-xs text-muted-foreground truncate">
                Sisa anggaran: <span className="font-semibold text-foreground">{formatRupiah(stats.remainingBudget)}</span>
              </p>
            </motion.div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BARIS 2 & 3: SPLIT GRID (Transaction List + Charts Stack)     */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            
            {/* =========================================================== */}
            {/* KIRI: SIOHIOMA TRANSACTION CARD (md:col-span-5)            */}
            {/* =========================================================== */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-foreground">Transaksi Terakhir</h4>
                  <p className="text-xs text-muted-foreground">Aktivitas arus kas siklus aktif</p>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToAdvanced}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  title="Lihat semua transaksi"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Transaction Rows */}
              <div className="divide-y divide-border/40">
                {stats.recentTransactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Belum ada transaksi tercatat.
                  </div>
                ) : (
                  stats.recentTransactions.map((tx) => {
                    const isExpense = tx.type === 'expense'
                    const isQuickEditing = quickEditTx?.id === tx.id

                    return (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0 relative group"
                      >
                        {/* Left: Round Square Icon + Description + Date */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Round Square Thumbnail / Icon */}
                          <div className="w-10 h-10 rounded-xl bg-secondary/80 border border-border/60 flex items-center justify-center shrink-0 text-base shadow-2xs group-hover:border-primary/40 transition-colors">
                            {tx.account ? (
                              <BankLogo bankCode={tx.account.bank_code} className="w-5 h-5" />
                            ) : (
                              <span>{getCategoryIcon(tx.category || '')}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate max-w-[140px] sm:max-w-[160px]">
                              {tx.description || tx.merchant || tx.category || 'Transaksi'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatTxDate(tx.date)}
                            </p>
                          </div>
                        </div>

                        {/* Right: Completed Status / Amount + Account Code */}
                        <div className="text-right shrink-0">
                          <p
                            className={cn(
                              'text-xs font-black tabular-nums tracking-tight',
                              isExpense ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {isExpense ? '-' : '+'} {formatRupiah(tx.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[90px]">
                            {tx.account?.name
                              ? tx.account.name
                              : tx.source === 'whatsapp'
                              ? 'WA-NANANG'
                              : 'COMPLETED'}
                          </p>
                        </div>

                        {/* Popover Inline Quick-Edit Dropdown */}
                        {isQuickEditing && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-8 top-12 z-40 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl p-2 w-64 max-h-56 overflow-y-auto animate-in text-xs"
                          >
                            <p className="font-bold text-[11px] text-muted-foreground px-2 py-1 uppercase tracking-wider">
                              Ubah Kategori
                            </p>
                            {TRANSACTION_CATEGORIES.expense.map((cat) => (
                              <button
                                key={cat.value}
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleQuickUpdateCategory(tx.id, cat.value)}
                                className={cn(
                                  'w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 hover:bg-secondary transition-colors',
                                  tx.category === cat.value && 'bg-secondary font-bold text-primary'
                                )}
                              >
                                <span>{cat.icon}</span>
                                <span className="truncate">{cat.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* View All Transactions Link */}
              <div className="pt-2 text-center border-t border-border/40">
                <button
                  type="button"
                  onClick={onSwitchToAdvanced}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Lihat Semua Transaksi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* =========================================================== */}
            {/* KANAN: CHARTS STACK (Arus Kas + Kategori Belanja) (md:col-span-7) */}
            {/* =========================================================== */}
            <div className="md:col-span-7 space-y-5">
              {/* 1. Tren Arus Kas Bar Chart */}
              <SiohiomaRevenueChart
                transactions={transactions}
                cycle={cycle}
                startDay={startDay}
              />

              {/* 2. Kategori Belanja Terbesar (Horizontal Bars) */}
              <SiohiomaHorizontalReport
                transactions={transactions}
                cycle={cycle}
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* KOLOM KANAN / RIGHT SIDEBAR (lg:col-span-4)                */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* 1. Alokasi Anggaran Belanja (Donut Chart) */}
          <SiohiomaDonutPerformance
            transactions={transactions}
            cycle={cycle}
            totalBudget={stats.totalBudget}
            onViewBudgetDetails={onSwitchToBudgets}
          />

          {/* 2. Kantong & Rekening Aktif (Compact Quick-Action Cards) */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground">Kantong & Rekening</h4>
              <button
                type="button"
                onClick={onSwitchToSavings}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {savings.slice(0, 3).map((acc) => {
                const preset = getBankPreset(acc.bank_code)
                return (
                  <div
                    key={acc.id}
                    onClick={() => setLedgerAccount(acc)}
                    className="p-3 rounded-xl border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogo bankCode={acc.bank_code} className="w-6 h-6 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {acc.account_number ? `•••• ${acc.account_number.slice(-4)}` : preset.shortName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-foreground tabular-nums">
                        {formatRupiah(Number(acc.balance) || 0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onOpenTransfer) onOpenTransfer()
                  else if (onOpenAddTransaction) onOpenAddTransaction('transfer')
                }}
                className="flex-1 py-1.5 px-3 rounded-lg border border-border/80 hover:bg-secondary text-xs font-bold text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Transfer Dana</span>
              </button>
            </div>
          </div>

          {/* 4. Timeline Komitmen 14 Hari */}
          {upcomingCommitments.length > 0 && (
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Timeline 14 Hari
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {upcomingCommitments.length} komitmen
                </span>
              </div>

              <div className="space-y-2">
                {upcomingCommitments.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-border/60 bg-secondary/20 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.dueDateStr} • <span className="font-bold text-foreground">{formatRupiah(item.amount)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayTarget(item.target)}
                      className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 shrink-0"
                    >
                      Bayar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* MODALS PERSISTENCE (MUTASI, RECONCILE, PAY TARGET, SETTINGS) */}
      {/* ========================================================= */}
      <AccountLedgerDrawer
        isOpen={!!ledgerAccount}
        onClose={() => setLedgerAccount(null)}
        account={ledgerAccount}
      />

      <ReconcileModal
        isOpen={!!reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        account={reconcileAccount}
        onSuccess={() => {
          onRefresh?.()
        }}
      />

      <FinanceSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userProfile={userProfile as any}
        accounts={savings}
        onSuccess={() => {
          onRefresh?.()
        }}
      />

      <PayFromPocketModal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        accounts={savings}
        defaultAccountId={userProfile?.default_account_id}
        target={payTarget}
        onSuccess={() => {
          getSubscriptions().then(setSubscriptions).catch(() => {})
          getWeddingBudgetItems().then(setWeddingItems).catch(() => {})
          onRefresh?.()
        }}
      />
    </div>
  )
}

export const GamifiedOverview = FinanceOverview
export type { FinanceOverviewProps as GamifiedOverviewProps }
