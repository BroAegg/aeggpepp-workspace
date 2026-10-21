'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Plus,
  PiggyBank,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OwnerBadge } from '@/components/ui/owner-badge'
import { cn } from '@/lib/utils'
import type { SavingsAccount } from '@/types'
import type { PocketCategory, PocketOption } from './modals/add-savings-modal'

interface SavingsTabProps {
  savings: SavingsAccount[]
  formatCurrency: (amount: number) => string
  onOpenAddSavings: (category?: PocketCategory) => void
  onOpenSavingsTx: (account: SavingsAccount, type: 'deposit' | 'withdraw') => void
  onDeleteSavings: (id: string) => void
  pocketOptions: PocketOption[]
  getAccountCategory: (account: SavingsAccount) => PocketCategory
}

export function SavingsTab({
  savings,
  formatCurrency,
  onOpenAddSavings,
  onOpenSavingsTx,
  onDeleteSavings,
  pocketOptions,
  getAccountCategory,
}: SavingsTabProps) {
  const [pocketFilter, setPocketFilter] = useState<'all' | PocketCategory>('all')

  const totalSavings = useMemo(() => {
    return savings.reduce((s, a) => s + a.balance, 0)
  }, [savings])

  const assetBreakdown = useMemo(() => {
    const breakdown: Record<PocketCategory, { count: number; amount: number; pct: number }> = {
      bank: { count: 0, amount: 0, pct: 0 },
      ewallet: { count: 0, amount: 0, pct: 0 },
      cash: { count: 0, amount: 0, pct: 0 },
      friend_loan: { count: 0, amount: 0, pct: 0 },
      investment: { count: 0, amount: 0, pct: 0 },
    }

    savings.forEach((acc) => {
      const cat = getAccountCategory(acc)
      if (breakdown[cat]) {
        breakdown[cat].count += 1
        breakdown[cat].amount += acc.balance
      }
    })

    const total = totalSavings > 0 ? totalSavings : 1
    ;(Object.keys(breakdown) as PocketCategory[]).forEach((k) => {
      breakdown[k].pct = Math.max(0, (breakdown[k].amount / total) * 100)
    })

    return breakdown
  }, [savings, totalSavings, getAccountCategory])

  const filteredSavings = useMemo(() => {
    if (pocketFilter === 'all') return savings
    return savings.filter((a) => getAccountCategory(a) === pocketFilter)
  }, [savings, pocketFilter, getAccountCategory])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">🗺️</span>
            Lokasi Uang & Likuiditas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau di mana saja uang tersimpan — Bank, E-Wallet, Tunai, hingga Piutang Teman.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onOpenAddSavings('friend_loan')}
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs rounded-xl"
          >
            <span className="mr-1.5">🤝</span> + Catat Piutang
          </Button>
          <Button onClick={() => onOpenAddSavings()} size="sm" className="rounded-xl">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Lokasi
          </Button>
        </div>
      </div>

      {/* Net Worth Banner & 4 Pillars Breakdown */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Likuiditas Seluruh Lokasi
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight mt-1">
              {formatCurrency(totalSavings)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>{savings.length} Lokasi Terdata</span>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        {totalSavings > 0 && (
          <div className="space-y-2">
            <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden flex">
              {assetBreakdown.bank.pct > 0 && (
                <div style={{ width: `${assetBreakdown.bank.pct}%` }} className="bg-blue-600 transition-all" />
              )}
              {assetBreakdown.ewallet.pct > 0 && (
                <div style={{ width: `${assetBreakdown.ewallet.pct}%` }} className="bg-sky-500 transition-all" />
              )}
              {assetBreakdown.cash.pct > 0 && (
                <div style={{ width: `${assetBreakdown.cash.pct}%` }} className="bg-emerald-500 transition-all" />
              )}
              {assetBreakdown.friend_loan.pct > 0 && (
                <div style={{ width: `${assetBreakdown.friend_loan.pct}%` }} className="bg-amber-500 transition-all" />
              )}
              {assetBreakdown.investment.pct > 0 && (
                <div style={{ width: `${assetBreakdown.investment.pct}%` }} className="bg-purple-500 transition-all" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> Bank ({assetBreakdown.bank.pct.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> E-Wallet ({assetBreakdown.ewallet.pct.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Tunai ({assetBreakdown.cash.pct.toFixed(0)}%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Piutang ({assetBreakdown.friend_loan.pct.toFixed(0)}%)
              </span>
              {assetBreakdown.investment.amount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> Investasi ({assetBreakdown.investment.pct.toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        )}

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div
            onClick={() => setPocketFilter(pocketFilter === 'bank' ? 'all' : 'bank')}
            className={cn(
              'p-3.5 rounded-xl border transition-all cursor-pointer',
              pocketFilter === 'bank'
                ? 'border-blue-500 bg-blue-500/10 shadow-xs'
                : 'border-border/70 bg-secondary/40 hover:bg-secondary/70'
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-base">🏦</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                {assetBreakdown.bank.pct.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Bank</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
              {formatCurrency(assetBreakdown.bank.amount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{assetBreakdown.bank.count} rekening</p>
          </div>

          <div
            onClick={() => setPocketFilter(pocketFilter === 'ewallet' ? 'all' : 'ewallet')}
            className={cn(
              'p-3.5 rounded-xl border transition-all cursor-pointer',
              pocketFilter === 'ewallet'
                ? 'border-sky-500 bg-sky-500/10 shadow-xs'
                : 'border-border/70 bg-secondary/40 hover:bg-secondary/70'
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-base">📱</span>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                {assetBreakdown.ewallet.pct.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">E-Wallet</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
              {formatCurrency(assetBreakdown.ewallet.amount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{assetBreakdown.ewallet.count} akun</p>
          </div>

          <div
            onClick={() => setPocketFilter(pocketFilter === 'cash' ? 'all' : 'cash')}
            className={cn(
              'p-3.5 rounded-xl border transition-all cursor-pointer',
              pocketFilter === 'cash'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                : 'border-border/70 bg-secondary/40 hover:bg-secondary/70'
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-base">💵</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {assetBreakdown.cash.pct.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Uang Tunai</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
              {formatCurrency(assetBreakdown.cash.amount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{assetBreakdown.cash.count} tempat</p>
          </div>

          <div
            onClick={() => setPocketFilter(pocketFilter === 'friend_loan' ? 'all' : 'friend_loan')}
            className={cn(
              'p-3.5 rounded-xl border transition-all cursor-pointer',
              pocketFilter === 'friend_loan'
                ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                : 'border-border/70 bg-secondary/40 hover:bg-secondary/70'
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-base">🤝</span>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {assetBreakdown.friend_loan.pct.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Piutang Teman</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">
              {formatCurrency(assetBreakdown.friend_loan.amount)}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {assetBreakdown.friend_loan.count} orang pinjam
            </p>
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
          { id: 'friend_loan' as const, label: `🤝 Di Teman (${assetBreakdown.friend_loan.count})` },
          ...(assetBreakdown.investment.amount > 0
            ? [{ id: 'investment' as const, label: `📈 Investasi (${assetBreakdown.investment.count})` }]
            : []),
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setPocketFilter(chip.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
              pocketFilter === chip.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Pocket Cards Grid */}
      {filteredSavings.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-2xl">
          <PiggyBank className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground mb-3">
            {pocketFilter === 'all'
              ? 'Belum ada akun atau lokasi uang terdaftar'
              : `Belum ada lokasi uang di kategori "${pocketFilter}"`}
          </p>
          <Button
            onClick={() => onOpenAddSavings(pocketFilter === 'all' ? 'bank' : pocketFilter)}
            size="sm"
            className="rounded-xl"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Lokasi Uang
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSavings.map((account) => {
            const category = getAccountCategory(account)
            const isFriendLoan = category === 'friend_loan'
            const pocketInfo = pocketOptions.find((b) => b.code === account.bank_code)

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl p-5 group border transition-all flex flex-col justify-between shadow-xs',
                  isFriendLoan
                    ? 'bg-amber-500/[0.04] border-amber-500/40 hover:border-amber-500/60'
                    : 'bg-card border-border hover:border-primary/40'
                )}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0',
                          isFriendLoan ? 'bg-amber-500/15' : 'bg-primary/10'
                        )}
                      >
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
                          {category === 'bank'
                            ? 'Rekening Bank'
                            : category === 'ewallet'
                            ? 'Dompet Digital'
                            : category === 'friend_loan'
                            ? 'Uang Belum Kembali'
                            : category === 'cash'
                            ? 'Uang Tunai'
                            : 'Investasi'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteSavings(account.id)}
                      className="p-1 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all text-muted-foreground hover:text-red-500"
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
                    <p
                      className={cn(
                        'text-2xl font-black tabular-nums tracking-tight',
                        isFriendLoan ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                      )}
                    >
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
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl"
                        onClick={() => onOpenSavingsTx(account, 'withdraw')}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Terima Pelunasan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs border-amber-500/30 rounded-xl"
                        onClick={() => onOpenSavingsTx(account, 'deposit')}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Tambah Pinjaman
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs rounded-xl"
                        onClick={() => onOpenSavingsTx(account, 'deposit')}
                      >
                        <ArrowDownRight className="w-3.5 h-3.5 mr-1" /> Deposit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs rounded-xl"
                        onClick={() => onOpenSavingsTx(account, 'withdraw')}
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
  )
}
