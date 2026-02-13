'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, TrendingUp, TrendingDown, Wallet, PiggyBank,
  ShoppingCart, Coffee, Car, Home, Gamepad2, Heart, Briefcase,
  Receipt, Edit2, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction as deleteTransactionAction,
  getBudgets, createBudget, updateBudget, deleteBudget
} from '@/lib/actions/finance'
import type { Transaction, Budget } from '@/types'

type TransactionType = 'all' | 'income' | 'expense'
type TabView = 'transactions' | 'budgets' | 'analytics'

const categoryIcons: Record<string, any> = {
  salary: Briefcase,
  freelance: DollarSign,
  food: Coffee,
  transport: Car,
  entertainment: Gamepad2,
  shopping: ShoppingCart,
  bills: Home,
  health: Heart,
  other: Receipt,
}

const categoryColors: Record<string, string> = {
  salary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  freelance: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  food: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  transport: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  entertainment: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  shopping: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  bills: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  health: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'transaction' | 'budget'>('transaction')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all')
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense')
  const [activeTab, setActiveTab] = useState<TabView>('transactions')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [transactionsData, budgetsData] = await Promise.all([
        getTransactions(),
        getBudgets()
      ])
      setTransactions(transactionsData)
      setBudgets(budgetsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTransaction = async (formData: FormData) => {
    setSaving(true)
    formData.set('type', selectedType)
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, formData)
      } else {
        await createTransaction(formData)
      }
      await fetchData()
      closeModal()
    } catch (error) {
      console.error('Error saving transaction:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitBudget = async (formData: FormData) => {
    setSaving(true)
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, formData)
      } else {
        await createBudget(formData)
      }
      await fetchData()
      closeModal()
    } catch (error) {
      console.error('Error saving budget:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransactionAction(id)
      await fetchData()
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const handleDeleteBudget = async (id: string) => {
    try {
      await deleteBudget(id)
      await fetchData()
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  // Calculate totals (filtered by current month)
  const totals = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const income = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const expense = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [transactions])

  // Calculate spending by category
  const spendingByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense')
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
    return Object.entries(grouped).sort((a, b) => b[1] - a[1])
  }, [transactions])

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    return true
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const openAddModal = (type: 'transaction' | 'budget') => {
    setModalType(type)
    setEditingTransaction(null)
    setEditingBudget(null)
    setSelectedType('expense')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTransaction(null)
    setEditingBudget(null)
  }

  return (
    <>
      <Header title="Finance Manager" emoji="💰" />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Income</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.income)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
              <span>This month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totals.expense)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm text-red-600 dark:text-red-400">
              <ArrowDownRight className="w-4 h-4" />
              <span>This month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Balance</p>
                <p className={cn(
                  "text-2xl font-bold",
                  totals.balance >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(totals.balance)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
              <PiggyBank className="w-4 h-4" />
              <span>Net savings</span>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit">
          {(['transactions', 'budgets', 'analytics'] as TabView[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize",
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                  {(['all', 'income', 'expense'] as TransactionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                        typeFilter === type
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={() => openAddModal('transaction')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Transaction List */}
            {!loading && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {filteredTransactions.map((transaction, index) => {
                    const IconComponent = categoryIcons[transaction.category] || Receipt
                    return (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("p-2.5 rounded-xl", categoryColors[transaction.category])}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{transaction.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="capitalize">{transaction.category}</span>
                              <span>•</span>
                              <span>{new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              <span>•</span>
                              <span className={cn(
                                "inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium",
                                (transaction as any).profiles?.role === 'aegg'
                                  ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                                  : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                              )}>
                                {(transaction as any).profiles?.role === 'aegg' ? '🍌' : '🍈'} {(transaction as any).profiles?.display_name?.split(' ')[0] || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className={cn(
                            "font-semibold text-lg",
                            transaction.type === 'income'
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingTransaction(transaction); setSelectedType(transaction.type as 'income' | 'expense'); setModalType('transaction'); setShowModal(true) }}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No transactions found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Monthly Budgets</h3>
              <Button onClick={() => openAddModal('budget')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Budget
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map((budget) => {
                // Filter spending by budget period (monthly = current month)
                const now = new Date()
                const currentMonth = now.getMonth()
                const currentYear = now.getFullYear()
                const spent = transactions
                  .filter(t => {
                    if (t.type !== 'expense' || t.category !== budget.category) return false
                    if (budget.period === 'monthly') {
                      const d = new Date(t.date)
                      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
                    }
                    return true // weekly/yearly: show all for now
                  })
                  .reduce((sum, t) => sum + t.amount, 0)
                const percentage = Math.min((spent / budget.amount) * 100, 100)
                const IconComponent = categoryIcons[budget.category] || Receipt
                const isOverBudget = spent > budget.amount

                return (
                  <motion.div
                    key={budget.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl", categoryColors[budget.category])}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground capitalize">{budget.category}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{budget.period}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          isOverBudget ? "text-red-600 dark:text-red-400" : "text-foreground"
                        )}>
                          {formatCurrency(spent)}
                        </p>
                        <p className="text-sm text-muted-foreground">of {formatCurrency(budget.amount)}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          isOverBudget
                            ? "bg-red-500"
                            : percentage > 80
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                        )}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className={cn(
                        isOverBudget ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                      )}>
                        {percentage.toFixed(0)}% used
                      </span>
                      <span className="text-muted-foreground">
                        {isOverBudget
                          ? `Over by ${formatCurrency(spent - budget.amount)}`
                          : `${formatCurrency(budget.amount - spent)} left`
                        }
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Spending by Category */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
              <div className="space-y-4">
                {spendingByCategory.map(([category, amount]) => {
                  const totalExpense = totals.expense || 1
                  const percentage = (amount / totalExpense) * 100
                  const IconComponent = categoryIcons[category] || Receipt

                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-lg", categoryColors[category])}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-foreground capitalize">{category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
                          <span className="text-sm text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={cn("h-full rounded-full", categoryColors[category].split(' ')[0].replace('bg-', 'bg-').replace('/30', ''))}
                          style={{
                            backgroundColor: category === 'food' ? '#f97316' :
                              category === 'transport' ? '#a855f7' :
                                category === 'entertainment' ? '#ec4899' :
                                  category === 'shopping' ? '#eab308' :
                                    category === 'bills' ? '#ef4444' : '#6b7280'
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Income vs Expense */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-semibold text-foreground mb-4">Income vs Expense</h3>
              <div className="flex items-end gap-8 h-48 px-4">
                <div className="flex-1 flex flex-col items-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(Math.max(totals.income, totals.expense) > 0 ? (totals.income / Math.max(totals.income, totals.expense)) * 100 : 0)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-[80px] bg-emerald-500 rounded-t-lg"
                  />
                  <p className="mt-2 font-medium text-foreground">Income</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.income)}</p>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(Math.max(totals.income, totals.expense) > 0 ? (totals.expense / Math.max(totals.income, totals.expense)) * 100 : 0)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full max-w-[80px] bg-red-500 rounded-t-lg"
                  />
                  <p className="mt-2 font-medium text-foreground">Expense</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{formatCurrency(totals.expense)}</p>
                </div>
              </div>

              {/* Savings Rate */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Savings Rate</span>
                  <span className={cn(
                    "font-semibold text-lg",
                    totals.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {totals.income > 0 ? ((totals.balance / totals.income) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  {modalType === 'transaction'
                    ? (editingTransaction ? 'Edit Transaction' : 'Add Transaction')
                    : 'Add Budget'
                  }
                </h2>
                <button
                  onClick={closeModal}
                  className="p-1 hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Transaction Form */}
              {modalType === 'transaction' && (
                <form ref={formRef} action={handleSubmitTransaction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedType('income')}
                        className={cn(
                          "px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2",
                          selectedType === 'income'
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "border-border hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        )}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Income
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedType('expense')}
                        className={cn(
                          "px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2",
                          selectedType === 'expense'
                            ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "border-border hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        )}
                      >
                        <TrendingDown className="w-4 h-4" />
                        Expense
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                      <input
                        type="number"
                        name="amount"
                        required
                        placeholder="0"
                        defaultValue={editingTransaction?.amount}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                    <input
                      type="text"
                      name="description"
                      required
                      placeholder="e.g. Grocery shopping"
                      defaultValue={editingTransaction?.description ?? ''}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                      <select
                        name="category"
                        defaultValue={editingTransaction?.category || 'food'}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="salary">💼 Salary</option>
                        <option value="freelance">💵 Freelance</option>
                        <option value="food">☕ Food</option>
                        <option value="transport">🚗 Transport</option>
                        <option value="entertainment">🎮 Entertainment</option>
                        <option value="shopping">🛒 Shopping</option>
                        <option value="bills">🏠 Bills</option>
                        <option value="health">❤️ Health</option>
                        <option value="other">📋 Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                      <input
                        type="date"
                        name="date"
                        defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTransaction ? 'Save Changes' : 'Add'}
                    </Button>
                  </div>
                </form>
              )}

              {/* Budget Form */}
              {modalType === 'budget' && (
                <form ref={formRef} action={handleSubmitBudget} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                    <select
                      name="category"
                      defaultValue={editingBudget?.category || 'food'}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="food">☕ Food</option>
                      <option value="transport">🚗 Transport</option>
                      <option value="entertainment">🎮 Entertainment</option>
                      <option value="shopping">🛒 Shopping</option>
                      <option value="bills">🏠 Bills</option>
                      <option value="health">❤️ Health</option>
                      <option value="other">📋 Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Budget Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                      <input
                        type="number"
                        name="amount"
                        required
                        placeholder="0"
                        defaultValue={editingBudget?.amount}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Period</label>
                    <select
                      name="period"
                      defaultValue={editingBudget?.period || 'monthly'}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingBudget ? 'Save Changes' : 'Add'}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
