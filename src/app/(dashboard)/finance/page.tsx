'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
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
import dynamic from 'next/dynamic'
import { FinanceNavTabs, type FinanceTab } from '@/components/features/finance/finance-nav-tabs'

const LedgerTab = dynamic(() => import('@/components/features/finance/ledger-tab').then((m) => m.LedgerTab), {
    loading: () => <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>,
    ssr: false,
})
const AnalyticsTab = dynamic(() => import('@/components/features/finance/analytics-tab').then((m) => m.AnalyticsTab), {
    loading: () => <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>,
    ssr: false,
})
const BudgetsTab = dynamic(() => import('@/components/features/finance/budgets-tab').then((m) => m.BudgetsTab), {
    loading: () => <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>,
    ssr: false,
})
const RecapTab = dynamic(() => import('@/components/features/finance/recap-tab').then((m) => m.RecapTab), {
    loading: () => <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>,
    ssr: false,
})

import { FinanceOverview } from '@/components/features/finance/finance-overview'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { QuickExpenseDrawer } from '@/components/features/finance/quick-expense-drawer'

import { useWorkspaceStore } from '@/stores/workspace-store'

type TransactionTypeFilter = 'all' | 'income' | 'expense'

const categoryIcons: Record<string, any> = {
    salary: Briefcase, freelance: DollarSign, asprak: BookOpen, volunteer: HandHeart,
    investment: TrendingUp, gift: Heart, other_income: DollarSign,
    food: Coffee, daily_needs: Building2, shopping: ShoppingCart, transport: Car,
    clothing: ShoppingCart, treatment: Droplets, sedekah: HandHeart, gift_giving: Gift,
    vacation: MapPin, entertainment: Activity, bills: Receipt,
    utilities: Zap, internet: Globe, health: Activity, vehicle: Settings,
    furniture: SofaIcon, education: BookOpen, saving: PiggyBank, ewallet: Smartphone,
    date: Heart, other_expense: Receipt, other: Receipt,
}

const CHART_COLORS = ['#e11d48', '#f43f5e', '#fb7185', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#94a3b8']

type PocketCategory = 'bank' | 'ewallet' | 'cash' | 'friend_loan' | 'investment'

interface PocketOption {
    code: string
    label: string
    icon: string
    category: PocketCategory
    categoryLabel: string
    color: string
}

const POCKET_OPTIONS: PocketOption[] = [
    // Bank
    { code: 'seabank', label: 'SeaBank', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#f97316' },
    { code: 'bca', label: 'Bank BCA', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#2563eb' },
    { code: 'jago', label: 'Bank Jago', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#eab308' },
    { code: 'mandiri', label: 'Bank Mandiri', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#0284c7' },
    { code: 'bri', label: 'Bank BRI', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#0369a1' },
    { code: 'bni', label: 'Bank BNI', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#ea580c' },
    { code: 'other_bank', label: 'Bank Lainnya', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#64748b' },

    // E-Wallet
    { code: 'dana', label: 'DANA', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#0284c7' },
    { code: 'gopay', label: 'GoPay', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#10b981' },
    { code: 'ovo', label: 'OVO', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#7c3aed' },
    { code: 'shopeepay', label: 'ShopeePay', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#f97316' },

    // Tunai
    { code: 'cash', label: 'Uang Tunai / Dompet', icon: '💵', category: 'cash', categoryLabel: 'Tunai', color: '#16a34a' },

    // Piutang Teman
    { code: 'friend_loan', label: 'Uang di Teman (Piutang)', icon: '🤝', category: 'friend_loan', categoryLabel: 'Piutang Teman', color: '#d97706' },

    // Investasi
    { code: 'investment', label: 'Investasi / Reksadana / Emas', icon: '📈', category: 'investment', categoryLabel: 'Investasi', color: '#8b5cf6' },
    { code: 'other', label: 'Rekening Lainnya', icon: '💳', category: 'cash', categoryLabel: 'Lainnya', color: '#64748b' },
]

const BANK_OPTIONS = POCKET_OPTIONS

const getAccountCategory = (account: SavingsAccount): PocketCategory => {
    if (account.bank_code === 'friend_loan' || account.type === 'friend_loan') return 'friend_loan'
    const found = POCKET_OPTIONS.find(p => p.code === account.bank_code)
    if (found) return found.category
    if (account.type === 'ewallet') return 'ewallet'
    if (account.type === 'bank' || account.type === 'digital') return 'bank'
    if (account.type === 'investment') return 'investment'
    return 'cash'
}


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
    const {
        transactions: cachedTransactions,
        budgets: cachedBudgets,
        savings: cachedSavings,
        financeLoaded,
        setFinanceData,
    } = useWorkspaceStore()

    const [transactions, setTransactions] = useState<Transaction[]>(cachedTransactions)
    const [budgets, setBudgets] = useState<Budget[]>(cachedBudgets)
    const [savings, setSavings] = useState<SavingsAccount[]>(cachedSavings)
    const hasCachedFinance = cachedTransactions.length > 0 || cachedBudgets.length > 0 || cachedSavings.length > 0
    const [loading, setLoading] = useState(!financeLoaded && !hasCachedFinance)
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
    const [pocketFilter, setPocketFilter] = useState<'all' | PocketCategory>('all')
    const [savingsCategory, setSavingsCategory] = useState<PocketCategory>('bank')
    const [savingsBankCode, setSavingsBankCode] = useState<string>('seabank')
    const [savingsIcon, setSavingsIcon] = useState<string>('🏦')

    // Partner View Stats
    const [viewMode, setViewMode] = useState<'me' | 'partner' | 'combined'>('me')
    const [userProfile, setUserProfile] = useState<{ id: string; role: string; partnerId?: string } | null>(null)
    const [quickExpenseOpen, setQuickExpenseOpen] = useState(false)

    const formRef = useRef<HTMLFormElement>(null)

    // Hydration sync
    useEffect(() => {
        if (cachedTransactions.length > 0) {
            setTransactions(cachedTransactions)
            setLoading(false)
        }
    }, [cachedTransactions])

    useEffect(() => {
        if (cachedBudgets.length > 0) {
            setBudgets(cachedBudgets)
            setLoading(false)
        }
    }, [cachedBudgets])

    useEffect(() => {
        if (cachedSavings.length > 0) {
            setSavings(cachedSavings)
            setLoading(false)
        }
    }, [cachedSavings])

    // Parallel initial load: profile AND finance data simultaneously
    useEffect(() => {
        let isMounted = true
        Promise.all([
            getFinanceProfile(),
            getTransactions(),
            getBudgets(),
            getSavingsAccounts(),
        ]).then(([profile, txData, budgetsData, savingsData]) => {
            if (!isMounted) return
            setUserProfile(profile)
            setTransactions(txData)
            setBudgets(budgetsData)
            setSavings(savingsData)
            setFinanceData({
                transactions: txData,
                budgets: budgetsData,
                savings: savingsData,
            })
            setLoading(false)
        }).catch(err => {
            console.error('Error loading initial finance data:', err)
            if (isMounted) setLoading(false)
        })
        return () => { isMounted = false }
    }, [])

    // Auto-revalidate when back online
    useEffect(() => {
        const handleOnline = () => {
            if (userProfile) fetchData(userProfile, viewMode)
        }
        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [userProfile, viewMode])

    const fetchData = async (profile: typeof userProfile, mode: typeof viewMode) => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setLoading(false)
            return
        }
        if (!financeLoaded && !hasCachedFinance) setLoading(true)
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
            setFinanceData({
                transactions: txData,
                budgets: budgetsData,
                savings: savingsData,
            })
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
            await fetchData(userProfile, viewMode)
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

    // Multi-Pocket Asset Allocation breakdown
    const assetBreakdown = useMemo(() => {
        let bankTotal = 0
        let ewalletTotal = 0
        let cashTotal = 0
        let friendLoanTotal = 0
        let investmentTotal = 0

        savings.forEach(acc => {
            const cat = getAccountCategory(acc)
            if (cat === 'bank') bankTotal += acc.balance
            else if (cat === 'ewallet') ewalletTotal += acc.balance
            else if (cat === 'cash') cashTotal += acc.balance
            else if (cat === 'friend_loan') friendLoanTotal += acc.balance
            else if (cat === 'investment') investmentTotal += acc.balance
        })

        const total = bankTotal + ewalletTotal + cashTotal + friendLoanTotal + investmentTotal
        const calcPct = (amt: number) => (total > 0 ? (amt / total) * 100 : 0)

        return {
            total,
            bank: { amount: bankTotal, pct: calcPct(bankTotal), count: savings.filter(s => getAccountCategory(s) === 'bank').length },
            ewallet: { amount: ewalletTotal, pct: calcPct(ewalletTotal), count: savings.filter(s => getAccountCategory(s) === 'ewallet').length },
            cash: { amount: cashTotal, pct: calcPct(cashTotal), count: savings.filter(s => getAccountCategory(s) === 'cash').length },
            friendLoan: { amount: friendLoanTotal, pct: calcPct(friendLoanTotal), count: savings.filter(s => getAccountCategory(s) === 'friend_loan').length },
            investment: { amount: investmentTotal, pct: calcPct(investmentTotal), count: savings.filter(s => getAccountCategory(s) === 'investment').length },
        }
    }, [savings])

    const filteredSavings = useMemo(() => {
        if (pocketFilter === 'all') return savings
        return savings.filter(acc => getAccountCategory(acc) === pocketFilter)
    }, [savings, pocketFilter])

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

    const openAddModal = (type: typeof modalType, defaultPocketCat: PocketCategory = 'bank') => {
        setModalType(type)
        setEditingTransaction(null)
        setEditingBudget(null)
        setSelectedType('expense')
        if (type === 'savings') {
            setSavingsCategory(defaultPocketCat)
            const defOption = POCKET_OPTIONS.find(p => p.category === defaultPocketCat)
            if (defOption) {
                setSavingsBankCode(defOption.code)
                setSavingsIcon(defOption.icon)
            }
        }
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
            <FinanceNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">

                        {/* View Mode & Actions Header */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                            <div className="bg-secondary/30 p-1.5 rounded-full flex items-center gap-1 border border-border/50 backdrop-blur-sm">
                                <button
                                    onClick={() => setViewMode('me')}
                                    className={cn(
                                        "px-5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2",
                                        viewMode === 'me'
                                            ? "bg-background shadow-xs text-primary font-bold ring-1 ring-black/5 dark:ring-white/10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    )}
                                >
                                    Keuangan Saya
                                </button>
                                {userProfile?.partnerId && (
                                    <button
                                        onClick={() => setViewMode('partner')}
                                        className={cn(
                                            "px-5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2",
                                            viewMode === 'partner'
                                                ? "bg-background shadow-xs text-primary font-bold ring-1 ring-black/5 dark:ring-white/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                        )}
                                    >
                                        Pasangan
                                    </button>
                                )}
                                <button
                                    onClick={() => setViewMode('combined')}
                                    className={cn(
                                        "px-5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-2",
                                        viewMode === 'combined'
                                            ? "bg-background shadow-xs text-primary font-bold ring-1 ring-black/5 dark:ring-white/10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    )}
                                >
                                    Gabungan Bersama
                                </button>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <Button
                                    onClick={() => setQuickExpenseOpen(true)}
                                    variant="outline"
                                    className="rounded-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 h-9 px-4"
                                >
                                    <Zap className="w-3.5 h-3.5 mr-1.5" /> Catat Cepat
                                </Button>
                                <Button
                                    onClick={() => openAddModal('transaction')}
                                    className="rounded-full text-xs font-semibold h-9 px-4"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Catat Manual
                                </Button>
                            </div>
                        </div>

                        {loading && transactions.length === 0 && budgets.length === 0 && savings.length === 0 && (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {/* ========== OVERVIEW (UNIFIED & INTUITIVE) ========== */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <FinanceOverview
                                    transactions={transactions}
                                    budgets={budgets}
                                    savings={savings}
                                    viewMode={viewMode}
                                    userRole={userProfile?.role}
                                    onOpenQuickExpense={() => setQuickExpenseOpen(true)}
                                    onSwitchToAdvanced={() => setActiveTab('analytics')}
                                />
                            <div className="space-y-6">
                                {/* Top Row: Balance + Income/Expense Summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <SummaryCard label="Total Balance" value={formatCurrency(totals.balance + totalSavings)} icon={<Wallet className="w-5 h-5" />} color={totals.balance >= 0 ? 'primary' : 'red'} sub="Semua akun" />
                                    <SummaryCard label="Income" value={formatCurrency(totals.income)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" sub="Bulan ini" />
                                    <SummaryCard label="Expenses" value={formatCurrency(totals.expense)} icon={<TrendingDown className="w-5 h-5" />} color="red" sub="Bulan ini" />
                                    <SummaryCard label="Savings Rate" value={`${totals.savingsRate.toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5" />} color={totals.savingsRate >= 20 ? 'emerald' : totals.savingsRate >= 0 ? 'amber' : 'red'} sub="Bulan ini" />
                                    <SummaryCard label="Lokasi Uang" value={formatCurrency(totalSavings)} icon={<Building2 className="w-5 h-5" />} color="purple" sub={`${savings.length} kantong / akun`} />
                                </div>

                                {/* Account Breakdown (compact list) */}
                                {savings.length > 0 && (
                                    <div className="bg-card border border-border rounded-xl p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                                    <Building2 className="w-4 h-4 text-primary" /> Di Mana Saja Uang Kita? (Lokasi Uang)
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Bank: {formatCurrency(assetBreakdown.bank.amount)} · E-Wallet: {formatCurrency(assetBreakdown.ewallet.amount)} · Tunai: {formatCurrency(assetBreakdown.cash.amount)} · Piutang: {formatCurrency(assetBreakdown.friendLoan.amount)}
                                                </p>
                                            </div>
                                            <button onClick={() => setActiveTab('savings')} className="text-xs text-primary hover:underline self-start sm:self-auto font-medium">Kelola & Detail →</button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            {savings.map((account) => {
                                                const bankInfo = POCKET_OPTIONS.find(b => b.code === account.bank_code)
                                                const isFriendLoan = account.bank_code === 'friend_loan' || account.type === 'friend_loan'
                                                return (
                                                    <div key={account.id} onClick={() => setActiveTab('savings')} className={cn("rounded-lg p-3 flex items-center gap-2.5 cursor-pointer transition-all hover:scale-[1.01]", isFriendLoan ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/50")}>
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
                                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                                        <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">🍩</span>
                                            Pengeluaran per Kategori
                                        </h3>
                                        {categoryPieData.length > 0 ? (
                                            <div className="flex flex-col md:flex-row items-center gap-8">
                                                <div className="h-[240px] w-full md:w-1/2 relative">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={categoryPieData}
                                                                cx="50%" cy="50%"
                                                                innerRadius={60} outerRadius={90}
                                                                paddingAngle={3}
                                                                cornerRadius={5}
                                                                dataKey="value"
                                                                label={false}
                                                            >
                                                                {categoryPieData.map((_, i) => (
                                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                formatter={(value) => formatCurrency(value as number)}
                                                                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                                itemStyle={{ color: 'var(--foreground)' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    {/* Center Text */}
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="text-center">
                                                            <span className="text-xs text-muted-foreground block">Total</span>
                                                            <span className="text-sm font-bold text-foreground">
                                                                {formatShort(categoryPieData.reduce((a, b) => a + b.value, 0))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Legend with percentages */}
                                                <div className="w-full md:w-1/2 space-y-3">
                                                    {categoryPieData.map((item, i) => {
                                                        const catInfo = TRANSACTION_CATEGORIES.expense.find(c => c.value === item.name)
                                                        return (
                                                            <div key={item.name} className="flex items-center gap-3">
                                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                                                <span className="text-sm text-foreground capitalize flex-1 truncate font-medium">{catInfo?.icon} {catInfo?.label || item.name}</span>
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-xs font-bold text-foreground tabular-nums">{item.percentage}%</span>
                                                                    <span className="text-[10px] text-muted-foreground tabular-nums">{formatShort(item.value)}</span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">Belum ada data pengeluaran bulan ini</div>
                                        )}
                                    </div>

                                    {/* Line Chart: Income vs Expense Trend */}
                                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                                        <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">📈</span>
                                            Tren 6 Bulan Terakhir
                                        </h3>
                                        <div className="h-[240px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                        </linearGradient>
                                                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} dy={10} />
                                                    <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        formatter={(value) => formatCurrency(value as number)}
                                                        contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        itemStyle={{ color: 'var(--foreground)' }}
                                                    />
                                                    <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} fill="url(#incomeGradient)" name="Income" activeDot={{ r: 6, strokeWidth: 0 }} />
                                                    <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} fill="url(#expenseGradient)" name="Expense" activeDot={{ r: 6, strokeWidth: 0 }} />
                                                    <Legend formatter={(value) => <span className="text-xs font-medium text-foreground ml-1">{value}</span>} iconType="circle" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Bar Chart: Monthly Comparison */}
                                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">📊</span>
                                        Perbandingan Bulanan
                                    </h3>
                                    <div className="h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
                                                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} dy={10} />
                                                <YAxis tickFormatter={(v) => formatShort(v)} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    formatter={(value) => formatCurrency(value as number)}
                                                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    cursor={{ fill: 'var(--secondary)', opacity: 0.5 }}
                                                    itemStyle={{ color: 'var(--foreground)' }}
                                                />
                                                <Bar dataKey="income" fill="#22c55e" radius={[6, 6, 0, 0]} name="Income" maxBarSize={50} />
                                                <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} name="Expense" maxBarSize={50} />
                                                <Legend formatter={(value) => <span className="text-xs font-medium text-foreground ml-1">{value}</span>} iconType="circle" />
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
                                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <PiggyBank className="w-4 h-4 text-primary" /> Rincian Rekening Simpanan
                                            </h3>
                                            <span className="text-sm font-bold text-primary">{formatCurrency(totalSavings)}</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {savings.map((account) => {
                                                const bankInfo = BANK_OPTIONS.find(b => b.code === account.bank_code)
                                                return (
                                                    <div key={account.id} className="bg-secondary/50 rounded-lg p-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-semibold">{account.icon || bankInfo?.icon || '💳'}</span>
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
                            </div>
                        )}

                        {/* ========== TRANSACTIONS ========== */}
                        {activeTab === 'transactions' && (
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
                                            <option value="all">Semua Orang</option>
                                            <option value="aegg">Aegg</option>
                                            <option value="peppaa">Peppaa</option>
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
                                                                    <><span>·</span><OwnerBadge role={(transaction as any).profiles.role} compact /></>
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
                        {activeTab === 'ledger' && (
                            <LedgerTab transactions={transactions} formatCurrency={formatCurrency} />
                        )}

                        {/* ========== ANALYTICS ========== */}
                        {activeTab === 'analytics' && (
                            <AnalyticsTab transactions={transactions} formatCurrency={formatCurrency} formatShort={formatShort} />
                        )}

                        {/* ========== BUDGETS ========== */}
                        {activeTab === 'budgets' && (
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
                        {activeTab === 'savings' && (
                            <div className="space-y-6">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                            <span className="p-2 rounded-xl bg-primary/10 text-primary">🗺️</span>
                                            Lokasi Uang & Likuiditas
                                        </h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                            Pantau presisi di mana uang Aegg & Peppaa berada — di Bank, E-Wallet, Dompet Tunai, hingga Piutang Teman.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button onClick={() => openAddModal('savings', 'friend_loan')} variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs">
                                            <span className="mr-1.5">🤝</span> + Catat Piutang
                                        </Button>
                                        <Button onClick={() => openAddModal('savings')}>
                                            <Plus className="w-4 h-4 mr-1.5" /> Tambah Lokasi
                                        </Button>
                                    </div>
                                </div>

                                {/* Net Worth Banner & 4 Pillars Breakdown */}
                                <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
                                        <div>
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Likuiditas Seluruh Lokasi</p>
                                            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight mt-1">
                                                {formatCurrency(totalSavings)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
                                            <Building2 className="w-3.5 h-3.5 text-primary" />
                                            <span>{savings.length} Kantong Penyimpanan Terdata</span>
                                        </div>
                                    </div>

                                    {/* Visual Stacked Progress Bar */}
                                    {totalSavings > 0 && (
                                        <div className="space-y-2">
                                            <div className="h-3 w-full bg-secondary/80 rounded-full overflow-hidden flex">
                                                {assetBreakdown.bank.pct > 0 && (
                                                    <div style={{ width: `${assetBreakdown.bank.pct}%` }} className="bg-blue-600 transition-all" title={`Bank: ${assetBreakdown.bank.pct.toFixed(1)}%`} />
                                                )}
                                                {assetBreakdown.ewallet.pct > 0 && (
                                                    <div style={{ width: `${assetBreakdown.ewallet.pct}%` }} className="bg-sky-500 transition-all" title={`E-Wallet: ${assetBreakdown.ewallet.pct.toFixed(1)}%`} />
                                                )}
                                                {assetBreakdown.cash.pct > 0 && (
                                                    <div style={{ width: `${assetBreakdown.cash.pct}%` }} className="bg-emerald-500 transition-all" title={`Tunai: ${assetBreakdown.cash.pct.toFixed(1)}%`} />
                                                )}
                                                {assetBreakdown.friendLoan.pct > 0 && (
                                                    <div style={{ width: `${assetBreakdown.friendLoan.pct}%` }} className="bg-amber-500 transition-all" title={`Piutang Teman: ${assetBreakdown.friendLoan.pct.toFixed(1)}%`} />
                                                )}
                                                {assetBreakdown.investment.pct > 0 && (
                                                    <div style={{ width: `${assetBreakdown.investment.pct}%` }} className="bg-purple-500 transition-all" title={`Investasi: ${assetBreakdown.investment.pct.toFixed(1)}%`} />
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Bank ({assetBreakdown.bank.pct.toFixed(0)}%)</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> E-Wallet ({assetBreakdown.ewallet.pct.toFixed(0)}%)</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tunai ({assetBreakdown.cash.pct.toFixed(0)}%)</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Piutang Teman ({assetBreakdown.friendLoan.pct.toFixed(0)}%)</span>
                                                {assetBreakdown.investment.amount > 0 && (
                                                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Investasi ({assetBreakdown.investment.pct.toFixed(0)}%)</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 4 Pillars Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                        {/* Bank */}
                                        <div
                                            onClick={() => setPocketFilter(pocketFilter === 'bank' ? 'all' : 'bank')}
                                            className={cn("p-3.5 rounded-xl border transition-all cursor-pointer", pocketFilter === 'bank' ? "border-blue-500 bg-blue-500/10 shadow-xs" : "border-border/70 bg-secondary/40 hover:bg-secondary/70")}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-base">🏦</span>
                                                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                    {assetBreakdown.bank.pct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium">Bank (SeaBank, BCA)</p>
                                            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">{formatCurrency(assetBreakdown.bank.amount)}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{assetBreakdown.bank.count} rekening</p>
                                        </div>

                                        {/* E-Wallet */}
                                        <div
                                            onClick={() => setPocketFilter(pocketFilter === 'ewallet' ? 'all' : 'ewallet')}
                                            className={cn("p-3.5 rounded-xl border transition-all cursor-pointer", pocketFilter === 'ewallet' ? "border-sky-500 bg-sky-500/10 shadow-xs" : "border-border/70 bg-secondary/40 hover:bg-secondary/70")}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-base">📱</span>
                                                <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                                                    {assetBreakdown.ewallet.pct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium">Dompet Digital (DANA)</p>
                                            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">{formatCurrency(assetBreakdown.ewallet.amount)}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{assetBreakdown.ewallet.count} e-wallet</p>
                                        </div>

                                        {/* Tunai */}
                                        <div
                                            onClick={() => setPocketFilter(pocketFilter === 'cash' ? 'all' : 'cash')}
                                            className={cn("p-3.5 rounded-xl border transition-all cursor-pointer", pocketFilter === 'cash' ? "border-emerald-500 bg-emerald-500/10 shadow-xs" : "border-border/70 bg-secondary/40 hover:bg-secondary/70")}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-base">💵</span>
                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                    {assetBreakdown.cash.pct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium">Uang Tunai / Kas</p>
                                            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">{formatCurrency(assetBreakdown.cash.amount)}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{assetBreakdown.cash.count} tempat</p>
                                        </div>

                                        {/* Piutang Teman */}
                                        <div
                                            onClick={() => setPocketFilter(pocketFilter === 'friend_loan' ? 'all' : 'friend_loan')}
                                            className={cn("p-3.5 rounded-xl border transition-all cursor-pointer", pocketFilter === 'friend_loan' ? "border-amber-500 bg-amber-500/10 shadow-xs" : "border-border/70 bg-secondary/40 hover:bg-secondary/70")}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-base">🤝</span>
                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                                    {assetBreakdown.friendLoan.pct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium">Uang di Teman</p>
                                            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">{formatCurrency(assetBreakdown.friendLoan.amount)}</p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{assetBreakdown.friendLoan.count} orang pinjam</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Chips */}
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                    {[
                                        { id: 'all' as const, label: `Semua (${savings.length})` },
                                        { id: 'bank' as const, label: `🏦 Bank (${assetBreakdown.bank.count})` },
                                        { id: 'ewallet' as const, label: `📱 E-Wallet (${assetBreakdown.ewallet.count})` },
                                        { id: 'cash' as const, label: `💵 Tunai (${assetBreakdown.cash.count})` },
                                        { id: 'friend_loan' as const, label: `🤝 Di Teman (${assetBreakdown.friendLoan.count})` },
                                        ...(assetBreakdown.investment.amount > 0 ? [{ id: 'investment' as const, label: `📈 Investasi (${assetBreakdown.investment.count})` }] : []),
                                    ].map((chip) => (
                                        <button
                                            key={chip.id}
                                            onClick={() => setPocketFilter(chip.id)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                                                pocketFilter === chip.id
                                                    ? "bg-primary text-primary-foreground shadow-xs"
                                                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                            )}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Pocket Cards Grid */}
                                {filteredSavings.length === 0 ? (
                                    <div className="text-center py-16 bg-card border border-border rounded-xl">
                                        <PiggyBank className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground mb-3">
                                            {pocketFilter === 'all'
                                                ? 'Belum ada akun atau lokasi uang terdaftar'
                                                : `Belum ada lokasi uang di kategori "${pocketFilter}"`}
                                        </p>
                                        <Button onClick={() => openAddModal('savings', pocketFilter === 'all' ? 'bank' : pocketFilter)}>
                                            <Plus className="w-4 h-4 mr-2" /> Tambah Lokasi Uang
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredSavings.map((account) => {
                                            const category = getAccountCategory(account)
                                            const isFriendLoan = category === 'friend_loan'
                                            const pocketInfo = POCKET_OPTIONS.find(b => b.code === account.bank_code)

                                            return (
                                                <motion.div
                                                    key={account.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={cn(
                                                        "rounded-2xl p-5 group border transition-all flex flex-col justify-between",
                                                        isFriendLoan
                                                            ? "bg-amber-500/[0.04] border-amber-500/40 hover:border-amber-500/60 shadow-xs"
                                                            : "bg-card border-border hover:border-primary/40 shadow-xs"
                                                    )}
                                                >
                                                    <div>
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0",
                                                                    isFriendLoan ? "bg-amber-500/15" : "bg-primary/10"
                                                                )}>
                                                                    {account.icon || pocketInfo?.icon || (isFriendLoan ? '🤝' : '💰')}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <h4 className="font-bold text-foreground text-sm truncate">{account.name}</h4>
                                                                        {isFriendLoan ? (
                                                                            <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                                                                                Piutang Teman
                                                                            </span>
                                                                        ) : pocketInfo ? (
                                                                            <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">
                                                                                {pocketInfo.label}
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                                                        {category === 'bank' ? 'Rekening Bank' : category === 'ewallet' ? 'Dompet Digital' : category === 'friend_loan' ? 'Uang Belum Kembali' : category === 'cash' ? 'Uang Tunai' : 'Investasi'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteSavings(account.id)}
                                                                className="p-1 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all text-muted-foreground hover:text-red-500"
                                                                title="Hapus lokasi"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Amount display */}
                                                        <div className="my-3">
                                                            <span className="text-[11px] text-muted-foreground font-medium block">
                                                                {isFriendLoan ? 'Sisa Piutang / Uang Belum Kembali' : 'Saldo Saat Ini'}
                                                            </span>
                                                            <p className={cn("text-2xl font-black tabular-nums tracking-tight", isFriendLoan ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                                                                {formatCurrency(account.balance)}
                                                            </p>
                                                        </div>

                                                        {account.profiles && (
                                                            <div className="mb-4">
                                                                <OwnerBadge role={account.profiles.role} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="pt-2 border-t border-border/50">
                                                        {isFriendLoan ? (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                                                                    onClick={() => {
                                                                        setSelectedSavingsAccount(account)
                                                                        setSavingsTxType('withdraw')
                                                                        setModalType('savings_tx')
                                                                        setShowModal(true)
                                                                    }}
                                                                >
                                                                    <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Terima Pelunasan
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="flex-1 text-xs border-amber-500/30"
                                                                    onClick={() => {
                                                                        setSelectedSavingsAccount(account)
                                                                        setSavingsTxType('deposit')
                                                                        setModalType('savings_tx')
                                                                        setShowModal(true)
                                                                    }}
                                                                >
                                                                    <Plus className="w-3 h-3 mr-1" /> Tambah Pinjaman
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="flex-1 text-xs"
                                                                    onClick={() => {
                                                                        setSelectedSavingsAccount(account)
                                                                        setSavingsTxType('deposit')
                                                                        setModalType('savings_tx')
                                                                        setShowModal(true)
                                                                    }}
                                                                >
                                                                    <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Deposit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="flex-1 text-xs"
                                                                    onClick={() => {
                                                                        setSelectedSavingsAccount(account)
                                                                        setSavingsTxType('withdraw')
                                                                        setModalType('savings_tx')
                                                                        setShowModal(true)
                                                                    }}
                                                                >
                                                                    <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Withdraw
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========== RECAP ========== */}
                        {activeTab === 'recap' && (
                            <RecapTab
                                transactions={transactions}
                                formatCurrency={formatCurrency}
                                onRefresh={fetchData}
                            />
                        )}
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
                                            <CurrencyInput
                                                name="amount"
                                                required
                                                defaultValue={editingTransaction?.amount || 0}
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
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
                                            <CurrencyInput
                                                name="amount"
                                                required
                                                defaultValue={editingBudget?.amount || 0}
                                                className="w-full pl-12 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
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
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Kategori Lokasi Uang</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                                            {[
                                                { id: 'bank' as const, label: 'Bank', icon: '🏦' },
                                                { id: 'ewallet' as const, label: 'E-Wallet', icon: '📱' },
                                                { id: 'cash' as const, label: 'Tunai', icon: '💵' },
                                                { id: 'friend_loan' as const, label: 'Di Teman', icon: '🤝' },
                                                { id: 'investment' as const, label: 'Investasi', icon: '📈' },
                                            ].map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSavingsCategory(cat.id)
                                                        const firstOpt = POCKET_OPTIONS.find(p => p.category === cat.id)
                                                        if (firstOpt) {
                                                            setSavingsBankCode(firstOpt.code)
                                                            setSavingsIcon(firstOpt.icon)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all gap-1",
                                                        savingsCategory === cat.id
                                                            ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                                                            : "border-border/70 hover:bg-secondary/50 text-muted-foreground"
                                                    )}
                                                >
                                                    <span className="text-base">{cat.icon}</span>
                                                    <span className="text-[11px] truncate w-full text-center">{cat.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <input type="hidden" name="type" value={savingsCategory} />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Platform / Layanan</label>
                                        <select
                                            name="bank_code"
                                            value={savingsBankCode}
                                            onChange={(e) => {
                                                setSavingsBankCode(e.target.value)
                                                const opt = POCKET_OPTIONS.find(p => p.code === e.target.value)
                                                if (opt) setSavingsIcon(opt.icon)
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        >
                                            {POCKET_OPTIONS.filter(b => b.category === savingsCategory).map((b) => (
                                                <option key={b.code} value={b.code}>{b.icon} {b.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">
                                            {savingsCategory === 'friend_loan' ? 'Nama Peminjam & Keterangan' : 'Nama Akun / Lokasi'}
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            placeholder={
                                                savingsCategory === 'friend_loan'
                                                    ? 'e.g. Dipinjam Budi (Talangan Liburan)'
                                                    : savingsCategory === 'bank'
                                                    ? 'e.g. SeaBank Tabungan Bersama'
                                                    : savingsCategory === 'ewallet'
                                                    ? 'e.g. DANA Belanja Harian'
                                                    : 'e.g. Kas Dompet Harian'
                                            }
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                        {savingsCategory === 'friend_loan' && (
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                                                💡 Uang ini akan dicatat sebagai piutang aktif yang belum kembali ke kantong kalian.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">
                                            {savingsCategory === 'friend_loan' ? 'Jumlah Uang yang Dipinjam' : 'Saldo Awal'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
                                            <CurrencyInput
                                                name="balance"
                                                placeholder="0"
                                                className="w-full pl-11 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1.5">Icon (Emoji)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                name="icon"
                                                value={savingsIcon}
                                                onChange={(e) => setSavingsIcon(e.target.value)}
                                                className="w-16 text-center text-lg px-2 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                            <span className="text-xs text-muted-foreground">Otomatis dipilih dari platform, bisa Anda ubah sesuai selera</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2.5 mt-6 pt-2 border-t border-border/60">
                                        <Button type="button" variant="outline" className="flex-1 text-xs" onClick={closeModal}>Batal</Button>
                                        <Button type="submit" className="flex-1 text-xs" disabled={saving}>
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Lokasi Uang'}
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Savings Transaction Form (with Friend Loan Repayment Support) */}
                            {modalType === 'savings_tx' && selectedSavingsAccount && (() => {
                                const isFriendLoan = selectedSavingsAccount.bank_code === 'friend_loan' || selectedSavingsAccount.type === 'friend_loan'
                                return (
                                    <form action={handleSavingsTransaction} className="space-y-4">
                                        <div className={cn(
                                            "rounded-xl p-3.5 mb-2 border flex items-center gap-3",
                                            isFriendLoan ? "bg-amber-500/10 border-amber-500/30" : "bg-secondary/50 border-border"
                                        )}>
                                            <span className="text-2xl">{selectedSavingsAccount.icon || (isFriendLoan ? '🤝' : '💰')}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-foreground text-sm truncate">{selectedSavingsAccount.name}</p>
                                                    {isFriendLoan && (
                                                        <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                                                            Piutang Teman
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {isFriendLoan ? 'Sisa yang belum lunas:' : 'Saldo saat ini:'}{' '}
                                                    <span className={cn("font-bold", isFriendLoan ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
                                                        {formatCurrency(selectedSavingsAccount.balance)}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jenis Transaksi</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {isFriendLoan ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSavingsTxType('withdraw')}
                                                            className={cn(
                                                                'px-3 py-2.5 rounded-lg border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                                                                savingsTxType === 'withdraw'
                                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                                    : 'border-border text-muted-foreground'
                                                            )}
                                                        >
                                                            ✓ Terima Pelunasan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSavingsTxType('deposit')}
                                                            className={cn(
                                                                'px-3 py-2.5 rounded-lg border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                                                                savingsTxType === 'deposit'
                                                                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                                    : 'border-border text-muted-foreground'
                                                            )}
                                                        >
                                                            + Tambah Pinjaman
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSavingsTxType('deposit')}
                                                            className={cn(
                                                                'px-3 py-2.5 rounded-lg border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                                                                savingsTxType === 'deposit'
                                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                                    : 'border-border text-muted-foreground'
                                                            )}
                                                        >
                                                            <ArrowDownRight className="w-3.5 h-3.5" /> Deposit (Masuk)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSavingsTxType('withdraw')}
                                                            className={cn(
                                                                'px-3 py-2.5 rounded-lg border-2 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5',
                                                                savingsTxType === 'withdraw'
                                                                    ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                                                    : 'border-border text-muted-foreground'
                                                            )}
                                                        >
                                                            <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw (Keluar)
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">
                                                {isFriendLoan && savingsTxType === 'withdraw' ? 'Jumlah Pelunasan' : 'Nominal Transaksi'}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
                                                <CurrencyInput
                                                    name="amount"
                                                    required
                                                    placeholder="0"
                                                    defaultValue={isFriendLoan && savingsTxType === 'withdraw' ? selectedSavingsAccount.balance : 0}
                                                    className="w-full pl-11 pr-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                />
                                            </div>
                                            {isFriendLoan && savingsTxType === 'withdraw' && (
                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                    Bisa diisi sebagian jika teman melunasi dengan cara dicicil.
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1.5">Keterangan / Catatan</label>
                                            <input
                                                type="text"
                                                name="description"
                                                placeholder={
                                                    isFriendLoan
                                                        ? (savingsTxType === 'withdraw' ? 'e.g. Ditransfer pelunasan via SeaBank / Cash' : 'e.g. Tambahan pinjam lagi')
                                                        : 'e.g. Nabung bulanan, sisa gaji'
                                                }
                                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>

                                        <div className="flex gap-2.5 mt-6 pt-2 border-t border-border/60">
                                            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={closeModal}>Batal</Button>
                                            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
                                                {saving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : isFriendLoan ? (
                                                    savingsTxType === 'withdraw' ? 'Terima Pelunasan' : 'Catat Tambahan'
                                                ) : (
                                                    savingsTxType === 'deposit' ? 'Simpan Deposit' : 'Simpan Penarikan'
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                )
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Expense Drawer */}
            <QuickExpenseDrawer
                isOpen={quickExpenseOpen}
                onClose={() => setQuickExpenseOpen(false)}
                onSuccess={() => fetchData(userProfile, viewMode)}
            />
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                        <p className={cn('text-xl md:text-2xl font-bold tracking-tight', c.text)}>{value}</p>
                    </div>
                    <div className={cn('p-3 rounded-2xl flex-shrink-0 transition-colors', c.iconBg)}>{icon}</div>
                </div>
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                    <span className="text-[10px] md:text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{sub}</span>
                </div>
            </div>
            {/* Background Blob Effect */}
            <div className={cn("absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-5 blur-2xl group-hover:opacity-10 transition-opacity", c.text.includes('emerald') ? 'bg-emerald-500' : c.text.includes('red') ? 'bg-red-500' : c.text.includes('primary') ? 'bg-primary' : 'bg-foreground')} />
        </motion.div>
    )
}
