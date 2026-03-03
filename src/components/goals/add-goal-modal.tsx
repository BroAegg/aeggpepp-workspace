'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GOAL_STATUSES, PRIORITIES } from '@/lib/constants'
import { createGoal, createGoalTask } from '@/lib/actions/goals'
import type { GoalTask } from '@/types'

type GoalStatus = 'backlog' | 'in_progress' | 'completed' | 'archived'
type Priority = 'low' | 'medium' | 'high'

interface AddGoalModalProps {
  open: boolean
  defaultStatus?: GoalStatus
  onClose: () => void
  onCreated: () => void
}

export function AddGoalModal({ open, defaultStatus = 'backlog', onClose, onCreated }: AddGoalModalProps) {
  const [saving, setSaving] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<GoalStatus>(defaultStatus)
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formTag, setFormTag] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formTasks, setFormTasks] = useState<{ id: string; title: string; completed: boolean }[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Reset on open
  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormStatus(defaultStatus)
    setFormPriority('medium')
    setFormTag('')
    setFormDueDate('')
    setFormTasks([])
    setNewTaskTitle('')
  }

  const addSubTask = () => {
    if (!newTaskTitle.trim()) return
    setFormTasks([...formTasks, { id: `task-${Date.now()}`, title: newTaskTitle, completed: false }])
    setNewTaskTitle('')
  }

  const removeSubTask = (id: string) => {
    setFormTasks(formTasks.filter(t => t.id !== id))
  }

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
      const result = await createGoal(formData)
      if (result && 'error' in result) {
        alert(`Failed to create goal: ${result.error}`)
        return
      }
      if (result && 'id' in result && result.id) {
        for (const task of formTasks) {
          await createGoalTask(result.id, task.title)
        }
      }
      resetForm()
      onCreated()
      onClose()
    } catch (error) {
      console.error('Error creating goal:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
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
            className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">New Goal</h2>
              <button onClick={handleClose} className="p-1 hover:bg-secondary rounded-lg transition-colors">
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

              {/* Status & Priority */}
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
                      <div className="w-4 h-4 rounded-sm border border-border flex-shrink-0" />
                      <span className="flex-1 text-sm">{task.title}</span>
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
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={!formTitle.trim() || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Goal'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
