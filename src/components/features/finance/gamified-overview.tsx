'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Heart,
  TrendingDown,
  Plus,
  Coffee,
  Car,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Building2,
} from 'lucide-react'
import type { Transaction, Budget, SavingsAccount } from '@/types'
import { cn } from '@/lib/utils'

interface GamifiedOverviewProps {
  transactions: Transaction[]
  budgets: Budget[]
  savings: SavingsAccount[]
  viewMode: 'me' | 'partner' | 'combined'
  onOpenQuickExpense: () => void
  onSwitchToAdvanced: () => void
  userRole?: string
}

export function GamifiedOverview({
  transactions,
  budgets,
  savings,
  viewMode,
  onOpenQuickExpense,
  onSwitchToAdvanced,
  userRole = 'aegg',
}: GamifiedOverviewProps) {
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Calculate monthly metrics
  const stats = useMemo(() => {
    const now = new Date()
    const cm = now.getMonth()
    const cy = now.getFullYear()

    const monthlyTx = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === cm && d.getFullYear() === cy
    })

    const expense = monthlyTx
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    const income = monthlyTx
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0) || 5000000
    const budgetPercent = Math.min(Math.round((expense / totalBudget) * 100), 100)

    // Wedding fund
    const weddingSavings = savings.find(
      (s) =>
        s.name.toLowerCase().includes('nikah') ||
        s.name.toLowerCase().includes('wedding')
    )
    const totalSavingsAmount = savings.reduce((s, a) => s + a.balance, 0)

    return {
      expense,
      income,
      totalBudget,
      budgetPercent,
      weddingSavings,
      totalSavingsAmount,
      recentExpenses: monthlyTx
        .filter((t) => t.type === 'expense')
        .slice(0, 5),
    }
  }, [transactions, budgets, savings])

  // Professional status meter
  const statusMeter = useMemo(() => {
    if (stats.budgetPercent <= 60) {
      return {
        label: 'Terkendali',
        desc: 'Pengeluaran bulan ini berada dalam batas anggaran wajar.',
        badgeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        barColor: 'bg-emerald-500',
        icon: ShieldCheck,
      }
    } else if (stats.budgetPercent <= 85) {
      return {
        label: 'Perhatian',
        desc: 'Pengeluaran telah mencapai 80% dari alokasi anggaran bulanan.',
        badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        barColor: 'bg-amber-500',
        icon: AlertTriangle,
      }
    } else {
      return {
        label: 'Melebihi Anggaran',
        desc: 'Pengeluaran telah melewati batas target anggaran yang ditetapkan.',
        badgeClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
        barColor: 'bg-rose-500',
        icon: AlertCircle,
      }
    }
  }, [stats.budgetPercent])

  return (
    <div className="space-y-6">
      {/* 1. Monthly Budget Meter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn('p-2 rounded-lg border flex items-center justify-center', statusMeter.badgeClass)}>
              <statusMeter.icon className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Status Anggaran Bulan Ini
                </h3>
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', statusMeter.badgeClass)}>
                  {statusMeter.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{statusMeter.desc}</p>
            </div>
          </div>
          <button
            onClick={onOpenQuickExpense}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:opacity-90 active:scale-98 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Pengeluaran
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Realisasi: {formatRupiah(stats.expense)}
            </span>
            <span className="text-muted-foreground font-mono">
              Limit: {formatRupiah(stats.totalBudget)} ({stats.budgetPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.budgetPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={cn('h-full rounded-full', statusMeter.barColor)}
            />
          </div>
        </div>
      </motion.div>

      {/* 2. Main Pockets (Clean Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pocket A: Dana Pernikahan */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3 relative"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-primary" />
              Alokasi Pernikahan
            </span>
            <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              Target Bersama
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
              {formatRupiah(stats.weddingSavings?.balance || stats.totalSavingsAmount * 0.6 || 0)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Akumulasi tabungan pernikahan bersama
            </p>
          </div>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '45%' }} />
          </div>
        </motion.div>

        {/* Pocket B: Kas Bersama & Operasional */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Kas Operasional & Kebutuhan
            </span>
            <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
              Bulan Ini
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
              {formatRupiah(stats.expense)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total belanja & kebutuhan yang telah tercatat
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Buku kas terverifikasi & sinkron
          </div>
        </motion.div>

        {/* Pocket C: Total Simpanan */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              Total Saldo Simpanan
            </span>
            <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
              {savings.length} Akun
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
              {formatRupiah(stats.totalSavingsAmount)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total saldo pada seluruh akun tabungan
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Rekening & dompet digital terhubung
          </div>
        </motion.div>
      </div>

      {/* 3. Quick Entry Presets */}
      <div className="bg-secondary/40 border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Kategori Pencatatan Cepat:
          </span>
          <span className="text-[11px] text-muted-foreground">
            Pilih kategori untuk input instan
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-all"
          >
            <span className="p-2 rounded-md bg-secondary text-foreground">
              <Coffee className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Konsumsi</p>
              <p className="text-[10px] text-muted-foreground">Makan & Minum</p>
            </div>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-all"
          >
            <span className="p-2 rounded-md bg-secondary text-foreground">
              <Car className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Transportasi</p>
              <p className="text-[10px] text-muted-foreground">Bensin & Ojek</p>
            </div>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-all"
          >
            <span className="p-2 rounded-md bg-secondary text-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Belanja</p>
              <p className="text-[10px] text-muted-foreground">Kebutuhan Harian</p>
            </div>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left transition-all"
          >
            <span className="p-2 rounded-md bg-secondary text-foreground">
              <Heart className="w-3.5 h-3.5 text-primary" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Agenda Bersama</p>
              <p className="text-[10px] text-muted-foreground">Kencan & Acara</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Recent Transactions List */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Transaksi Terakhir
            </h4>
            <p className="text-xs text-muted-foreground">
              Aktivitas pengeluaran tercatat bulan ini
            </p>
          </div>
          <button
            onClick={onSwitchToAdvanced}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            Lihat Buku Kas Lengkap
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-border">
          {stats.recentExpenses.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Belum ada transaksi pengeluaran tercatat untuk bulan ini.
            </div>
          ) : (
            stats.recentExpenses.map((tx) => {
              const role = (tx as any).profiles?.role || 'aegg'
              const isPeppaa = role === 'peppaa'
              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-xs font-bold">
                      {tx.category ? tx.category.substring(0, 2).toUpperCase() : 'TX'}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {tx.description || tx.category}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span
                          className={cn(
                            'font-medium px-1.5 py-0.2 rounded',
                            isPeppaa
                              ? 'bg-primary/10 text-primary'
                              : 'bg-secondary text-foreground'
                          )}
                        >
                          {isPeppaa ? 'Peppaa' : 'Aegg'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    - {formatRupiah(tx.amount)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
