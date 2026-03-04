'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PRIORITIES } from '@/lib/constants'
import { createTodo, createTodoTask } from '@/lib/actions/todos'
import type { TodoCategoryItem, Priority } from '@/types'

interface AddTodoModalProps {
  open: boolean
  categories: TodoCategoryItem[]
  onClose: () => void
  onCreated: () => void
}

export function AddTodoModal({ open, categories, onClose, onCreated }: AddTodoModalProps) {
  const [saving, setSaving] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formCategory, setFormCategory] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [tasks, setTasks] = useState<string[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormPriority('medium')
    setFormCategory('')
    setFormDueDate('')
    setTasks([])
    setNewTaskTitle('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    setTasks((prev) => [...prev, newTaskTitle.trim()])
    setNewTaskTitle('')
  }

  const handleRemoveTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!formTitle.trim()) return
    setSaving(true)

    try {
      const formData = new FormData()
      formData.set('title', formTitle)
      formData.set('description', formDescription)
      formData.set('priority', formPriority)
      formData.set('category', formCategory)
      formData.set('due_date', formDueDate)

      const result = await createTodo(formData)

      // Add initial sub-tasks
      if (result?.id && tasks.length > 0) {
        for (const taskTitle of tasks) {
          await createTodoTask(result.id, taskTitle)
        }
      }

      resetForm()
      onCreated()
      onClose()
    } catch (error) {
      console.error('Error creating todo:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">New Todo</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-md hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Todo title..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                autoFocus
              />

              {/* Description */}
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
              />

              {/* Priority + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Priority)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {Object.entries(PRIORITIES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Sub-tasks */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Sub-tasks
                </label>
                {tasks.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {tasks.map((task, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1 rounded-md bg-secondary/50 text-sm"
                      >
                        <span className="flex-1 text-foreground">{task}</span>
                        <button
                          onClick={() => handleRemoveTask(i)}
                          className="p-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTask()
                      }
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
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formTitle.trim() || saving}
                className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Todo
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
