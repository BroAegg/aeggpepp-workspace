'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown, ArrowLeftRight, Tag, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { BankLogo } from '@/lib/bank-registry'
import { cn } from '@/lib/utils'
import { TRANSACTION_CATEGORIES } from '@/lib/constants'
import type { Transaction, SavingsAccount, TransactionType } from '@/types'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  editingTransaction: Transaction | null
  selectedType: TransactionType
  setSelectedType: (type: TransactionType) => void
  accounts?: SavingsAccount[]
  onSubmit: (formData: FormData) => Promise<void>
  saving: boolean
  formRef?: React.Ref<HTMLFormElement>
}

export function AddTransactionModal({
  isOpen,
  onClose,
  editingTransaction,
  selectedType,
  setSelectedType,
  accounts = [],
  defaultAccountId,
  onSubmit,
  saving,
  formRef,
}: AddTransactionModalProps & { defaultAccountId?: string | null }) {
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState<number>(0)

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID())
      if (editingTransaction) {
        setFromAccountId(editingTransaction.from_account_id || '')
        setToAccountId(editingTransaction.to_account_id || '')
        setAccountId(editingTransaction.account_id || '')
        setAmount(editingTransaction.amount || 0)
      } else {
        const def = defaultAccountId && accounts.some((a) => a.id === defaultAccountId)
          ? defaultAccountId
          : accounts.find((a) => !a.is_locked)?.id || accounts[0]?.id || ''
        setFromAccountId(accounts[0]?.id || '')
        setToAccountId(accounts[1]?.id || '')
        setAccountId(def)
        setAmount(0)
      }
    }
  }, [isOpen, editingTransaction, accounts, defaultAccountId])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border/80 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form ref={formRef} action={onSubmit} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />

          {/* 3-Way Transaction Type Toggle (Anti-Slop Clean Style) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedType('expense')}
                className={cn(
                  'px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  selectedType === 'expense'
                    ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                    : 'border-border/80 hover:border-red-500/40 text-muted-foreground'
                )}
              >
                <TrendingDown className="w-3.5 h-3.5" /> Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('income')}
                className={cn(
                  'px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  selectedType === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'border-border/80 hover:border-emerald-500/40 text-muted-foreground'
                )}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('transfer')}
                className={cn(
                  'px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                  selectedType === 'transfer'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'border-border/80 hover:border-blue-500/40 text-muted-foreground'
                )}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
              </button>
            </div>
          </div>

          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nominal
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                Rp
              </span>
              <CurrencyInput
                name="amount"
                required
                value={amount}
                onChange={(val) => setAmount(val)}
                className="w-full pl-11 pr-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            {/* Quick Nominal Chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {[
                { label: '+10rb', add: 10000 },
                { label: '+25rb', add: 25000 },
                { label: '+50rb', add: 50000 },
                { label: '+100rb', add: 100000 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setAmount((prev) => (Number(prev) || 0) + chip.add)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold border border-border/70 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(0)}
                className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20 transition-colors ml-auto"
              >
                Reset
              </button>
            </div>
          </div>

          {/* TRANSFER FIELDS: Dari Akun -> Ke Akun */}
          {selectedType === 'transfer' ? (
            <div className="space-y-3 bg-secondary/30 p-3.5 rounded-xl border border-border/80">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Dari Rekening / Kantong Asal
                </label>
                <select
                  name="from_account_id"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="" disabled>Pilih Rekening Asal</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: Rp {Number(acc.balance).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center -my-1">
                <div className="p-1 rounded-full bg-secondary text-muted-foreground border border-border">
                  <ArrowLeftRight className="w-3.5 h-3.5 rotate-90 sm:rotate-0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Ke Rekening / Kantong Tujuan
                </label>
                <select
                  name="to_account_id"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="" disabled>Pilih Rekening Tujuan</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                      {acc.name} {acc.id === fromAccountId ? '(Rekening Asal)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* NON-TRANSFER: Optional account linkage */
            accounts.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Lokasi Uang / Rekening Terkait <span className="text-[10px] lowercase text-muted-foreground">(opsional)</span>
                </label>
                <select
                  name="account_id"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">-- Tanpa tautan rekening (hanya buku kas) --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: Rp {Number(acc.balance).toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Keterangan
            </label>
            <input
              type="text"
              name="description"
              required
              placeholder={
                selectedType === 'transfer'
                  ? 'e.g. Pindah dana operasional ke tabungan nikah'
                  : selectedType === 'income'
                  ? 'e.g. Gaji bulanan, Bonus proyek'
                  : 'e.g. Belanja mingguan, Makan siang'
              }
              defaultValue={editingTransaction?.description ?? ''}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Kategori & Tanggal (hanya jika bukan transfer) */}
          <div className="grid grid-cols-2 gap-3">
            {selectedType !== 'transfer' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kategori
                </label>
                <select
                  name="category"
                  defaultValue={editingTransaction?.category || (selectedType === 'income' ? 'salary' : 'food')}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {TRANSACTION_CATEGORIES[selectedType === 'income' ? 'income' : 'expense'].map((cat: any) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kategori
                </label>
                <input
                  type="text"
                  name="category"
                  value="Transfer"
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/50 text-muted-foreground text-xs"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Tanggal
              </label>
              <input
                type="date"
                name="date"
                defaultValue={editingTransaction?.date || new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Dicatat Oleh
              </label>
              <select
                name="paid_by"
                defaultValue={editingTransaction?.paid_by || 'aegg'}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="aegg">Aegg</option>
                <option value="peppaa">Peppaa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3" /> Label Grup
                  <span className="text-[10px] text-muted-foreground lowercase">(opsional)</span>
                </span>
              </label>
              <input
                type="text"
                name="sub_title"
                placeholder="e.g. Belanja, Trip, Nikahan"
                defaultValue={editingTransaction?.sub_title ?? ''}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {selectedType !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Foto Struk (Opsional)
              </label>
              <input
                type="file"
                name="receipt_file"
                accept="image/*"
                className="w-full text-xs text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
              />
              {editingTransaction?.receipt_url && (
                <p className="mt-1 text-[11px] text-emerald-500">✓ Struk sudah ada (upload baru untuk mengganti)</p>
              )}
            </div>
          )}

          <div className="flex gap-2.5 pt-3 border-t border-border/60">
            <Button type="button" variant="outline" className="flex-1 text-xs" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 text-xs" disabled={saving}>
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : editingTransaction ? (
                'Simpan'
              ) : selectedType === 'transfer' ? (
                'Eksekusi Transfer'
              ) : (
                'Tambah Transaksi'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
