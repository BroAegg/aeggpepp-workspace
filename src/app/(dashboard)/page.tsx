'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar, Clock, Plus, ArrowRight, Search,
  Target, CheckSquare, Wallet, Gift,
} from 'lucide-react'
import { getUser } from '@/lib/actions/auth'
import { getTodos } from '@/lib/actions/todos'
import { getGoals } from '@/lib/actions/goals'
import { getEvents } from '@/lib/actions/calendar'
import { cn } from '@/lib/utils'

interface RecentItem {
  id: string
  title: string
  type: 'goal' | 'todo' | 'event' | 'finance'
  icon: string
  href: string
  user: string
  timestamp: string
  rawDate: string
  status: string
  statusColor: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [greeting, setGreeting] = useState('')
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [stats, setStats] = useState({
    activeTodos: 0,
    upcomingEvents: 0,
    activeGoals: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch User Profile
    getUser().then((data) => {
      if (data) setProfile(data)
    })

    // 2. Set Greeting
    const updateTime = () => {
      const hours = new Date().getHours()
      if (hours >= 5 && hours < 11) setGreeting('Good Morning')
      else if (hours >= 11 && hours < 15) setGreeting('Good Afternoon')
      else if (hours >= 15 && hours < 18) setGreeting('Good Evening')
      else setGreeting('Good Night')
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)

    // 3. Fetch real data
    fetchDashboardData()

    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [todos, goals, events] = await Promise.all([
        getTodos(),
        getGoals(),
        getEvents(),
      ])

      // Stats
      const activeTodos = todos.filter(t => !t.completed).length
      const now = new Date()
      const upcomingEvents = events.filter(e => new Date(e.start_date) >= now).length
      const activeGoals = goals.filter(g => g.status === 'in_progress').length

      setStats({ activeTodos, upcomingEvents, activeGoals })

      // Build recent items from real data
      const items: RecentItem[] = []

      // Recent todos
      for (const todo of todos.slice(0, 3)) {
        const role = (todo as any).profiles?.role || 'aegg'
        items.push({
          id: `todo-${todo.id}`,
          title: todo.title,
          type: 'todo',
          icon: '✅',
          href: '/todos',
          user: role,
          timestamp: formatRelativeTime(todo.created_at),
          rawDate: todo.created_at,
          status: todo.completed ? 'Completed' : todo.priority === 'high' ? 'High Priority' : 'Active',
          statusColor: todo.completed
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : todo.priority === 'high'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
        })
      }

      // Recent goals
      for (const goal of goals.slice(0, 3)) {
        const role = (goal as any).profiles?.role || 'aegg'
        const statusMap: Record<string, string> = {
          backlog: 'Backlog',
          in_progress: 'In Progress',
          completed: 'Completed',
          archived: 'Archived',
        }
        items.push({
          id: `goal-${goal.id}`,
          title: goal.title,
          type: 'goal',
          icon: '🎯',
          href: '/goals',
          user: role,
          timestamp: formatRelativeTime(goal.created_at),
          rawDate: goal.created_at,
          status: statusMap[goal.status] || goal.status,
          statusColor: goal.status === 'completed'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : goal.status === 'in_progress'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
        })
      }

      // Recent events
      for (const event of events.slice(0, 3)) {
        const isUpcoming = new Date(event.start_date) >= now
        items.push({
          id: `event-${event.id}`,
          title: event.title,
          type: 'event',
          icon: '📅',
          href: '/calendar',
          user: (event as any).profiles?.role || 'aegg',
          timestamp: formatRelativeTime(event.created_at),
          rawDate: event.created_at,
          status: isUpcoming ? 'Upcoming' : 'Past',
          statusColor: isUpcoming
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
        })
      }

      // Sort by most recent first
      items.sort((a, b) => {
        return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      })

      setRecentItems(items.slice(0, 8))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header title="Home" emoji="🏠" />

      <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-12">
        {/* 1. Hero Greeting */}
        <section className="text-center space-y-4 pt-4 md:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <div className="text-5xl md:text-7xl mb-2">
              {greeting === 'Good Night' ? '🌙' : greeting === 'Good Morning' ? '🌅' : '☀️'}
            </div>
            <h1 className="text-3xl md:text-6xl font-bold text-foreground font-sans tracking-tight">
              {greeting}
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground font-medium">
              {profile?.display_name || '...'}
            </p>
          </motion.div>
        </section>

        {/* 2. Stats Cards */}
        <section className="grid grid-cols-3 gap-3 md:gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href="/todos" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground font-medium">Active Todos</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : stats.activeTodos}</p>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link href="/calendar" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                <span className="text-xs text-muted-foreground font-medium">Upcoming</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : stats.upcomingEvents}</p>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Link href="/goals" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground font-medium">In Progress</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{loading ? '—' : stats.activeGoals}</p>
            </Link>
          </motion.div>
        </section>

        {/* 3. Quick Access */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-sm font-medium uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Quick Access</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { title: 'Calendar', icon: '📅', href: '/calendar', desc: 'View Schedule', color: 'bg-primary/10 text-primary' },
              { title: 'Todos', icon: '✅', href: '/todos', desc: 'Task List', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' },
              { title: 'Goals Board', icon: '🎯', href: '/goals', desc: 'Track Progress', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
              { title: 'Gallery', icon: '📸', href: '/gallery', desc: 'Our Memories', color: 'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-300' },
              { title: 'Finance', icon: '💰', href: '/finance', desc: 'Budget & Expenses', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "group flex flex-col p-4 h-28 md:h-32 rounded-xl transition-all duration-200",
                    "bg-card hover:bg-secondary border border-border hover:border-primary/30",
                    "shadow-sm hover:shadow-md"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-lg md:text-xl mb-auto",
                    item.color
                  )}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 4. Recent Activity */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-sm font-medium uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Recent Activity</span>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : recentItems.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <Search className="w-7 h-7 text-primary/50" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">No activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start by creating a todo, goal, or event!
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 hover:bg-secondary/50 transition-colors group"
                    >
                      <span className="text-base md:text-lg flex-shrink-0">{item.icon}</span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            item.statusColor
                          )}>
                            {item.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp}
                          </span>
                        </div>
                      </div>

                      <span className={cn(
                        "hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                        item.user === 'aegg'
                          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                          : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                      )}>
                        {item.user === 'aegg' ? '🍌 Aegg' : '🍈 Peppaa'}
                      </span>

                      <ArrowRight className="w-4 h-4 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. Quick Actions */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-muted-foreground text-sm font-medium uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            <span>Create New</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { label: 'New Todo', icon: '✅', href: '/todos' },
              { label: 'New Goal', icon: '🎯', href: '/goals' },
              { label: 'Add Event', icon: '📅', href: '/calendar' },
              { label: 'Expense', icon: '💸', href: '/finance' },
              { label: 'Wishlist', icon: '🎁', href: '/wishlist' },
            ].map((action) => (
              <Link key={action.label} href={action.href}>
                <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-full hover:bg-secondary transition-colors whitespace-nowrap text-sm font-medium shadow-sm">
                  <span>{action.label}</span>
                  <span className="text-xs opacity-70">{action.icon}</span>
                </button>
              </Link>
            ))}
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

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
