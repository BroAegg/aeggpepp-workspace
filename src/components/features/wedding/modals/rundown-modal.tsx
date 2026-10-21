'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WeddingRundownItem } from '@/types'

interface RundownModalProps {
  isOpen: boolean
  onClose: () => void
  editingRundownItem: WeddingRundownItem | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  isSubmitting: boolean
}

export function RundownModal({
  isOpen,
  onClose,
  editingRundownItem,
  onSubmit,
  isSubmitting,
}: RundownModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {editingRundownItem ? 'Edit Sesi Acara' : 'Tambah Sesi Acara'}
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
              Nama Sesi Acara *
            </label>
            <input
              name="title"
              required
              defaultValue={editingRundownItem?.title || ''}
              placeholder="Contoh: Ijab Qabul & Pembacaan Shighat..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Jam Mulai *</label>
              <input
                name="time_start"
                required
                defaultValue={editingRundownItem?.time_start || '08:00'}
                placeholder="08:00"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Jam Selesai</label>
              <input
                name="time_end"
                defaultValue={editingRundownItem?.time_end || '09:00'}
                placeholder="09:00"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Penanggung Jawab (PIC)
            </label>
            <input
              name="pic"
              defaultValue={editingRundownItem?.pic || ''}
              placeholder="Contoh: Aegg, Peppaa, WO, Kakak..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Catatan / Checklist Sesi</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={editingRundownItem?.notes || ''}
              placeholder="Rincian checklist, persiapan mikrofon, mahar..."
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Sesi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
