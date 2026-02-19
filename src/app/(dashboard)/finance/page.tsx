'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Plus, X, TrendingUp, TrendingDown, Wallet, PiggyBank,
    Coffee, Car, Gamepad2, Heart, Briefcase,
    Receipt, Edit2, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, Loader2,
    ShoppingCart, Globe, Settings, Gift, MapPin, Zap,
    Tag, Search, FileText, Upload, ChevronDown,
    Smartphone, HandHeart, Activity, Building2, BookOpen, Sofa as SofaIcon, Droplets,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import {
    getTransactions, createTransaction, updateTransaction, deleteTransaction as deleteTransactionAction,
    getBudgets, createBudget, updateBudget, deleteBudget,
    getSavingsAccounts, createSavingsAccount, updateSavingsBalance, deleteSavingsAccount,
    getFinanceProfile
} from '@/lib/actions/finance'
import type { Transaction, Budget, SavingsAccount } from '@/types'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
    Area, AreaChart,
} from 'recharts'
import { FinanceSidebar, type FinanceTab } from '@/components/features/finance/finance-sidebar'
import { LedgerTab } from '@/components/features/finance/ledger-tab'
import { AnalyticsTab } from '@/components/features/finance/analytics-tab'
import { BudgetsTab } from '@/components/features/finance/budgets-tab'
import { RecapTab } from '@/components/features/finance/recap-tab'

type TransactionTypeFilter = 'all' | 'income' | 'expense'

const categoryIcons: Record<string, any> = {
    salary: Briefcase, freelance: DollarSign, asprak: BookOpen, volunteer: HandHeart,
    investment: TrendingUp, gift: Heart, other_income: DollarSign,
    food: Coffee, daily_needs: Building2, shopping: ShoppingCart, transport: Car,
    clothing: ShoppingCart, treatment: Droplets, sedekah: HandHeart, gift_giving: Gift,
    vacation: MapPin, entertainment: Gamepad2, bills: Receipt,
    utilities: Zap, internet: Globe, health: Activity, vehicle: Settings,
    furniture: SofaIcon, education: BookOpen, saving: PiggyBank, ewallet: Smartphone,
    date: Heart, other_expense: Receipt, other: Receipt,
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
    const [viewingReceipt, setViewingReceipt] = useState<string | null>(null)
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
    const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')
    const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense')
    const [activeTab, setActiveTab] = useState<FinanceTab>('overview')
    const [personFilter, setPersonFilter] = useState<string>('all')
    const [selectedSavingsAccount, setSelectedSavingsAccount] = useState<SavingsAccount | null>(null)
    const [savingsTxType, setSavingsTxType] = useState<'deposit' | 'withdraw'>('deposit')

    // Partner View Stats
    const [viewMode, setViewMode] = useState<'me' | 'partner' | 'combined'>('me')
    const [userProfile, setUserProfile] = useState<{ id: string; role: string; partnerId?: string } | null>(null)

    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        getFinanceProfile().then(p => {
            setUserProfile(p)
            fetchData(p, viewMode)
        })
    }, [])

    // Re-fetch when viewMode changes
    useEffect(() => {
        if (!userProfile) return
        fetchData(userProfile, viewMode)
    }, [viewMode])

    const fetchData = async (profile: typeof userProfile, mode: typeof viewMode) => {
        setLoading(true)
        try {
            let targetId: string | 'all' | undefined = undefined
            if (mode === 'combined') targetId = 'all'
            else if (mode === 'partner' && profile?.partnerId) targetId = profile.partnerId
            else if (mode === 'me' && profile?.id) targetId = profile.id

            const [txData, budgetsData, savingsData] = await Promise.all([
                getTransactions(targetId),
                getBudgets(targetId),
                getSavingsAccounts(targetId)
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

    // ========== Handlers ==========
    const handleSubmitTransaction = async (formData: FormData) => {
        setSaving(true)
        formData.set('type', selectedType)
        try {
            if (editingTransaction) {
                await updateTransaction(editingTransaction.id, formData)
            } else {
                await createTransaction(formData)
            }
            await fetchData(userProfile, viewMode)
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
            await fetchData(userProfile, viewMode)
        } catch (error) {
            console.error('Error deleting transaction:', error)
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
            await fetchData(userProfile, viewMode)
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

    const handleSubmitSavings = async (formData: FormData) => {
        setSaving(true)
        try {
            await createSavingsAccount(formData)
            await fetchData(userProfile, viewMode)
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
            await fetchData(userProfile, viewMode)
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
            await fetchData(userProfile, viewMode)
        } catch (error) {
            console.error('Error deleting savings:', error)
        }
    }

    // ========== Computed ==========
    const totals = useMemo(() => {
        const now = new Date()
        const cm = now.getMonth(), cy = now.getFullYear()
        const monthly = transactions.filter(t => {
            const d = new Date(t.date)
            return d.getMonth() === cm && d.getFullYear() === cy
        })
        const income = monthly.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const expense = monthly.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0
        return { income, expense, balance: income - expense, savingsRate }
    }, [transactions])

    const totalSavings = useMemo(() => savings.reduce((s, a) => s + a.balance, 0), [savings])

    const monthlyChartData = useMemo(() => {
        const months: { name: string; income: number; expense: number; balance: number }[] = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const m = d.getMonth(), y = d.getFullYear()
            const monthTx = transactions.filter(t => {
                const td = new Date(t.date)
                return td.getMonth() === m && td.getFullYear() === y
            })
            const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
            months.push({
                name: d.toLocaleDateString('id-ID', { month: 'short' }),
                income: inc,
                expense: exp,
                balance: inc - exp,
            })
        }
        return months
    }, [transactions])

    const categoryPieData = useMemo(() => {
        const now = new Date()
        const cm = now.getMonth(), cy = now.getFullYear()
        const totalExpense = transactions.filter(t => {
            if (t.type !== 'expense') return false
            const d = new Date(t.date)
            return d.getMonth() === cm && d.getFullYear() === cy
        }).reduce((s, t) => s + t.amount, 0)
        const expenses = transactions.filter(t => {
            if (t.type !== 'expense') return false
            const d = new Date(t.date)
            return d.getMonth() === cm && d.getFullYear() === cy
        })
        const grouped = expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount
            return acc
        }, {} as Record<string, number>)
        return Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, value]) => ({
                name,
                value,
                percentage: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
            }))
    }, [transactions])

    const filteredTransactions = useMemo(() => {
        let result = [...transactions]
        if (typeFilter !== 'all') result = result.filter(t => t.type === typeFilter)
        if (personFilter !== 'all') result = result.filter(t => (t as any).profiles?.role === personFilter)
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }, [transactions, typeFilter, personFilter])

    // Top spending category this month
    const topCategory = useMemo(() => {
        if (categoryPieData.length === 0) return null
        const cat = categoryPieData[0]
        const catInfo = TRANSACTION_CATEGORIES.expense.find(c => c.value === cat.name)
        return { name: catInfo?.label || cat.name, icon: catInfo?.icon || '💰', amount: cat.value }
    }, [categoryPieData])

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
            <Header title="Finance" icon={Wallet} />

            <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
                {/* Sub-Sidebar */}
                <FinanceSidebar activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">

                        {/* View Mode Toggle */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-secondary/50 p-1 rounded-xl flex items-center gap-1">
                                <button
                                    onClick={() => setViewMode('me')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                        viewMode === 'me' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    My Finance
                                </button>
                                {userProfile?.partnerId && (
                                    <button
                                        onClick={() => setViewMode('partner')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                            viewMode === 'partner' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Partner
                                    </button>
                                )}
                                <button
                                    onClick={() => setViewMode('combined')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                        viewMode === 'combined' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Combined
                                </button>
                            </div>
                        </div>

                        {loading && (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {/* ========== OVERVIEW ========== */}
                        {!loading && activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Top Row: Balance + Income/Expense Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <SummaryCard label="Total Balance" value={formatCurrency(totals.balance + totalSavings)} icon={<Wallet className="w-5 h-5" />} color={totals.balance >= 0 ? 'primary' : 'red'} sub="Semua akun" />
                                    <SummaryCard label="Income" value={formatCurrency(totals.income)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" sub="Bulan ini" />
                                    <SummaryCard label="Expenses" value={formatCurrency(totals.expense)} icon={<TrendingDown className="w-5 h-5" />} color="red" sub="Bulan ini" />
                                    <SummaryCard label="Savings Rate" value={`${totals.savingsRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5" />} color={totals.savingsRate >= 20 ? 'emerald' : totals.savingsRate >= 0 ? 'amber' : 'red'} sub="Bulan ini" />
                                    <SummaryCard label="Tabungan" value={formatCurrency(totalSavings)} icon={<PiggyBank className="w-5 h-5" />} color="purple" sub={`${savings.length} akun`} />
                                </div>

                                {/* Account Breakdown (compact list) */}
                                {savings.length > 0 && (
                                    <div className="bg-card border border-border rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-foreground">💳 Saldo per Akun</h3>
                                            <button onClick={() => setActiveTab('savings')} className="text-xs text-primary hover:underline">Kelola →</button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            {savings.map((account) => {
                                                const bankInfo = BANK_OPTIONS.find(b => b.code === account.bank_code)
                                                return (
                                                    <div key={account.id} className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2.5">
                                                        <span className="text-xl">{account.icon || bankInfo?.icon || '💰'}</span>
                                                        <div className="min-w-0">
                                                            <p className="text-xs text-muted-foreground truncate">{account.name}</p>
                                                            <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(account.balance)}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {/* Donut Pie Chart with Percentage */}
                                    <div className="bg-card border border-border rounded-xl p-5">
                                        <h3 className="text-sm font-semibold text-foreground mb-4">🍩 Pengeluaran per Kategori</h3>
                                        {categoryPieData.length > 0 ? (
                                            <div className="flex flex-col md:flex-row items-center gap-4">
                                                <div className="h-[220px] w-full md:w-1/2">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={categoryPieData}
                                                                cx="50%" cy="50%"
                                                                innerRadius={50} outerRadius={85}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                label={({ percent }) => percent ? `${(percent * 100).toFixed(0)}%` : ''}
                                                                labelLine={false}
                                                            >
                                                                {categoryPieData.map((_, i) => (
                                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                formatter={(value) => formatCurrency(value as number)}
                                                                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                {/* Legend with percentages */}
                                                <div className="w-full md:w-1/2 space-y-1.5">
                                                    {categoryPieData.map((item, i) => {
                                                        const catInfo = TRANSACTION_CATEGORIES.expense.find(c => c.value === item.name)
                                                        return (
                                                            <div key={item.name} className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                                <span className="text-xs text-foreground capitalize flex-1 truncate">{catInfo?.icon} {catInfo?.label || item.name}</span>
                                                                <span className="text-xs font-semibold text-foreground tabular-nums">{item.percentage}%</span>
                                                                <span className="text-[10px] text-muted-foreground tabular-nums">{formatShort(item.value)}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Belum ada data pengeluaran bulan ini</div>
                                        )}
                                    </div>

                                    {/* Line Chart: Income vs Expense Trend */}
                                    <div className="bg-card border border-border rounded-xl p-5">
                                        <h3 className="text-sm font-semibold text-foreground mb-4">📈 Tren 6 Bulan Terakhir</h3>
                                        <div className="h-[220px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={monthlyChartData}>
                                                    <defs>
                                                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                                                    <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={45} />
                                                    <Tooltip
                                                        formatter={(value) => formatCurrency(value as number)}
                                                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                                    />
                                                    <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGradient)" name="Income" dot={{ r: 3, fill: '#22c55e' }} />
                                                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGradient)" name="Expense" dot={{ r: 3, fill: '#ef4444' }} />
                                                    <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Bar Chart: Monthly Comparison */}
                                <div className="bg-card border border-border rounded-xl p-5">
                                    <h3 className="text-sm font-semibold text-foreground mb-4">📊 Perbandingan Bulanan</h3>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlyChartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                                                <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                                                <Tooltip
                                                    formatter={(value) => formatCurrency(value as number)}
                                                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                                                />
                                                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income" />
                                                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense" />
                                                <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Budget vs Realisasi */}
                                {budgets.length > 0 && (
                                    <div className="bg-card border border-border rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-foreground">🎯 Budget vs Realisasi</h3>
                                            <button onClick={() => setActiveTab('budgets')} className="text-xs text-primary hover:underline">Lihat semua →</button>
                                        </div>
                                        <div className="space-y-2.5">
                                            {budgets.slice(0, 5).map(budget => {
                                                const now = new Date()
                                                const spent = transactions.filter(t => {
                                                    if (t.type !== 'expense' || t.category !== budget.category) return false
                                                    const d = new Date(t.date)
                                                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                                                }).reduce((s, t) => s + t.amount, 0)
                                                const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
                                                const isOver = spent > budget.amount
                                                const catInfo = TRANSACTION_CATEGORIES.expense.find(c => c.value === budget.category)
                                                return (
                                                    <div key={budget.id} className="flex items-center gap-3">
                                                        <span className="text-sm">{catInfo?.icon || '💰'}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <span className="text-xs font-medium text-foreground capitalize">{catInfo?.label || budget.category}</span>
                                                                <span className={cn('text-xs font-medium', isOver ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                                                                    {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                                                <div className={cn('h-full rounded-full transition-all', isOver ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Savings Overview */}
                                {savings.length > 0 && (
                                    <div className="bg-card border border-border rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-foreground">🐷 Tabungan</h3>
                                            <span className="text-sm font-bold text-primary">{formatCurrency(totalSavings)}</span>
                                        </div>
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
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========== TRANSACTIONS ========== */}
                        {!loading && activeTab === 'transactions' && (
                            <div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                                            {(['all', 'income', 'expense'] as TransactionTypeFilter[]).map((type) => (
                                                <button key={type} onClick={() => setTypeFilter(type)}
                                                    className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize', typeFilter === type ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                        <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}
                                            className="px-2.5 py-1.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                                            <option value="all">All People</option>
                                            <option value="aegg">⭐ Aegg</option>
                                            <option value="peppaa">🌙 Peppaa</option>
                                        </select>
                                    </div>
                                    <Button onClick={() => openAddModal('transaction')}>
                                        <Plus className="w-4 h-4 mr-2" /> Transaksi
                                    </Button>
                                </div>

                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="divide-y divide-border">
                                        {filteredTransactions.map((transaction, index) => {
                                            const IconComponent = categoryIcons[transaction.category] || Receipt
                                            return (
                                                <motion.div key={transaction.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}
                                                    className="flex items-center justify-between p-3 md:p-4 hover:bg-secondary/50 transition-colors group">
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
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 flex-shrink-0">Split</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                                <span className="capitalize">{transaction.category.replace(/_/g, ' ')}</span>
                                                                <span>·</span>
                                                                <span>{new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                                {transaction.sub_title && (
                                                                    <><span>·</span><span className="text-primary font-medium"><Tag className="w-2.5 h-2.5 inline mr-0.5" />{transaction.sub_title}</span></>
                                                                )}
                                                                {(transaction as any).profiles && (
                                                                    <><span>·</span><span>{(transaction as any).profiles.role === 'aegg' ? '⭐' : '🌙'}</span></>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                                                        <p className={cn('font-semibold text-sm md:text-lg', transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                        </p>
                                                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                            {transaction.receipt_url && (
                                                                <button onClick={() => setViewingReceipt(transaction.receipt_url!)}
                                                                    className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="Lihat Struk">
                                                                    <Receipt className="w-3.5 h-3.5 text-blue-500" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => { setEditingTransaction(transaction); setSelectedType(transaction.type as 'income' | 'expense'); setModalType('transaction'); setShowModal(true) }}
                                                                className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                            </button>
                                                            <button onClick={() => handleDeleteTransaction(transaction.id)}
                                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
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
                                            <p className="text-muted-foreground">Tidak ada transaksi</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ========== LEDGER ========== */}
                        {!loading && activeTab === 'ledger' && (
                            <LedgerTab transactions={transactions} formatCurrency={formatCurrency} />
                        )}

                        {/* ========== ANALYTICS ========== */}
                        {!loading && activeTab === 'analytics' && (
                            <AnalyticsTab transactions={transactions} formatCurrency={formatCurrency} formatShort={formatShort} />
                        )}

                        {/* ========== BUDGETS ========== */}
                        {!loading && activeTab === 'budgets' && (
                            <BudgetsTab
                                budgets={budgets}
                                transactions={transactions}
                                formatCurrency={formatCurrency}
                                onAddBudget={() => openAddModal('budget')}
                                onEditBudget={(b) => { setEditingBudget(b); setModalType('budget'); setShowModal(true) }}
                                onDeleteBudget={handleDeleteBudget}
                            />
                        )}

                        {/* ========== SAVINGS ========== */}
                        {!loading && activeTab === 'savings' && (<div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">Tabungan</h3>
                                    <p className="text-sm text-muted-foreground">Total: {formatCurrency(totalSavings)}</p>
                                </div>
                                <Button onClick={() => openAddModal('savings')}>
                                    <Plus className="w-4 h-4 mr-2" /> Akun Baru
                                </Button>
                            </div>

                            {savings.length === 0 ? (
                                <div className="text-center py-16 bg-card border border-border rounded-xl">
                                    <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground mb-3">Belum ada akun tabungan</p>
                                    <Button onClick={() => openAddModal('savings')}><Plus className="w-4 h-4 mr-2" /> Tambah Akun</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {savings.map((account) => {
                                        const bankInfo = BANK_OPTIONS.find(b => b.code === account.bank_code)
                                        return (
                                            <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-5 group">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">{account.icon || bankInfo?.icon || '💰'}</div>
                                                        <div>
                                                            <h4 className="font-semibold text-foreground">{account.name}</h4>
                                                            <p className="text-xs text-muted-foreground uppercase">{account.type} {bankInfo ? `· ${bankInfo.label.split(' ')[1]}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDeleteSavings(account.id)} className="p-1 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all">
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                                <p className="text-2xl font-bold text-foreground mb-4">{formatCurrency(account.balance)}</p>
                                                {account.profiles && (
                                                    <p className="text-xs text-muted-foreground mb-3">{account.profiles.role === 'aegg' ? '⭐' : '🌙'} {account.profiles.display_name}</p>
                                                )}
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="flex-1" onClick={() => { setSelectedSavingsAccount(account); setSavingsTxType('deposit'); setModalType('savings_tx'); setShowModal(true) }}>
                                                        <ArrowDownRight className="w-3 h-3 mr-1" /> Deposit
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedSavingsAccount(account); setSavingsTxType('withdraw'); setModalType('savings_tx'); setShowModal(true) }}>
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

                        {/* ========== RECAP ========== */}
                        {!loading && activeTab === 'recap' && (
                            <RecapTab
                                transactions={transactions}
                                formatCurrency={formatCurrency}
                                onRefresh={fetchData}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ========== MODALS ========== */}
            <AnimatePresence>
                {viewingReceipt && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingReceipt(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-3xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setViewingReceipt(null)} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10">
                                <X className="w-5 h-5" />
                            </button>
                            <img src={viewingReceipt ?? ''} alt="Receipt" className="max-w-full max-h-[85vh] object-contain bg-white" />
                        </motion.div>
                    </motion.div>
                )}

                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-card rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-foreground">
                                    {modalType === 'transaction' ? (editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi')
                                        : modalType === 'budget' ? (editingBudget ? 'Edit Budget' : 'Tambah Budget')
                                            : modalType === 'savings' ? 'Tambah Akun Tabungan'
                                                : `${savingsTxType === 'deposit' ? 'Deposit ke' : 'Tarik dari'} ${selectedSavingsAccount?.name}`}
                                </h2>
                                <button onClick={closeModal} className="p-1 hover:bg-secondary rounded-lg transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
                            </div>

                            {/* Transaction Form */}
                            {modalType === 'transaction' && (
                                <form ref={formRef} action={handleSubmitTransaction} className="space-y-4" encType="multipart/form-data">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setSelectedType('income')}
                                                className={cn('px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2',
                                                    selectedType === 'income' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-border hover:border-emerald-500')}>
                                                <TrendingUp className="w-4 h-4" /> Income
                                            </button>
                                            <button type="button" onClick={() => setSelectedType('expense')}
                                                className={cn('px-4 py-3 rounded-lg border-2 font-medium transition-colors flex items-center justify-center gap-2',
                                                    selectedType === 'expense' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'border-border hover:border-red-500')}>
                                                <TrendingDown className="w-4 h-4" /> Expense
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="amount" required placeholder="0" defaultValue={editingTransaction?.amount}
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Keterangan</label>
                                        <input type="text" name="description" required placeholder="e.g. Beli makan siang" defaultValue={editingTransaction?.description ?? ''}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Kategori</label>
                                            <select name="category" defaultValue={editingTransaction?.category || (selectedType === 'income' ? 'salary' : 'food')}
                                                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                                {TRANSACTION_CATEGORIES[selectedType].map((cat) => (
                                                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Tanggal</label>
                                            <input type="date" name="date" defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            <span className="flex items-center gap-1.5">
                                                <Tag className="w-3.5 h-3.5" /> Sub Judul / Label Grup
                                                <span className="text-xs text-muted-foreground font-normal">(opsional, untuk rekap)</span>
                                            </span>
                                        </label>
                                        <input type="text" name="sub_title" placeholder="e.g. Belanja Nov 2025, Trip Bali, Bulanan Feb"
                                            defaultValue={editingTransaction?.sub_title ?? ''}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Upload Struk (Optional)</label>
                                        <div className="relative">
                                            <input type="file" name="receipt_file" accept="image/*"
                                                className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80" />
                                        </div>
                                        {editingTransaction?.receipt_url && (
                                            <p className="mt-1 text-xs text-emerald-500">✓ Struk sudah ada (upload baru untuk mengganti)</p>
                                        )}
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Batal</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTransaction ? 'Simpan' : 'Tambah'}</Button>
                                    </div>
                                </form>
                            )}

                            {/* Budget Form */}
                            {modalType === 'budget' && (
                                <form ref={formRef} action={handleSubmitBudget} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Kategori</label>
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
                                            <input type="number" name="amount" required placeholder="0" defaultValue={editingBudget?.amount}
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Period</label>
                                        <select name="period" defaultValue={editingBudget?.period || 'monthly'}
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                            <option value="weekly">Mingguan</option>
                                            <option value="monthly">Bulanan</option>
                                            <option value="yearly">Tahunan</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Batal</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingBudget ? 'Simpan' : 'Tambah'}</Button>
                                    </div>
                                </form>
                            )}

                            {/* Savings Form */}
                            {modalType === 'savings' && (
                                <form action={handleSubmitSavings} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Nama Akun</label>
                                        <input type="text" name="name" required placeholder="e.g. Tabungan BCA"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
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
                                                {BANK_OPTIONS.map((b) => (<option key={b.code} value={b.code}>{b.label}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Saldo Awal</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="balance" placeholder="0"
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Icon (emoji)</label>
                                        <input type="text" name="icon" placeholder="💰"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Batal</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buat Akun'}</Button>
                                    </div>
                                </form>
                            )}

                            {/* Savings Transaction Form */}
                            {modalType === 'savings_tx' && selectedSavingsAccount && (
                                <form action={handleSavingsTransaction} className="space-y-4">
                                    <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3 mb-2">
                                        <span className="text-lg">{selectedSavingsAccount!.icon || '💰'}</span>
                                        <div>
                                            <p className="font-medium text-foreground text-sm">{selectedSavingsAccount!.name}</p>
                                            <p className="text-xs text-muted-foreground">Saldo: {formatCurrency(selectedSavingsAccount!.balance)}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setSavingsTxType('deposit')}
                                                className={cn('px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors',
                                                    savingsTxType === 'deposit' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-border')}>
                                                Deposit
                                            </button>
                                            <button type="button" onClick={() => setSavingsTxType('withdraw')}
                                                className={cn('px-4 py-2.5 rounded-lg border-2 font-medium text-sm transition-colors',
                                                    savingsTxType === 'withdraw' ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'border-border')}>
                                                Withdraw
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rp</span>
                                            <input type="number" name="amount" required placeholder="0"
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Keterangan</label>
                                        <input type="text" name="description" placeholder="e.g. Nabung bulanan"
                                            className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Batal</Button>
                                        <Button type="submit" className="flex-1" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : savingsTxType === 'deposit' ? 'Deposit' : 'Withdraw'}</Button>
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

// ========== Summary Card ==========
function SummaryCard({ label, value, icon, color, sub }: {
    label: string; value: string; icon: React.ReactNode; color: string; sub: string
}) {
    const colorMap: Record<string, { text: string; iconBg: string }> = {
        emerald: { text: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' },
        red: { text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
        primary: { text: 'text-primary', iconBg: 'bg-primary/10 text-primary' },
        purple: { text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' },
        amber: { text: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300' },
    }
    const c = colorMap[color] || colorMap.primary

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-3 md:p-4">
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className={cn('text-sm md:text-lg font-bold truncate', c.text)}>{value}</p>
                </div>
                <div className={cn('p-2 rounded-xl flex-shrink-0', c.iconBg)}>{icon}</div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">{sub}</p>
        </motion.div>
    )
}
