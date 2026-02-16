'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, X, TrendingUp, TrendingDown, Wallet, PiggyBank,
    Coffee, Car, Gamepad2, Heart, Briefcase,
    Receipt, Edit2, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, Loader2, Users, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import {
    getTransactions, createTransaction, updateTransaction, deleteTransaction as deleteTransactionAction,
    getBudgets, createBudget, updateBudget, deleteBudget,
    getSavingsAccounts, createSavingsAccount, updateSavingsBalance, deleteSavingsAccount,
} from '@/lib/actions/finance'
import type { Transaction, Budget, SavingsAccount } from '@/types'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

type TransactionTypeFilter = 'all' | 'income' | 'expense'
type TabView = 'overview' | 'transactions' | 'savings' | 'budgets'

const categoryIcons: Record<string, any> = {
    salary: Briefcase, freelance: DollarSign, investment: TrendingUp, gift: Heart,
    food: Coffee, transport: Car, entertainment: Gamepad2, shopping: Wallet,
    bills: Receipt, health: Heart, education: Briefcase, date: Heart,
    other_income: DollarSign, other_expense: Receipt, other: Receipt,
}

const CHART_COLORS = ['#ff7dda', '#a855f7', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#64748b']

const BANK_OPTIONS = [
    { code: 'cash', label: '💵 Cash', icon: '💵' },
    { code: 'bca', label: '🏦 BCA', icon: '🏦' },
    { code: 'bni', label: '🏦 BNI', icon: '🏦' },
    { code: 'bri', label: '🏦 BRI', icon: '🏦' },
    { code: 'mandiri', label: '🏦 Mandiri', icon: '🏦' },
    { code: 'dana', label: '💜 DANA', icon: '💜' },
    { code: 'gopay', label: '💚 GoPay', icon: '💚' },
    { code: 'ovo', label: '💜 OVO', icon: '💜' },
    { code: 'shopeepay', label: '🧡 ShopeePay', icon: '🧡' },
    { code: 'other', label: '💰 Other', icon: '💰' },
]

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount)
}

const formatShort = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
    return amount.toString()
}

export default function FinancePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [budgets, setBudgets] = useState<Budget[]>([])
    const [savings, setSavings] = useState<SavingsAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState<'transaction' | 'budget' | 'savings' | 'savings_tx'>('transaction')
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
    const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')
    const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense')
    const [activeTab, setActiveTab] = useState<TabView>('overview')
    const [personFilter, setPersonFilter] = useState<string>('all')
    const [selectedSavingsAccount, setSelectedSavingsAccount] = useState<SavingsAccount | null>(null)
    const [savingsTxType, setSavingsTxType] = useState<'deposit' | 'withdraw'>('deposit')
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [txData, budgetsData, savingsData] = await Promise.all([
                getTransactions(), getBudgets(), getSavingsAccounts()
            ])
            setTransactions(txData)
            setBudgets(budgetsData)
            setSavings(savingsData)
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    // ========== Transaction Handlers ==========
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

    const handleDeleteTransaction = async (id: string) => {
        try {
            await deleteTransactionAction(id)
            await fetchData()
        } catch (error) {
            console.error('Error deleting transaction:', error)
        }
    }

    // ========== Budget Handlers ==========
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

    const handleDeleteBudget = async (id: string) => {
        try {
            await deleteBudget(id)
            await fetchData()
        } catch (error) {
            console.error('Error deleting budget:', error)
        }
    }

    // ========== Savings Handlers ==========
    const handleSubmitSavings = async (formData: FormData) => {
        setSaving(true)
        try {
            await createSavingsAccount(formData)
            await fetchData()
            closeModal()
        } catch (error) {
            console.error('Error creating savings:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleSavingsTransaction = async (formData: FormData) => {
        if (!selectedSavingsAccount) return
        setSaving(true)
        try {
            const amount = parseFloat(formData.get('amount') as string)
            const description = formData.get('description') as string
            await updateSavingsBalance(selectedSavingsAccount.id, amount, savingsTxType, description)
            await fetchData()
            closeModal()
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteSavings = async (id: string) => {
        try {
            await deleteSavingsAccount(id)
            await fetchData()
        } catch (error) {
            console.error('Error deleting savings:', error)
        }
    }

    // ========== Computed Data ==========
    const totals = useMemo(() => {
        const now = new Date()
        const cm = now.getMonth(), cy = now.getFullYear()
        const monthly = transactions.filter(t => {
            const d = new Date(t.date)
            return d.getMonth() === cm && d.getFullYear() === cy
        })
        const income = monthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const expense = monthly.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return { income, expense, balance: income - expense }
    }, [transactions])

    const totalSavings = useMemo(() => savings.reduce((s, a) => s + a.balance, 0), [savings])

    // Monthly chart data (last 6 months)
    const monthlyChartData = useMemo(() => {
        const months: { name: string; income: number; expense: number }[] = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const m = d.getMonth(), y = d.getFullYear()
            const monthTx = transactions.filter(t => {
                const td = new Date(t.date)
                return td.getMonth() === m && td.getFullYear() === y
            })
            months.push({
                name: d.toLocaleDateString('id-ID', { month: 'short' }),
                income: monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
                expense: monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            })
        }
        return months
    }, [transactions])

    // Category pie data
    const categoryPieData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense')
        const grouped = expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
        }, {} as Record<string, number>)
        return Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, value]) => ({ name, value }))
    }, [transactions])

    const filteredTransactions = useMemo(() => {
        let result = [...transactions]
        if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter)
        if (personFilter !== 'all') result = result.filter(t => (t as any).profiles?.role === personFilter)
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [transactions, typeFilter, personFilter])

    const openAddModal = (type: typeof modalType) => {
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
        setSelectedSavingsAccount(null)
    }

    return (
        <>
            <Header title="Finance" emoji="💰" />

            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
                    <SummaryCard
                        label="Income"
                        value={formatCurrency(totals.income)}
                        icon={<TrendingUp className="w-5 h-5" />}
                        color="emerald"
                        sub="This month"
                    />
                    <SummaryCard
                        label="Expenses"
                        value={formatCurrency(totals.expense)}
                        icon={<TrendingDown className="w-5 h-5" />}
                        color="red"
                        sub="This month"
                    />
                    <SummaryCard
                        label="Balance"
                        value={formatCurrency(totals.balance)}
                        icon={<Wallet className="w-5 h-5" />}
                        color={totals.balance >= 0 ? 'primary' : 'red'}
                        sub="Net savings"
                    />
                    <SummaryCard
                        label="Total Tabungan"
                        value={formatCurrency(totalSavings)}
                        icon={<PiggyBank className="w-5 h-5" />}
                        color="purple"
                        sub={`${savings.length} accounts`}
                    />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit overflow-x-auto">
                    {(['overview', 'transactions', 'savings', 'budgets'] as TabView[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-3 md:px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize whitespace-nowrap',
                                activeTab === tab
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {tab === 'savings' ? 'Tabungan' : tab}
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* ========== OVERVIEW TAB ========== */}
                {!loading && activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Monthly Trend Chart */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Trend</h3>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                                        <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                                        <Tooltip
                                            formatter={(value) => formatCurrency(Number(value))}
                                            contentStyle={{
                                                backgroundColor: 'var(--card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                                        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Spending by Category Pie */}
                        <div className="bg-card border border-border rounded-xl p-5">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
                            {categoryPieData.length > 0 ? (
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {categoryPieData.map((_, i) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                            <Legend
                                                formatter={(value) => (
                                                    <span className="text-xs capitalize text-foreground">{value}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                                    No expense data yet
                                </div>
                            )}
                        </div>

                        {/* Savings Overview */}
                        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-foreground">Tabungan Overview</h3>
                                <span className="text-lg font-bold text-primary">{formatCurrency(totalSavings)}</span>
                            </div>
                            {savings.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {savings.map((account) => {
                                        const bankInfo = BANK_OPTIONS.find(b => b.code === account.bank_code)
                                        return (
                                            <div key={account.id} className="bg-secondary/50 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">{account.icon || bankInfo?.icon || '💰'}</span>
                                                    <span className="text-sm font-medium text-foreground truncate">{account.name}</span>
                                                </div>
                                                <p className="text-base font-bold text-foreground">{formatCurrency(account.balance)}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">{account.type}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No savings accounts yet. Add one in the Tabungan tab.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ========== TRANSACTIONS TAB ========== */}
                {!loading && activeTab === 'transactions' && (
                    <div>
                        {/* Filters & Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Type Filter */}
                                <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                                    {(['all', 'income', 'expense'] as TransactionTypeFilter[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTypeFilter(type)}
                                            className={cn(
                                                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
                                                typeFilter === type
                                                    ? 'bg-card text-foreground shadow-sm'
                                                    : 'text-muted-foreground hover:text-foreground'
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {/* Person Filter */}
                                <select
                                    value={personFilter}
                                    onChange={(e) => setPersonFilter(e.target.value)}
                                    className="px-2.5 py-1.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="all">All People</option>
                                    <option value="aegg">🍌 Aegg</option>
                                    <option value="peppaa">🍈 Peppaa</option>
                                </select>
                            </div>

                            <Button onClick={() => openAddModal('transaction')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Transaction
                            </Button>
                        </div>

                        {/* Transaction List */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="divide-y divide-border">
                                {filteredTransactions.map((transaction, index) => {
                                    const IconComponent = categoryIcons[transaction.category] || Receipt
                                    return (
                                        <motion.div
                                            key={transaction.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="flex items-center justify-between p-3 md:p-4 hover:bg-secondary/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                                <div className="p-2 md:p-2.5 rounded-xl bg-secondary flex-shrink-0">
                                                    <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-foreground text-sm md:text-base truncate">
                                                            {transaction.description || transaction.category}
                                                        </p>
                                                        {transaction.is_split && (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 flex-shrink-0">
                                                                Split
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                        <span className="capitalize">{transaction.category}</span>
                                                        <span>·</span>
                                                        <span>{new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                        {(transaction as any).profiles && (
                                                            <>
                                                                <span>·</span>
                                                                <span>{(transaction as any).profiles.role === 'aegg' ? '🍌' : '🍈'}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                                                <p className={cn(
                                                    'font-semibold text-sm md:text-lg',
                                                    transaction.type === 'income'
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                )}>
                                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                </p>
                                                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingTransaction(transaction)
                                                            setSelectedType(transaction.type as 'income' | 'expense')
                                                            setModalType('transaction')
                                                            setShowModal(true)
                                                        }}
                                                        className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTransaction(transaction.id)}
                                                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
                    </div>
                )}

                {/* ========== SAVINGS/TABUNGAN TAB ========== */}
                {!loading && activeTab === 'savings' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Tabungan</h3>
                                <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalSavings)}</p>
                            </div>
                            <Button onClick={() => openAddModal('savings')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Account
                            </Button>
                        </div>

                        {savings.length === 0 ? (
                            <div className="text-center py-16 bg-card border border-border rounded-xl">
                                <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground mb-3">No savings accounts yet</p>
                                <Button onClick={() => openAddModal('savings')}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Account
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savings.map((account) => {
                                    const bankInfo = BANK_OPTIONS.find(b => b.code === account.bank_code)
                                    return (
                                        <motion.div
                                            key={account.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-card border border-border rounded-xl p-5 group"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                                                        {account.icon || bankInfo?.icon || '💰'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-foreground">{account.name}</h4>
                                                        <p className="text-xs text-muted-foreground uppercase">
                                                            {account.type} {bankInfo ? `· ${bankInfo.label.split(' ')[1]}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteSavings(account.id)}
                                                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                </button>
                                            </div>

                                            <p className="text-2xl font-bold text-foreground mb-4">
                                                {formatCurrency(account.balance)}
                                            </p>

                                            {/* Owner badge */}
                                            {account.profiles && (
                                                <p className="text-xs text-muted-foreground mb-3">
                                                    {account.profiles.role === 'aegg' ? '🍌' : '🍈'} {account.profiles.display_name}
                                                </p>
                                            )}

                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedSavingsAccount(account)
                                                        setSavingsTxType('deposit')
                                                        setModalType('savings_tx')
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    <ArrowDownRight className="w-3 h-3 mr-1" /> Deposit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => {
                                                        setSelectedSavingsAccount(account)
                                                        setSavingsTxType('withdraw')
                                                        setModalType('savings_tx')
                                                        setShowModal(true)
                                                    }}
                                                >
                                                    <ArrowUpRight className="w-3 h-3 mr-1" /> Withdraw
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ========== BUDGETS TAB ========== */}
                {!loading && activeTab === 'budgets' && (
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
                                const now = new Date()
                                const cm = now.getMonth(), cy = now.getFullYear()
                                const spent = transactions
                                    .filter(t => {
                                        if (t.type !== 'expense' || t.category !== budget.category) return false
                                        const d = new Date(t.date)
                                        return d.getMonth() === cm && d.getFullYear() === cy
                                    })
                                    .reduce((sum, t) => sum + t.amount, 0)
                                const percentage = Math.min((spent / budget.amount) * 100, 100)
                                const isOver = spent > budget.amount
                                const IconComponent = categoryIcons[budget.category] || Receipt

                                return (
                                    <motion.div
                                        key={budget.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-card border border-border rounded-xl p-5 group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-secondary">
                                                    <IconComponent className="w-5 h-5 text-foreground" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-foreground capitalize">{budget.category}</h4>
                                                    <p className="text-xs text-muted-foreground capitalize">{budget.period}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn('font-semibold', isOver ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                                                    {formatCurrency(spent)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">of {formatCurrency(budget.amount)}</p>
                                            </div>
                                        </div>

                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.5 }}
                                                className={cn(
                                                    'h-full rounded-full',
                                                    isOver ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                )}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between mt-2 text-xs">
                                            <span className={cn(isOver ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                                                {percentage.toFixed(0)}% used
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">
                                                    {isOver ? `Over ${formatCurrency(spent - budget.amount)}` : `${formatCurrency(budget.amount - spent)} left`}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteBudget(budget.id)}
                                                    className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        {budgets.length === 0 && (
                            <div className="text-center py-16 bg-card border border-border rounded-xl">
                                <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">No budgets set yet</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========== MODALS ========== */}
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
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-foreground">
                                    {modalType === 'transaction' ? (editingTransaction ? 'Edit Transaction' : 'Add Transaction')
                                        : modalType === 'budget' ? (editingBudget ? 'Edit Budget' : 'Add Budget')
                                            : modalType === 'savings' ? 'Add Savings Account'
                                                : `${savingsTxType === 'deposit' ? 'Deposit to' : 'Withdraw from'} ${selectedSavingsAccount?.name}`
                                    }
                                </h2>
                                <button onClick={closeModal} className="p-1 hover:bg-secondary rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Transaction Form */}
                            {modalType === 'transaction' && (
                                <form ref={formRef} action={handleSubmitTransaction} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setSelectedType('income')}
                                                className={cn(
                                                    'px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2',
                                                    selectedType === 'income'
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : 'border-border hover:border-emerald-500'
                                                )}>
                                                <TrendingUp className="w-4 h-4" /> Income
                                            </button>
                                            <button type="button" onClick={() => setSelectedType('expense')}
                                                className={cn(
                                                    'px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2',
                                                    selectedType === 'expense'
                                                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'border-border hover:border-red-500'
                                                )}>
                                                <TrendingDown className="w-4 h-4" /> Expense
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="amount" required placeholder="0"
                                                defaultValue={editingTransaction?.amount}
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                                        <input type="text" name="description" required placeholder="e.g. Grocery shopping"
                                            defaultValue={editingTransaction?.description ?? ''}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                                            <select name="category" defaultValue={editingTransaction?.category || (selectedType === 'income' ? 'salary' : 'food')}
                                                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                                {TRANSACTION_CATEGORIES[selectedType].map((cat) => (
                                                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                                            <input type="date" name="date"
                                                defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTransaction ? 'Save' : 'Add'}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Budget Form */}
                            {modalType === 'budget' && (
                                <form ref={formRef} action={handleSubmitBudget} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                                        <select name="category" defaultValue={editingBudget?.category || 'food'}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                            {TRANSACTION_CATEGORIES.expense.map((cat) => (
                                                <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Budget Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="amount" required placeholder="0"
                                                defaultValue={editingBudget?.amount}
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Period</label>
                                        <select name="period" defaultValue={editingBudget?.period || 'monthly'}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="yearly">Yearly</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingBudget ? 'Save' : 'Add'}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Savings Account Form */}
                            {modalType === 'savings' && (
                                <form action={handleSubmitSavings} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Account Name</label>
                                        <input type="text" name="name" required placeholder="e.g. Tabungan BCA"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                            <select name="type" className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                                <option value="cash">💵 Cash</option>
                                                <option value="digital">📱 Digital</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Bank/Wallet</label>
                                            <select name="bank_code" className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                                {BANK_OPTIONS.map((b) => (
                                                    <option key={b.code} value={b.code}>{b.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Initial Balance</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="balance" placeholder="0"
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Icon (emoji)</label>
                                        <input type="text" name="icon" placeholder="💰"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Savings Transaction Form */}
                            {modalType === 'savings_tx' && selectedSavingsAccount && (
                                <form action={handleSavingsTransaction} className="space-y-4">
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3 mb-2">
                                        <span className="text-lg">{selectedSavingsAccount.icon || '💰'}</span>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">{selectedSavingsAccount.name}</p>
                                            <p className="text-xs text-muted-foreground">Balance: {formatCurrency(selectedSavingsAccount.balance)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setSavingsTxType('deposit')}
                                                className={cn(
                                                    'px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors',
                                                    savingsTxType === 'deposit'
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : 'border-border'
                                                )}>
                                                Deposit
                                            </button>
                                            <button type="button" onClick={() => setSavingsTxType('withdraw')}
                                                className={cn(
                                                    'px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors',
                                                    savingsTxType === 'withdraw'
                                                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                        : 'border-border'
                                                )}>
                                                Withdraw
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="amount" required placeholder="0"
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                                        <input type="text" name="description" placeholder="e.g. Monthly savings"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savingsTxType === 'deposit' ? 'Deposit' : 'Withdraw'}
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

// ========== Summary Card Component ==========

function SummaryCard({ label, value, icon, color, sub }: {
    label: string; value: string; icon: React.ReactNode; color: string; sub: string
}) {
    const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
        emerald: { bg: '', text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
        red: { bg: '', text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
        primary: { bg: '', text: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
        purple: { bg: '', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' },
    }
    const c = colorMap[color] || colorMap.primary

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-4 md:p-5"
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">{label}</p>
                    <p className={cn('text-lg md:text-2xl font-bold truncate', c.text)}>{value}</p>
                </div>
                <div className={cn('p-2 md:p-3 rounded-xl flex-shrink-0', c.iconBg)}>
                    {icon}
                </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{sub}</p>
        </motion.div>
    )
}
