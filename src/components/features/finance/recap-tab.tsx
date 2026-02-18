'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FileText, Plus, Upload, Loader2, X, ChevronDown, ChevronRight,
    TrendingUp, TrendingDown, Receipt, Trash2, Tag, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { bulkCreateTransactions, type BulkTransactionItem } from '@/lib/actions/finance'
import type { Transaction } from '@/types'

interface RecapTabProps {
    transactions: Transaction[]
    formatCurrency: (amount: number) => string
    onRefresh: () => Promise<void>
}

interface BulkRow {
    id: string
    type: 'income' | 'expense'
    category: string
    sub_title: string
    amount: string
    description: string
    date: string
}

const newRow = (sub_title = ''): BulkRow => ({
    id: Math.random().toString(36).slice(2),
    type: 'expense',
    category: 'food',
    sub_title,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
})

export function RecapTab({ transactions, formatCurrency, onRefresh }: RecapTabProps) {
    // ---- Bulk Upload State ----
    const [showBulk, setShowBulk] = useState(false)
    const [bulkSubTitle, setBulkSubTitle] = useState('')
    const [bulkRows, setBulkRows] = useState<BulkRow[]>([newRow()])
    const [uploading, setUploading] = useState(false)
    const [bulkMsg, setBulkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // ---- Recap Filter State ----
    const [filterSubTitle, setFilterSubTitle] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    // ---- Unique sub_titles from data ----
    const subTitles = useMemo(() => {
        const all = transactions.map(t => t.sub_title).filter(Boolean) as string[]
        return all.reduce((acc: string[], v) => { if (!acc.includes(v)) acc.push(v); return acc }, []).sort()
    }, [transactions])

    // ---- Group transactions by sub_title ----
    const grouped = useMemo(() => {
        const filtered = transactions.filter(t => {
            const matchSub = filterSubTitle === 'all' || t.sub_title === filterSubTitle
            const matchSearch = !searchQuery ||
                t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.sub_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.category.toLowerCase().includes(searchQuery.toLowerCase())
            return matchSub && matchSearch
        })

        const groups: Record<string, { transactions: Transaction[]; totalIncome: number; totalExpense: number }> = {}
        filtered.forEach(t => {
            const key = t.sub_title || '—'
            if (!groups[key]) groups[key] = { transactions: [], totalIncome: 0, totalExpense: 0 }
            groups[key].transactions.push(t)
            if (t.type === 'income') groups[key].totalIncome += t.amount
            else groups[key].totalExpense += t.amount
        })

        return Object.entries(groups)
            .sort((a, b) => {
                // Sort: labeled groups first, then '—'
                if (a[0] === '—') return 1
                if (b[0] === '—') return -1
                return a[0].localeCompare(b[0])
            })
            .map(([key, val]) => ({ key, ...val }))
    }, [transactions, filterSubTitle, searchQuery])

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }

    // ---- Bulk upload handlers ----
    const updateRow = (id: string, field: keyof BulkRow, value: string) => {
        setBulkRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    }

    const addRow = () => {
        setBulkRows(prev => [...prev, newRow(bulkSubTitle)])
    }

    const removeRow = (id: string) => {
        setBulkRows(prev => prev.filter(r => r.id !== id))
    }

    const applySubTitleToAll = () => {
        setBulkRows(prev => prev.map(r => ({ ...r, sub_title: bulkSubTitle })))
    }

    const handleBulkUpload = async () => {
        const validRows = bulkRows.filter(r => r.amount && parseFloat(r.amount) > 0 && r.description)
        if (!validRows.length) {
            setBulkMsg({ type: 'error', text: 'Isi minimal 1 baris dengan amount dan keterangan' })
            return
        }

        setUploading(true)
        setBulkMsg(null)

        const items: BulkTransactionItem[] = validRows.map(r => ({
            type: r.type,
            category: r.category,
            sub_title: r.sub_title || bulkSubTitle || undefined,
            amount: parseFloat(r.amount),
            description: r.description,
            date: r.date,
        }))

        const result = await bulkCreateTransactions(items)

        if (result.error) {
            setBulkMsg({ type: 'error', text: result.error })
        } else {
            setBulkMsg({ type: 'success', text: `${result.count} transaksi berhasil ditambahkan!` })
            setBulkRows([newRow(bulkSubTitle)])
            await onRefresh()
        }
        setUploading(false)
    }

    const categoryOptions = [
        ...TRANSACTION_CATEGORIES.income,
        ...TRANSACTION_CATEGORIES.expense,
    ]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Rekap Transaksi</h3>
                        <p className="text-xs text-muted-foreground">Kelompokkan dan upload transaksi berdasarkan sub judul</p>
                    </div>
                </div>
                <Button onClick={() => setShowBulk(!showBulk)} variant={showBulk ? 'outline' : 'default'}>
                    {showBulk ? <X className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {showBulk ? 'Tutup' : 'Upload Massal'}
                </Button>
            </div>

            {/* BULK UPLOAD PANEL */}
            <AnimatePresence>
                {showBulk && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <Upload className="w-4 h-4" /> Upload Massal Transaksi
                            </h4>

                            {/* Sub Title for batch */}
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        <Tag className="w-3 h-3 inline mr-1" />
                                        Sub Judul Grup (opsional — berlaku untuk semua baris)
                                    </label>
                                    <input
                                        type="text"
                                        value={bulkSubTitle}
                                        onChange={e => setBulkSubTitle(e.target.value)}
                                        placeholder="e.g. Belanja Bulanan Feb 2026, Trip Bandung"
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <Button type="button" size="sm" variant="outline" onClick={applySubTitleToAll}>
                                    Apply ke Semua
                                </Button>
                            </div>

                            {/* Rows Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-20">Tipe</th>
                                            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Kategori</th>
                                            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Keterangan*</th>
                                            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-32">Amount*</th>
                                            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium w-32">Tanggal</th>
                                            <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Sub Judul</th>
                                            <th className="py-2 px-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {bulkRows.map((row, i) => (
                                            <tr key={row.id} className="group">
                                                <td className="py-1.5 px-2">
                                                    <select
                                                        value={row.type}
                                                        onChange={e => updateRow(row.id, 'type', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                    >
                                                        <option value="expense">Expense</option>
                                                        <option value="income">Income</option>
                                                    </select>
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    <select
                                                        value={row.category}
                                                        onChange={e => updateRow(row.id, 'category', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                    >
                                                        {categoryOptions.map(c => (
                                                            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    <input
                                                        type="text"
                                                        value={row.description}
                                                        onChange={e => updateRow(row.id, 'description', e.target.value)}
                                                        placeholder="Keterangan..."
                                                        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                    />
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={row.amount}
                                                            onChange={e => updateRow(row.id, 'amount', e.target.value)}
                                                            placeholder="0"
                                                            className="w-full pl-7 pr-2 py-1.5 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    <input
                                                        type="date"
                                                        value={row.date}
                                                        onChange={e => updateRow(row.id, 'date', e.target.value)}
                                                        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                    />
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    <input
                                                        type="text"
                                                        value={row.sub_title}
                                                        onChange={e => updateRow(row.id, 'sub_title', e.target.value)}
                                                        placeholder={bulkSubTitle || 'Sub judul...'}
                                                        className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                                                    />
                                                </td>
                                                <td className="py-1.5 px-2">
                                                    {bulkRows.length > 1 && (
                                                        <button
                                                            onClick={() => removeRow(row.id)}
                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5 text-red-500" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={addRow}
                                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                                </button>
                                <span className="text-muted-foreground text-xs">{bulkRows.length} baris</span>
                            </div>

                            {bulkMsg && (
                                <div className={cn('px-4 py-2.5 rounded-lg text-sm', bulkMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400')}>
                                    {bulkMsg.text}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => { setShowBulk(false); setBulkRows([newRow()]); setBulkMsg(null) }}>
                                    Batal
                                </Button>
                                <Button onClick={handleBulkUpload} disabled={uploading}>
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                    {uploading ? 'Menyimpan...' : `Upload ${bulkRows.filter(r => r.amount && r.description).length} Transaksi`}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RECAP FILTER + SEARCH */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari transaksi..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <select
                    value={filterSubTitle}
                    onChange={e => setFilterSubTitle(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">Semua Sub Judul</option>
                    {subTitles.map(st => (
                        <option key={st} value={st}>{st}</option>
                    ))}
                </select>
            </div>

            {/* GROUPED RECAP */}
            {grouped.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">Belum ada transaksi</p>
                    <p className="text-xs text-muted-foreground mt-1">Gunakan "Upload Massal" atau tambah transaksi dengan Sub Judul</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {grouped.map((group) => {
                        const isExpanded = expandedGroups.has(group.key)
                        const net = group.totalIncome - group.totalExpense
                        return (
                            <motion.div
                                key={group.key}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-card border border-border rounded-xl overflow-hidden"
                            >
                                {/* Group Header */}
                                <button
                                    onClick={() => toggleGroup(group.key)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isExpanded
                                            ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        }
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                {group.key !== '—' && <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                                                <span className={cn('font-semibold text-foreground truncate', group.key === '—' && 'text-muted-foreground')}>
                                                    {group.key}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                                    {group.transactions.length} transaksi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Summary chips */}
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                        {group.totalIncome > 0 && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                <TrendingUp className="w-3 h-3" /> {formatCurrency(group.totalIncome)}
                                            </span>
                                        )}
                                        {group.totalExpense > 0 && (
                                            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                                <TrendingDown className="w-3 h-3" /> {formatCurrency(group.totalExpense)}
                                            </span>
                                        )}
                                        <span className={cn('text-sm font-bold', net >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400')}>
                                            {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                        </span>
                                    </div>
                                </button>

                                {/* Expanded rows */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="border-t border-border divide-y divide-border">
                                                {group.transactions
                                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                    .map((t) => {
                                                        const catInfo = [
                                                            ...TRANSACTION_CATEGORIES.income,
                                                            ...TRANSACTION_CATEGORIES.expense
                                                        ].find(c => c.value === t.category)
                                                        return (
                                                            <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <span className="text-base flex-shrink-0">{catInfo?.icon || '💰'}</span>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium text-foreground truncate">
                                                                            {t.description || t.category}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                            <span>{new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                                            <span>·</span>
                                                                            <span className="capitalize">{catInfo?.label || t.category}</span>
                                                                            {(t as any).profiles && (
                                                                                <><span>·</span><span>{(t as any).profiles.role === 'aegg' ? '⭐' : '🌙'}</span></>
                                                                            )}
                                                                            {t.receipt_url && (
                                                                                <><span>·</span><span className="text-blue-500">📄</span></>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <p className={cn('text-sm font-semibold flex-shrink-0 ml-4',
                                                                    t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                                                )}>
                                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                                </p>
                                                            </div>
                                                        )
                                                    })}
                                            </div>
                                            {/* Group footer summary */}
                                            <div className="border-t border-border bg-secondary/30 px-4 py-2.5 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</span>
                                                <div className="flex items-center gap-4">
                                                    {group.totalIncome > 0 && (
                                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                            +{formatCurrency(group.totalIncome)}
                                                        </span>
                                                    )}
                                                    {group.totalExpense > 0 && (
                                                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                                            -{formatCurrency(group.totalExpense)}
                                                        </span>
                                                    )}
                                                    <span className={cn('text-sm font-bold', net >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400')}>
                                                        {net >= 0 ? '+' : ''}{formatCurrency(net)}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
