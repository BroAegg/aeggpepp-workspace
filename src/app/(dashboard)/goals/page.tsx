'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Plus, Target, LayoutGrid, Table2, PiggyBank } from 'lucide-react'
import { GoalsSkeleton } from '@/components/goals/goals-skeleton'
import { cn } from '@/lib/utils'
import { getGoals, toggleGoalTask } from '@/lib/actions/goals'
import { getSavingsAccounts } from '@/lib/actions/finance'
import { KanbanView } from '@/components/goals/kanban-view'
import { TableView } from '@/components/goals/table-view'
import { SidePeek } from '@/components/goals/side-peek'
import { AddGoalModal } from '@/components/goals/add-goal-modal'
import { SubPageEditor } from '@/components/goals/sub-page-editor'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Goal, GoalPage, SavingsAccount } from '@/types'

type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
type ViewMode = 'table' | 'kanban'

export default function GoalsPage() {
  const {
    goals: cachedGoals,
    savings: cachedSavings,
    goalsLoaded,
    setGoalsData,
    setFinanceData,
    toggleGoalTaskOptimistic,
  } = useWorkspaceStore()
  const [goals, setGoals] = useState<Goal[]>(cachedGoals)
  const [savings, setSavings] = useState<SavingsAccount[]>(cachedSavings)
  const [loading, setLoading] = useState(!goalsLoaded && cachedGoals.length === 0)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Hydration sync
  useEffect(() => {
    if (cachedGoals.length > 0) {
      setGoals(cachedGoals)
      setLoading(false)
    }
  }, [cachedGoals])

  useEffect(() => {
    if (cachedSavings.length > 0) {
      setSavings(cachedSavings)
    } else {
      getSavingsAccounts('all')
        .then((data) => {
          setSavings(data)
          setFinanceData({ savings: data })
        })
        .catch(console.error)
    }
  }, [cachedSavings])

  // Auto-linked financial goals from savings pockets
  const linkedFinancialPockets = useMemo(() => {
    if (!savings || savings.length === 0) return []
    const targets = [
      {
        keyword: 'nikah',
        altKeyword: 'wedding',
        label: 'Tabungan Nikah Bersama',
        targetAmount: 25000000,
        icon: '💍',
      },
      {
        keyword: 'rumah',
        altKeyword: 'properti',
        label: 'Dana Impian Rumah / DP KPR',
        targetAmount: 50000000,
        icon: '🏡',
      },
      {
        keyword: 'darurat',
        altKeyword: 'emergency',
        label: 'Dana Darurat Pasangan',
        targetAmount: 15000000,
        icon: '🛡️',
      },
    ]

    return targets
      .map((t) => {
        const matched = savings.filter((s) => {
          const lower = s.name.toLowerCase()
          return lower.includes(t.keyword) || lower.includes(t.altKeyword)
        })
        if (matched.length === 0) return null
        const currentBalance = matched.reduce((sum, s) => sum + s.balance, 0)
        const percent = Math.min(100, Math.round((currentBalance / t.targetAmount) * 100))
        const deficit = Math.max(0, t.targetAmount - currentBalance)
        const estMonths =
          deficit > 0 && currentBalance > 0
            ? Math.ceil(deficit / Math.max(1500000, currentBalance / 3))
            : 0
        const estDate = new Date()
        estDate.setMonth(estDate.getMonth() + estMonths)
        const estMonthYear = estDate.toLocaleDateString('id-ID', {
          month: 'long',
          year: 'numeric',
        })

        return {
          ...t,
          currentBalance,
          percent,
          deficit,
          estMonthYear,
          accountNames: matched.map((m) => m.name).join(', '),
        }
      })
      .filter(Boolean)
  }, [savings])

  // Side peek state
  const [peekGoal, setPeekGoal] = useState<Goal | null>(null)
  const [peekOpen, setPeekOpen] = useState(false)

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDefaultStatus, setAddDefaultStatus] = useState<GoalStatus>('backlog')

  // Sub-page editor state
  const [editingPage, setEditingPage] = useState<{ goal: Goal; page: GoalPage } | null>(null)

  useEffect(() => {
    fetchGoals()
    // Restore view preference
    const saved = localStorage.getItem('goals-view-mode')
    if (saved === 'kanban' || saved === 'table') setViewMode(saved)

    const handleOnline = () => fetchGoals()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const fetchGoals = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLoading(false)
      return
    }
    try {
      const data = await getGoals()
      setGoals(data)
      setGoalsData(data)
      // Refresh peek goal if open
      if (peekGoal) {
        const updated = data.find(g => g.id === peekGoal.id)
        if (updated) setPeekGoal(updated)
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('goals-view-mode', mode)
  }

  const handleOpenGoal = (goal: Goal) => {
    setPeekGoal(goal)
    setPeekOpen(true)
  }

  const handleOpenAdd = (status: GoalStatus = 'backlog') => {
    setAddDefaultStatus(status)
    setShowAddModal(true)
  }

  const handleToggleTask = async (goalId: string, taskId: string) => {
    const goal = goals.find(g => g.id === goalId)
    const task = goal?.goal_tasks?.find(t => t.id === taskId)
    if (!task) return

    const newCompleted = !task.completed

    // ⚡ 1. Optimistic Update (0ms instant response)
    const updateGoalInList = (list: Goal[]) =>
      list.map(g => {
        if (g.id !== goalId) return g
        return {
          ...g,
          goal_tasks: (g.goal_tasks || []).map(t =>
            t.id === taskId ? { ...t, completed: newCompleted } : t
          ),
        }
      })

    setGoals(prev => updateGoalInList(prev))
    if (peekGoal && peekGoal.id === goalId) {
      setPeekGoal(prev =>
        prev
          ? {
              ...prev,
              goal_tasks: (prev.goal_tasks || []).map(t =>
                t.id === taskId ? { ...t, completed: newCompleted } : t
              ),
            }
          : null
      )
    }
    toggleGoalTaskOptimistic(goalId, taskId, newCompleted)

    // ⚡ 2. Background Server Action (non-blocking)
    try {
      const res = await toggleGoalTask(taskId, newCompleted)
      if (res && 'error' in res && res.error) {
        throw new Error(res.error)
      }
    } catch (err) {
      console.error('Failed to toggle goal task, rolling back:', err)
      // Rollback on failure
      setGoals(prev =>
        prev.map(g => {
          if (g.id !== goalId) return g
          return {
            ...g,
            goal_tasks: (g.goal_tasks || []).map(t =>
              t.id === taskId ? { ...t, completed: !newCompleted } : t
            ),
          }
        })
      )
      toggleGoalTaskOptimistic(goalId, taskId, !newCompleted)
    }
  }

  const handleOpenPage = (goalId: string, page: GoalPage) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    setPeekOpen(false)
    setEditingPage({ goal, page })
  }

  const handleBackFromPage = () => {
    setEditingPage(null)
    fetchGoals()
  }

  // If editing a sub-page, show the editor
  if (editingPage) {
    return (
      <>
        <Header title="Goals" icon={Target} />
        <SubPageEditor
          goal={editingPage.goal}
          page={editingPage.page}
          onBack={handleBackFromPage}
          onRefresh={fetchGoals}
        />
      </>
    )
  }

  return (
    <>
      <Header title="Goals" icon={Target} />

      <div className="p-4 md:p-8 h-[calc(100vh-64px)] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Goals</h2>
            {/* View Toggle */}
            <div className="flex items-center bg-secondary/50 rounded-lg p-0.5">
              <button
                onClick={() => handleViewChange('table')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  viewMode === 'table'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="w-3.5 h-3.5" />
                Table
              </button>
              <button
                onClick={() => handleViewChange('kanban')}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  viewMode === 'kanban'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Board
              </button>
            </div>
          </div>

          <Button onClick={() => handleOpenAdd()}>
            <Plus className="w-4 h-4 mr-2" /> New Goal
          </Button>
        </div>

        {/* Auto-Linked Financial Goals Banner */}
        {linkedFinancialPockets.length > 0 && (
          <div className="mb-6 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <PiggyBank className="w-3.5 h-3.5 text-primary" />
                Tabungan & Target Finansial Terhubung (Auto-Linked)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Sinkron otomatis dengan modul Finance & Rekening
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {linkedFinancialPockets.map((pocket: any) => (
                <div
                  key={pocket.label}
                  className="p-3.5 rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xs space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>{pocket.icon}</span>
                      {pocket.label}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {pocket.percent}%
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-primary">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0,
                        }).format(pocket.currentBalance)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Target:{' '}
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0,
                        }).format(pocket.targetAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary/80 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${pocket.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span className="truncate max-w-[140px]">{pocket.accountNames}</span>
                    <span className="text-primary font-medium">Est: {pocket.estMonthYear}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <GoalsSkeleton />
        ) : goals.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Target className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No goals yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first goal to get started</p>
            <Button onClick={() => handleOpenAdd()}>
              <Plus className="w-4 h-4 mr-2" /> New Goal
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          <TableView
            goals={goals}
            onOpenGoal={handleOpenGoal}
            onOpenAdd={() => handleOpenAdd()}
          />
        ) : (
          <KanbanView
            goals={goals}
            onOpenAdd={handleOpenAdd}
            onOpenGoal={handleOpenGoal}
            onToggleTask={handleToggleTask}
          />
        )}
      </div>

      {/* Side Peek */}
      <SidePeek
        goal={peekGoal}
        open={peekOpen}
        onClose={() => {
          setPeekOpen(false)
          setPeekGoal(null)
          fetchGoals()
        }}
        onRefresh={fetchGoals}
        onOpenPage={handleOpenPage}
      />

      {/* Add Goal Modal */}
      <AddGoalModal
        open={showAddModal}
        defaultStatus={addDefaultStatus}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchGoals}
      />
    </>
  )
}
