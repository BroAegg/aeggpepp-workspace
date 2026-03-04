'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  Circle, Clock, CheckCircle2, Calendar,
  GripVertical, ArrowRight, CheckSquare, SquareCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Todo, TodoCategoryItem, TodoStatus, Priority } from '@/types'

const COLUMNS: {
  id: TodoStatus
  title: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  accentColor: string
  mobileOrder: string
}[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: <Circle className="w-4 h-4" />,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50/80 dark:bg-rose-950/20',
    borderColor: 'border-rose-200 dark:border-rose-800/40',
    accentColor: 'border-l-rose-400 dark:border-l-rose-500',
    mobileOrder: 'order-2 md:order-1',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50/80 dark:bg-fuchsia-950/20',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800/40',
    accentColor: 'border-l-fuchsia-400 dark:border-l-fuchsia-500',
    mobileOrder: 'order-1 md:order-2',
  },
  {
    id: 'completed',
    title: 'Completed',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/80 dark:bg-emerald-950/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/40',
    accentColor: 'border-l-emerald-400 dark:border-l-emerald-500',
    mobileOrder: 'order-3 md:order-3',
  },
]

const priorityColors: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface KanbanViewProps {
  todos: Todo[]
  todosByStatus: Record<TodoStatus, Todo[]>
  categories: TodoCategoryItem[]
  onOpenTodo: (todo: Todo) => void
  onStatusChange: (todoId: string, status: TodoStatus) => void
  onToggleTask: (taskId: string, completed: boolean) => void
}

export function KanbanView({
  todos,
  todosByStatus,
  categories,
  onOpenTodo,
  onStatusChange,
  onToggleTask,
}: KanbanViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)

    if (!over) return

    const todoId = active.id as string
    const newStatus = over.id as TodoStatus

    if (!['todo', 'in_progress', 'completed'].includes(newStatus)) return

    const todo = todos.find((t) => t.id === todoId)
    if (!todo) return

    const currentStatus = todo.status || 'todo'
    if (currentStatus === newStatus) return

    onStatusChange(todoId, newStatus)
  }

  const draggedTodo = activeDragId ? todos.find((t) => t.id === activeDragId) : null

  const getCategoryInfo = (category: string | null) =>
    categories.find((c) => c.name === category)

  const isOverdue = (todo: Todo): boolean =>
    !!(todo.due_date && !todo.completed && new Date(todo.due_date) < new Date(new Date().toDateString()))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            todos={todosByStatus[column.id] || []}
            onEdit={onOpenTodo}
            onQuickStatusChange={onStatusChange}
            isOverdue={isOverdue}
            getCategoryInfo={getCategoryInfo}
            onToggleTask={onToggleTask}
            className={column.mobileOrder}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedTodo ? (
          <div className="bg-card rounded-xl border border-primary/30 shadow-xl p-3 max-w-[320px] opacity-90 rotate-2">
            <p className="text-sm font-medium text-foreground truncate">
              {draggedTodo.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                  priorityColors[draggedTodo.priority]
                )}
              >
                {draggedTodo.priority.toUpperCase()}
              </span>
              {draggedTodo.profiles && (
                <span className="text-[10px] text-muted-foreground">
                  {draggedTodo.profiles.role === 'aegg' ? '⭐' : '🌙'}
                </span>
              )}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ============== Kanban Column ==============

function KanbanColumn({
  column,
  todos,
  onEdit,
  onQuickStatusChange,
  isOverdue,
  getCategoryInfo,
  onToggleTask,
  className,
}: {
  column: (typeof COLUMNS)[number]
  todos: Todo[]
  onEdit: (todo: Todo) => void
  onQuickStatusChange: (todoId: string, status: TodoStatus) => void
  isOverdue: (todo: Todo) => boolean
  getCategoryInfo: (category: string | null) => TodoCategoryItem | undefined
  onToggleTask: (taskId: string, completed: boolean) => void
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border transition-all duration-200 min-h-[300px] backdrop-blur-[2px]',
        column.bgColor,
        column.borderColor,
        isOver && 'ring-2 ring-primary/40 border-primary/30 scale-[1.01]',
        className
      )}
    >
      {/* Column Header */}
      <div className={cn('px-4 py-3 border-b border-black/5 dark:border-white/5')}>
        <div className="flex items-center gap-2">
          <span className={column.color}>{column.icon}</span>
          <h3 className="font-bold text-sm md:text-sm text-foreground">{column.title}</h3>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm',
              column.color,
              column.bgColor
            )}
          >
            {todos.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="p-2 space-y-2">
        <AnimatePresence mode="popLayout">
          {todos.map((todo) => (
            <KanbanCard
              key={todo.id}
              todo={todo}
              columnId={column.id}
              onEdit={onEdit}
              onQuickStatusChange={onQuickStatusChange}
              isOverdue={isOverdue(todo)}
              getCategoryInfo={getCategoryInfo}
              onToggleTask={onToggleTask}
            />
          ))}
        </AnimatePresence>

        {todos.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-muted-foreground">
              {isOver ? 'Drop here' : 'No items'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============== Kanban Card ==============

function KanbanCard({
  todo,
  columnId,
  onEdit,
  onQuickStatusChange,
  isOverdue,
  getCategoryInfo,
  onToggleTask,
}: {
  todo: Todo
  columnId: TodoStatus
  onEdit: (todo: Todo) => void
  onQuickStatusChange: (todoId: string, status: TodoStatus) => void
  isOverdue: boolean
  getCategoryInfo: (category: string | null) => TodoCategoryItem | undefined
  onToggleTask: (taskId: string, completed: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const category = getCategoryInfo(todo.category)
  const tasks = todo.todo_tasks || []
  const completedTasks = tasks.filter((t) => t.completed).length
  const showSubTasks = columnId === 'in_progress' && tasks.length > 0

  const nextStatus: TodoStatus | null =
    columnId === 'todo' ? 'in_progress' : columnId === 'in_progress' ? 'completed' : null

  const column = COLUMNS.find((c) => c.id === columnId)

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'bg-card rounded-lg border-l-[3px] border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer group',
        column?.accentColor,
        isOverdue && 'border-l-red-500 dark:border-l-red-400 bg-red-50/30 dark:bg-red-950/10',
        isDragging && 'shadow-xl z-50'
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 p-1 rounded hover:bg-secondary cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          >
            <GripVertical className="w-4 h-4 md:w-3.5 md:h-3.5 text-muted-foreground/50" />
          </button>

          {/* Card content */}
          <div className="flex-1 min-w-0" onClick={() => onEdit(todo)}>
            <p
              className={cn(
                'text-base md:text-sm font-medium leading-tight',
                todo.completed
                  ? 'line-through text-muted-foreground'
                  : 'text-foreground'
              )}
            >
              {todo.title}
            </p>

            {todo.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {todo.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] md:text-[10px] font-bold',
                  priorityColors[todo.priority]
                )}
              >
                {todo.priority.toUpperCase()}
              </span>

              {category && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[11px] md:text-[10px] font-semibold',
                    category.color
                  )}
                >
                  {category.icon || category.name}
                </span>
              )}

              {todo.due_date && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[11px] md:text-[10px]',
                    isOverdue
                      ? 'text-red-500 font-bold'
                      : 'text-muted-foreground'
                  )}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  {isOverdue
                    ? 'Overdue'
                    : new Date(todo.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                </span>
              )}

              {tasks.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <CheckSquare className="w-2.5 h-2.5" />
                  {completedTasks}/{tasks.length}
                </span>
              )}

              {todo.profiles && (
                <span className="text-[10px] ml-auto">
                  {todo.profiles.role === 'aegg' ? '⭐' : '🌙'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sub-tasks (visible only in In Progress) */}
        {showSubTasks && (
          <div className="mt-2.5 ml-6 space-y-1 border-t border-border/30 pt-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleTask(task.id, !task.completed)
                }}
                className="flex items-center gap-2 w-full text-left group/task hover:bg-secondary/50 rounded px-1 py-0.5 transition-colors"
              >
                {task.completed ? (
                  <CheckSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <SquareCheck className="w-3.5 h-3.5 text-muted-foreground group-hover/task:text-primary flex-shrink-0" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    task.completed
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground'
                  )}
                >
                  {task.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Quick move button */}
        {nextStatus && (
          <div className="mt-2 ml-6 md:ml-6">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQuickStatusChange(todo.id, nextStatus)
              }}
              className="flex items-center gap-1 text-xs md:text-[10px] font-medium text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-700 transition-colors md:opacity-0 md:group-hover:opacity-100"
            >
              <ArrowRight className="w-3.5 h-3.5 md:w-3 md:h-3" />
              Move to {COLUMNS.find((c) => c.id === nextStatus)?.title}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
