'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
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
    Plus,
    CheckCircle2,
    Circle,
    X,
    Trash2,
    Calendar,
    AlertTriangle,
    Loader2,
    Filter,
    GripVertical,
    Inbox,
    Clock,
    ArrowRight,
    CheckSquare,
    SquareCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITIES, TODO_CATEGORIES } from '@/lib/constants'
import {
    getTodos,
    createTodo,
    updateTodo,
    deleteTodo as deleteTodoAction,
    updateTodoStatus,
    createTodoTask,
    toggleTodoTask,
    deleteTodoTask,
} from '@/lib/actions/todos'
import type { Todo, TodoCategory, TodoStatus, TodoTask, Priority } from '@/types'

const COLUMNS: { id: TodoStatus; title: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
    {
        id: 'todo',
        title: 'Todo',
        icon: <Circle className="w-4 h-4" />,
        color: 'text-slate-500',
        bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    },
    {
        id: 'in_progress',
        title: 'In Progress',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
        id: 'completed',
        title: 'Completed',
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
]

const priorityColors: Record<Priority, string> = {
    low: 'bg-secondary text-muted-foreground',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export default function TodosPage() {
    const [todos, setTodos] = useState<Todo[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
    const [activeDragId, setActiveDragId] = useState<string | null>(null)

    // Filters
    const [personFilter, setPersonFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')

    // Form state
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formPriority, setFormPriority] = useState<Priority>('medium')
    const [formCategory, setFormCategory] = useState<string>('')
    const [formDueDate, setFormDueDate] = useState('')

    // Sub-task form
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [addingTask, setAddingTask] = useState(false)

    // DnD sensors
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    })
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 5 },
    })
    const sensors = useSensors(pointerSensor, touchSensor)

    useEffect(() => {
        fetchTodos()
    }, [])

    const fetchTodos = async () => {
        try {
            const data = await getTodos()
            setTodos(data)
        } catch (error) {
            console.error('Error fetching todos:', error)
        } finally {
            setLoading(false)
        }
    }

    // Filter todos
    const filteredTodos = useMemo(() => {
        let result = [...todos]

        if (personFilter !== 'all') {
            result = result.filter((t) => t.profiles?.role === personFilter)
        }
        if (priorityFilter !== 'all') {
            result = result.filter((t) => t.priority === priorityFilter)
        }
        if (categoryFilter !== 'all') {
            result = result.filter((t) => t.category === categoryFilter)
        }

        return result
    }, [todos, personFilter, priorityFilter, categoryFilter])

    // Group by status
    const todosByStatus = useMemo(() => {
        const grouped: Record<TodoStatus, Todo[]> = {
            todo: [],
            in_progress: [],
            completed: [],
        }
        filteredTodos.forEach((t) => {
            const status = t.status || 'todo'
            if (grouped[status]) {
                grouped[status].push(t)
            }
        })
        return grouped
    }, [filteredTodos])

    // Stats
    const totalTodo = todos.filter((t) => (t.status || 'todo') === 'todo').length
    const totalInProgress = todos.filter((t) => t.status === 'in_progress').length
    const totalCompleted = todos.filter((t) => t.status === 'completed').length
    const overdueTodos = todos.filter(
        (t) => !t.completed && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())
    ).length

    // Drag handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
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

        // Optimistic update
        setTodos((prev) =>
            prev.map((t) =>
                t.id === todoId
                    ? {
                          ...t,
                          status: newStatus,
                          completed: newStatus === 'completed',
                          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                      }
                    : t
            )
        )

        try {
            await updateTodoStatus(todoId, newStatus)
        } catch (error) {
            console.error('Error updating status:', error)
            await fetchTodos()
        }
    }

    const draggedTodo = activeDragId ? todos.find((t) => t.id === activeDragId) : null

    // Modal handlers
    const openAddModal = () => {
        setEditingTodo(null)
        setFormTitle('')
        setFormDescription('')
        setFormPriority('medium')
        setFormCategory('')
        setFormDueDate('')
        setNewTaskTitle('')
        setShowModal(true)
    }

    const openEditModal = (todo: Todo) => {
        setEditingTodo(todo)
        setFormTitle(todo.title)
        setFormDescription(todo.description || '')
        setFormPriority(todo.priority)
        setFormCategory(todo.category || '')
        setFormDueDate(todo.due_date || '')
        setNewTaskTitle('')
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!formTitle.trim()) return
        setSaving(true)

        const formData = new FormData()
        formData.set('title', formTitle)
        formData.set('description', formDescription)
        formData.set('priority', formPriority)
        formData.set('category', formCategory)
        formData.set('due_date', formDueDate)

        try {
            if (editingTodo) {
                await updateTodo(editingTodo.id, formData)
            } else {
                await createTodo(formData)
            }
            await fetchTodos()
            setShowModal(false)
            setEditingTodo(null)
        } catch (error) {
            console.error('Error saving todo:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteTodoAction(id)
            await fetchTodos()
            setShowDeleteConfirm(null)
            setShowModal(false)
        } catch (error) {
            console.error('Error deleting todo:', error)
        }
    }

    // Sub-task handlers
    const handleAddTask = async () => {
        if (!editingTodo || !newTaskTitle.trim()) return
        setAddingTask(true)
        try {
            await createTodoTask(editingTodo.id, newTaskTitle.trim())
            setNewTaskTitle('')
            await fetchTodos()
            const updated = (await getTodos()).find((t) => t.id === editingTodo.id)
            if (updated) setEditingTodo(updated)
        } catch (error) {
            console.error('Error adding task:', error)
        } finally {
            setAddingTask(false)
        }
    }

    const handleToggleTask = async (taskId: string, completed: boolean) => {
        try {
            await toggleTodoTask(taskId, completed)
            await fetchTodos()
            if (editingTodo) {
                const updated = (await getTodos()).find((t) => t.id === editingTodo.id)
                if (updated) {
                    setEditingTodo(updated)
                    // Auto-move to completed when all sub-tasks done
                    if (
                        updated.todo_tasks &&
                        updated.todo_tasks.length > 0 &&
                        updated.todo_tasks.every((task) => task.completed) &&
                        updated.status !== 'completed'
                    ) {
                        await updateTodoStatus(updated.id, 'completed')
                        await fetchTodos()
                    }
                }
            }
        } catch (error) {
            console.error('Error toggling task:', error)
        }
    }

    const handleDeleteTask = async (taskId: string) => {
        try {
            await deleteTodoTask(taskId)
            await fetchTodos()
            if (editingTodo) {
                const updated = (await getTodos()).find((t) => t.id === editingTodo.id)
                if (updated) setEditingTodo(updated)
            }
        } catch (error) {
            console.error('Error deleting task:', error)
        }
    }

    // Quick status change
    const handleQuickStatusChange = async (todoId: string, newStatus: TodoStatus) => {
        setTodos((prev) =>
            prev.map((t) =>
                t.id === todoId
                    ? {
                          ...t,
                          status: newStatus,
                          completed: newStatus === 'completed',
                          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                      }
                    : t
            )
        )
        try {
            await updateTodoStatus(todoId, newStatus)
        } catch (error) {
            await fetchTodos()
        }
    }

    const isOverdue = (todo: Todo): boolean =>
        !!(todo.due_date && !todo.completed && new Date(todo.due_date) < new Date(new Date().toDateString()))

    const getCategoryInfo = (category: string | null) =>
        TODO_CATEGORIES.find((c) => c.value === category)

    const hasActiveFilters = personFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'

    return (
        <>
            <Header title="Todos" emoji="✅" />

            <div className="p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {totalTodo} todo · {totalInProgress} in progress · {totalCompleted} done
                                {overdueTodos > 0 && (
                                    <span className="text-red-500 ml-1">· {overdueTodos} overdue</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <Button onClick={openAddModal}>
                        <Plus className="w-4 h-4 mr-2" /> Add Todo
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Filters:</span>
                    </div>

                    <select
                        value={personFilter}
                        onChange={(e) => setPersonFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All People</option>
                        <option value="aegg">🍌 Aegg</option>
                        <option value="peppaa">🍈 Peppaa</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All Priorities</option>
                        {Object.entries(PRIORITIES).map(([key, val]) => (
                            <option key={key} value={key}>
                                {val.label}
                            </option>
                        ))}
                    </select>

                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All Categories</option>
                        {TODO_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.icon} {cat.label}
                            </option>
                        ))}
                    </select>

                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setPersonFilter('all')
                                setPriorityFilter('all')
                                setCategoryFilter('all')
                            }}
                            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Empty state */}
                {!loading && todos.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/80 flex items-center justify-center">
                            <Inbox className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">No todos yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create your first todo to get started!
                        </p>
                        <Button onClick={openAddModal}>
                            <Plus className="w-4 h-4 mr-2" /> Add Todo
                        </Button>
                    </motion.div>
                )}

                {/* Kanban Board */}
                {!loading && todos.length > 0 && (
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
                                    onEdit={openEditModal}
                                    onQuickStatusChange={handleQuickStatusChange}
                                    isOverdue={isOverdue}
                                    getCategoryInfo={getCategoryInfo}
                                    onToggleTask={handleToggleTask}
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
                                                {draggedTodo.profiles.role === 'aegg' ? '🍌' : '🍈'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            {/* Add/Edit Modal */}
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
                            className="bg-card rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-foreground">
                                    {editingTodo ? 'Edit Todo' : 'New Todo'}
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
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="What needs to be done?"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        placeholder="Add details..."
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        rows={2}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    />
                                </div>

                                {/* Priority & Category */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Priority
                                        </label>
                                        <select
                                            value={formPriority}
                                            onChange={(e) =>
                                                setFormPriority(e.target.value as Priority)
                                            }
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            {Object.entries(PRIORITIES).map(([key, val]) => (
                                                <option key={key} value={key}>
                                                    {val.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            <option value="">No category</option>
                                            {TODO_CATEGORIES.map((cat) => (
                                                <option key={cat.value} value={cat.value}>
                                                    {cat.icon} {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Due Date */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formDueDate}
                                        onChange={(e) => setFormDueDate(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>

                                {/* Sub-tasks (only in edit mode) */}
                                {editingTodo && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Sub-tasks
                                        </label>
                                        <div className="space-y-1.5 mb-2">
                                            {editingTodo.todo_tasks &&
                                                editingTodo.todo_tasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        className="flex items-center gap-2 group"
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                handleToggleTask(
                                                                    task.id,
                                                                    !task.completed
                                                                )
                                                            }
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
                                                                task.completed &&
                                                                    'line-through text-muted-foreground'
                                                            )}
                                                        >
                                                            {task.title}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                handleDeleteTask(task.id)
                                                            }
                                                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                                        >
                                                            <X className="w-3 h-3 text-red-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Add a sub-task..."
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                onKeyDown={(e) =>
                                                    e.key === 'Enter' && handleAddTask()
                                                }
                                                className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleAddTask}
                                                disabled={!newTaskTitle.trim() || addingTask}
                                            >
                                                {addingTask ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Plus className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                {editingTodo && (
                                    <Button
                                        variant="outline"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => setShowDeleteConfirm(editingTodo.id)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleSave}
                                    disabled={!formTitle.trim() || saving}
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : editingTodo ? (
                                        'Save Changes'
                                    ) : (
                                        'Create Todo'
                                    )}
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
                                    <h3 className="font-semibold text-foreground">Delete Todo?</h3>
                                    <p className="text-sm text-muted-foreground">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowDeleteConfirm(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                                    onClick={() => handleDelete(showDeleteConfirm)}
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

// ============== Kanban Column ==============

function KanbanColumn({
    column,
    todos,
    onEdit,
    onQuickStatusChange,
    isOverdue,
    getCategoryInfo,
    onToggleTask,
}: {
    column: (typeof COLUMNS)[number]
    todos: Todo[]
    onEdit: (todo: Todo) => void
    onQuickStatusChange: (todoId: string, status: TodoStatus) => void
    isOverdue: (todo: Todo) => boolean
    getCategoryInfo: (category: string | null) => (typeof TODO_CATEGORIES)[number] | undefined
    onToggleTask: (taskId: string, completed: boolean) => void
}) {
    const { setNodeRef, isOver } = useDroppable({ id: column.id })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'rounded-xl border border-border/50 transition-all duration-200 min-h-[300px]',
                column.bgColor,
                isOver && 'ring-2 ring-primary/40 border-primary/30 scale-[1.01]'
            )}
        >
            {/* Column Header */}
            <div className="px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                    <span className={column.color}>{column.icon}</span>
                    <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground">
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
    getCategoryInfo: (category: string | null) => (typeof TODO_CATEGORIES)[number] | undefined
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
                'bg-card rounded-lg border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer group',
                isOverdue && 'border-red-300 dark:border-red-800',
                isDragging && 'shadow-xl z-50'
            )}
        >
            <div className="p-3">
                <div className="flex items-start gap-2">
                    {/* Drag handle */}
                    <button
                        {...listeners}
                        {...attributes}
                        className="mt-0.5 p-0.5 rounded hover:bg-secondary cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
                    >
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </button>

                    {/* Card content */}
                    <div className="flex-1 min-w-0" onClick={() => onEdit(todo)}>
                        <p
                            className={cn(
                                'text-sm font-medium leading-tight',
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
                                    'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                                    priorityColors[todo.priority]
                                )}
                            >
                                {todo.priority.toUpperCase()}
                            </span>

                            {category && (
                                <span
                                    className={cn(
                                        'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                                        category.color
                                    )}
                                >
                                    {category.icon}
                                </span>
                            )}

                            {todo.due_date && (
                                <span
                                    className={cn(
                                        'flex items-center gap-0.5 text-[10px]',
                                        isOverdue
                                            ? 'text-red-500 font-semibold'
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
                                    {todo.profiles.role === 'aegg' ? '🍌' : '🍈'}
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
                    <div className="mt-2 ml-6">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onQuickStatusChange(todo.id, nextStatus)
                            }}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <ArrowRight className="w-3 h-3" />
                            Move to {COLUMNS.find((c) => c.id === nextStatus)?.title}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
