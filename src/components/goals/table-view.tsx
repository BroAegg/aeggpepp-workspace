'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown, Calendar, CheckCircle2, Circle, Clock, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUSES, PRIORITIES } from '@/lib/constants'
import type { Goal, GoalTask } from '@/types'

type SortField = 'display_id' | 'title' | 'status' | 'priority' | 'due_date' | 'created_at'
type SortDir = 'asc' | 'desc'

const statusOrder: Record<string, number> = { backlog: 0, in_progress: 1, completed: 2, archived: 3 }
const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

const statusIcons: Record<string, React.ReactNode> = {
  backlog: <Circle className="w-3.5 h-3.5 text-gray-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  archived: <Circle className="w-3.5 h-3.5 text-gray-300" />,
}

const priorityDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-gray-400',
}

const tagColors: Record<string, string> = {
  Dev: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  Design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

interface TableViewProps {
  goals: Goal[]
  onOpenGoal: (goal: Goal) => void
  onOpenAdd: () => void
}

export function TableView({ goals, onOpenGoal, onOpenAdd }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('display_id')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...goals].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'display_id':
          cmp = (a.display_id || 0) - (b.display_id || 0)
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'status':
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
          break
        case 'priority':
          cmp = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
          break
        case 'due_date':
          cmp = (a.due_date || '9999').localeCompare(b.due_date || '9999')
          break
        case 'created_at':
          cmp = a.created_at.localeCompare(b.created_at)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [goals, sortField, sortDir])

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group",
        className
      )}
    >
      {children}
      <ArrowUpDown className={cn(
        "w-3 h-3 transition-colors",
        sortField === field ? "text-primary" : "text-transparent group-hover:text-muted-foreground"
      )} />
    </button>
  )

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[700px]">
        {/* Table Header */}
        <div className="grid grid-cols-[50px_1fr_130px_100px_90px_110px_60px] gap-2 px-3 py-2 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <SortHeader field="display_id">#</SortHeader>
          <SortHeader field="title">Title</SortHeader>
          <SortHeader field="status">Status</SortHeader>
          <SortHeader field="priority">Priority</SortHeader>
          <span className="text-xs font-medium text-muted-foreground">Tag</span>
          <SortHeader field="due_date">Due Date</SortHeader>
          <span className="text-xs font-medium text-muted-foreground text-center">Tasks</span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-border/50">
          {sorted.map((goal) => {
            const completedTasks = goal.goal_tasks?.filter((t: GoalTask) => t.completed).length || 0
            const totalTasks = goal.goal_tasks?.length || 0
            const totalPages = goal.goal_pages?.length || 0

            return (
              <div
                key={goal.id}
                onClick={() => onOpenGoal(goal)}
                className="grid grid-cols-[50px_1fr_130px_100px_90px_110px_60px] gap-2 px-3 py-2.5 hover:bg-secondary/40 cursor-pointer transition-colors group"
              >
                {/* # */}
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {goal.display_id || '—'}
                </span>

                {/* Title */}
                <div className="flex items-center gap-2 min-w-0">
                  {goal.icon && <span className="text-sm flex-shrink-0">{goal.icon}</span>}
                  <span className={cn(
                    "text-sm font-medium truncate group-hover:text-primary transition-colors",
                    goal.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {goal.title}
                  </span>
                  {totalPages > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                      <FileText className="w-3 h-3" />
                      {totalPages}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  {statusIcons[goal.status]}
                  <span className="text-xs text-foreground">
                    {GOAL_STATUSES[goal.status as keyof typeof GOAL_STATUSES]?.label || goal.status}
                  </span>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", priorityDots[goal.priority])} />
                  <span className="text-xs text-foreground capitalize">{goal.priority}</span>
                </div>

                {/* Tag */}
                <div>
                  {goal.tag ? (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      tagColors[goal.tag] || 'bg-secondary text-muted-foreground'
                    )}>
                      {goal.tag}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-1">
                  {goal.due_date ? (
                    <>
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className={cn(
                        "text-xs",
                        new Date(goal.due_date) < new Date() && goal.status !== 'completed'
                          ? "text-red-500 font-medium"
                          : "text-foreground"
                      )}>
                        {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Tasks progress */}
                <div className="flex items-center justify-center">
                  {totalTasks > 0 ? (
                    <span className={cn(
                      "text-[11px] font-medium tabular-nums",
                      completedTasks === totalTasks ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      {completedTasks}/{totalTasks}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Add New Row */}
        <button
          onClick={onOpenAdd}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors text-sm group"
        >
          <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
          <span>New goal</span>
        </button>
      </div>
    </div>
  )
}
