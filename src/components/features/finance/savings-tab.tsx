'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  Lock,
  ArrowLeftRight,
  Plus,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { BankLogo, getBankPreset } from '@/lib/bank-registry'
import { cn } from '@/lib/utils'
import type { SavingsAccount } from '@/types'

interface SavingsTabProps {
  savings: SavingsAccount[]
  formatCurrency: (amount: number) => string
  onOpenAddSavings: () => void
  onOpenSavingsTx: (account: SavingsAccount, type: 'deposit' | 'withdraw') => void
  onDeleteSavings: (id: string) => void
  onOpenTransfer?: (fromAccountId?: string) => void
  pocketOptions?: any
  getAccountCategory?: any
}

type TabFilter = 'all' | 'operational' | 'locked' | 'bank' | 'ewallet' | 'cash'

export function SavingsTab({
  savings,
  formatCurrency,
  onOpenAddSavings,
  onOpenSavingsTx,
  onDeleteSavings,
  onOpenTransfer,
}: SavingsTabProps) {
  const [filter, setFilter] = useState<TabFilter>('all')

  // Total liquidity metrics
  const { totalBalance, operationalBalance, lockedBalance, operationalPct, lockedPct } = useMemo(() => {
    let total = 0
    let op = 0
    let lock = 0

    savings.forEach((acc) => {
      const bal = Number(acc.balance) || 0
      total += bal
      if (acc.is_locked) {
        lock += bal
      } else {
        op += bal
      }
    })

    const opPct = total > 0 ? (op / total) * 100 : 0
    const lockPct = total > 0 ? (lock / total) * 100 : 0

    return {
      totalBalance: total,
      operationalBalance: op,
      lockedBalance: lock,
      operationalPct: opPct,
      lockedPct: lockPct,
    }
  }, [savings])

  const filteredAccounts = useMemo(() => {
    return savings.filter((acc) => {
      if (filter === 'operational') return !acc.is_locked
      if (filter === 'locked') return !!acc.is_locked
      if (filter === 'bank') {
        const preset = getBankPreset(acc.bank_code)
        return preset.category === 'digital_bank' || preset.category === 'conventional_bank' || acc.type === 'bank'
      }
      if (filter === 'ewallet') {
        const preset = getBankPreset(acc.bank_code)
        return preset.category === 'ewallet' || acc.type === 'ewallet'
      }
      if (filter === 'cash') {
        const preset = getBankPreset(acc.bank_code)
        return preset.category === 'cash' || acc.type === 'cash'
      }
      return true
    })
  }, [savings, filter])

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="w-4 h-4" />
            </span>
            Lokasi Uang & Likuiditas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pemisahan tegas antara Dana Operasional Bebas dan Tabungan Nikah Terkunci.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenTransfer && (
            <Button
              onClick={() => onOpenTransfer()}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs flex-1 sm:flex-none border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" /> Transfer Antar Rekening
            </Button>
          )}
          <Button onClick={onOpenAddSavings} size="sm" className="rounded-xl text-xs flex-1 sm:flex-none">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Kantong
          </Button>
        </div>
      </div>

      {/* 3 Pillars Summary (Anti-Slop: Clean, High Data Density, Professional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Total Liquidity */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Seluruh Likuiditas
          </p>
          <p className="text-2xl font-black text-foreground tabular-nums tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Tersebar di {savings.length} rekening & kantong aktif
          </p>
        </div>

        {/* Operational Funds */}
        <div className="bg-emerald-500/[0.04] border border-emerald-500/30 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Dana Bebas Operasional
            </p>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">
              {operationalPct.toFixed(0)}%
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums tracking-tight">
            {formatCurrency(operationalBalance)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Bisa dibelanjakan untuk makan, belanja, dan tagihan
          </p>
        </div>

        {/* Locked Wedding & Emergency Funds */}
        <div className="bg-amber-500/[0.04] border border-amber-500/30 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Dana Terkunci (Nikah & Impian)
            </p>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
              {lockedPct.toFixed(0)}%
            </span>
          </div>
          <p className="text-2xl font-black text-amber-800 dark:text-amber-300 tabular-nums tracking-tight">
            {formatCurrency(lockedBalance)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Terproteksi aman untuk hari H & masa depan berdua
          </p>
        </div>
      </div>

      {/* Progress Bar of Allocation */}
      {totalBalance > 0 && (
        <div className="space-y-1.5 bg-card border border-border/70 p-3 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Rasio Alokasi Dana</span>
            <span className="tabular-nums">
              Bebas {operationalPct.toFixed(0)}% • Terkunci {lockedPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
            <div style={{ width: `${operationalPct}%` }} className="bg-emerald-500 transition-all" />
            <div style={{ width: `${lockedPct}%` }} className="bg-amber-500 transition-all" />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'all' as const, label: `Semua (${savings.length})` },
          { id: 'operational' as const, label: '🟢 Dana Bebas' },
          { id: 'locked' as const, label: '🔒 Dana Terkunci' },
          { id: 'bank' as const, label: '🏦 Bank' },
          { id: 'ewallet' as const, label: '📱 E-Wallet' },
          { id: 'cash' as const, label: '💵 Kas / Tunai' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
              filter === tab.id
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Cards Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-2xl space-y-3">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Belum ada kantong atau rekening di kategori ini.
          </p>
          <Button onClick={onOpenAddSavings} size="sm" className="rounded-xl text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Kantong Baru
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAccounts.map((account) => {
            const preset = getBankPreset(account.bank_code)
            const isLocked = !!account.is_locked

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl p-4.5 border transition-all flex flex-col justify-between shadow-2xs group bg-card',
                  isLocked
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-border/80 hover:border-primary/40'
                )}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <BankLogo bankCode={account.bank_code} className="w-10 h-10 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="font-bold text-foreground text-sm truncate">{account.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {preset.name}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-1.5 py-0.2 rounded-full',
                              isLocked
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            )}
                          >
                            {isLocked ? '🔒 Terkunci (Nikah)' : '🟢 Dana Bebas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteSavings(account.id)}
                      className="p-1 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Hapus kantong"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Balance Display */}
                  <div className="my-3">
                    <span className="text-[11px] text-muted-foreground font-medium block">
                      Saldo Saat Ini
                    </span>
                    <p
                      className={cn(
                        'text-2xl font-black tabular-nums tracking-tight mt-0.5',
                        isLocked ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                      )}
                    >
                      {formatCurrency(Number(account.balance) || 0)}
                    </p>
                  </div>

                  {account.profiles && (
                    <div className="mb-3">
                      <OwnerBadge role={account.profiles.role} />
                    </div>
                  )}
                </div>

                {/* Actions: Transfer & Deposit / Withdraw */}
                <div className="pt-2.5 border-t border-border/50 flex gap-2">
                  {onOpenTransfer && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                      onClick={() => onOpenTransfer(account.id)}
                    >
                      <ArrowLeftRight className="w-3 h-3 mr-1" /> Transfer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs rounded-xl"
                    onClick={() => onOpenSavingsTx(account, 'deposit')}
                  >
                    <ArrowDownRight className="w-3 h-3 mr-1" /> Deposit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs rounded-xl"
                    onClick={() => onOpenSavingsTx(account, 'withdraw')}
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
  )
}
