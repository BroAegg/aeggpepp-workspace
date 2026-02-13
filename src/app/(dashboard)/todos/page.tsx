'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
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
    SortAsc,
    SquareCheck,
    Clock,
    Edit,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITIES, TODO_CATEGORIES } from '@/lib/constants'
import {
    getTodos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo as deleteTodoAction,
} from '@/lib/actions/todos'
import type { Todo, TodoCategory, Priority } from '@/types'

type StatusFilter = 'all' | 'active' | 'completed'
type SortBy = 'created_at' | 'due_date' | 'priority'

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
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

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<SortBy>('created_at')

    // Form state
    const [formTitle, setFormTitle] = useState('')
    const [formDescription, setFormDescription] = useState('')
    const [formPriority, setFormPriority] = useState<Priority>('medium')
    const [formCategory, setFormCategory] = useState<string>('')
    const [formDueDate, setFormDueDate] = useState('')

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

    // Filtered + Sorted todos
    const filteredTodos = useMemo(() => {
        let result = [...todos]

        // Status filter
        if (statusFilter === 'active') result = result.filter((t) => !t.completed)
        if (statusFilter === 'completed') result = result.filter((t) => t.completed)

        // Category filter
        if (categoryFilter !== 'all') {
            result = result.filter((t) => t.category === categoryFilter)
        }

        // Priority filter
        if (priorityFilter !== 'all') {
            result = result.filter((t) => t.priority === priorityFilter)
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'due_date') {
                if (!a.due_date && !b.due_date) return 0
                if (!a.due_date) return 1
                if (!b.due_date) return -1
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
            }
            if (sortBy === 'priority') {
                return priorityOrder[a.priority] - priorityOrder[b.priority]
            }
            // Default: created_at desc
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        return result
    }, [todos, statusFilter, categoryFilter, priorityFilter, sortBy])

    const activeTodos = filteredTodos.filter((t) => !t.completed)
    const completedTodos = filteredTodos.filter((t) => t.completed)

    // Stats
    const totalActive = todos.filter((t) => !t.completed).length
    const totalCompleted = todos.filter((t) => t.completed).length
    const overdueTodos = todos.filter(
        (t) => !t.completed && t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())
    ).length

    // Modal handlers
    const openAddModal = () => {
        setEditingTodo(null)
        setFormTitle('')
        setFormDescription('')
        setFormPriority('medium')
        setFormCategory('')
        setFormDueDate('')
        setShowModal(true)
    }

    const openEditModal = (todo: Todo) => {
        setEditingTodo(todo)
        setFormTitle(todo.title)
        setFormDescription(todo.description || '')
        setFormPriority(todo.priority)
        setFormCategory(todo.category || '')
        setFormDueDate(todo.due_date || '')
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

    const handleToggle = async (id: string, completed: boolean) => {
        // Optimistic update
        setTodos((prev) =>
            prev.map((t) =>
                t.id === id
                    ? { ...t, completed, completed_at: completed ? new Date().toISOString() : null }
                    : t
            )
        )
        try {
            await toggleTodo(id, completed)
            await fetchTodos()
        } catch (error) {
            console.error('Error toggling todo:', error)
            await fetchTodos() // Revert
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

    const isOverdue = (todo: Todo): boolean =>
        !!(todo.due_date && !todo.completed && new Date(todo.due_date) < new Date(new Date().toDateString()))

    const isDueToday = (todo: Todo): boolean =>
        !!(!todo.completed &&
            todo.due_date &&
            new Date(todo.due_date).toDateString() === new Date().toDateString())

    const getCategoryInfo = (category: string | null) =>
        TODO_CATEGORIES.find((c) => c.value === category)

    return (
        <>
            <Header title="Todos" emoji="✅" />

            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Todos</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {totalActive} active{overdueTodos > 0 && <span className="text-red-500 ml-1">· {overdueTodos} overdue</span>}
                            {totalCompleted > 0 && <span> · {totalCompleted} completed</span>}
                        </p>
                    </div>
                    <Button onClick={openAddModal}>
                        <Plus className="w-4 h-4 mr-2" /> Add Todo
                    </Button>
                </div>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 mb-4 p-1 bg-secondary/50 rounded-lg w-fit">
                    {(['all', 'active', 'completed'] as StatusFilter[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                                statusFilter === status
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {status === 'all' ? `All (${todos.length})` : status === 'active' ? `Active (${totalActive})` : `Completed (${totalCompleted})`}
                        </button>
                    ))}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Filters:</span>
                    </div>

                    {/* Category Filter */}
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

                    {/* Priority Filter */}
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

                    {/* Sort */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <SortAsc className="w-3.5 h-3.5 text-muted-foreground" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="px-2.5 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="created_at">Newest First</option>
                            <option value="due_date">Due Date</option>
                            <option value="priority">Priority</option>
                        </select>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Empty State */}
                {!loading && todos.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/80 flex items-center justify-center">
                            <SquareCheck className="w-8 h-8 text-muted-foreground" />
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

                {/* No filter results */}
                {!loading && todos.length > 0 && filteredTodos.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">No todos match the current filters.</p>
                    </div>
                )}

                {/* Active Todos */}
                {!loading && activeTodos.length > 0 && (
                    <div className="mb-6">
                        {statusFilter !== 'completed' && (
                            <div className="flex items-center gap-2 mb-3">
                                <Circle className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-foreground">
                                    Active ({activeTodos.length})
                                </span>
                            </div>
                        )}
                        <div className="space-y-1">
                            {activeTodos.map((todo, index) => (
                                <TodoItem
                                    key={todo.id}
                                    todo={todo}
                                    index={index}
                                    isOverdue={isOverdue(todo)}
                                    isDueToday={isDueToday(todo)}
                                    getCategoryInfo={getCategoryInfo}
                                    onToggle={handleToggle}
                                    onEdit={openEditModal}
                                    onDelete={(id) => setShowDeleteConfirm(id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed Todos */}
                {!loading && completedTodos.length > 0 && (
                    <div>
                        {statusFilter !== 'active' && (
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-semibold text-foreground">
                                    Completed ({completedTodos.length})
                                </span>
                            </div>
                        )}
                        <div className="space-y-1">
                            {completedTodos.map((todo, index) => (
                                <TodoItem
                                    key={todo.id}
                                    todo={todo}
                                    index={index}
                                    isOverdue={false}
                                    isDueToday={false}
                                    getCategoryInfo={getCategoryInfo}
                                    onToggle={handleToggle}
                                    onEdit={openEditModal}
                                    onDelete={(id) => setShowDeleteConfirm(id)}
                                />
                            ))}
                        </div>
                    </div>
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
                                    <label className="block text-sm font-medium text-foreground mb-2">Title</label>
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
                                        rows={3}
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
                                            onChange={(e) => setFormPriority(e.target.value as Priority)}
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
                                    <label className="block text-sm font-medium text-foreground mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        value={formDueDate}
                                        onChange={(e) => setFormDueDate(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
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
                                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
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
                                    <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
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

// ============== Todo Item Component ==============

function TodoItem({
    todo,
    index,
    isOverdue,
    isDueToday,
    getCategoryInfo,
    onToggle,
    onEdit,
    onDelete,
}: {
    todo: Todo
    index: number
    isOverdue: boolean
    isDueToday: boolean
    getCategoryInfo: (category: string | null) => (typeof TODO_CATEGORIES)[number] | undefined
    onToggle: (id: string, completed: boolean) => void
    onEdit: (todo: Todo) => void
    onDelete: (id: string) => void
}) {
    const category = getCategoryInfo(todo.category)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={cn(
                'group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors',
                'hover:bg-secondary/50',
                isOverdue && !todo.completed && 'bg-red-50/50 dark:bg-red-950/10'
            )}
        >
            {/* Checkbox */}
            <button
                onClick={() => onToggle(todo.id, !todo.completed)}
                className={cn(
                    'mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0',
                    todo.completed
                        ? 'bg-green-500 border-green-500 text-white scale-100'
                        : 'border-border hover:border-primary hover:scale-110'
                )}
            >
                {todo.completed && <CheckCircle2 className="w-3 h-3" />}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0" onClick={() => onEdit(todo)}>
                <div className="flex items-center gap-2 cursor-pointer">
                    <p
                        className={cn(
                            'text-sm font-medium transition-all duration-200',
                            todo.completed
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground group-hover:text-primary'
                        )}
                    >
                        {todo.title}
                    </p>
                </div>

                {/* Description */}
                {todo.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{todo.description}</p>
                )}

                {/* Metadata row */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Priority badge */}
                    <span
                        className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                            priorityColors[todo.priority]
                        )}
                    >
                        {todo.priority.toUpperCase()}
                    </span>

                    {/* Category badge */}
                    {category && (
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold', category.color)}>
                            {category.icon} {category.label}
                        </span>
                    )}

                    {/* Due date */}
                    {todo.due_date && (
                        <span
                            className={cn(
                                'flex items-center gap-1 text-[10px]',
                                isOverdue
                                    ? 'text-red-500 font-semibold'
                                    : isDueToday
                                        ? 'text-amber-500 font-semibold'
                                        : 'text-muted-foreground'
                            )}
                        >
                            <Calendar className="w-3 h-3" />
                            {isOverdue
                                ? 'Overdue'
                                : isDueToday
                                    ? 'Today'
                                    : new Date(todo.due_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                        </span>
                    )}

                    {/* Owner badge */}
                    {todo.profiles && (
                        <span
                            className={cn(
                                'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                                todo.profiles.role === 'aegg'
                                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                    : todo.profiles.role === 'peppaa'
                                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                                        : 'bg-secondary text-muted-foreground'
                            )}
                        >
                            {todo.profiles.role === 'aegg' ? '🥚' : '🌶️'}{' '}
                            {todo.profiles.display_name?.split(' ')[0]}
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(todo)}
                    className="p-1 hover:bg-secondary rounded transition-colors"
                    title="Edit"
                >
                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                    onClick={() => onDelete(todo.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
            </div>
        </motion.div>
    )
}
