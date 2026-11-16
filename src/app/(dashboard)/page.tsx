'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar, Clock, Plus, ArrowRight, Search,
  Target, CheckSquare, Wallet, Gift, Home,
  CheckCircle2, ShoppingBag, Sparkles, ChevronRight,
  HeartHandshake, ShieldCheck, AlertCircle, ArrowUpRight,
} from 'lucide-react'
import { getTodos, toggleTodo } from '@/lib/actions/todos'
import { getGoals } from '@/lib/actions/goals'
import { getEvents } from '@/lib/actions/calendar'
import { getSavingsAccounts, getBudgets, getTransactions } from '@/lib/actions/finance'
import { getSubscriptions } from '@/lib/actions/subscriptions'
import { getWeddingSettings, getWeddingBudgetItems } from '@/lib/actions/wedding'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { isSameDay, format } from 'date-fns'
import {
  getTodayWIB,
  getNowWIBDate,
  getBillingCycle,
  isDateInBillingCycle,
  calculateDailySafeToSpend,
} from '@/lib/cycle-utils'
import type {
  Todo, CalendarEvent, Goal, Transaction, Budget,
  SavingsAccount, Subscription, WeddingBudgetItem, WeddingSettings
} from '@/types'

interface RecentItem {
  id: string
  title: string
  type: 'goal' | 'todo' | 'event' | 'finance'
  href: string
  user: string
  timestamp: string
  rawDate: string
  status: string
  statusColor: string
}

interface UpcomingCommitment {
  id: string
  title: string
  date: string
  type: 'calendar' | 'subscription' | 'wedding'
  amount?: number
  badgeLabel: string
  badgeColor: string
  href: string
}

function buildRecentItems(todoList: Todo[], goalList: Goal[], eventList: CalendarEvent[]): RecentItem[] {
  const items: RecentItem[] = []
  const now = new Date()

  for (const todo of (todoList || []).slice(0, 3)) {
    const role = (todo as any).profiles?.role || 'aegg'
    items.push({
      id: `todo-${todo.id}`,
      title: todo.title,
      type: 'todo',
      href: '/todos',
      user: role,
      timestamp: formatRelativeTime(todo.created_at),
      rawDate: todo.created_at,
      status: todo.completed ? 'Selesai' : todo.priority === 'high' ? 'Prioritas Tinggi' : 'Aktif',
      statusColor: todo.completed
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : todo.priority === 'high'
          ? 'bg-red-500/10 text-red-600 dark:text-red-400'
          : 'bg-primary/10 text-primary',
    })
  }

  for (const goal of (goalList || []).slice(0, 3)) {
    const role = (goal as any).profiles?.role || 'aegg'
    const statusMap: Record<string, string> = {
      backlog: 'Rencana',
      in_progress: 'Sedang Berjalan',
      completed: 'Tercapai',
      archived: 'Arsip',
    }
    items.push({
      id: `goal-${goal.id}`,
      title: goal.title,
      type: 'goal',
      href: '/goals',
      user: role,
      timestamp: formatRelativeTime(goal.created_at),
      rawDate: goal.created_at,
      status: statusMap[goal.status] || goal.status,
      statusColor: goal.status === 'completed'
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : goal.status === 'in_progress'
          ? 'bg-primary/10 text-primary'
          : 'bg-secondary text-muted-foreground',
    })
  }

  for (const event of (eventList || []).slice(0, 3)) {
    const isUpcoming = new Date(event.start_date) >= now
    items.push({
      id: `event-${event.id}`,
      title: event.title,
      type: 'event',
      href: '/calendar',
      user: (event as any).profiles?.role || 'aegg',
      timestamp: formatRelativeTime(event.created_at),
      rawDate: event.created_at,
      status: isUpcoming ? 'Mendatang' : 'Selesai',
      statusColor: isUpcoming
        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
        : 'bg-secondary text-muted-foreground',
    })
  }

  items.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())
  return items.slice(0, 6)
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const {
    todos: cachedTodos,
    goals: cachedGoals,
    events: cachedEvents,
    savings: cachedSavings,
    budgets: cachedBudgets,
    transactions: cachedTransactions,
    weddingSettings: cachedWeddingSettings,
    weddingBudgetItems: cachedWeddingBudgetItems,
    dashboardLoaded,
    setDashboardData,
  } = useWorkspaceStore()

  const [greeting, setGreeting] = useState('Halo')
  const [todos, setTodos] = useState<Todo[]>(cachedTodos)
  const [goals, setGoals] = useState<Goal[]>(cachedGoals)
  const [events, setEvents] = useState<CalendarEvent[]>(cachedEvents)
  const [savings, setSavings] = useState<SavingsAccount[]>(cachedSavings)
  const [budgets, setBudgets] = useState<Budget[]>(cachedBudgets)
  const [transactions, setTransactions] = useState<Transaction[]>(cachedTransactions)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [weddingSettings, setWeddingSettings] = useState<WeddingSettings | null>(cachedWeddingSettings)
  const [weddingBudgetItems, setWeddingBudgetItems] = useState<WeddingBudgetItem[]>(cachedWeddingBudgetItems)
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() =>
    buildRecentItems(cachedTodos, cachedGoals, cachedEvents)
  )
  const [togglingTodoId, setTogglingTodoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!dashboardLoaded && cachedTodos.length === 0)

  // Hydration sync
  useEffect(() => {
    if (cachedTodos.length > 0) setTodos(cachedTodos)
  }, [cachedTodos])

  useEffect(() => {
    if (cachedGoals.length > 0) setGoals(cachedGoals)
  }, [cachedGoals])

  useEffect(() => {
    if (cachedEvents.length > 0) setEvents(cachedEvents)
  }, [cachedEvents])

  useEffect(() => {
    if (cachedSavings.length > 0) setSavings(cachedSavings)
  }, [cachedSavings])

  useEffect(() => {
    if (cachedBudgets.length > 0) setBudgets(cachedBudgets)
  }, [cachedBudgets])

  useEffect(() => {
    if (cachedTransactions.length > 0) setTransactions(cachedTransactions)
  }, [cachedTransactions])

  useEffect(() => {
    if (cachedWeddingSettings) setWeddingSettings(cachedWeddingSettings)
  }, [cachedWeddingSettings])

  useEffect(() => {
    if (cachedWeddingBudgetItems.length > 0) setWeddingBudgetItems(cachedWeddingBudgetItems)
  }, [cachedWeddingBudgetItems])

  useEffect(() => {
    // 1. Set Greeting based on WIB hour
    const updateTime = () => {
      const hours = new Date().getHours()
      if (hours >= 5 && hours < 11) setGreeting('Selamat Pagi')
      else if (hours >= 11 && hours < 15) setGreeting('Selamat Siang')
      else if (hours >= 15 && hours < 18) setGreeting('Selamat Sore')
      else setGreeting('Selamat Malam')
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    // 2. Fetch fresh data in background
    fetchDashboardData()

    const handleOnline = () => fetchDashboardData()
    window.addEventListener('online', handleOnline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const fetchDashboardData = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false)
      return
    }
    try {
      const results = await Promise.allSettled([
        getTodos(),
        getGoals(),
        getEvents(),
        getSavingsAccounts(),
        getBudgets(),
        getTransactions(),
        getSubscriptions(),
        getWeddingSettings(),
        getWeddingBudgetItems(),
      ])

      const fetchedTodos = results[0].status === 'fulfilled' ? results[0].value : []
      const fetchedGoals = results[1].status === 'fulfilled' ? results[1].value : []
      const fetchedEvents = results[2].status === 'fulfilled' ? results[2].value : []
      const fetchedSavings = results[3].status === 'fulfilled' ? results[3].value : []
      const fetchedBudgets = results[4].status === 'fulfilled' ? results[4].value : []
      const fetchedTransactions = results[5].status === 'fulfilled' ? results[5].value : []
      const fetchedSubs = results[6].status === 'fulfilled' ? results[6].value : []
      const fetchedWeddingSettings = results[7].status === 'fulfilled' ? results[7].value : null
      const fetchedWeddingBudgetItems = results[8].status === 'fulfilled' ? results[8].value : []

      setTodos(fetchedTodos)
      setGoals(fetchedGoals)
      setEvents(fetchedEvents)
      setSavings(fetchedSavings)
      setBudgets(fetchedBudgets)
      setTransactions(fetchedTransactions)
      setSubscriptions(fetchedSubs)
      setWeddingSettings(fetchedWeddingSettings)
      setWeddingBudgetItems(fetchedWeddingBudgetItems)
      setRecentItems(buildRecentItems(fetchedTodos, fetchedGoals, fetchedEvents))

      setDashboardData({
        todos: fetchedTodos,
        goals: fetchedGoals,
        events: fetchedEvents,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Wedding Countdown
  const weddingCountdown = useMemo(() => {
    if (!weddingSettings?.wedding_date) return null
    const [wYear, wMonth, wDay] = weddingSettings.wedding_date.split('-').map(Number)
    const weddingDate = new Date(wYear, wMonth - 1, wDay)
    const today = getNowWIBDate()
    const diffMs = weddingDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    const dateFormatted = weddingDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return {
      daysRemaining: diffDays,
      dateFormatted,
      isPast: diffDays < 0,
      isToday: diffDays === 0,
    }
  }, [weddingSettings?.wedding_date])

  // Daily Safe-to-Spend
  const dailySafeSpend = useMemo(() => {
    const cycle = getBillingCycle(profile?.billing_cycle_start_day || 25, getNowWIBDate())
    const totalBudget = budgets.reduce((acc, b) => acc + (b.amount || 0), 0)
    const cycleExpenses = transactions
      .filter((t) => t.type === 'expense' && isDateInBillingCycle(t.date, cycle))
      .reduce((acc, t) => acc + (t.amount || 0), 0)

    const remainingBudget = Math.max(0, totalBudget - cycleExpenses)
    const safeResult = calculateDailySafeToSpend(remainingBudget, cycle.daysRemaining)

    return {
      ...safeResult,
      cycle,
      totalBudget,
      remainingBudget,
      hasBudget: totalBudget > 0,
    }
  }, [budgets, transactions, profile?.billing_cycle_start_day])

  // Locked Wedding Fund
  const weddingFund = useMemo(() => {
    const lockedTotal = savings
      .filter((s) => s.is_locked || s.name.toLowerCase().includes('nikah') || s.name.toLowerCase().includes('wedding'))
      .reduce((acc, s) => acc + (s.balance || 0), 0)

    const target = weddingSettings?.target_budget || 25000000
    const progress = target > 0 ? Math.min(100, Math.round((lockedTotal / target) * 100)) : 0

    return {
      lockedTotal,
      target,
      progress,
    }
  }, [savings, weddingSettings?.target_budget])

  // 3 Nearest Upcoming Commitments
  const upcomingCommitments = useMemo(() => {
    const todayStr = getTodayWIB()
    const items: UpcomingCommitment[] = []

    // 1. Calendar events
    for (const ev of events) {
      const dStr = ev.start_date.slice(0, 10)
      if (dStr >= todayStr) {
        items.push({
          id: `ev-${ev.id}`,
          title: ev.title,
          date: dStr,
          type: 'calendar',
          badgeLabel: 'Agenda',
          badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
          href: '/calendar',
        })
      }
    }

    // 2. Subscriptions
    for (const sub of subscriptions) {
      if (!sub.is_active) continue
      const now = getNowWIBDate()
      const y = now.getFullYear()
      const m = now.getMonth()
      const d = now.getDate()
      let targetY = y
      let targetM = m
      if (d > sub.due_day) {
        targetM = m + 1
        if (targetM > 11) {
          targetM = 0
          targetY = y + 1
        }
      }
      const subDateStr = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(Math.min(sub.due_day, 28)).padStart(2, '0')}`
      if (subDateStr >= todayStr) {
        items.push({
          id: `sub-${sub.id}`,
          title: sub.name,
          date: subDateStr,
          type: 'subscription',
          amount: sub.amount,
          badgeLabel: 'Tagihan Rutin',
          badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          href: '/finance?tab=subscriptions',
        })
      }
    }

    // 3. Wedding Milestones
    for (const w of weddingBudgetItems) {
      if (w.dp_due_date && !w.dp_paid && w.dp_due_date >= todayStr) {
        items.push({
          id: `w-dp-${w.id}`,
          title: `DP: ${w.title}`,
          date: w.dp_due_date,
          type: 'wedding',
          amount: w.dp_amount || undefined,
          badgeLabel: 'Vendor Nikah',
          badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
          href: '/wedding?tab=budget',
        })
      } else if (w.termin2_due_date && !w.termin2_paid && w.termin2_due_date >= todayStr) {
        items.push({
          id: `w-t2-${w.id}`,
          title: `Termin 2: ${w.title}`,
          date: w.termin2_due_date,
          type: 'wedding',
          amount: w.termin2_amount || undefined,
          badgeLabel: 'Vendor Nikah',
          badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
          href: '/wedding?tab=budget',
        })
      } else if (w.pelunasan_due_date && !w.pelunasan_paid && w.pelunasan_due_date >= todayStr) {
        items.push({
          id: `w-pelunasan-${w.id}`,
          title: `Pelunasan: ${w.title}`,
          date: w.pelunasan_due_date,
          type: 'wedding',
          amount: w.pelunasan_amount || undefined,
          badgeLabel: 'Vendor Nikah',
          badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
          href: '/wedding?tab=budget',
        })
      } else if (w.due_date && w.status !== 'paid_off' && w.due_date >= todayStr) {
        items.push({
          id: `w-due-${w.id}`,
          title: w.title,
          date: w.due_date,
          type: 'wedding',
          amount: w.actual_cost || w.estimated_cost,
          badgeLabel: 'Vendor Nikah',
          badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
          href: '/wedding?tab=budget',
        })
      }
    }

    items.sort((a, b) => a.date.localeCompare(b.date))
    return items.slice(0, 3)
  }, [events, subscriptions, weddingBudgetItems])

  // Active groceries / shopping items
  const activeGroceries = useMemo(() => {
    return todos.filter(t =>
      !t.completed &&
      (t.category === 'shopping' ||
        t.title.toLowerCase().startsWith('beli') ||
        t.title.toLowerCase().startsWith('belanja'))
    ).slice(0, 5)
  }, [todos])

  // Quick toggle shopping item
  const handleToggleGrocery = async (id: string, currentStatus: boolean) => {
    setTogglingTodoId(id)
    try {
      const newStatus = !currentStatus
      await toggleTodo(id, newStatus)
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t))
    } catch (err) {
      console.error('Failed to toggle grocery:', err)
    } finally {
      setTogglingTodoId(null)
    }
  }

  const userDisplayName = profile?.display_name || 'Aegg & Peppaa'

  return (
    <>
      <Header title="Home" icon={Home} />

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        {/* 1. Header Greeting & Wedding Banner */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  AeggPepp Life OS
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                Halo, {userDisplayName}! 👋
              </h1>
              <p className="text-xs text-muted-foreground">
                {greeting}! Berikut ringkasan aman jajan, dana nikah, dan komitmen terdekat kita hari ini.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/wedding"
                className="px-3.5 py-2 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-semibold hover:bg-pink-500/20 border border-pink-500/20 transition-colors flex items-center gap-1.5"
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                Wedding Hub
              </Link>
              <Link
                href="/finance"
                className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Keuangan
              </Link>
            </div>
          </div>

          {/* Wedding Countdown Banner */}
          {weddingCountdown ? (
            <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-pink-500/10 text-pink-500">💍</span>
                <span className="font-semibold text-foreground">
                  {weddingCountdown.isToday
                    ? 'Hari Pernikahan Kita Tiba Hari Ini! 🎉'
                    : weddingCountdown.isPast
                      ? 'Hari Bahagia Telah Berlangsung'
                      : `H-${weddingCountdown.daysRemaining} Menuju Hari Bahagia`}
                </span>
                <span className="text-muted-foreground font-normal">
                  ({weddingCountdown.dateFormatted})
                </span>
              </div>
              <Link
                href="/wedding"
                className="text-pink-600 dark:text-pink-400 font-semibold hover:underline inline-flex items-center gap-1"
              >
                Buka Rencana Wedding <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="p-1 rounded-md bg-pink-500/10 text-pink-500">💍</span>
                Belum ada tanggal pernikahan yang diset.
              </span>
              <Link href="/wedding?tab=budget" className="text-primary font-semibold hover:underline">
                Atur Tanggal Nikah
              </Link>
            </div>
          )}
        </motion.section>

        {/* 2. Key Metrics: Aman Jajan Hari Ini & Dana Nikah */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Aman Jajan Hari Ini */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aman Jajan Hari Ini</h3>
                  <p className="text-[11px] text-muted-foreground">Sisa siklus ({dailySafeSpend.cycle.daysRemaining} hari lagi)</p>
                </div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                dailySafeSpend.status === 'safe'
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : dailySafeSpend.status === 'warning'
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}>
                {dailySafeSpend.status === 'safe' ? 'Aman' : dailySafeSpend.status === 'warning' ? 'Waspada' : 'Kritis'}
              </span>
            </div>

            <div>
              <p className="text-2xl md:text-3xl font-bold font-mono text-foreground tracking-tight tabular-nums truncate">
                {formatCurrency(dailySafeSpend.dailyAmount)}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ hari</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {dailySafeSpend.hasBudget
                  ? `Sisa anggaran siklus: ${formatCurrency(dailySafeSpend.remainingBudget)} (Gajian ${dailySafeSpend.cycle.nextPaydayLabel})`
                  : 'Belum ada limit anggaran. Atur di menu Finance agar kalkulasi lebih presisi.'}
              </p>
            </div>

            <Link
              href="/finance"
              className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 pt-1"
            >
              Lihat Detail Siklus Keuangan <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          {/* Card 2: Total Dana Nikah */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-600 dark:text-pink-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Dana Nikah</h3>
                  <p className="text-[11px] text-muted-foreground">Terkunci di Kantong Tabungan</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                {weddingFund.progress}% Tercapai
              </span>
            </div>

            <div>
              <p className="text-2xl md:text-3xl font-bold font-mono text-foreground tracking-tight tabular-nums truncate">
                {formatCurrency(weddingFund.lockedTotal)}
              </p>
              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${weddingFund.progress}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex justify-between">
                <span>Target: {formatCurrency(weddingFund.target)}</span>
                <span>Kekurangan: {formatCurrency(Math.max(0, weddingFund.target - weddingFund.lockedTotal))}</span>
              </p>
            </div>

            <Link
              href="/wedding?tab=budget"
              className="text-xs text-pink-600 dark:text-pink-400 font-semibold hover:underline inline-flex items-center gap-1 pt-1"
            >
              Kelola Alokasi Vendor Nikah <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        </section>

        {/* 3. Nearest Commitments & Belanjaan Hari Ini */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: 3 Nearest Upcoming Commitments */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">3 Agenda & Komitmen Terdekat</h3>
              </div>
              <Link href="/calendar" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Semua Agenda <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Memuat komitmen...</div>
            ) : upcomingCommitments.length === 0 ? (
              <div className="py-6 px-4 rounded-lg bg-secondary/30 text-center space-y-1 border border-dashed border-border">
                <p className="text-xs font-medium text-foreground">Tidak ada komitmen mendesak</p>
                <p className="text-[11px] text-muted-foreground">Semua agenda dan pembayaran dalam kondisi tenang.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingCommitments.map(item => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border flex items-center justify-between gap-3 transition-colors block"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold shrink-0", item.badgeColor)}>
                          {item.badgeLabel}
                        </span>
                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.date} {item.amount ? `· ${formatCurrency(item.amount)}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right: Belanjaan & Kebutuhan Aktif */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-pink-500" />
                <h3 className="text-sm font-semibold text-foreground">Belanjaan & Kebutuhan Aktif</h3>
              </div>
              <Link href="/todos" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Kelola Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Memuat belanjaan...</div>
            ) : activeGroceries.length === 0 ? (
              <div className="py-6 px-4 rounded-lg bg-secondary/30 text-center space-y-1 border border-dashed border-border">
                <p className="text-xs font-medium text-foreground">Semua belanjaan sudah terbeli</p>
                <p className="text-[11px] text-muted-foreground">Catat kebutuhan baru di menu Todos atau lewat WA Nanang.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeGroceries.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-secondary/50 border border-border flex items-center justify-between gap-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => handleToggleGrocery(item.id, item.completed)}
                        disabled={togglingTodoId === item.id}
                        className="w-4 h-4 rounded border border-border flex items-center justify-center bg-background hover:border-primary transition-colors shrink-0"
                      >
                        {item.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <span className="text-xs font-medium text-foreground truncate">{item.title}</span>
                    </div>
                    <OwnerBadge role={item.profiles?.role || 'aegg'} compact />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 4. Recent Activity */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>Aktivitas Terkini</span>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-xs">Memuat aktivitas...</div>
            ) : recentItems.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-primary/60" />
                </div>
                <p className="text-xs font-medium text-foreground">Belum ada aktivitas baru</p>
                <p className="text-[11px] text-muted-foreground">Mulai dengan mencatat tugas, target, atau agenda bersama!</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentItems.map((item, index) => {
                  const ItemIcon =
                    item.type === 'todo' ? CheckCircle2 :
                    item.type === 'goal' ? Target :
                    item.type === 'event' ? Calendar : Wallet

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <ItemIcon className="w-3.5 h-3.5 text-foreground/80" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[9px] font-semibold",
                              item.statusColor
                            )}>
                              {item.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.timestamp}
                            </span>
                          </div>
                        </div>

                        <OwnerBadge role={item.user} className="hidden sm:inline-flex shrink-0" />
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* 5. Clean Quick Actions Bar */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5" />
            <span>Aksi Cepat</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {[
              { label: 'Tugas Baru', icon: CheckSquare, href: '/todos' },
              { label: 'Target Baru', icon: Target, href: '/goals' },
              { label: 'Agenda Baru', icon: Calendar, href: '/calendar' },
              { label: 'Catat Pengeluaran', icon: Wallet, href: '/finance' },
              { label: 'Wishlist Baru', icon: Gift, href: '/wishlist' },
            ].map((action) => {
              const ActionIcon = action.icon
              return (
                <Link key={action.label} href={action.href} className="shrink-0">
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-card border border-border rounded-lg hover:bg-secondary hover:border-primary/30 transition-all text-xs font-medium shadow-xs">
                    <ActionIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{action.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins}m lalu`
  if (diffHours < 24) return `${diffHours}j lalu`
  if (diffDays < 7) return `${diffDays}h lalu`
  return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
}
