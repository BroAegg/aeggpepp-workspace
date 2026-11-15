'use client'

import { useState } from 'react'
import { X, Calendar, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import type { WeddingBudgetItem, WeddingCategory } from '@/types'

interface BudgetItemModalProps {
  isOpen: boolean
  onClose: () => void
  editingBudgetItem: WeddingBudgetItem | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  isSubmitting: boolean
  categoryConfig: Record<WeddingCategory, { label: string; color: string; badge: string }>
}

export function BudgetItemModal({
  isOpen,
  onClose,
  editingBudgetItem,
  onSubmit,
  isSubmitting,
  categoryConfig,
}: BudgetItemModalProps) {
  const [dpPaid, setDpPaid] = useState(!!editingBudgetItem?.dp_paid)
  const [termin2Paid, setTermin2Paid] = useState(!!editingBudgetItem?.termin2_paid)
  const [pelunasanPaid, setPelunasanPaid] = useState(!!editingBudgetItem?.pelunasan_paid)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {editingBudgetItem ? 'Edit Pos Anggaran & Vendor' : 'Tambah Pos Anggaran Baru'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola rincian vendor, kontak, dan jadwal termin pembayaran (DP, Termin 2, Pelunasan).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="dp_paid" value={dpPaid ? 'true' : 'false'} />
          <input type="hidden" name="termin2_paid" value={termin2Paid ? 'true' : 'false'} />
          <input type="hidden" name="pelunasan_paid" value={pelunasanPaid ? 'true' : 'false'} />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Nama Pos / Item Kebutuhan *
            </label>
            <input
              name="title"
              required
              defaultValue={editingBudgetItem?.title || ''}
              placeholder="Contoh: Katering Prasmanan (180 Pax), MUA & Gaun..."
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Kategori
              </label>
              <select
                name="category"
                defaultValue={editingBudgetItem?.category || 'catering'}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Status Pembayaran
              </label>
              <select
                name="status"
                defaultValue={editingBudgetItem?.status || 'planned'}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="planned">Direncanakan</option>
                <option value="booked_dp">Sudah DP</option>
                <option value="paid_off">Lunas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Estimasi (Rp)
              </label>
              <CurrencyInput
                name="estimated_cost"
                defaultValue={editingBudgetItem?.estimated_cost || 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Realisasi (Rp)
              </label>
              <CurrencyInput
                name="actual_cost"
                defaultValue={editingBudgetItem?.actual_cost || 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Terbayar (Rp)
              </label>
              <CurrencyInput
                name="paid_amount"
                defaultValue={editingBudgetItem?.paid_amount || 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* VENDOR MILESTONES SECTION */}
          <div className="bg-secondary/30 border border-border/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Jadwal Termin Pembayaran Vendor (Milestones)
              </span>
              <span className="text-[10px] text-muted-foreground">DP • Termin 2 • Pelunasan</span>
            </div>

            {/* 1. Uang Muka (DP) */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <span className="text-xs font-semibold text-foreground">1. Uang Muka (DP)</span>
              </div>
              <div className="col-span-4">
                <CurrencyInput
                  name="dp_amount"
                  placeholder="Nominal DP"
                  defaultValue={editingBudgetItem?.dp_amount || 0}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs tabular-nums"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="date"
                  name="dp_due_date"
                  defaultValue={editingBudgetItem?.dp_due_date || ''}
                  className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs tabular-nums"
                  title="Jatuh tempo DP"
                />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <label className="flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dpPaid}
                    onChange={(e) => setDpPaid(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Lunas</span>
                </label>
              </div>
            </div>

            {/* 2. Termin 2 (Pertengahan) */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <span className="text-xs font-semibold text-foreground">2. Termin 2</span>
              </div>
              <div className="col-span-4">
                <CurrencyInput
                  name="termin2_amount"
                  placeholder="Nominal Termin 2"
                  defaultValue={editingBudgetItem?.termin2_amount || 0}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs tabular-nums"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="date"
                  name="termin2_due_date"
                  defaultValue={editingBudgetItem?.termin2_due_date || ''}
                  className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs tabular-nums"
                  title="Jatuh tempo Termin 2"
                />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <label className="flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termin2Paid}
                    onChange={(e) => setTermin2Paid(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Lunas</span>
                </label>
              </div>
            </div>

            {/* 3. Pelunasan Akhir */}
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <span className="text-xs font-semibold text-foreground">3. Pelunasan</span>
              </div>
              <div className="col-span-4">
                <CurrencyInput
                  name="pelunasan_amount"
                  placeholder="Nominal Pelunasan"
                  defaultValue={editingBudgetItem?.pelunasan_amount || 0}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs tabular-nums"
                />
              </div>
              <div className="col-span-3">
                <input
                  type="date"
                  name="pelunasan_due_date"
                  defaultValue={editingBudgetItem?.pelunasan_due_date || ''}
                  className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-xs tabular-nums"
                  title="Jatuh tempo Pelunasan"
                />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <label className="flex items-center gap-1 text-[11px] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pelunasanPaid}
                    onChange={(e) => setPelunasanPaid(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Lunas</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Nama Vendor (Opsional)
              </label>
              <input
                name="vendor_name"
                defaultValue={editingBudgetItem?.vendor_name || ''}
                placeholder="Nama vendor / penyedia..."
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                No Kontak / WhatsApp Vendor
              </label>
              <input
                name="vendor_contact"
                defaultValue={editingBudgetItem?.vendor_contact || ''}
                placeholder="0812xxxx"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Catatan / Rincian
            </label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingBudgetItem?.notes || ''}
              placeholder="Detail paket, rincian barang, termin perjanjian..."
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl text-xs">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pos Anggaran'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
