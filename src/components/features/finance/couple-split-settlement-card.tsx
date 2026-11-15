'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTransaction } from '@/lib/actions/finance'
import { toast } from '@/components/ui/toast'
import type { Transaction } from '@/types'

interface CoupleSplitSettlementCardProps {
  transactions: Transaction[]
  userProfile: any
  onSettled: () => void
}

export function CoupleSplitSettlementCard({
  transactions,
  userProfile,
  onSettled,
}: CoupleSplitSettlementCardProps) {
  const [settling, setSettling] = useState(false)

  // Current month's split transactions that haven't been settled
  const now = new Date()
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const splitTxs = transactions.filter((t) => {
    if (!t.is_split || t.is_settlement || t.deleted_at) return false
    return t.date.startsWith(currentMonthPrefix)
  })

  // Calculate totals paid by each partner
  let aeggTotalPaid = 0
  let peppaaTotalPaid = 0

  splitTxs.forEach((t) => {
    const role = t.profiles?.role
    if (role === 'peppaa') {
      peppaaTotalPaid += t.amount
    } else {
      // Default to aegg if not explicitly peppaa
      aeggTotalPaid += t.amount
    }
  })

  // Net difference (half of each goes to partner)
  const aeggShare = aeggTotalPaid / 2
  const peppaaShare = peppaaTotalPaid / 2
  const netDifference = aeggShare - peppaaShare // > 0 means Peppaa owes Aegg, < 0 means Aegg owes Peppaa

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Math.abs(val))
  }

  const handleSettleUp = async () => {
    if (Math.abs(netDifference) < 100) {
      toast.info('Patungan sudah seimbang / 0!')
      return
    }

    setSettling(true)
    try {
      const payerName = netDifference > 0 ? 'Peppaa' : 'Aegg'
      const receiverName = netDifference > 0 ? 'Aegg' : 'Peppaa'
      const amount = Math.round(Math.abs(netDifference))

      const formData = new FormData()
      formData.set('type', 'expense')
      formData.set('category', 'settlement')
      formData.set('sub_title', 'Pelunasan Patungan')
      formData.set('amount', amount.toString())
      formData.set('description', `Pelunasan Patungan (${payerName} ➔ ${receiverName})`)
      formData.set('date', new Date().toISOString().split('T')[0])
      formData.set('is_settlement', 'true')
      formData.set('idempotency_key', crypto.randomUUID())

      const res = await createTransaction(formData)
      if (res && 'error' in res && res.error) {
        toast.error('Gagal mencatat pelunasan', res.error)
      } else {
        toast.success(
          'Patungan Ditandai Lunas! 🎉',
          `Pelunasan ${formatCurrency(amount)} berhasil dicatat.`
        )
        onSettled()
      }
    } catch (err: any) {
      toast.error('Gagal memproses pelunasan', err?.message)
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Pelunasan Patungan Bulan Ini (Split Settlement)
            </h3>
            <p className="text-xs text-muted-foreground">
              Total {splitTxs.length} transaksi patungan 50:50 terdata
            </p>
          </div>
        </div>

        {Math.abs(netDifference) >= 100 ? (
          <Button
            size="sm"
            onClick={handleSettleUp}
            disabled={settling}
            className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
          >
            {settling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Tandai Lunas / Settle
              </>
            )}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" /> Impas / Lunas
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-border/60">
        <div className="p-3 bg-secondary/50 rounded-xl">
          <p className="text-[11px] text-muted-foreground font-medium">Ditalangi Aegg</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(aeggTotalPaid)}</p>
        </div>

        <div className="p-3 bg-secondary/50 rounded-xl">
          <p className="text-[11px] text-muted-foreground font-medium">Ditalangi Peppaa</p>
          <p className="text-sm font-bold text-foreground mt-0.5">{formatCurrency(peppaaTotalPaid)}</p>
        </div>

        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <p className="text-[11px] text-purple-600 dark:text-purple-300 font-medium">Posisi Hutang Bersih</p>
          <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mt-0.5">
            {netDifference > 100
              ? `Peppaa bayar ke Aegg: ${formatCurrency(netDifference)}`
              : netDifference < -100
              ? `Aegg bayar ke Peppaa: ${formatCurrency(netDifference)}`
              : 'Semua impas (Rp 0)'}
          </p>
        </div>
      </div>
    </div>
  )
}
