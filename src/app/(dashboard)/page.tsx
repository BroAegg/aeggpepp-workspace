'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar, Clock, Plus, ArrowRight, Search,
  Target, CheckSquare, Wallet, Gift, Home,
  CheckCircle2, ShoppingBag, Sparkles, ChevronRight,
} from 'lucide-react'
import { getTodos, toggleTodo } from '@/lib/actions/todos'
import { getGoals } from '@/lib/actions/goals'
import { getEvents } from '@/lib/actions/calendar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { isSameDay } from 'date-fns'
import type { Todo, CalendarEvent, Goal } from '@/types'

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

export default function DashboardPage() {
  const { profile } = useAuth()
  const {
    todos: cachedTodos,
    goals: cachedGoals,
    events: cachedEvents,
    dashboardLoaded,
    setDashboardData,
  } = useWorkspaceStore()

  const [greeting, setGreeting] = useState('')
  const [todos, setTodos] = useState<Todo[]>(cachedTodos)
  const [goals, setGoals] = useState<Goal[]>(cachedGoals)
  const [events, setEvents] = useState<CalendarEvent[]>(cachedEvents)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [togglingTodoId, setTogglingTodoId] = useState<string | null>(null)

  const [stats, setStats] = useState({
    activeTodos: cachedTodos.filter(t => !t.completed).length,
    upcomingEvents: cachedEvents.filter(e => new Date(e.start_date) >= new Date()).length,
    activeGoals: cachedGoals.filter(g => g.status === 'in_progress').length,
  })
  const [loading, setLoading] = useState(!dashboardLoaded && cachedTodos.length === 0)

  useEffect(() => {
    // 1. Set Greeting
    const updateTime = () => {
      const hours = new Date().getHours()
      if (hours >= 5 && hours < 11) setGreeting('Selamat Pagi')
      else if (hours >= 11 && hours < 15) setGreeting('Selamat Siang')
      else if (hours >= 15 && hours < 18) setGreeting('Selamat Sore')
      else setGreeting('Selamat Malam')
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    // 2. Fetch real data
    fetchDashboardData()

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const results = await Promise.allSettled([
        getTodos(),
        getGoals(),
        getEvents(),
      ])

      const fetchedTodos = results[0].status === 'fulfilled' ? results[0].value : []
      const fetchedGoals = results[1].status === 'fulfilled' ? results[1].value : []
      const fetchedEvents = results[2].status === 'fulfilled' ? results[2].value : []

      setTodos(fetchedTodos)
      setGoals(fetchedGoals)
      setEvents(fetchedEvents)

      // Stats
      const activeTodos = fetchedTodos.filter(t => !t.completed).length
      const now = new Date()
      const upcomingEvents = fetchedEvents.filter(e => new Date(e.start_date) >= now).length
      const activeGoals = fetchedGoals.filter(g => g.status === 'in_progress').length

      setStats({ activeTodos, upcomingEvents, activeGoals })
      setDashboardData({ todos: fetchedTodos, goals: fetchedGoals, events: fetchedEvents })

      // Build recent items from real data
      const items: RecentItem[] = []

      // Recent todos
      for (const todo of fetchedTodos.slice(0, 3)) {
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

      // Recent goals
      for (const goal of fetchedGoals.slice(0, 3)) {
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

      // Recent events
      for (const event of fetchedEvents.slice(0, 3)) {
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

      // Sort by most recent first
      items.sort((a, b) => {
        return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      })

      setRecentItems(items.slice(0, 6))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Today's events
  const todayEvents = useMemo(() => {
    const today = new Date()
    return events.filter(e => isSameDay(new Date(e.start_date), today))
  }, [events])

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

  return (
    <>
      <Header title="Home" icon={Home} />

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        {/* 1. Header Overview Banner */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-2xs space-y-4"
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
                {greeting}, {profile?.display_name || 'Aegg & Peppaa'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Ringkasan agenda, belanja bersama, dan target pernikahan kita hari ini.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/goals"
                className="px-3.5 py-2 rounded-lg bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 border border-border transition-colors flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5 text-orange-500" />
                Target Bersama
              </Link>
              <Link
                href="/finance"
                className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Catat Keuangan
              </Link>
            </div>
          </div>
        </motion.section>

        {/* 2. Stats Cards */}
        <section className="grid grid-cols-3 gap-3 md:gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Link href="/todos" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground font-medium">Tugas Aktif</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : stats.activeTodos}</p>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href="/calendar" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground font-medium">Agenda Mendatang</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : stats.upcomingEvents}</p>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link href="/goals" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">Target Berjalan</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : stats.activeGoals}</p>
            </Link>
          </motion.div>
        </section>

        {/* 3. Actionable Daily Command Center: Agenda & Belanjaan Hari Ini */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Agenda Hari Ini */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">Agenda Kalender Hari Ini</h3>
              </div>
              <Link href="/calendar" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Lihat Kalender <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Memuat agenda...</div>
            ) : todayEvents.length === 0 ? (
              <div className="py-6 px-4 rounded-lg bg-secondary/30 text-center space-y-1 border border-dashed border-border">
                <p className="text-xs font-medium text-foreground">Tidak ada agenda khusus hari ini</p>
                <p className="text-[11px] text-muted-foreground">Waktu santai dan produktif bersama!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayEvents.map(event => (
                  <div key={event.id} className="p-2.5 rounded-lg bg-secondary/50 border border-border flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {event.all_day ? 'Sepanjang Hari' : new Date(event.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <OwnerBadge role={(event as any).profiles?.role || 'aegg'} compact />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Belanjaan Aktif */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-3">
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
                <p className="text-[11px] text-muted-foreground">Ketik /belanja di Telegram untuk tambah baru.</p>
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

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xs">
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
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-card border border-border rounded-lg hover:bg-secondary hover:border-primary/30 transition-all text-xs font-medium shadow-2xs">
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

// Helper: format relative time
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
