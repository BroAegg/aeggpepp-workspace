'use client'

import { motion } from 'framer-motion'
import { Plus, Clock, CheckCircle2, Circle, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Goal, GoalTask } from '@/types'

type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
type Priority = 'low' | 'medium' | 'high'

const columns: { status: GoalStatus; label: string; icon: React.ReactNode; headerColor: string }[] = [
  { status: 'backlog', label: 'Backlog', icon: <Circle className="w-4 h-4" />, headerColor: 'text-gray-500' },
  { status: 'in_progress', label: 'In Progress', icon: <Clock className="w-4 h-4" />, headerColor: 'text-primary-500' },
  { status: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" />, headerColor: 'text-green-500' },
]

const priorityColors: Record<Priority, string> = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const tagColors: Record<string, string> = {
  Dev: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  Design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

interface KanbanViewProps {
  goals: Goal[]
  onOpenAdd: (status: GoalStatus) => void
  onOpenGoal: (goal: Goal) => void
  onToggleTask: (goalId: string, taskId: string) => void
}

export function KanbanView({ goals, onOpenAdd, onOpenGoal, onToggleTask }: KanbanViewProps) {
  return (
    <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnGoals = goals.filter(g => g.status === column.status)

        return (
          <div
            key={column.status}
            className="flex-1 min-w-[280px] max-w-[380px] flex flex-col"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={column.headerColor}>{column.icon}</span>
                <span className="font-semibold text-sm text-foreground">{column.label}</span>
                <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5">
                  {columnGoals.length}
                </span>
              </div>
              <button
                onClick={() => onOpenAdd(column.status)}
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {columnGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onOpenGoal(goal)}
                >
                  {/* Top Row: Priority + Tag */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      priorityColors[goal.priority]
                    )}>
                      {goal.priority.toUpperCase()}
                    </span>
                    {goal.tag && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                        tagColors[goal.tag] || 'bg-secondary text-muted-foreground'
                      )}>
                        {goal.tag}
                      </span>
                    )}
                  </div>

                  {/* Title with icon */}
                  <p className={cn(
                    "font-medium text-sm group-hover:text-primary transition-colors",
                    column.status === 'completed' && "line-through text-muted-foreground"
                  )}>
                    {goal.icon && <span className="mr-1.5">{goal.icon}</span>}
                    {goal.title}
                  </p>

                  {/* Description (truncated) */}
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Sub-tasks progress */}
                  {goal.goal_tasks && goal.goal_tasks.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${(goal.goal_tasks.filter((t: GoalTask) => t.completed).length / goal.goal_tasks.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                          {goal.goal_tasks.filter((t: GoalTask) => t.completed).length}/{goal.goal_tasks.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {goal.goal_tasks.map((task: GoalTask) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 hover:bg-secondary/30 -mx-1 px-1 py-0.5 rounded transition-colors"
                            onClick={(e) => { e.stopPropagation(); onToggleTask(goal.id, task.id) }}
                          >
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center cursor-pointer transition-all",
                              task.completed
                                ? "bg-primary border-primary scale-100"
                                : "border-muted-foreground/30 hover:border-primary hover:scale-110"
                            )}>
                              {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={cn(
                              "text-[11px] flex-1 cursor-pointer select-none transition-all",
                              task.completed ? "line-through text-muted-foreground" : "text-foreground"
                            )}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-pages count */}
                  {goal.goal_pages && goal.goal_pages.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                      <span className="text-[10px]">📄 {goal.goal_pages.length} page{goal.goal_pages.length > 1 ? 's' : ''}</span>
                    </div>
                  )}

                  {/* Due date */}
                  {goal.due_date && (
                    <div className="flex items-center gap-1 mt-2 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="text-[10px]">
                        {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Add Card Button */}
              <button
                onClick={() => onOpenAdd(column.status)}
                className="w-full flex items-center gap-2 p-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors text-sm group"
              >
                <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span>New</span>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
