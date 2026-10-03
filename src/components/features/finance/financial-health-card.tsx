'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  PiggyBank,
  Wallet,
} from 'lucide-react'
import type { FinancialHealthReport } from '@/types'

interface FinancialHealthCardProps {
  report: FinancialHealthReport
}

export function FinancialHealthCard({ report }: FinancialHealthCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Status configuration
  const statusConfig = {
    excellent: {
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      ringColor: '#10b981',
      bgGlow: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      icon: ShieldCheck,
    },
    good: {
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      ringColor: '#3b82f6',
      bgGlow: 'from-blue-500/10 via-blue-500/5 to-transparent',
      icon: Activity,
    },
    warning: {
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      ringColor: '#f59e0b',
      bgGlow: 'from-amber-500/10 via-amber-500/5 to-transparent',
      icon: AlertTriangle,
    },
    critical: {
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      ringColor: '#f43f5e',
      bgGlow: 'from-rose-500/10 via-rose-500/5 to-transparent',
      icon: AlertCircle,
    },
  }[report.status]

  const StatusIcon = statusConfig.icon

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Background Ambient Glow */}
      <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br ${statusConfig.bgGlow} blur-3xl pointer-events-none`} />

      {/* Main Header / Top Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Radial Score Gauge */}
          <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-secondary/40 border border-border/80 shadow-inner">
            <svg className="h-full w-full -rotate-90 p-1.5" viewBox="0 0 36 36">
              <path
                className="text-muted/30"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                strokeDasharray={`${report.score}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke={statusConfig.ringColor}
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{report.score}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">/100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badgeBg}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {report.statusLabel}
              </span>
              <span className="hidden sm:inline-block text-xs text-muted-foreground">Kesehatan Finansial Aegg & Peppaa</span>
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-bold text-foreground">
              Evaluasi Keuangan Bersama
            </h2>
            <p className="text-xs text-muted-foreground">
              {report.monthlyIncome > 0
                ? `Pemasukan Rp ${report.monthlyIncome.toLocaleString('id-ID')} · Pengeluaran Rp ${report.monthlyExpense.toLocaleString('id-ID')} (${report.expenseRatio}% terpakai)`
                : `Pengeluaran bulan ini Rp ${report.monthlyExpense.toLocaleString('id-ID')}`}
            </p>
          </div>
        </div>

        {/* Toggle Detailed Breakdown Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <span>{showDetails ? 'Tutup Rincian' : 'Lihat Analisis Rinci'}</span>
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* 4 Pillars Quick Overview Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Pillar 1: Savings Rate */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Rasio Tabungan</span>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-foreground">{report.savingsRate}%</span>
            <span className="text-[11px] text-muted-foreground">/ target 20%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                report.savingsRate >= 20 ? 'bg-emerald-500' : report.savingsRate >= 10 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, (report.savingsRate / 35) * 100))}%` }}
            />
          </div>
        </div>

        {/* Pillar 2: Burn-Rate Velocity */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Rata-rata Belanja</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold text-foreground">
              Rp {Math.round(report.burnRateVelocity.dailyAverage / 1000).toLocaleString('id-ID')}k
            </span>
            <span className="text-[11px] text-muted-foreground">/hari</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Proyeksi: Rp {Math.round(report.burnRateVelocity.projectedMonthEnd / 1000000).toFixed(1)}jt di akhir bln
          </p>
        </div>

        {/* Pillar 3: Couple Spending Fairness */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Proporsi Pasangan</span>
            <HeartHandshake className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-xs font-bold text-foreground">
            <span className="text-blue-500">👨‍💻 {report.coupleSplit.aeggPercent}%</span>
            <span className="text-pink-500">👩‍💼 {report.coupleSplit.peppaaPercent}%</span>
          </div>
          <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div className="bg-blue-500 transition-all duration-500" style={{ width: `${report.coupleSplit.aeggPercent}%` }} />
            <div className="bg-pink-500 transition-all duration-500" style={{ width: `${report.coupleSplit.peppaaPercent}%` }} />
          </div>
        </div>

        {/* Pillar 4: Liquid Cushion */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Cadangan Likuid</span>
            <Wallet className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-bold text-foreground">{report.liquidBufferMonths}</span>
            <span className="text-[11px] text-muted-foreground">Bulan runway</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Saldo: Rp {Math.round(report.totalLiquidAssets / 1000000).toFixed(1)}jt siap pakai
          </p>
        </div>
      </div>

      {/* Smart Alerts Notification Strip */}
      {report.alerts.length > 0 && (
        <div className="mt-4 space-y-2">
          {report.alerts.map((alert) => {
            const isDanger = alert.type === 'danger'
            const isSuccess = alert.type === 'success'
            const isWarning = alert.type === 'warning'

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                  isDanger
                    ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : isSuccess
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                }`}
              >
                {isDanger && <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />}
                {isSuccess && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />}
                {isWarning && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{alert.title}</span>
                    {alert.metric && (
                      <span className="rounded bg-background/50 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                        {alert.metric}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 opacity-90">{alert.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Expandable Deep Analysis & Recommendations */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-5 border-t border-border/60 pt-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Rekomendasi Cerdas untuk Aegg & Peppaa:
              </h3>
              <ul className="mt-2.5 space-y-2">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl bg-secondary/20 p-3 text-[11px] text-muted-foreground border border-border/40">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Kriteria Penilaian Skor Kesehatan Finansial (0–100):</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>• Rasio Tabungan: bobot 35%</div>
                  <div>• Stabilitas Cashflow: bobot 30%</div>
                  <div>• Kepatuhan Budget: bobot 20%</div>
                  <div>• Cadangan Likuid: bobot 15%</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
