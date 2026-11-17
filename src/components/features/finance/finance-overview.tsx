'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  Receipt,
  RefreshCw,
  ArrowLeftRight,
  ChevronDown,
  Tag,
  X,
  ExternalLink,
} from 'lucide-react'
import type { Transaction, Budget, SavingsAccount, Subscription, WeddingBudgetItem, Scope } from '@/types'
import { cn } from '@/lib/utils'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { BankLogo, getBankPreset } from '@/lib/bank-registry'
import { toast } from '@/components/ui/toast'
import { quickUpdateTransaction } from '@/lib/actions/finance'
import { FinanceCharts } from '@/components/features/finance/finance-charts'
import { NevBankDonutChart } from '@/components/features/finance/nevbank-donut-chart'
import { getBillingCycle, isDateInBillingCycle, calculateDailySafeToSpend } from '@/lib/cycle-utils'
import { PayFromPocketModal, type PayTarget } from '@/components/features/finance/modals/pay-from-pocket-modal'
import { FinanceSettingsModal } from '@/components/features/finance/modals/finance-settings-modal'
import { AccountLedgerDrawer } from '@/components/features/finance/modals/account-ledger-drawer'
import { ReconcileModal } from '@/components/features/finance/modals/reconcile-modal'
import { getSubscriptions } from '@/lib/actions/subscriptions'
import { getWeddingBudgetItems } from '@/lib/actions/wedding'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'

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

  // Close card menus when clicked outside
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

    // Calculate Daily Safe-to-Spend
    const safeToSpend = calculateDailySafeToSpend(remainingBudget, cycle.daysRemaining)

    // Calculate Unpaid Wedding Commitments (Exclude sponsored/parent funded)
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

    // Recent 5 expenses or transactions
    const expenseList = cycleTx.filter((t) => t.type === 'expense')
    const recent = (expenseList.length > 0 ? expenseList : (allTransactions || transactions).filter((t) => t.type === 'expense')).slice(0, 5)

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
      recentExpenses: recent,
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

  const mainPreset = useMemo(() => {
    return mainAccount ? getBankPreset(mainAccount.bank_code) : null
  }, [mainAccount])

  // Average daily spending so far
  const avgDailySpending = useMemo(() => {
    return Math.round(stats.expense / (cycleElapsedDays || 1))
  }, [stats.expense, cycleElapsedDays])

  // 2. Build 14-Day Upcoming Commitments Timeline
  const upcomingCommitments = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 14)
    maxDate.setHours(23, 59, 59, 999)

    const list: TimelineCommitmentItem[] = []
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    // A. Subscriptions due within 14 days
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

    // B. Wedding Milestones due within 14 days
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

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* BARIS 1: ASYMMETRIC HERO GRID (lg:col-span-8 / lg:col-span-4) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* KARTU KIRI: REKENING UTAMA & SALDO AKTIF (lg:col-span-8) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[200px] relative overflow-hidden"
        >
          {/* Top Row: Account Info & Balance */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Rekening Utama
                </span>
                {mainPreset && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border/60">
                    {mainPreset.name}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate max-w-[340px]">
                {mainAccount?.name || 'Rekening Operasional'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                <span className="font-mono">
                  {mainAccount?.account_number
                    ? `•••• ${mainAccount.account_number.slice(-4)}`
                    : 'Kantong Operasional Harian'}
                </span>
                {mainAccount?.account_number && (
                  <button
                    type="button"
                    onClick={() => handleCopy(mainAccount.account_number!, 'main-acc')}
                    title="Salin Nomor Rekening"
                    className="hover:text-foreground transition-colors p-0.5 rounded hover:bg-secondary"
                  >
                    {copiedId === 'main-acc' ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Available Funds Tabular Big Balance */}
            <div className="sm:text-right">
              <span className="text-xs font-semibold text-muted-foreground block">
                Saldo Tersedia
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums mt-0.5">
                {formatRupiah(mainAccount ? Number(mainAccount.balance) : stats.operationalSavings)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activeScope === 'joint' ? 'Kas & Tabungan Bersama' : 'Siap belanja tanpa ganggu tabungan'}
              </p>
            </div>
          </div>

          {/* Bottom Row: NevBank Action Buttons */}
          <div className="flex items-center gap-3 pt-5 mt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                if (onOpenTransfer) onOpenTransfer()
                else if (onOpenAddTransaction) onOpenAddTransaction('transfer')
              }}
              className="btn-primary text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Transfer Dana
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenAddTransaction) onOpenAddTransaction('expense')
                else onOpenQuickExpense()
              }}
              className="btn-secondary text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-transform active:scale-98 border border-border/80"
            >
              <Plus className="w-4 h-4" />
              Catat Transaksi
            </button>
          </div>
        </motion.div>

        {/* KARTU KANAN: SPOTLIGHT CARD KONTEKSTUAL (lg:col-span-4) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'lg:col-span-4 rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[200px] border transition-all',
            // Pink mode: soft rose gradient surface. Dark mode: dark elevated surface with rose glow
            'bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-rose-500/15 border-rose-500/30 dark:bg-card/95 dark:from-transparent dark:to-transparent dark:border-primary/30 dark:shadow-[0_0_20px_rgba(251,113,133,0.08)]'
          )}
        >
          {/* Top Title & Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              {activeScope === 'joint' ? (
                <>
                  <Heart className="w-4 h-4 text-primary" />
                  Likuiditas Dana Nikah
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-primary" />
                  Aman Jajan Hari Ini
                </>
              )}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                activeScope === 'joint'
                  ? stats.weddingLiquidityDelta >= 0
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  : stats.safeToSpend.status === 'safe'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : stats.safeToSpend.status === 'warning'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
              )}
            >
              {activeScope === 'joint'
                ? stats.weddingLiquidityDelta >= 0
                  ? '🟢 Likuiditas Aman'
                  : '🔴 Defisit Vendor'
                : stats.safeToSpend.status === 'safe'
                ? '🟢 Aman'
                : stats.safeToSpend.status === 'warning'
                ? '🟡 Tipis'
                : '🔴 Defisit'}
            </span>
          </div>

          {/* Center Metric */}
          <div className="my-3">
            <h4 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
              {activeScope === 'joint'
                ? `${stats.weddingLiquidityDelta >= 0 ? '+' : ''}${formatRupiah(stats.weddingLiquidityDelta)}`
                : `${formatRupiah(stats.safeToSpend.dailyAmount)}`}
              {activeScope !== 'joint' && (
                <span className="text-xs font-medium text-muted-foreground ml-1">/ hari</span>
              )}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              {activeScope === 'joint'
                ? `Dana tabungan terkunci ${formatRupiah(stats.lockedSavings)} vs Sisa komitmen vendor ${formatRupiah(stats.totalUnpaidVendor)}.`
                : `${cycle.daysRemaining} hari menuju gajian (${cycle.nextPaydayLabel}). Sisa anggaran ${formatRupiah(stats.remainingBudget)}.`}
            </p>
          </div>

          {/* Bottom CTA Button */}
          <div className="pt-2">
            {activeScope === 'joint' ? (
              <button
                type="button"
                onClick={() => {
                  if (onSwitchToSavings) onSwitchToSavings()
                  else onSwitchToAdvanced()
                }}
                className="w-full btn-primary text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-98"
              >
                Rincian Vendor Nikah
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenQuickExpense}
                className="w-full btn-primary text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Pengeluaran Cepat
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* BARIS 2: DERETAN KARTU REKENING (grid-cols-1 sm:2 lg:4) */}
      {/* ========================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-foreground">Kantong & Rekening Aktif</h3>
          <button
            type="button"
            onClick={onSwitchToSavings}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Kelola Semua Kantong
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {savings.slice(0, 4).map((acc) => {
            const preset = getBankPreset(acc.bank_code)
            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setLedgerAccount(acc)}
                className="bg-card hover:bg-secondary/30 border border-border/80 hover:border-primary/40 rounded-2xl p-4 shadow-xs transition-all cursor-pointer group relative flex flex-col justify-between min-h-[110px]"
              >
                {/* Card Top: Bank Name & Vector Logo */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {acc.name}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                      <span>{acc.account_number ? `•••• ${acc.account_number.slice(-4)}` : preset.shortName}</span>
                      {acc.account_number && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(acc.account_number!, acc.id)
                          }}
                          className="hover:text-foreground p-0.5 rounded"
                          title="Salin no rekening"
                        >
                          {copiedId === acc.id ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <BankLogo bankCode={acc.bank_code} className="w-7 h-7" />
                  </div>
                </div>

                {/* Card Bottom: Balance & Menu ⋮ */}
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/40">
                  <span className="text-base font-black text-foreground tabular-nums tracking-tight">
                    {formatRupiah(Number(acc.balance) || 0)}
                  </span>

                  {/* ⋮ Three-dots menu */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setOpenMenuAccountId(openMenuAccountId === acc.id ? null : acc.id)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Menu kantong"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {openMenuAccountId === acc.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-popover text-popover-foreground border border-border/80 shadow-lg rounded-xl py-1 z-30 text-xs animate-in">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuAccountId(null)
                            setLedgerAccount(acc)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary flex items-center gap-2"
                        >
                          <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Mutasi Rekening</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuAccountId(null)
                            setReconcileAccount(acc)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary flex items-center gap-2"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Sesuaikan Saldo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuAccountId(null)
                            if (onOpenTransfer) onOpenTransfer()
                            else if (onOpenAddTransaction) onOpenAddTransaction('transfer')
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary flex items-center gap-2 text-primary font-medium"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>Transfer dari Sini</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BARIS 3: SPLIT BAWAH (lg:col-span-7 Transaksi / lg:col-span-5 Ringkasan & Donut) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KIRI: TRANSAKSI TERAKHIR (lg:col-span-7) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4"
        >
          {/* Header with Arrow Button */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h4 className="text-sm font-bold text-foreground">Transaksi Terakhir</h4>
              <p className="text-xs text-muted-foreground">Aktivitas arus kas tercatat dalam siklus aktif</p>
            </div>
            <button
              type="button"
              onClick={onSwitchToAdvanced}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center shadow-xs transition-transform active:scale-95"
              title="Ke Buku Besar Transaksi"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Table Rows (Minimalist NevBank Row Table) */}
          <div className="divide-y divide-border/40">
            {stats.recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Belum ada transaksi tercatat pada periode ini.
              </div>
            ) : (
              stats.recentExpenses.map((tx) => {
                const role = (tx as any).profiles?.role || 'aegg'
                const isExpense = tx.type === 'expense'
                const isQuickEditing = quickEditTx?.id === tx.id

                return (
                  <div
                    key={tx.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 first:pt-0 last:pb-0 relative"
                  >
                    {/* Left: Date + Title + Source Badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] font-semibold text-muted-foreground w-14 shrink-0 tabular-nums">
                        {formatTxDate(tx.date)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate max-w-[200px]">
                            {tx.description || tx.merchant || tx.category}
                          </p>
                          {tx.source === 'whatsapp' ? (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase"
                              title="Dicatat otomatis lewat WhatsApp Nanang"
                            >
                              WA
                            </span>
                          ) : (
                            <span
                              className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/50 uppercase"
                              title="Dicatat lewat Web Dashboard"
                            >
                              Web
                            </span>
                          )}
                          <OwnerBadge role={role} compact />
                        </div>

                        {/* Subline: Category & Account with 1-Tap Inline Quick-Edit */}
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 relative">
                          {/* 1-Tap Category Quick-Edit Trigger */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setQuickEditTx(
                                isQuickEditing && quickEditTx?.type === 'category'
                                  ? null
                                  : { id: tx.id, type: 'category' }
                              )
                            }}
                            className="capitalize hover:text-foreground hover:bg-secondary px-1 py-0.5 rounded transition-colors flex items-center gap-0.5 font-medium"
                          >
                            <span>{tx.category ? tx.category.replace(/_/g, ' ') : 'Lainnya'}</span>
                            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                          </button>

                          <span>•</span>

                          {/* 1-Tap Account Quick-Edit Trigger */}
                          {tx.account ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setQuickEditTx(
                                  isQuickEditing && quickEditTx?.type === 'account'
                                    ? null
                                    : { id: tx.id, type: 'account' }
                                )
                              }}
                              className="hover:text-foreground hover:bg-secondary px-1 py-0.5 rounded transition-colors flex items-center gap-1 font-medium"
                            >
                              <BankLogo bankCode={tx.account.bank_code} className="w-3.5 h-3.5 inline-block" />
                              <span className="truncate max-w-[100px]">{tx.account.name}</span>
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setQuickEditTx(
                                  isQuickEditing && quickEditTx?.type === 'account'
                                    ? null
                                    : { id: tx.id, type: 'account' }
                                )
                              }}
                              className="text-primary hover:bg-primary/10 px-1 py-0.5 rounded flex items-center gap-0.5 font-medium"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>+ Rekening</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Nominal Tabular Nums */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span
                        className={cn(
                          'text-xs font-black tabular-nums tracking-tight',
                          isExpense ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400'
                        )}
                      >
                        {isExpense ? '-' : '+'} {formatRupiah(tx.amount)}
                      </span>
                    </div>

                    {/* Popover Inline Quick-Edit Dropdown */}
                    {isQuickEditing && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-8 top-12 z-40 bg-popover text-popover-foreground border border-border shadow-xl rounded-xl p-2 w-64 max-h-56 overflow-y-auto animate-in text-xs"
                      >
                        {quickEditTx.type === 'category' ? (
                          <div className="space-y-1">
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
                        ) : (
                          <div className="space-y-1">
                            <p className="font-bold text-[11px] text-muted-foreground px-2 py-1 uppercase tracking-wider">
                              Pilih Rekening Sumber
                            </p>
                            {savings.map((acc) => (
                              <button
                                key={acc.id}
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleQuickUpdateAccount(tx.id, acc.id)}
                                className={cn(
                                  'w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-secondary transition-colors',
                                  tx.account_id === acc.id && 'bg-secondary font-bold text-primary'
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <BankLogo bankCode={acc.bank_code} className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{acc.name}</span>
                                </div>
                                <span className="tabular-nums text-[10px] text-muted-foreground">
                                  {formatRupiah(Number(acc.balance) || 0)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer See More */}
          <div className="pt-2 text-center border-t border-border/40">
            <button
              type="button"
              onClick={onSwitchToAdvanced}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              Lihat Semua Transaksi
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* KANAN: ALL EXPENSES & DONUT CHART (lg:col-span-5) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-5"
        >
          {/* Header with Arrow Button */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h4 className="text-sm font-bold text-foreground">Ringkasan Pengeluaran</h4>
              <p className="text-xs text-muted-foreground">Siklus {cycle.label}</p>
            </div>
            <button
              type="button"
              onClick={onSwitchToBudgets}
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center shadow-xs transition-transform active:scale-95"
              title="Ke Halaman Anggaran"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* NevBank 3-Metric Aligned Row (Daily, Weekly/Avg, Monthly) */}
          <div className="grid grid-cols-3 gap-2 py-1 text-center bg-secondary/30 rounded-xl p-2.5 border border-border/40">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Aman / Hari
              </span>
              <span className="text-xs sm:text-sm font-black text-foreground tabular-nums block mt-0.5">
                {formatRupiah(stats.safeToSpend.dailyAmount)}
              </span>
            </div>
            <div className="border-x border-border/40">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Rata-rata
              </span>
              <span className="text-xs sm:text-sm font-black text-foreground tabular-nums block mt-0.5">
                {formatRupiah(avgDailySpending)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Siklus
              </span>
              <span className="text-xs sm:text-sm font-black text-primary tabular-nums block mt-0.5">
                {formatRupiah(stats.expense)}
              </span>
            </div>
          </div>

          {/* Interactive Donut Chart with Center Hole Highlight */}
          <NevBankDonutChart
            transactions={transactions}
            cycle={cycle}
            formatCurrency={formatRupiah}
          />

          {/* Section: Timeline Komitmen 14 Hari */}
          <div className="pt-3 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Timeline Komitmen 14 Hari
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {upcomingCommitments.length} komitmen
              </span>
            </div>

            {upcomingCommitments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-2 text-center bg-secondary/20 rounded-lg">
                Tidak ada tagihan atau termin dalam 14 hari ke depan.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {upcomingCommitments.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-border/60 bg-card hover:bg-secondary/30 transition-colors flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                        <span
                          className={cn(
                            'font-bold px-1 rounded',
                            item.isOverdue
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                              : item.relativeDays === 0
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              : 'bg-secondary text-muted-foreground'
                          )}
                        >
                          {item.isOverdue
                            ? `Terlewat ${Math.abs(item.relativeDays)} hari`
                            : item.relativeDays === 0
                            ? 'Hari ini'
                            : `H-${item.relativeDays}`}
                        </span>
                        <span>•</span>
                        <span className="tabular-nums font-bold text-foreground">
                          {formatRupiah(item.amount)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPayTarget(item.target)}
                      className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 shrink-0 transition-transform active:scale-95"
                    >
                      Bayar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* SECTION TAMBAHAN: TREN ARUS KAS 6 SIKLUS GAJIAN */}
      {/* ========================================================= */}
      <FinanceCharts
        transactions={transactions}
        cycle={cycle}
        startDay={startDay}
        scope={activeScope}
        mode="trend-only"
      />

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}
      {/* Account Ledger Drawer (Mutasi) */}
      <AccountLedgerDrawer
        isOpen={!!ledgerAccount}
        onClose={() => setLedgerAccount(null)}
        account={ledgerAccount}
      />

      {/* Reconcile Modal (Sesuaikan Saldo) */}
      <ReconcileModal
        isOpen={!!reconcileAccount}
        onClose={() => setReconcileAccount(null)}
        account={reconcileAccount}
        onSuccess={() => {
          onRefresh?.()
        }}
      />

      {/* Finance Settings Modal */}
      <FinanceSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userProfile={userProfile as any}
        accounts={savings}
        onSuccess={() => {
          onRefresh?.()
        }}
      />

      {/* Pay From Pocket Modal */}
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

// Backwards compatibility alias
export const GamifiedOverview = FinanceOverview
export type { FinanceOverviewProps as GamifiedOverviewProps }
