'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Plus, Zap } from 'lucide-react'
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction as deleteTransactionAction,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getSavingsAccounts,
  createSavingsAccount,
  updateSavingsBalance,
  deleteSavingsAccount,
  getFinanceProfile,
} from '@/lib/actions/finance'
import type { Transaction, Budget, SavingsAccount } from '@/types'
import { FinanceNavTabs, type FinanceTab } from '@/components/features/finance/finance-nav-tabs'
import { FinanceSkeleton } from '@/components/features/finance/finance-skeleton'
import { FinanceOverview } from '@/components/features/finance/finance-overview'
import { QuickExpenseDrawer } from '@/components/features/finance/quick-expense-drawer'
import { ReceiptDetailModal } from '@/components/features/finance/receipt-detail-modal'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { toast } from '@/components/ui/toast'

// Lazy-loaded Tabs (Dynamic Chunks for 0ms Perceived Navigation)
const TransactionsTab = dynamic(
  () => import('@/components/features/finance/transactions-tab').then((m) => m.TransactionsTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)
const SavingsTab = dynamic(
  () => import('@/components/features/finance/savings-tab').then((m) => m.SavingsTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)
const LedgerTab = dynamic(
  () => import('@/components/features/finance/ledger-tab').then((m) => m.LedgerTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)
const AnalyticsTab = dynamic(
  () => import('@/components/features/finance/analytics-tab').then((m) => m.AnalyticsTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)
const BudgetsTab = dynamic(
  () => import('@/components/features/finance/budgets-tab').then((m) => m.BudgetsTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)
const RecapTab = dynamic(
  () => import('@/components/features/finance/recap-tab').then((m) => m.RecapTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)
const AdvisorTab = dynamic(
  () => import('@/components/features/finance/advisor-tab').then((m) => m.AdvisorTab),
  { loading: () => <FinanceSkeleton />, ssr: false }
)

// Modals
import { AddTransactionModal } from '@/components/features/finance/modals/add-transaction-modal'
import { AddBudgetModal } from '@/components/features/finance/modals/add-budget-modal'
import {
  AddSavingsModal,
  type PocketCategory,
  type PocketOption,
} from '@/components/features/finance/modals/add-savings-modal'
import { SavingsTransactionModal } from '@/components/features/finance/modals/savings-transaction-modal'

const POCKET_OPTIONS: PocketOption[] = [
  { code: 'seabank', label: 'SeaBank', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#f97316' },
  { code: 'bca', label: 'Bank BCA', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#2563eb' },
  { code: 'jago', label: 'Bank Jago', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#eab308' },
  { code: 'mandiri', label: 'Bank Mandiri', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#0284c7' },
  { code: 'bri', label: 'Bank BRI', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#0369a1' },
  { code: 'bni', label: 'Bank BNI', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#ea580c' },
  { code: 'other_bank', label: 'Bank Lainnya', icon: '🏦', category: 'bank', categoryLabel: 'Bank', color: '#64748b' },
  { code: 'dana', label: 'DANA', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#0284c7' },
  { code: 'gopay', label: 'GoPay', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#10b981' },
  { code: 'ovo', label: 'OVO', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#7c3aed' },
  { code: 'shopeepay', label: 'ShopeePay', icon: '📱', category: 'ewallet', categoryLabel: 'E-Wallet', color: '#f97316' },
  { code: 'cash', label: 'Uang Tunai / Dompet', icon: '💵', category: 'cash', categoryLabel: 'Tunai', color: '#16a34a' },
  { code: 'friend_loan', label: 'Uang di Teman (Piutang)', icon: '🤝', category: 'friend_loan', categoryLabel: 'Piutang Teman', color: '#d97706' },
  { code: 'investment', label: 'Investasi / Reksadana / Emas', icon: '📈', category: 'investment', categoryLabel: 'Investasi', color: '#8b5cf6' },
  { code: 'other', label: 'Rekening Lainnya', icon: '💳', category: 'cash', categoryLabel: 'Lainnya', color: '#64748b' },
]

const getAccountCategory = (account: SavingsAccount): PocketCategory => {
  if (account.bank_code === 'friend_loan' || account.type === 'friend_loan') return 'friend_loan'
  const found = POCKET_OPTIONS.find((p) => p.code === account.bank_code)
  if (found) return found.category
  if (account.type === 'ewallet') return 'ewallet'
  if (account.type === 'bank' || account.type === 'digital') return 'bank'
  if (account.type === 'investment') return 'investment'
  return 'cash'
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview')

  // Partner view mode
  const [viewMode, setViewMode] = useState<'me' | 'partner' | 'combined'>('combined')
  const [userProfile, setUserProfile] = useState<{ id: string; role: string; partnerId?: string } | null>(null)
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false)

  // Modals state
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense')
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null)

  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  const [showSavingsModal, setShowSavingsModal] = useState(false)
  const [savingsCategory, setSavingsCategory] = useState<PocketCategory>('bank')
  const [savingsBankCode, setSavingsBankCode] = useState<string>('seabank')
  const [savingsIcon, setSavingsIcon] = useState<string>('🏦')

  const [showSavingsTxModal, setShowSavingsTxModal] = useState(false)
  const [selectedSavingsAccount, setSelectedSavingsAccount] = useState<SavingsAccount | null>(null)
  const [savingsTxType, setSavingsTxType] = useState<'deposit' | 'withdraw'>('deposit')

  const formRef = useRef<HTMLFormElement>(null)
  const isSubmittingRef = useRef<boolean>(false)

  // Hydration sync from store
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

  // Initial load
  useEffect(() => {
    let isMounted = true
    Promise.all([
      getFinanceProfile(),
      getTransactions('all'),
      getBudgets('all'),
      getSavingsAccounts('all'),
    ])
      .then(([profile, txData, budgetsData, savingsData]) => {
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
      })
      .catch((err) => {
        console.error('Error loading initial finance data:', err)
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
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
    try {
      let targetId: string | 'all' | undefined = undefined
      if (mode === 'combined') targetId = 'all'
      else if (mode === 'partner' && profile?.partnerId) targetId = profile.partnerId
      else if (mode === 'me' && profile?.id) targetId = profile.id

      const [txData, budgetsData, savingsData] = await Promise.all([
        getTransactions(targetId),
        getBudgets(targetId),
        getSavingsAccounts(targetId),
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

  // Transaction Handlers
  const handleSubmitTransaction = async (formData: FormData) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaving(true)
    formData.set('type', selectedType)
    try {
      let res: any
      if (editingTransaction) {
        res = await updateTransaction(editingTransaction.id, formData)
      } else {
        res = await createTransaction(formData)
      }
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan transaksi', res.error)
        return
      }
      toast.success(editingTransaction ? 'Transaksi berhasil diperbarui' : 'Transaksi berhasil ditambahkan')
      setShowTransactionModal(false)
      setEditingTransaction(null)
      await fetchData(userProfile, viewMode)
    } catch (error) {
      toast.error('Error menyimpan transaksi')
      console.error('Error saving transaction:', error)
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return
    try {
      await deleteTransactionAction(id)
      toast.success('Transaksi dihapus')
      await fetchData(userProfile, viewMode)
    } catch (error) {
      toast.error('Gagal menghapus transaksi')
      console.error('Error deleting transaction:', error)
    }
  }

  // Budget Handlers
  const handleSubmitBudget = async (formData: FormData) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaving(true)
    try {
      let res: any
      if (editingBudget) {
        res = await updateBudget(editingBudget.id, formData)
      } else {
        res = await createBudget(formData)
      }
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan budget', res.error)
        return
      }
      toast.success(editingBudget ? 'Budget berhasil diperbarui' : 'Budget baru berhasil dibuat')
      setShowBudgetModal(false)
      setEditingBudget(null)
      await fetchData(userProfile, viewMode)
    } catch (error) {
      toast.error('Error menyimpan budget')
      console.error('Error saving budget:', error)
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Hapus target anggaran ini?')) return
    try {
      await deleteBudget(id)
      await fetchData(userProfile, viewMode)
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  // Savings Handlers
  const handleSubmitSavings = async (formData: FormData) => {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaving(true)
    try {
      const res = await createSavingsAccount(formData)
      if (res && 'error' in res && res.error) {
        toast.error('Gagal menyimpan lokasi uang', res.error)
        return
      }
      toast.success('Lokasi uang berhasil disimpan')
      setShowSavingsModal(false)
      await fetchData(userProfile, viewMode)
    } catch (error) {
      toast.error('Error membuat lokasi uang')
      console.error('Error creating savings:', error)
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  const handleSavingsTransaction = async (formData: FormData) => {
    if (!selectedSavingsAccount || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSaving(true)
    try {
      const amountStr = formData.get('amount') as string
      const rawAmount = parseFloat(amountStr.replace(/[^0-9]/g, '')) || 0
      const amount = rawAmount
      const description = (formData.get('description') as string) || (savingsTxType === 'deposit' ? 'Deposit' : 'Withdraw')

      const res = await updateSavingsBalance(selectedSavingsAccount.id, amount, savingsTxType, description)
      if (res && 'error' in res && res.error) {
        toast.error('Gagal memperbarui saldo', res.error)
        return
      }
      toast.success('Saldo lokasi uang berhasil diperbarui')
      setShowSavingsTxModal(false)
      setSelectedSavingsAccount(null)
      await fetchData(userProfile, viewMode)
    } catch (error) {
      toast.error('Error memperbarui saldo')
      console.error('Error updating savings balance:', error)
    } finally {
      setSaving(false)
      isSubmittingRef.current = false
    }
  }

  const handleDeleteSavings = async (id: string) => {
    if (!confirm('Hapus lokasi uang ini beserta riwayatnya?')) return
    try {
      await deleteSavingsAccount(id)
      toast.success('Lokasi uang dihapus')
      await fetchData(userProfile, viewMode)
    } catch (error) {
      toast.error('Gagal menghapus lokasi uang')
      console.error('Error deleting savings account:', error)
    }
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />

        <main className="flex-1 pb-16">
          {/* Sub Navigation Bar */}
          <FinanceNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
            {/* Header Title & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Keuangan Aegg & Peppaa</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Catat arus kas, pantau tabungan bersama, dan capai target finansial berdua.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setQuickExpenseOpen(true)}
                  variant="outline"
                  className="rounded-full text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 h-9 px-4"
                >
                  <Zap className="w-3.5 h-3.5 mr-1.5" /> Catat Cepat
                </Button>
                <Button
                  onClick={() => {
                    setEditingTransaction(null)
                    setSelectedType('expense')
                    setShowTransactionModal(true)
                  }}
                  className="rounded-full text-xs font-semibold h-9 px-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Catat Manual
                </Button>
              </div>
            </div>

            {/* Skeleton Loading on initial empty state */}
            {loading && transactions.length === 0 && budgets.length === 0 && savings.length === 0 && (
              <FinanceSkeleton />
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <FinanceOverview
                transactions={transactions}
                budgets={budgets}
                savings={savings}
                viewMode={viewMode}
                userRole={userProfile?.role}
                onOpenQuickExpense={() => setQuickExpenseOpen(true)}
                onSwitchToAdvanced={() => setActiveTab('analytics')}
              />
            )}

            {/* TAB: TRANSACTIONS */}
            {activeTab === 'transactions' && (
              <TransactionsTab
                transactions={transactions}
                formatCurrency={formatCurrency}
                onAddTransaction={() => {
                  setEditingTransaction(null)
                  setSelectedType('expense')
                  setShowTransactionModal(true)
                }}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx)
                  setSelectedType(tx.type as 'income' | 'expense')
                  setShowTransactionModal(true)
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onOpenReceiptModal={(tx) => setReceiptModalTx(tx)}
              />
            )}

            {/* TAB: SAVINGS (LOKASI UANG) */}
            {activeTab === 'savings' && (
              <SavingsTab
                savings={savings}
                formatCurrency={formatCurrency}
                onOpenAddSavings={(category) => {
                  if (category) {
                    setSavingsCategory(category)
                    const opt = POCKET_OPTIONS.find((p) => p.category === category)
                    if (opt) {
                      setSavingsBankCode(opt.code)
                      setSavingsIcon(opt.icon)
                    }
                  }
                  setShowSavingsModal(true)
                }}
                onOpenSavingsTx={(account, type) => {
                  setSelectedSavingsAccount(account)
                  setSavingsTxType(type)
                  setShowSavingsTxModal(true)
                }}
                onDeleteSavings={handleDeleteSavings}
                pocketOptions={POCKET_OPTIONS}
                getAccountCategory={getAccountCategory}
              />
            )}

            {/* TAB: LEDGER (BUKU KAS) */}
            {activeTab === 'ledger' && (
              <LedgerTab
                transactions={transactions}
                formatCurrency={formatCurrency}
                onRefresh={() => fetchData(userProfile, viewMode)}
              />
            )}

            {/* TAB: AI ADVISOR */}
            {activeTab === 'advisor' && <AdvisorTab />}

            {/* TAB: ANALYTICS */}
            {activeTab === 'analytics' && (
              <AnalyticsTab
                transactions={transactions}
                formatCurrency={formatCurrency}
                formatShort={formatShort}
              />
            )}

            {/* TAB: BUDGETS */}
            {activeTab === 'budgets' && (
              <BudgetsTab
                budgets={budgets}
                transactions={transactions}
                formatCurrency={formatCurrency}
                onAddBudget={() => {
                  setEditingBudget(null)
                  setShowBudgetModal(true)
                }}
                onEditBudget={(b) => {
                  setEditingBudget(b)
                  setShowBudgetModal(true)
                }}
                onDeleteBudget={handleDeleteBudget}
              />
            )}

            {/* TAB: RECAP */}
            {activeTab === 'recap' && (
              <RecapTab
                transactions={transactions}
                formatCurrency={formatCurrency}
                onRefresh={() => fetchData(userProfile, viewMode)}
              />
            )}
          </div>
        </main>
      </div>

      {/* ========== MODALS ========== */}
      <AddTransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false)
          setEditingTransaction(null)
        }}
        editingTransaction={editingTransaction}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        onSubmit={handleSubmitTransaction}
        saving={saving}
        formRef={formRef}
      />

      <AddBudgetModal
        isOpen={showBudgetModal}
        onClose={() => {
          setShowBudgetModal(false)
          setEditingBudget(null)
        }}
        editingBudget={editingBudget}
        onSubmit={handleSubmitBudget}
        saving={saving}
        formRef={formRef}
      />

      <AddSavingsModal
        isOpen={showSavingsModal}
        onClose={() => setShowSavingsModal(false)}
        savingsCategory={savingsCategory}
        setSavingsCategory={setSavingsCategory}
        savingsBankCode={savingsBankCode}
        setSavingsBankCode={setSavingsBankCode}
        savingsIcon={savingsIcon}
        setSavingsIcon={setSavingsIcon}
        pocketOptions={POCKET_OPTIONS}
        onSubmit={handleSubmitSavings}
        saving={saving}
      />

      <SavingsTransactionModal
        isOpen={showSavingsTxModal}
        onClose={() => {
          setShowSavingsTxModal(false)
          setSelectedSavingsAccount(null)
        }}
        selectedSavingsAccount={selectedSavingsAccount}
        savingsTxType={savingsTxType}
        setSavingsTxType={setSavingsTxType}
        onSubmit={handleSavingsTransaction}
        saving={saving}
        formatCurrency={formatCurrency}
      />

      <ReceiptDetailModal
        isOpen={!!receiptModalTx}
        onClose={() => setReceiptModalTx(null)}
        transaction={receiptModalTx}
        onReceiptUpdated={() => {
          if (userProfile) fetchData(userProfile, viewMode)
        }}
      />

      <QuickExpenseDrawer
        isOpen={quickExpenseOpen}
        onClose={() => setQuickExpenseOpen(false)}
        onSuccess={() => fetchData(userProfile, viewMode)}
      />
    </>
  )
}
