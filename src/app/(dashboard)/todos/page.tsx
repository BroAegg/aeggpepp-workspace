'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, X, Loader2, Filter, Inbox,
    CheckSquare, Table2, LayoutGrid, Edit2, Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIORITIES, CATEGORY_COLORS } from '@/lib/constants'
import {
    getTodos,
    updateTodoStatus,
    toggleTodoTask,
    clearCompletedTodos,
} from '@/lib/actions/todos'
import {
    getTodoCategories,
    createTodoCategory,
    updateTodoCategory,
    deleteTodoCategory,
} from '@/lib/actions/todo-categories'
import { TableView } from '@/components/todos/table-view'
import { KanbanView } from '@/components/todos/kanban-view'
import { TodoSidePeek } from '@/components/todos/side-peek'
import { AddTodoModal } from '@/components/todos/add-todo-modal'
import type { Todo, TodoCategoryItem, TodoStatus, Priority } from '@/types'

type ViewMode = 'table' | 'board'

export default function TodosPage() {
    const [todos, setTodos] = useState<Todo[]>([])
    const [categories, setCategories] = useState<TodoCategoryItem[]>([])
    const [loading, setLoading] = useState(true)

    // View mode
    const [viewMode, setViewMode] = useState<ViewMode>('board')

    // Side peek state
    const [peekTodo, setPeekTodo] = useState<Todo | null>(null)
    const [peekOpen, setPeekOpen] = useState(false)

    // Add modal
    const [showAddModal, setShowAddModal] = useState(false)

    // Category management
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [newCatIcon, setNewCatIcon] = useState('')
    const [newCatColor, setNewCatColor] = useState<string>(CATEGORY_COLORS[0].value)
    const [editingCat, setEditingCat] = useState<TodoCategoryItem | null>(null)
    const [savingCat, setSavingCat] = useState(false)
    const [deletingCatId, setDeletingCatId] = useState<string | null>(null)

    // Filters
    const [personFilter, setPersonFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [dueDateFilter, setDueDateFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<string>('none')

    useEffect(() => {
        fetchTodos()
        fetchCategories()

        // Load view mode & filters from localStorage
        if (typeof window !== 'undefined') {
            const savedView = localStorage.getItem('todos-view-mode')
            if (savedView === 'table' || savedView === 'board') setViewMode(savedView)

            const savedPerson = localStorage.getItem('todos_personFilter')
            const savedPriority = localStorage.getItem('todos_priorityFilter')
            const savedCategory = localStorage.getItem('todos_categoryFilter')
            const savedDueDate = localStorage.getItem('todos_dueDateFilter')
            const savedSort = localStorage.getItem('todos_sortBy')

            if (savedPerson) setPersonFilter(savedPerson)
            if (savedPriority) setPriorityFilter(savedPriority)
            if (savedCategory) setCategoryFilter(savedCategory)
            if (savedDueDate) setDueDateFilter(savedDueDate)
            if (savedSort) setSortBy(savedSort)
        }
    }, [])

    // Save filters to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('todos_personFilter', personFilter)
            localStorage.setItem('todos_priorityFilter', priorityFilter)
            localStorage.setItem('todos_categoryFilter', categoryFilter)
            localStorage.setItem('todos_dueDateFilter', dueDateFilter)
            localStorage.setItem('todos_sortBy', sortBy)
        }
    }, [personFilter, priorityFilter, categoryFilter, dueDateFilter, sortBy])

    const handleViewChange = (mode: ViewMode) => {
        setViewMode(mode)
        localStorage.setItem('todos-view-mode', mode)
    }

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

    const fetchCategories = async () => {
        try {
            const data = await getTodoCategories()
            setCategories(data)
        } catch (error) {
            console.error('Error fetching categories:', error)
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
        if (dueDateFilter !== 'all') {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayStr = today.toISOString().split('T')[0]
            const weekFromNow = new Date(today)
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            const weekStr = weekFromNow.toISOString().split('T')[0]

            if (dueDateFilter === 'today') {
                result = result.filter((t) => t.due_date === todayStr)
            } else if (dueDateFilter === 'this_week') {
                result = result.filter((t) => t.due_date && t.due_date >= todayStr && t.due_date <= weekStr)
            } else if (dueDateFilter === 'overdue') {
                result = result.filter((t) => t.due_date && t.due_date < todayStr && t.status !== 'completed')
            } else if (dueDateFilter === 'no_date') {
                result = result.filter((t) => !t.due_date)
            }
        }

        if (sortBy !== 'none') {
            const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }

            if (sortBy === 'priority_desc') {
                result.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))
            } else if (sortBy === 'priority_asc') {
                result.sort((a, b) => (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0))
            } else if (sortBy === 'due_date_asc') {
                result.sort((a, b) => {
                    if (!a.due_date && !b.due_date) return 0
                    if (!a.due_date) return 1
                    if (!b.due_date) return -1
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                })
            } else if (sortBy === 'due_date_desc') {
                result.sort((a, b) => {
                    if (!a.due_date && !b.due_date) return 0
                    if (!a.due_date) return 1
                    if (!b.due_date) return -1
                    return new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
                })
            }
        }

        return result
    }, [todos, personFilter, priorityFilter, categoryFilter, dueDateFilter, sortBy])

    // Group by status (for board view)
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

    // Callbacks for child components
    const handleOpenTodo = (todo: Todo) => {
        const fresh = todos.find((t) => t.id === todo.id) || todo
        setPeekTodo(fresh)
        setPeekOpen(true)
    }

    const handleOpenAdd = () => {
        setShowAddModal(true)
    }

    const handleStatusChange = async (todoId: string, newStatus: TodoStatus) => {
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

    const handleToggleTask = async (taskId: string, completed: boolean) => {
        try {
            await toggleTodoTask(taskId, completed)
            await fetchTodos()
        } catch (error) {
            console.error('Error toggling task:', error)
        }
    }

    const handleSidePeekClose = () => {
        setPeekOpen(false)
        setTimeout(() => setPeekTodo(null), 300)
    }

    const handleRefresh = async () => {
        await fetchTodos()
        // Update side peek todo with fresh data
        if (peekTodo) {
            const freshTodos = await getTodos()
            const updated = freshTodos.find((t: Todo) => t.id === peekTodo.id)
            if (updated) setPeekTodo(updated)
        }
    }

    // Category management
    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return
        setSavingCat(true)
        try {
            await createTodoCategory(newCatName.trim(), newCatIcon.trim() || undefined, newCatColor)
            setNewCatName('')
            setNewCatIcon('')
            setNewCatColor(CATEGORY_COLORS[0].value)
            await fetchCategories()
        } catch (error) {
            console.error('Error creating category:', error)
        } finally {
            setSavingCat(false)
        }
    }

    const [clearingCompleted, setClearingCompleted] = useState(false)

    const handleClearCompleted = async () => {
        if (totalCompleted === 0) return
        if (!confirm(`Hapus semua ${totalCompleted} todo yang selesai?`)) return
        setClearingCompleted(true)
        try {
            await clearCompletedTodos()
            await fetchTodos()
        } catch (error) {
            console.error('Error clearing completed:', error)
        } finally {
            setClearingCompleted(false)
        }
    }

    const hasActiveFilters = personFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || dueDateFilter !== 'all' || sortBy !== 'none'

    return (
        <>
            <Header title="Todos" icon={CheckSquare} />

            <div className="p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)] bg-gradient-to-br from-pink-50/40 via-background to-fuchsia-50/30 dark:from-pink-950/10 dark:via-background dark:to-fuchsia-950/10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap text-sm">
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-semibold text-xs">
                                {totalTodo} todo
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 font-semibold text-xs">
                                {totalInProgress} in progress
                            </span>
                            <button
                                onClick={handleClearCompleted}
                                disabled={clearingCompleted || totalCompleted === 0}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Hapus semua yang selesai"
                            >
                                {clearingCompleted ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                {totalCompleted} done
                            </button>
                            {overdueTodos > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 font-semibold text-xs animate-pulse">
                                    {overdueTodos} overdue
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-secondary/50 rounded-lg p-0.5">
                            <button
                                onClick={() => handleViewChange('table')}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                                    viewMode === 'table'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Table2 className="w-3.5 h-3.5" /> Table
                            </button>
                            <button
                                onClick={() => handleViewChange('board')}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                                    viewMode === 'board'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Board
                            </button>
                        </div>

                        <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white shadow-md shadow-pink-500/20 hover:shadow-pink-500/40 transition-all">
                            <Plus className="w-4 h-4 mr-2" /> Add Todo
                        </Button>
                    </div>
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
                        <option value="aegg">⭐ Aegg</option>
                        <option value="peppaa">🌙 Peppaa</option>
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
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={dueDateFilter}
                        onChange={(e) => setDueDateFilter(e.target.value)}
                        className="px-2.5 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="all">All Due Dates</option>
                        <option value="today">📅 Today</option>
                        <option value="this_week">📆 This Week</option>
                        <option value="overdue">⚠️ Overdue</option>
                        <option value="no_date">— No Date</option>
                    </select>

                    <div className="h-4 w-px bg-border" />

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-xs font-medium">Sort:</span>
                    </div>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-2.5 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="none">Default</option>
                        <option value="priority_desc">⬆️ Priority (High → Low)</option>
                        <option value="priority_asc">⬇️ Priority (Low → High)</option>
                        <option value="due_date_asc">📅 Due Date (Nearest)</option>
                        <option value="due_date_desc">📅 Due Date (Farthest)</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            onClick={() => {
                                setPersonFilter('all')
                                setPriorityFilter('all')
                                setCategoryFilter('all')
                                setDueDateFilter('all')
                                setSortBy('none')
                            }}
                            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear all
                        </button>
                    )}

                    {/* Category Management button */}
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="ml-auto px-2.5 py-1 rounded-md border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Manage Categories
                    </button>
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
                        <Button onClick={handleOpenAdd}>
                            <Plus className="w-4 h-4 mr-2" /> Add Todo
                        </Button>
                    </motion.div>
                )}

                {/* Content — Table or Board */}
                {!loading && todos.length > 0 && (
                    <>
                        {viewMode === 'table' ? (
                            <TableView
                                todos={filteredTodos}
                                categories={categories}
                                onOpenTodo={handleOpenTodo}
                                onOpenAdd={handleOpenAdd}
                            />
                        ) : (
                            <KanbanView
                                todos={todos}
                                todosByStatus={todosByStatus}
                                categories={categories}
                                onOpenTodo={handleOpenTodo}
                                onStatusChange={handleStatusChange}
                                onToggleTask={handleToggleTask}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Side Peek */}
            <TodoSidePeek
                todo={peekTodo}
                open={peekOpen}
                categories={categories}
                onClose={handleSidePeekClose}
                onRefresh={handleRefresh}
            />

            {/* Add Modal */}
            <AddTodoModal
                open={showAddModal}
                categories={categories}
                onClose={() => setShowAddModal(false)}
                onCreated={() => {
                    fetchTodos()
                    setShowAddModal(false)
                }}
            />

            {/* Category Management Modal */}
            <AnimatePresence>
                {showCategoryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCategoryModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-card rounded-xl shadow-2xl w-full max-w-md border border-border"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                                <h2 className="text-base font-semibold text-foreground">
                                    Manage Categories
                                </h2>
                                <button
                                    onClick={() => setShowCategoryModal(false)}
                                    className="p-1 rounded-md hover:bg-secondary transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                                {/* Existing categories */}
                                {categories.length > 0 && (
                                    <div className="space-y-2">
                                        {categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/30 group"
                                            >
                                                <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', cat.color)}>
                                                    {cat.icon || '•'} {cat.name}
                                                </span>
                                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {editingCat?.id === cat.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                value={editingCat.name}
                                                                onChange={(e) =>
                                                                    setEditingCat({ ...editingCat, name: e.target.value })
                                                                }
                                                                className="px-2 py-0.5 rounded border border-border bg-background text-xs w-24"
                                                            />
                                                            <button
                                                                onClick={async () => {
                                                                    await updateTodoCategory(editingCat.id, {
                                                                        name: editingCat.name,
                                                                    })
                                                                    setEditingCat(null)
                                                                    await fetchCategories()
                                                                }}
                                                                className="text-xs text-primary hover:underline"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingCat(null)}
                                                                className="text-xs text-muted-foreground"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingCat(cat)}
                                                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setDeletingCatId(cat.id)
                                                                    await deleteTodoCategory(cat.id)
                                                                    setDeletingCatId(null)
                                                                    await fetchCategories()
                                                                }}
                                                                disabled={deletingCatId === cat.id}
                                                                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {categories.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                        No categories yet. Create one below!
                                    </p>
                                )}

                                {/* Create new category */}
                                <div className="border-t border-border pt-4 space-y-3">
                                    <h3 className="text-sm font-medium text-foreground">
                                        New Category
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <input
                                            value={newCatIcon}
                                            onChange={(e) => setNewCatIcon(e.target.value)}
                                            placeholder="Icon"
                                            className="w-14 px-2 py-1.5 rounded-md border border-border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                        <input
                                            value={newCatName}
                                            onChange={(e) => setNewCatName(e.target.value)}
                                            placeholder="Category name"
                                            className="flex-1 px-2.5 py-1.5 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCreateCategory()
                                            }}
                                        />
                                    </div>
                                    {/* Color picker */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {CATEGORY_COLORS.map((c) => (
                                            <button
                                                key={c.value}
                                                onClick={() => setNewCatColor(c.value)}
                                                className={cn(
                                                    'w-6 h-6 rounded-full border-2 transition-all',
                                                    c.preview,
                                                    newCatColor === c.value
                                                        ? 'border-foreground scale-110'
                                                        : 'border-transparent hover:scale-105'
                                                )}
                                                title={c.label}
                                            />
                                        ))}
                                    </div>
                                    {/* Preview */}
                                    {newCatName.trim() && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">Preview:</span>
                                            <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', newCatColor)}>
                                                {newCatIcon || '•'} {newCatName}
                                            </span>
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleCreateCategory}
                                        disabled={!newCatName.trim() || savingCat}
                                        className="w-full"
                                        size="sm"
                                    >
                                        {savingCat ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        Create Category
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
