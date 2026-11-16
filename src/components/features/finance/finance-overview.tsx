'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Heart,
  TrendingDown,
  Plus,
  Coffee,
  Car,
  ShoppingBag,
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
} from 'lucide-react'
import type { Transaction, Budget, SavingsAccount, Subscription, WeddingBudgetItem } from '@/types'
import { cn } from '@/lib/utils'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { calculateFinancialHealth } from '@/lib/financial-health'
import { FinancialHealthCard } from '@/components/features/finance/financial-health-card'
import { FinanceCharts } from '@/components/features/finance/finance-charts'
import { getBillingCycle, isDateInBillingCycle, calculateDailySafeToSpend } from '@/lib/cycle-utils'
import { PayFromPocketModal, type PayTarget } from '@/components/features/finance/modals/pay-from-pocket-modal'
import { FinanceSettingsModal } from '@/components/features/finance/modals/finance-settings-modal'
import { getSubscriptions } from '@/lib/actions/subscriptions'
import { getWeddingBudgetItems } from '@/lib/actions/wedding'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Scope } from '@/types'

interface FinanceOverviewProps {
  transactions: Transaction[]
  allTransactions?: Transaction[]
  budgets: Budget[]
  savings: SavingsAccount[]
  scope?: Scope | 'all'
  viewMode?: 'me' | 'partner' | 'combined'
  onOpenQuickExpense: () => void
  onSwitchToAdvanced: () => void
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
  onSwitchToAdvanced,
  userRole = 'aegg',
  userProfile,
  onRefresh,
}: FinanceOverviewProps) {
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [weddingItems, setWeddingItems] = useState<WeddingBudgetItem[]>([])

  const { weddingBudgetItems: cachedWedding } = useWorkspaceStore()
  const activeScope: Scope | 'all' = scope || (viewMode === 'combined' ? 'all' : (userRole as Scope))

  // Load subscriptions & wedding items for 14-day timeline & liquidity metrics
  useEffect(() => {
    getSubscriptions().then(setSubscriptions).catch(() => {})
    if (cachedWedding && cachedWedding.length > 0) {
      setWeddingItems(cachedWedding)
    } else {
      getWeddingBudgetItems().then(setWeddingItems).catch(() => {})
    }
  }, [cachedWedding])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  // 1. Dynamic Billing Cycle & Calculations
  const startDay = userProfile?.billing_cycle_start_day ?? 25
  const cycle = useMemo(() => getBillingCycle(startDay), [startDay])

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
      recentExpenses: cycleTx
        .filter((t) => t.type === 'expense')
        .slice(0, 5),
    }
  }, [transactions, budgets, savings, cycle, weddingItems])

  // Multi-POV Contribution Calculations
  const fullTxList = allTransactions || transactions
  const outgoingContributions = useMemo(() => {
    if (activeScope !== 'aegg' && activeScope !== 'peppaa') return 0
    return fullTxList
      .filter((t) => isDateInBillingCycle(t.date, cycle))
      .filter(
        (t) =>
          t.type === 'transfer' &&
          t.transfer_category === 'contribution' &&
          (t.scope === activeScope || t.paid_by === userProfile?.id)
      )
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [fullTxList, cycle, activeScope, userProfile?.id])

  const incomingContributions = useMemo(() => {
    const cycleTx = fullTxList.filter((t) => isDateInBillingCycle(t.date, cycle))
    const contributionTxs = cycleTx.filter(
      (t) => t.type === 'transfer' && t.transfer_category === 'contribution'
    )
    let aegg = 0
    let peppaa = 0
    contributionTxs.forEach((t) => {
      const amt = Number(t.amount) || 0
      if (t.paid_by === userProfile?.id) {
        if (userProfile?.role === 'aegg') aegg += amt
        else peppaa += amt
      } else {
        if (userProfile?.role === 'aegg') peppaa += amt
        else aegg += amt
      }
    })
    return { aegg, peppaa, total: aegg + peppaa }
  }, [fullTxList, cycle, userProfile])

  // 2. Build 14-Day Upcoming Commitments Timeline
  const upcomingCommitments = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 14)
    maxDate.setHours(23, 59, 59, 999)

    const list: TimelineCommitmentItem[] = []
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

    // A. Subscriptions due within 14 days (or overdue this month)
    subscriptions.forEach((sub) => {
      if (!sub.is_active) return
      // Check if already paid this month
      if (sub.last_paid_at && sub.last_paid_at.startsWith(currentMonthYear)) return

      // Determine due date for this month
      const dueDate = new Date(today.getFullYear(), today.getMonth(), sub.due_day)
      const diffMs = dueDate.getTime() - today.getTime()
      const relativeDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

      // Include if overdue (up to -7 days) or due in next 14 days
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

    // B. Wedding Milestones due within 14 days (or overdue)
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

    // Sort earliest / overdue first
    list.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    return list
  }, [subscriptions, weddingItems])

  // Budget status badge
  const statusMeter = useMemo(() => {
    if (stats.budgetPercent <= 60) {
      return {
        label: 'Terkendali',
        desc: 'Pengeluaran siklus ini berada dalam batas anggaran wajar.',
        badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        barColor: 'bg-emerald-500',
        icon: ShieldCheck,
      }
    } else if (stats.budgetPercent <= 85) {
      return {
        label: 'Perhatian',
        desc: 'Pengeluaran telah mencapai 80% dari batas anggaran siklus aktif.',
        badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        barColor: 'bg-amber-500',
        icon: AlertTriangle,
      }
    } else {
      return {
        label: 'Melebihi Anggaran',
        desc: 'Pengeluaran telah melewati batas target anggaran siklus aktif.',
        badgeClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        barColor: 'bg-rose-500',
        icon: AlertCircle,
      }
    }
  }, [stats.budgetPercent])

  const healthReport = useMemo(() => {
    let txToScore = cycleTx
    if (activeScope === 'joint' && !cycleTx.some((t) => t.type === 'income') && incomingContributions.total > 0) {
      txToScore = [
        ...cycleTx,
        {
          id: 'joint-contributions-income',
          user_id: userProfile?.id || '',
          amount: incomingContributions.total,
          type: 'income',
          category: 'contribution',
          date: cycle.startStr,
          created_at: new Date().toISOString(),
        } as Transaction,
      ]
    }
    return calculateFinancialHealth(txToScore, budgets, savings, new Date(), cycle)
  }, [cycleTx, budgets, savings, cycle, activeScope, incomingContributions.total, userProfile?.id])

  const healthCardTitle = useMemo(() => {
    if (activeScope === 'aegg') return 'Evaluasi Keuangan Aegg'
    if (activeScope === 'peppaa') return 'Evaluasi Keuangan Peppaa'
    if (activeScope === 'joint') return 'Evaluasi Kas Bersama'
    return 'Evaluasi Keuangan Bersama'
  }, [activeScope])

  return (
    <div className="space-y-6">
      {/* 0. Intelligent Financial Health Score & Alerts */}
      <FinancialHealthCard
        report={healthReport}
        title={healthCardTitle}
        cycleLabel={cycle.label}
        showCoupleSplit={activeScope === 'joint' || activeScope === 'all'}
      />

      {/* 1. Dynamic Salary Cycle Header & Safe-to-Spend KPI Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dynamic Billing Cycle & Budget Meter (2 cols on lg) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={cn('p-2 rounded-xl border flex items-center justify-center shrink-0', statusMeter.badgeClass)}>
                <statusMeter.icon className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">Siklus Anggaran Gajian</h3>
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full border', statusMeter.badgeClass)}>
                    {statusMeter.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span className="font-semibold text-foreground tabular-nums">{cycle.label}</span>
                  <span>•</span>
                  <span className="text-primary font-medium">
                    {cycle.isTodayPayday ? 'Hari ini Gajian! 🎉' : `${cycle.daysRemaining} hari menuju gajian`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => setShowSettingsModal(true)}
                title="Atur Tanggal Gajian & Rekening Utama"
                className="p-2 rounded-xl border border-border/70 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenQuickExpense}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 active:scale-98 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Pengeluaran
              </button>
            </div>
          </div>

          {/* Progress Bar Realisasi Anggaran */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground tabular-nums">
                Terpakai: {formatRupiah(stats.expense)}
              </span>
              <span className="text-muted-foreground font-medium tabular-nums">
                Batas: {formatRupiah(stats.totalBudget)} ({stats.budgetPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden border border-border/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.budgetPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={cn('h-full rounded-full', statusMeter.barColor)}
              />
            </div>
          </div>
        </motion.div>

        {/* Aman Jajan Hari Ini (Daily Safe-to-Spend KPI Card) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'bg-card border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3',
            stats.safeToSpend.status === 'safe'
              ? 'border-emerald-500/30 ring-1 ring-emerald-500/10'
              : stats.safeToSpend.status === 'warning'
              ? 'border-amber-500/30 ring-1 ring-amber-500/10'
              : 'border-rose-500/30 ring-1 ring-rose-500/10'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Aman Jajan Hari Ini
            </span>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                stats.safeToSpend.status === 'safe'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : stats.safeToSpend.status === 'warning'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
              )}
            >
              {stats.safeToSpend.status === 'safe'
                ? '🟢 Aman'
                : stats.safeToSpend.status === 'warning'
                ? '🟡 Tipis'
                : '🔴 Defisit'}
            </span>
          </div>

          <div>
            <h4 className="text-2xl font-black text-foreground tracking-tight tabular-nums">
              {formatRupiah(stats.safeToSpend.dailyAmount)}
              <span className="text-xs font-medium text-muted-foreground ml-1">/ hari</span>
            </h4>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
              Sisa anggaran {formatRupiah(stats.remainingBudget)} dibagi {cycle.daysRemaining} hari menuju gajian ({cycle.nextPaydayLabel}).
            </p>
          </div>

          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
            Membantu pengeluaran tetap terkontrol tanpa overbudget.
          </div>
        </motion.div>
      </div>

      {/* 2. Main Pockets & Wedding Liquidity Card */}
      <div
        className={cn(
          'grid gap-4',
          activeScope === 'aegg' || activeScope === 'peppaa'
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-3'
        )}
      >
        {/* Pocket A: Dana Bebas Operasional */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-emerald-500/30 rounded-2xl p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Dana Bebas Operasional
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
              🟢 Siap Pakai
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-foreground tracking-tight tabular-nums">
              {formatRupiah(stats.operationalSavings)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Saldo belanja, makan, dan kebutuhan harian
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Bisa dibelanjakan tanpa mengganggu tabungan
          </div>
        </motion.div>

        {/* Pocket B: Dana Terkunci & Likuiditas Vendor Wedding (Hanya di Kas Bersama & Semua) */}
        {activeScope !== 'aegg' && activeScope !== 'peppaa' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={cn(
              'bg-card border rounded-2xl p-5 shadow-xs space-y-3',
              stats.weddingLiquidityDelta >= 0 ? 'border-amber-500/30' : 'border-rose-500/30'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-amber-500" />
                Dana Terkunci (Nikah & Impian)
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                  stats.weddingLiquidityDelta >= 0
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20'
                )}
              >
                {stats.weddingLiquidityDelta >= 0 ? '🟢 Likuiditas Aman' : '🔴 Defisit Vendor'}
              </span>
            </div>
            <div>
              <h4 className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight tabular-nums">
                {formatRupiah(stats.lockedSavings)}
              </h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Sisa Vendor:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatRupiah(stats.totalUnpaidVendor)}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.weddingLiquidityDelta >= 0
                ? `Surplus likuiditas: +${formatRupiah(stats.weddingLiquidityDelta)} dari komitmen vendor.`
                : `Perlu top-up ${formatRupiah(Math.abs(stats.weddingLiquidityDelta))} untuk melunasi vendor.`}
            </div>
          </motion.div>
        )}

        {/* Pocket C: POV-Tailored Contribution / Consolidated Card */}
        {activeScope === 'aegg' || activeScope === 'peppaa' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Kontribusi ke Kas Bersama
              </span>
              <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                📤 Siklus Ini
              </span>
            </div>
            <div>
              <h4 className="text-2xl font-black text-foreground tracking-tight tabular-nums">
                {formatRupiah(outgoingContributions)}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alokasi dari kantong {activeScope === 'aegg' ? 'Aegg' : 'Peppaa'} untuk kas bersama
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {outgoingContributions > 0
                ? 'Tercatat sebagai transfer kontribusi ke kas pasangan & nikah.'
                : 'Belum ada transfer kontribusi di siklus gaji aktif ini.'}
            </div>
          </motion.div>
        ) : activeScope === 'joint' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                Kontribusi Masuk Pasangan
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                📥 Kas Bersama
              </span>
            </div>
            <div>
              <h4 className="text-2xl font-black text-foreground tracking-tight tabular-nums">
                {formatRupiah(incomingContributions.total)}
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                <span>Aegg: <strong className="text-foreground tabular-nums">{formatRupiah(incomingContributions.aegg)}</strong></span>
                <span>•</span>
                <span>Peppaa: <strong className="text-foreground tabular-nums">{formatRupiah(incomingContributions.peppaa)}</strong></span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Total transfer masuk untuk mendanai operasional & vendor wedding
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Total Likuiditas Gabungan
              </span>
              <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
                {savings.length} Kantong
              </span>
            </div>
            <div>
              <h4 className="text-2xl font-black text-foreground tracking-tight tabular-nums">
                {formatRupiah(stats.totalSavingsAmount)}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total seluruh rekening bank, e-wallet & kas
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              Seluruh saldo terdata & sinkron realtime
            </div>
          </motion.div>
        )}
      </div>

      {/* 2.5. Intelligent Anti-Slop Visual Finance Charts */}
      <FinanceCharts
        transactions={transactions}
        cycle={cycle}
        startDay={startDay}
        scope={activeScope}
      />

      {/* 3. Timeline Komitmen 14 Hari & 1-Click Bayar dari Kantong */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Timeline Komitmen 14 Hari</h4>
              <p className="text-xs text-muted-foreground">
                Jadwal tagihan rutin & termin vendor yang mendekati jatuh tempo
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-1 bg-secondary rounded-lg text-muted-foreground">
            {upcomingCommitments.length} komitmen aktif
          </span>
        </div>

        {upcomingCommitments.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border/70">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
            <p className="font-semibold text-foreground">Tidak ada komitmen jatuh tempo dalam 14 hari</p>
            <p className="mt-0.5">Semua tagihan rutin dan termin vendor pernikahan masih aman terkendali.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingCommitments.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                  item.isOverdue
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-border/70 bg-card hover:bg-secondary/30'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5',
                      item.category === 'wedding'
                        ? 'bg-pink-500/10 text-pink-600 border-pink-500/20'
                        : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                    )}
                  >
                    {item.category === 'wedding' ? (
                      <Heart className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.2 rounded',
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
                      <span className="text-[10px] text-muted-foreground">({item.dueDateStr})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                  <span className="text-sm font-extrabold text-foreground tabular-nums">
                    {formatRupiah(item.amount)}
                  </span>
                  <button
                    onClick={() => setPayTarget(item.target)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Bayar dari Kantong
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent Transactions List */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Transaksi Terakhir
            </h4>
            <p className="text-xs text-muted-foreground">
              Aktivitas pengeluaran tercatat dalam siklus aktif
            </p>
          </div>
          <button
            onClick={onSwitchToAdvanced}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Lihat Semua Transaksi
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-border/50">
          {stats.recentExpenses.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Belum ada transaksi pengeluaran tercatat untuk siklus ini.
            </div>
          ) : (
            stats.recentExpenses.map((tx) => {
              const role = (tx as any).profiles?.role || 'aegg'
              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground text-xs font-bold border border-border/60">
                      {tx.category ? tx.category.substring(0, 2).toUpperCase() : 'TX'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {tx.description || tx.category}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                        <span>{tx.date}</span>
                        {tx.source === 'whatsapp' ? (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider inline-flex items-center"
                            title="Dicatat otomatis lewat WhatsApp Nanang"
                          >
                            WA
                          </span>
                        ) : (
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/50 uppercase tracking-wider"
                            title="Dicatat lewat Web Dashboard"
                          >
                            Web
                          </span>
                        )}
                        <span>•</span>
                        <OwnerBadge role={role} compact />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    - {formatRupiah(tx.amount)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

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
