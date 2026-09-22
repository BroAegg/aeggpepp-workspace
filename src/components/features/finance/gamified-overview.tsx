'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Heart,
  TrendingDown,
  Sparkles,
  Zap,
  Coffee,
  Utensils,
  Car,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
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

  // Calculate this month's stats
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

    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0) || 5000000 // default benchmark if not set
    const budgetPercent = Math.min(Math.round((expense / totalBudget) * 100), 100)

    // Wedding fund calculation
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

  // Status meter level
  const statusMeter = useMemo(() => {
    if (stats.budgetPercent <= 60) {
      return {
        label: 'Aman Terkendali 🌿',
        desc: 'Pengeluaran masih dalam batas wajar, kalian berdua hebat!',
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        barColor: 'bg-emerald-500',
        icon: ShieldCheck,
      }
    } else if (stats.budgetPercent <= 85) {
      return {
        label: 'Mulai Waspada ⚠️',
        desc: 'Sudah mendekati 80% anggaran bulanan, kurangi jajan impulsif ya!',
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        barColor: 'bg-amber-500',
        icon: AlertTriangle,
      }
    } else {
      return {
        label: 'Mode Hemat / Overbudget 🚨',
        desc: 'Pengeluaran hampir atau sudah melewati target! Rem dulu belanjaannya.',
        color: 'text-red-500 bg-red-500/10 border-red-500/20',
        barColor: 'bg-red-500',
        icon: Flame,
      }
    }
  }, [stats.budgetPercent])

  return (
    <div className="space-y-6">
      {/* 1. Monthly Financial Health Meter (Visual & Game-like) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'p-2 rounded-xl border flex items-center justify-center',
                statusMeter.color
              )}
            >
              <statusMeter.icon className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Status Pengeluaran Bulan Ini
                </h3>
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full border',
                    statusMeter.color
                  )}
                >
                  {statusMeter.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{statusMeter.desc}</p>
            </div>
          </div>
          <button
            onClick={onOpenQuickExpense}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Catat Kilat
          </button>
        </div>

        {/* Progress Meter Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Terpakai: {formatRupiah(stats.expense)}
            </span>
            <span className="text-muted-foreground">
              Target Limit: {formatRupiah(stats.totalBudget)} ({stats.budgetPercent}%)
            </span>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden p-0.5 border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.budgetPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full rounded-full', statusMeter.barColor)}
            />
          </div>
        </div>
      </motion.div>

      {/* 2. Main Pockets (Dompet Utama: Uang Kas, Tabungan Nikah, Total Simpanan) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pocket A: Tabungan Menikah (Pre-Wedding Fund) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-pink-500/10 via-card to-card border border-pink-500/20 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
              Tabungan Menikah
            </span>
            <span className="text-[10px] font-semibold bg-pink-500/10 text-pink-600 px-2 py-0.5 rounded-full border border-pink-500/20">
              Target Bersama 💑
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-foreground tracking-tight">
              {formatRupiah(
                stats.weddingSavings?.balance || stats.totalSavingsAmount * 0.6 || 0
              )}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menuju Pelaminan Aegg & Peppaa 💍
            </p>
          </div>
          <div className="w-full bg-pink-500/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-pink-500 h-full rounded-full"
              style={{ width: '42%' }}
            />
          </div>
        </motion.div>

        {/* Pocket B: Kas Jajan Berdua (Date & Food) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Coffee className="w-4 h-4" />
              Kas Jajan & Kencan
            </span>
            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Bulan Ini
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-foreground tracking-tight">
              {formatRupiah(stats.expense * 0.45)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total kopi, makan, dan kencan berdua
            </p>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Setiap momen kencan tercatat rapi
          </div>
        </motion.div>

        {/* Pocket C: Total Simpanan & Aset */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              Total Tabungan & Kas
            </span>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
              Semua Akun
            </span>
          </div>
          <div>
            <h4 className="text-2xl font-black text-foreground tracking-tight">
              {formatRupiah(stats.totalSavingsAmount)}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {savings.length} akun tabungan terhubung
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Fondasi masa depan sampai hari tua 🏡
          </div>
        </motion.div>
      </div>

      {/* 3. Quick Action Presets (For fast thumb clicking) */}
      <div className="bg-secondary/40 border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500 fill-current" />
            Catat Pengeluaran Cepat:
          </span>
          <span className="text-[11px] text-muted-foreground">
            Buka popup instan tanpa reload
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
              <Coffee className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">Kopi / Jajan</p>
              <p className="text-[10px] text-muted-foreground">Rp 25.000</p>
            </div>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:scale-105 transition-transform">
              <Utensils className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">Makan Berdua</p>
              <p className="text-[10px] text-muted-foreground">Rp 35.000+</p>
            </div>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border hover:border-primary/40 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
              <Car className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">Transport</p>
              <p className="text-[10px] text-muted-foreground">Bensin / Gojek</p>
            </div>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border hover:border-pink-500/40 text-left transition-all group"
          >
            <span className="p-2 rounded-lg bg-pink-500/10 text-pink-500 group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground">Ngedate / Liburan</p>
              <p className="text-[10px] text-muted-foreground">Jalan bareng</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Recent Couple Expenses & Switch to Advanced Mode */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Catatan Pengeluaran Terkini
            </h4>
            <p className="text-xs text-muted-foreground">
              Aktivitas belanja terakhir kalian berdua
            </p>
          </div>
          <button
            onClick={onSwitchToAdvanced}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Lihat Buku Kas Lengkap
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-border">
          {stats.recentExpenses.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Belum ada transaksi bulan ini. Tap tombol di atas untuk mencatat! ☕
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
                    <span className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-base">
                      {tx.category === 'food'
                        ? '☕'
                        : tx.category === 'date'
                        ? '💑'
                        : tx.category === 'transport'
                        ? '🚗'
                        : tx.category === 'shopping'
                        ? '🛍️'
                        : '🧾'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {tx.description || tx.category}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span
                          className={cn(
                            'font-semibold px-1.5 py-0.2 rounded-md',
                            isPeppaa
                              ? 'bg-purple-500/10 text-purple-600'
                              : 'bg-blue-500/10 text-blue-600'
                          )}
                        >
                          {isPeppaa ? '🌙 Peppaa' : '⭐ Aegg'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-500 tabular-nums">
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
