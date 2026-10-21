'use client'

import { X } from 'lucide-react'
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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {editingBudgetItem ? 'Edit Pos Anggaran & Vendor' : 'Tambah Pos Anggaran Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Nama Pos / Item Kebutuhan *
            </label>
            <input
              name="title"
              required
              defaultValue={editingBudgetItem?.title || ''}
              placeholder="Contoh: Cetak Undangan Fisik & Digital..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Kategori</label>
              <select
                name="category"
                defaultValue={editingBudgetItem?.category || 'catering'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Status Pembayaran</label>
              <select
                name="status"
                defaultValue={editingBudgetItem?.status || 'planned'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="planned">Direncanakan</option>
                <option value="booked_dp">Sudah DP</option>
                <option value="paid_off">Lunas</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Estimasi (Rp)</label>
              <CurrencyInput
                name="estimated_cost"
                defaultValue={editingBudgetItem?.estimated_cost || 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Realisasi (Rp)</label>
              <CurrencyInput
                name="actual_cost"
                defaultValue={editingBudgetItem?.actual_cost || 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Terbayar (Rp)</label>
              <CurrencyInput
                name="paid_amount"
                defaultValue={editingBudgetItem?.paid_amount || 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Nama Vendor (Opsional)</label>
              <input
                name="vendor_name"
                defaultValue={editingBudgetItem?.vendor_name || ''}
                placeholder="Nama vendor..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">No Kontak / WA Vendor</label>
              <input
                name="vendor_contact"
                defaultValue={editingBudgetItem?.vendor_contact || ''}
                placeholder="0812xxxx"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Catatan / Rincian</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingBudgetItem?.notes || ''}
              placeholder="Detail paket, rincian barang, dll..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground">
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
