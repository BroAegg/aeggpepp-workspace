'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Circle, Clock, CheckCircle2, Calendar,
  CheckSquare, ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TODO_STATUSES, PRIORITIES } from '@/lib/constants'
import type { Todo, TodoCategoryItem, TodoStatus, Priority } from '@/types'

type SortField = 'title' | 'status' | 'priority' | 'category' | 'due_date' | 'created_at'
type SortDir = 'asc' | 'desc'

const statusIcons: Record<TodoStatus, React.ReactNode> = {
  todo: <Circle className="w-3 h-3 text-rose-500" />,
  in_progress: <Clock className="w-3 h-3 text-fuchsia-500" />,
  completed: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
}

const priorityDots: Record<Priority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
}

interface TableViewProps {
  todos: Todo[]
  categories: TodoCategoryItem[]
  onOpenTodo: (todo: Todo) => void
  onOpenAdd: () => void
}

export function TableView({ todos, categories, onOpenTodo, onOpenAdd }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedTodos = useMemo(() => {
    const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, completed: 2 }
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

    return [...todos].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'status':
          cmp = (statusOrder[a.status || 'todo'] ?? 0) - (statusOrder[b.status || 'todo'] ?? 0)
          break
        case 'priority':
          cmp = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
          break
        case 'category':
          cmp = (a.category || '').localeCompare(b.category || '')
          break
        case 'due_date':
          if (!a.due_date && !b.due_date) cmp = 0
          else if (!a.due_date) cmp = 1
          else if (!b.due_date) cmp = -1
          else cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          break
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [todos, sortField, sortDir])

  const getCategoryInfo = (category: string | null) =>
    categories.find((c) => c.name === category)

  const isOverdue = (todo: Todo): boolean =>
    !!(todo.due_date && !todo.completed && new Date(todo.due_date) < new Date(new Date().toDateString()))

  const SortHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField
    children: React.ReactNode
    className?: string
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group',
        className
      )}
    >
      {children}
      <ArrowUpDown
        className={cn(
          'w-3 h-3 transition-colors',
          sortField === field
            ? 'text-primary'
            : 'text-transparent group-hover:text-muted-foreground'
        )}
      />
    </button>
  )

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_120px_90px_120px_110px_70px_50px] gap-2 px-4 py-2.5 border-b border-border bg-secondary/30 text-xs">
        <SortHeader field="title">Title</SortHeader>
        <SortHeader field="status">Status</SortHeader>
        <SortHeader field="priority">Priority</SortHeader>
        <SortHeader field="category">Category</SortHeader>
        <SortHeader field="due_date">Due Date</SortHeader>
        <span className="text-xs font-medium text-muted-foreground">Tasks</span>
        <span className="text-xs font-medium text-muted-foreground text-right">By</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        <AnimatePresence mode="popLayout">
          {sortedTodos.map((todo, index) => {
            const category = getCategoryInfo(todo.category)
            const tasks = todo.todo_tasks || []
            const completedTasks = tasks.filter((t) => t.completed).length
            const overdue = isOverdue(todo)

            return (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                onClick={() => onOpenTodo(todo)}
                className={cn(
                  'grid grid-cols-[1fr_120px_90px_120px_110px_70px_50px] gap-2 px-4 py-2.5 cursor-pointer hover:bg-secondary/40 transition-colors group items-center',
                  overdue && 'bg-red-50/30 dark:bg-red-950/10'
                )}
              >
                {/* Title */}
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      todo.completed
                        ? 'line-through text-muted-foreground'
                        : 'text-foreground'
                    )}
                  >
                    {todo.title}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  {statusIcons[todo.status || 'todo']}
                  <span
                    className={cn(
                      'text-[11px] font-medium px-1.5 py-0.5 rounded-md',
                      TODO_STATUSES[todo.status || 'todo']?.color
                    )}
                  >
                    {TODO_STATUSES[todo.status || 'todo']?.label}
                  </span>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', priorityDots[todo.priority])} />
                  <span className="text-xs text-muted-foreground capitalize">{todo.priority}</span>
                </div>

                {/* Category */}
                <div>
                  {category ? (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                        category.color
                      )}
                    >
                      {category.icon ? `${category.icon} ` : ''}{category.name}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  {todo.due_date ? (
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        overdue ? 'text-red-500 font-bold' : 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="w-3 h-3" />
                      {overdue
                        ? 'Overdue'
                        : new Date(todo.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Tasks */}
                <div>
                  {tasks.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckSquare className="w-3 h-3" />
                      {completedTasks}/{tasks.length}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Owner */}
                <div className="text-right">
                  {todo.profiles ? (
                    <span className="text-sm">
                      {todo.profiles.role === 'aegg' ? '⭐' : '🌙'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Add Row */}
        <button
          onClick={onOpenAdd}
          className="w-full grid grid-cols-[1fr_120px_90px_120px_110px_70px_50px] gap-2 px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors group"
        >
          <span className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            <Plus className="w-4 h-4" />
            New todo
          </span>
        </button>
      </div>
    </div>
  )
}
