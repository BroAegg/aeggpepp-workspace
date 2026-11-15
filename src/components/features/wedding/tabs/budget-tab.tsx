'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  CheckCircle2,
  PiggyBank,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WeddingBudgetItem, SavingsAccount } from '@/types'
import {
  TARGET_BUDGET,
  TARGET_PAX,
  CATEGORY_CONFIG,
  formatCurrency,
  formatShort,
  cleanPhoneForWa,
} from '../wedding-config'

interface BudgetTabProps {
  budgetItems: WeddingBudgetItem[]
  savings?: SavingsAccount[]
  onAddBudgetItem: () => void
  onEditBudgetItem: (item: WeddingBudgetItem) => void
  onDeleteBudgetItem: (id: string) => void
}

export function BudgetTab({
  budgetItems,
  savings = [],
  onAddBudgetItem,
  onEditBudgetItem,
  onDeleteBudgetItem,
}: BudgetTabProps) {
  const [budgetSearch, setBudgetSearch] = useState('')
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState<string>('all')
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>('all')

  const weddingSavings = useMemo(() => {
    if (!savings || savings.length === 0) return null
    const matched = savings.filter(
      (s) =>
        s.name.toLowerCase().includes('nikah') ||
        s.name.toLowerCase().includes('wedding')
    )
    if (matched.length === 0) return null
    const totalBalance = matched.reduce((sum, s) => sum + s.balance, 0)
    const percentOfTarget = TARGET_BUDGET > 0 ? Math.min(100, Math.round((totalBalance / TARGET_BUDGET) * 100)) : 0
    const deficit = Math.max(0, TARGET_BUDGET - totalBalance)
    const estimatedMonthsNeeded = totalBalance > 0 && deficit > 0 ? Math.ceil(deficit / Math.max(2000000, totalBalance / 3)) : 0
    const estDate = new Date()
    estDate.setMonth(estDate.getMonth() + estimatedMonthsNeeded)
    const estMonthYear = estDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    return {
      totalBalance,
      percentOfTarget,
      deficit,
      estimatedMonthsNeeded,
      estMonthYear,
      accounts: matched,
    }
  }, [savings])

  const { totalEstimated, totalActual, totalPaid, totalUnpaid } = useMemo(() => {
    let est = 0
    let act = 0
    let paid = 0

    budgetItems.forEach((item) => {
      est += item.estimated_cost || 0
      act += item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost || 0
      paid += item.paid_amount || 0
    })

    return {
      totalEstimated: est,
      totalActual: act,
      totalPaid: paid,
      totalUnpaid: Math.max(0, act - paid),
    }
  }, [budgetItems])

  const percentUsed = Math.min(100, Math.round((totalActual / TARGET_BUDGET) * 100))
  const percentPaid = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0
  const remainingBudget = TARGET_BUDGET - totalActual

  const filteredBudgetItems = useMemo(() => {
    return budgetItems.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(budgetSearch.toLowerCase()) ||
        (item.vendor_name && item.vendor_name.toLowerCase().includes(budgetSearch.toLowerCase()))
      const matchCat = budgetCategoryFilter === 'all' || item.category === budgetCategoryFilter
      const matchStatus = budgetStatusFilter === 'all' || item.status === budgetStatusFilter
      return matchSearch && matchCat && matchStatus
    })
  }, [budgetItems, budgetSearch, budgetCategoryFilter, budgetStatusFilter])

  return (
    <div className="space-y-6">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Target Anggaran
          </span>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(TARGET_BUDGET)}</div>
          <div className="text-xs text-muted-foreground">Target perayaan {TARGET_PAX} pax</div>
        </div>

        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Total Estimasi / Realisasi
          </span>
          <div className="text-2xl font-bold text-primary">{formatCurrency(totalActual)}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>{percentUsed}% dari target</span>
            <span>Est: {formatShort(totalEstimated)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Sudah Dibayar (DP/Lunas)
          </span>
          <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalPaid)}</div>
          <div className="text-xs text-muted-foreground">{percentPaid}% dari total kebutuhan</div>
        </div>

        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Sisa Tagihan Pelunasan
          </span>
          <div
            className={cn(
              'text-2xl font-bold',
              totalUnpaid > 0 ? 'text-amber-500' : 'text-emerald-500'
            )}
          >
            {formatCurrency(totalUnpaid)}
          </div>
          <div className="text-xs text-muted-foreground">
            {remainingBudget >= 0
              ? `Sisa saldo budget: ${formatShort(remainingBudget)}`
              : `Over budget: ${formatShort(Math.abs(remainingBudget))}`}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/40 space-y-2 shadow-xs">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Terbayar: {formatCurrency(totalPaid)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Belum Dibayar: {formatCurrency(totalUnpaid)}
            </span>
          </div>
          <span>Target: {formatCurrency(TARGET_BUDGET)}</span>
        </div>
        <div className="h-3 w-full bg-secondary/60 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${(totalPaid / TARGET_BUDGET) * 100}%` }}
          />
          <div
            className="bg-amber-500/80 transition-all duration-300"
            style={{ width: `${(totalUnpaid / TARGET_BUDGET) * 100}%` }}
          />
        </div>
      </div>

      {/* Auto-Linked Wedding Savings Progress */}
      {weddingSavings && (
        <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                  Tabungan Nikah Terkumpul (Auto-Linked)
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    Live Finance Sync
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground">
                  Saldo terhubung dari akun: {weddingSavings.accounts.map((a) => a.name).join(', ')}
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-lg font-bold text-primary font-mono">
                {formatCurrency(weddingSavings.totalBalance)}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {weddingSavings.percentOfTarget}% dari target {formatShort(TARGET_BUDGET)}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="w-full bg-secondary/80 h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${weddingSavings.percentOfTarget}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 flex-wrap gap-1">
              <span>
                {weddingSavings.deficit > 0
                  ? `Kekurangan dana: ${formatCurrency(weddingSavings.deficit)}`
                  : 'Target dana pernikahan tercapai penuh! 🎉'}
              </span>
              {weddingSavings.deficit > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Estimasi terpenuhi: {weddingSavings.estMonthYear}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar & Action */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari pos pengeluaran / vendor..."
            value={budgetSearch}
            onChange={(e) => setBudgetSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={budgetCategoryFilter}
            onChange={(e) => setBudgetCategoryFilter(e.target.value)}
            className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          <select
            value={budgetStatusFilter}
            onChange={(e) => setBudgetStatusFilter(e.target.value)}
            className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Status</option>
            <option value="planned">Direncanakan</option>
            <option value="booked_dp">Sudah DP</option>
            <option value="paid_off">Lunas</option>
          </select>

          <Button onClick={onAddBudgetItem} size="sm" className="rounded-xl shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Pos
          </Button>
        </div>
      </div>

      {/* Budget Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredBudgetItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
            Tidak ada pos anggaran yang cocok dengan filter.
          </div>
        ) : (
          filteredBudgetItems.map((item) => {
            const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
            const effectiveCost =
              item.actual_cost && item.actual_cost > 0 ? item.actual_cost : item.estimated_cost
            const unpaid = Math.max(0, effectiveCost - (item.paid_amount || 0))

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-border/50 bg-card hover:border-border transition-all flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            catCfg.color
                          )}
                        >
                          {catCfg.label}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-medium px-2 py-0.5 rounded-full border',
                            item.status === 'paid_off'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : item.status === 'booked_dp'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                              : 'bg-secondary text-muted-foreground border-border'
                          )}
                        >
                          {item.status === 'paid_off'
                            ? 'Lunas'
                            : item.status === 'booked_dp'
                            ? 'Sudah DP'
                            : 'Direncanakan'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base text-foreground leading-snug">{item.title}</h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditBudgetItem(item)}
                        className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                        title="Edit item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteBudgetItem(item.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                        title="Hapus item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.notes}</p>
                  )}

                  {item.vendor_name && (
                    <div className="flex items-center gap-2 text-xs text-foreground/80 bg-secondary/40 px-2.5 py-1.5 rounded-xl">
                      <span className="font-medium">Vendor: {item.vendor_name}</span>
                      {item.vendor_contact && (
                        <a
                          href={`https://wa.me/${cleanPhoneForWa(item.vendor_contact)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-emerald-500 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <Phone className="w-3 h-3" />
                          {item.vendor_contact}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Payment Milestone Chips */}
                  {(Boolean(item.dp_amount) || Boolean(item.termin2_amount) || Boolean(item.pelunasan_amount)) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {Boolean(item.dp_amount && item.dp_amount > 0) && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1',
                            item.dp_paid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          )}
                        >
                          {item.dp_paid ? '✓' : '⌛'} DP: {formatShort(item.dp_amount!)}
                          {item.dp_due_date && ` (${new Date(item.dp_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`}
                        </span>
                      )}
                      {Boolean(item.termin2_amount && item.termin2_amount > 0) && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1',
                            item.termin2_paid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          )}
                        >
                          {item.termin2_paid ? '✓' : '⌛'} Termin 2: {formatShort(item.termin2_amount!)}
                          {item.termin2_due_date && ` (${new Date(item.termin2_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`}
                        </span>
                      )}
                      {Boolean(item.pelunasan_amount && item.pelunasan_amount > 0) && (
                        <span
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1',
                            item.pelunasan_paid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          )}
                        >
                          {item.pelunasan_paid ? '✓' : '⌛'} Pelunasan: {formatShort(item.pelunasan_amount!)}
                          {item.pelunasan_due_date && ` (${new Date(item.pelunasan_due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})`}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cost Details Footer */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Kebutuhan: </span>
                    <span className="font-semibold text-foreground">{formatCurrency(effectiveCost)}</span>
                    {item.actual_cost &&
                      item.actual_cost > 0 &&
                      item.actual_cost !== item.estimated_cost && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (Est: {formatShort(item.estimated_cost)})
                        </span>
                      )}
                  </div>

                  <div className="text-right">
                    {unpaid > 0 ? (
                      <span className="text-amber-500 font-medium">Sisa: {formatCurrency(unpaid)}</span>
                    ) : (
                      <span className="text-emerald-500 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
