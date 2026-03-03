'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, CheckCircle2, Plus, Trash2, Calendar, Clock, Circle,
  FileText, AlertTriangle, Loader2, Target, FilePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GOAL_STATUSES, PRIORITIES } from '@/lib/constants'
import {
  updateGoal, updateGoalStatus, deleteGoal as deleteGoalAction,
  createGoalTask, toggleGoalTask, deleteGoalTask, updateGoalIcon,
} from '@/lib/actions/goals'
import { createGoalPage, deleteGoalPage } from '@/lib/actions/goal-pages'
import type { Goal, GoalTask, GoalPage } from '@/types'

type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
type Priority = 'low' | 'medium' | 'high'

const statusIcons: Record<string, React.ReactNode> = {
  backlog: <Circle className="w-3.5 h-3.5 text-gray-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
  archived: <Circle className="w-3.5 h-3.5 text-gray-300" />,
}

const tagColors: Record<string, string> = {
  Dev: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
  Design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

const EMOJI_QUICK = ['🎯', '🚀', '💡', '🎮', '📱', '🎨', '📊', '🔥', '⭐', '🃏', '🌙', '💻', '📝', '🏆', '🎬', '🎵']

interface SidePeekProps {
  goal: Goal | null
  open: boolean
  onClose: () => void
  onRefresh: () => void
  onOpenPage: (goalId: string, page: GoalPage) => void
}

export function SidePeek({ goal, open, onClose, onRefresh, onOpenPage }: SidePeekProps) {
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newPageTitle, setNewPageTitle] = useState('')

  // Editable fields
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState<GoalStatus>('backlog')
  const [editPriority, setEditPriority] = useState<Priority>('medium')
  const [editTag, setEditTag] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  // Sync state when goal changes
  const syncGoal = (g: Goal) => {
    setEditTitle(g.title)
    setEditDesc(g.description || '')
    setEditStatus(g.status as GoalStatus)
    setEditPriority(g.priority as Priority)
    setEditTag(g.tag || '')
    setEditDueDate(g.due_date || '')
    setShowDeleteConfirm(false)
    setShowEmojiPicker(false)
    setNewTaskTitle('')
    setNewPageTitle('')
  }

  // When goal prop changes
  if (goal && editTitle === '' && open) {
    syncGoal(goal)
  }

  const handleSave = async () => {
    if (!goal || !editTitle.trim()) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('title', editTitle)
      formData.set('description', editDesc)
      formData.set('priority', editPriority)
      formData.set('tag', editTag)
      formData.set('due_date', editDueDate)

      await updateGoal(goal.id, formData)

      if (editStatus !== goal.status) {
        await updateGoalStatus(goal.id, editStatus)
      }

      onRefresh()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!goal) return
    try {
      await deleteGoalAction(goal.id)
      onClose()
      onRefresh()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await toggleGoalTask(taskId, !completed)
    onRefresh()
  }

  const handleAddTask = async () => {
    if (!goal || !newTaskTitle.trim()) return
    await createGoalTask(goal.id, newTaskTitle)
    setNewTaskTitle('')
    onRefresh()
  }

  const handleDeleteTask = async (taskId: string) => {
    await deleteGoalTask(taskId)
    onRefresh()
  }

  const handleSetIcon = async (icon: string | null) => {
    if (!goal) return
    await updateGoalIcon(goal.id, icon)
    setShowEmojiPicker(false)
    onRefresh()
  }

  const handleAddPage = async () => {
    if (!goal) return
    const title = newPageTitle.trim() || 'Untitled'
    await createGoalPage(goal.id, title)
    setNewPageTitle('')
    onRefresh()
  }

  const handleDeletePage = async (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteGoalPage(pageId)
    onRefresh()
  }

  const handleClose = () => {
    // Auto-save on close if changed
    if (goal && (editTitle !== goal.title || editDesc !== (goal.description || '') || editStatus !== goal.status || editPriority !== goal.priority || editTag !== (goal.tag || '') || editDueDate !== (goal.due_date || ''))) {
      handleSave()
    }
    setEditTitle('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && goal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[480px] lg:w-[520px] bg-card border-l border-border z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  #{goal.display_id || '—'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-7 text-xs"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </Button>
                <button onClick={handleClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Icon + Title */}
              <div className="flex items-start gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-10 h-10 rounded-lg border border-border hover:border-primary/50 flex items-center justify-center transition-colors text-lg bg-secondary/30"
                  >
                    {goal.icon || '🎯'}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute top-12 left-0 bg-card border border-border rounded-lg shadow-xl p-2 z-10 grid grid-cols-8 gap-1 w-[260px]">
                      {EMOJI_QUICK.map(e => (
                        <button
                          key={e}
                          onClick={() => handleSetIcon(e)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-secondary rounded transition-colors text-base"
                        >
                          {e}
                        </button>
                      ))}
                      {goal.icon && (
                        <button
                          onClick={() => handleSetIcon(null)}
                          className="col-span-8 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded py-1 mt-1"
                        >
                          Remove icon
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                  placeholder="Goal title..."
                />
              </div>

              {/* Properties */}
              <div className="space-y-3 bg-secondary/20 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h4>
                
                <div className="grid grid-cols-[80px_1fr] gap-y-2.5 items-center">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as GoalStatus)}
                    className="text-sm px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {Object.entries(GOAL_STATUSES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>

                  <span className="text-xs text-muted-foreground">Priority</span>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="text-sm px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {Object.entries(PRIORITIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>

                  <span className="text-xs text-muted-foreground">Tag</span>
                  <select
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value)}
                    className="text-sm px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">No tag</option>
                    <option value="Dev">Dev</option>
                    <option value="Design">Design</option>
                    <option value="Finance">Finance</option>
                    <option value="Personal">Personal</option>
                  </select>

                  <span className="text-xs text-muted-foreground">Due Date</span>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="text-sm px-2 py-1 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Sub-tasks */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Sub-tasks
                  {goal.goal_tasks && goal.goal_tasks.length > 0 && (
                    <span className="ml-2 text-[10px] font-normal">
                      ({goal.goal_tasks.filter((t: GoalTask) => t.completed).length}/{goal.goal_tasks.length})
                    </span>
                  )}
                </h4>

                {/* Progress bar */}
                {goal.goal_tasks && goal.goal_tasks.length > 0 && (
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${(goal.goal_tasks.filter((t: GoalTask) => t.completed).length / goal.goal_tasks.length) * 100}%`
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1 mb-2">
                  {goal.goal_tasks?.map((task: GoalTask) => (
                    <div key={task.id} className="flex items-center gap-2 group py-0.5">
                      <button
                        onClick={() => handleToggleTask(task.id, task.completed)}
                        className={cn(
                          "w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all flex-shrink-0",
                          task.completed
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30 hover:border-primary"
                        )}
                      >
                        {task.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <span className={cn(
                        "flex-1 text-sm",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="md:opacity-0 md:group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    placeholder="Add sub-task..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()} className="h-8">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Sub-pages */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pages
                  {goal.goal_pages && goal.goal_pages.length > 0 && (
                    <span className="ml-2 text-[10px] font-normal">({goal.goal_pages.length})</span>
                  )}
                </h4>

                <div className="space-y-1 mb-2">
                  {goal.goal_pages?.map((page: GoalPage) => (
                    <div
                      key={page.id}
                      onClick={() => onOpenPage(goal.id, page)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors group"
                    >
                      <span className="text-sm">{page.icon || '📄'}</span>
                      <span className="flex-1 text-sm text-foreground truncate">{page.title}</span>
                      <button
                        onClick={(e) => handleDeletePage(page.id, e)}
                        className="md:opacity-0 md:group-hover:opacity-100 p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                    placeholder="New page title..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddPage} className="h-8">
                    <FilePlus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-3 border-t border-border">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete this goal
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 flex-1">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">Delete permanently?</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
