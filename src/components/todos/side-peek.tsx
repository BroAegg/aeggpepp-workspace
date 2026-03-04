'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, CheckCircle2, Plus, Trash2, Calendar, Clock, Circle,
  AlertTriangle, Loader2, CheckSquare, SquareCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TODO_STATUSES, PRIORITIES } from '@/lib/constants'
import {
  updateTodo,
  updateTodoStatus,
  deleteTodo as deleteTodoAction,
  createTodoTask,
  toggleTodoTask,
  deleteTodoTask,
} from '@/lib/actions/todos'
import type { Todo, TodoCategoryItem, TodoStatus, Priority } from '@/types'

const statusIcons: Record<TodoStatus, React.ReactNode> = {
  todo: <Circle className="w-3.5 h-3.5 text-rose-500" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-fuchsia-500" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
}

interface SidePeekProps {
  todo: Todo | null
  open: boolean
  categories: TodoCategoryItem[]
  onClose: () => void
  onRefresh: () => void
}

export function TodoSidePeek({ todo, open, categories, onClose, onRefresh }: SidePeekProps) {
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Editable fields
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState<TodoStatus>('todo')
  const [editPriority, setEditPriority] = useState<Priority>('medium')
  const [editCategory, setEditCategory] = useState('')
  const [editDueDate, setEditDueDate] = useState('')

  // Sync state when todo changes
  useEffect(() => {
    if (todo && open) {
      setEditTitle(todo.title)
      setEditDesc(todo.description || '')
      setEditStatus(todo.status || 'todo')
      setEditPriority(todo.priority)
      setEditCategory(todo.category || '')
      setEditDueDate(todo.due_date || '')
      setShowDeleteConfirm(false)
      setNewTaskTitle('')
    }
  }, [todo?.id, open])

  const handleSave = async () => {
    if (!todo || !editTitle.trim()) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('title', editTitle)
      formData.set('description', editDesc)
      formData.set('priority', editPriority)
      formData.set('category', editCategory)
      formData.set('due_date', editDueDate)

      await updateTodo(todo.id, formData)

      if (editStatus !== (todo.status || 'todo')) {
        await updateTodoStatus(todo.id, editStatus)
      }

      onRefresh()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!todo) return
    try {
      await deleteTodoAction(todo.id)
      onClose()
      onRefresh()
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    await toggleTodoTask(taskId, !completed)
    onRefresh()
  }

  const handleAddTask = async () => {
    if (!todo || !newTaskTitle.trim()) return
    await createTodoTask(todo.id, newTaskTitle.trim())
    setNewTaskTitle('')
    onRefresh()
  }

  const handleDeleteTask = async (taskId: string) => {
    await deleteTodoTask(taskId)
    onRefresh()
  }

  const handleClose = () => {
    // Auto-save on close if changed
    if (
      todo &&
      (editTitle !== todo.title ||
        editDesc !== (todo.description || '') ||
        editStatus !== (todo.status || 'todo') ||
        editPriority !== todo.priority ||
        editCategory !== (todo.category || '') ||
        editDueDate !== (todo.due_date || ''))
    ) {
      handleSave()
    }
    onClose()
  }

  const tasks = todo?.todo_tasks || []
  const completedTasks = tasks.filter((t) => t.completed).length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  const isOverdue =
    editDueDate && editStatus !== 'completed' && new Date(editDueDate) < new Date(new Date().toDateString())

  return (
    <AnimatePresence>
      {open && todo && (
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
                <CheckSquare className="w-4 h-4 text-fuchsia-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Todo
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
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-6">
                {/* Title */}
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                  placeholder="Todo title..."
                />

                {/* Properties Grid */}
                <div className="space-y-1">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Properties
                  </h4>
                  <div className="grid grid-cols-[100px_1fr] gap-y-2.5 items-center">
                    {/* Status */}
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {statusIcons[editStatus]} Status
                    </span>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as TodoStatus)}
                      className="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Object.entries(TODO_STATUSES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>

                    {/* Priority */}
                    <span className="text-xs text-muted-foreground">Priority</span>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as Priority)}
                      className="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {Object.entries(PRIORITIES).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>

                    {/* Category */}
                    <span className="text-xs text-muted-foreground">Category</span>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">No Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </option>
                      ))}
                    </select>

                    {/* Due Date */}
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Due Date
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="px-2 py-1 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1"
                      />
                      {isOverdue && (
                        <span className="text-[10px] text-red-500 font-bold animate-pulse">
                          Overdue!
                        </span>
                      )}
                    </div>

                    {/* Owner (read-only) */}
                    <span className="text-xs text-muted-foreground">Owner</span>
                    <div className="text-sm">
                      {todo.profiles ? (
                        <span>
                          {todo.profiles.role === 'aegg' ? '⭐ Aegg' : '🌙 Peppaa'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Description
                  </h4>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                    placeholder="Add a description..."
                  />
                </div>

                {/* Sub-tasks */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Sub-tasks
                    </h4>
                    {tasks.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {completedTasks}/{tasks.length} ({taskProgress}%)
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {tasks.length > 0 && (
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full transition-all duration-300"
                        style={{ width: `${taskProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Task list */}
                  <div className="space-y-1 mb-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 group hover:bg-secondary/50 rounded px-1.5 py-1 transition-colors"
                      >
                        <button
                          onClick={() => handleToggleTask(task.id, task.completed)}
                          className="flex-shrink-0"
                        >
                          {task.completed ? (
                            <CheckSquare className="w-4 h-4 text-green-500" />
                          ) : (
                            <SquareCheck className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                        <span
                          className={cn(
                            'text-sm flex-1',
                            task.completed
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {task.title}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add task */}
                  <div className="flex items-center gap-2">
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask()
                      }}
                      placeholder="Add a sub-task..."
                      className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="h-7"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Completed info */}
                {todo.completed_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Completed on{' '}
                    {new Date(todo.completed_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                )}

                {/* Danger Zone */}
                <div className="pt-4 border-t border-border">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete this todo
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          Delete this todo?
                        </p>
                        <p className="text-xs text-red-500/70">This cannot be undone.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDelete}
                          className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
