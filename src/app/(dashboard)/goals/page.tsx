'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Plus, Target, LayoutGrid, Table2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGoals, toggleGoalTask } from '@/lib/actions/goals'
import { KanbanView } from '@/components/goals/kanban-view'
import { TableView } from '@/components/goals/table-view'
import { SidePeek } from '@/components/goals/side-peek'
import { AddGoalModal } from '@/components/goals/add-goal-modal'
import { SubPageEditor } from '@/components/goals/sub-page-editor'
import type { Goal, GoalPage } from '@/types'

type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
type ViewMode = 'table' | 'kanban'

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('table')

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
  }, [])

  const fetchGoals = async () => {
    try {
      const data = await getGoals()
      setGoals(data)
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
    await toggleGoalTask(taskId, !task.completed)
    fetchGoals()
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

        {/* Loading */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
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
