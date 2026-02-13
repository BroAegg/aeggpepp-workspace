'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Clock, CheckCircle2, Circle, X, Trash2, Calendar, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUSES, PRIORITIES } from '@/lib/constants'
import { getGoals, createGoal, updateGoal, deleteGoal as deleteGoalAction, createGoalTask, toggleGoalTask, deleteGoalTask } from '@/lib/actions/goals'
import type { Goal, GoalTask } from '@/types'

type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
type Priority = 'low' | 'medium' | 'high'

const columns: { status: GoalStatus; label: string; icon: React.ReactNode; headerColor: string }[] = [
  { status: 'backlog', label: 'Backlog', icon: <Circle className="w-4 h-4" />, headerColor: 'text-gray-500' },
  { status: 'in_progress', label: 'In Progress', icon: <Clock className="w-4 h-4" />, headerColor: 'text-blue-500' },
  { status: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" />, headerColor: 'text-green-500' },
]

const priorityColors: Record<Priority, string> = {
  low: 'bg-secondary text-muted-foreground',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const tagColors: Record<string, string> = {
  Dev: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Design: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Finance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<GoalStatus>('backlog')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formTag, setFormTag] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formTasks, setFormTasks] = useState<(GoalTask | { id: string; title: string; completed: boolean; goal_id: string; position: number })[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      const data = await getGoals()
      setGoals(data)
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  // Open Add Modal
  const openAddModal = (status: GoalStatus = 'backlog') => {
    setEditingGoal(null)
    setFormTitle('')
    setFormDescription('')
    setFormStatus(status)
    setFormPriority('medium')
    setFormTag('')
    setFormDueDate('')
    setFormTasks([])
    setNewTaskTitle('')
    setShowModal(true)
  }

  // Open Edit Modal  
  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal)
    setFormTitle(goal.title)
    setFormDescription(goal.description || '')
    setFormStatus(goal.status as GoalStatus)
    setFormPriority(goal.priority as Priority)
    setFormTag(goal.tag || '')
    setFormDueDate(goal.due_date || '')
    setFormTasks(goal.goal_tasks || [])
    setNewTaskTitle('')
    setShowModal(true)
  }

  // Save Goal
  const handleSave = async () => {
    if (!formTitle.trim()) return
    setSaving(true)

    const formData = new FormData()
    formData.set('title', formTitle)
    formData.set('description', formDescription)
    formData.set('status', formStatus)
    formData.set('priority', formPriority)
    formData.set('tag', formTag)
    formData.set('due_date', formDueDate)

    try {
      if (editingGoal) {
        const result = await updateGoal(editingGoal.id, formData)
        if (result && 'error' in result) {
          alert(`Failed to update goal: ${result.error}`)
          return
        }
        // Handle tasks - add new tasks, toggle existing
        for (const task of formTasks) {
          if (task.id.startsWith('task-')) {
            // New local task, create it
            await createGoalTask(editingGoal.id, task.title)
          }
        }
      } else {
        // Create goal, then add tasks
        const newGoal = await createGoal(formData)
        if (newGoal && 'error' in newGoal) {
          alert(`Failed to create goal: ${newGoal.error}`)
          return
        }
        if (newGoal && 'id' in newGoal && newGoal.id) {
          for (const task of formTasks) {
            await createGoalTask(newGoal.id, task.title)
          }
        }
      }
      await fetchGoals()
      setShowModal(false)
      setEditingGoal(null)
    } catch (error) {
      console.error('Error saving goal:', error)
      alert('An unexpected error occurred. Check the console for details.')
    } finally {
      setSaving(false)
    }
  }

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoalAction(id)
      await fetchGoals()
      setShowDeleteConfirm(null)
      setShowModal(false)
    } catch (error) {
      console.error('Error deleting goal:', error)
    }
  }

  // Add Sub-task
  const addSubTask = () => {
    if (!newTaskTitle.trim()) return
    setFormTasks([...formTasks, {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      completed: false,
      goal_id: '',
      position: formTasks.length,
    }])
    setNewTaskTitle('')
  }

  // Toggle Sub-task in form
  const toggleFormTask = (taskId: string) => {
    setFormTasks(formTasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t))
  }

  // Remove Sub-task
  const removeSubTask = (taskId: string) => {
    setFormTasks(formTasks.filter(t => t.id !== taskId))
  }

  // Toggle task completion from card
  const toggleCardTask = async (goalId: string, taskId: string) => {
    // Find the task
    const goal = goals.find(g => g.id === goalId)
    const task = goal?.goal_tasks?.find((t: GoalTask) => t.id === taskId)
    if (!task) return

    try {
      const result = await toggleGoalTask(taskId, !task.completed)
      if (result && 'error' in result) {
        alert(`Failed to toggle task: ${result.error}`)
        return
      }
      await fetchGoals()
    } catch (error) {
      console.error('Error toggling task:', error)
      alert('An error occurred while toggling the task')
    }
  }

  return (
    <>
      <Header title="Goals" emoji="🎯" />

      <div className="p-4 md:p-8 h-[calc(100vh-64px)] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Goals Board</h2>
          <Button onClick={() => openAddModal()}>
            <Plus className="w-4 h-4 mr-2" /> New Goal
          </Button>
        </div>

        {/* Kanban Board */}
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
                    onClick={() => openAddModal(column.status)}
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
                      onClick={() => openEditModal(goal)}
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

                      {/* Title */}
                      <p className={cn(
                        "font-medium text-sm group-hover:text-primary transition-colors",
                        column.status === 'completed' && "line-through text-muted-foreground"
                      )}>
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
                          {/* Progress bar */}
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

                          {/* Task items (show ALL) */}
                          <div className="space-y-1">
                            {goal.goal_tasks.map((task: GoalTask) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-2 hover:bg-secondary/30 -mx-1 px-1 py-0.5 rounded transition-colors"
                                onClick={(e) => { e.stopPropagation(); toggleCardTask(goal.id, task.id) }}
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

                      {/* Bottom Row: Due date */}
                      {goal.due_date && (
                        <div className="flex items-center gap-1 mt-3 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px]">
                            {new Date(goal.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Add Card Button (bottom of column) */}
                  <button
                    onClick={() => openAddModal(column.status)}
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
      </div>

      {/* Goal Modal (Add/Edit) */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {editingGoal ? 'Edit Goal' : 'New Goal'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="Goal name..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    placeholder="Add details..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Status & Priority (side by side) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as GoalStatus)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {Object.entries(GOAL_STATUSES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Priority)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {Object.entries(PRIORITIES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tag & Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tag</label>
                    <select
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">No tag</option>
                      <option value="Dev">Dev</option>
                      <option value="Design">Design</option>
                      <option value="Finance">Finance</option>
                      <option value="Personal">Personal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Sub-tasks */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Sub-tasks</label>
                  <div className="space-y-2 mb-3">
                    {formTasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => toggleFormTask(task.id)}
                          className={cn(
                            "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0",
                            task.completed
                              ? "bg-primary border-primary text-white"
                              : "border-border hover:border-primary"
                          )}
                        >
                          {task.completed && <CheckCircle2 className="w-3 h-3" />}
                        </button>
                        <span className={cn(
                          "flex-1 text-sm",
                          task.completed && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </span>
                        <button
                          onClick={() => removeSubTask(task.id)}
                          className="md:opacity-0 md:group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add sub-task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubTask()}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <Button variant="outline" size="sm" onClick={addSubTask} disabled={!newTaskTitle.trim()}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                {editingGoal && (
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => setShowDeleteConfirm(editingGoal.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={!formTitle.trim() || saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingGoal ? 'Save Changes' : 'Create Goal'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card rounded-xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Delete Goal?</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => handleDeleteGoal(showDeleteConfirm)}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
