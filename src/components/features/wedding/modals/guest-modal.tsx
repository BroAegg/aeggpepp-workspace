'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WeddingGuest, WeddingGuestGroup } from '@/types'

interface GuestModalProps {
  isOpen: boolean
  onClose: () => void
  editingGuest: WeddingGuest | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  isSubmitting: boolean
  guestGroupConfig: Record<WeddingGuestGroup, { label: string; color: string }>
}

export function GuestModal({
  isOpen,
  onClose,
  editingGuest,
  onSubmit,
  isSubmitting,
  guestGroupConfig,
}: GuestModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {editingGuest ? 'Edit Tamu Undangan' : 'Tambah Tamu Undangan'}
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
              Nama Tamu / Keluarga *
            </label>
            <input
              name="name"
              required
              defaultValue={editingGuest?.name || ''}
              placeholder="Contoh: Om Joko & Tante Rina..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Kelompok</label>
              <select
                name="group_type"
                defaultValue={editingGuest?.group_type || 'family_aegg'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(guestGroupConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Jumlah Pax</label>
              <input
                type="number"
                min="1"
                name="pax"
                defaultValue={editingGuest?.pax || 1}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Status RSVP</label>
              <select
                name="rsvp_status"
                defaultValue={editingGuest?.rsvp_status || 'pending'}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="attending">Hadir</option>
                <option value="pending">Menunggu</option>
                <option value="declined">Berhalangan</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">No WhatsApp</label>
              <input
                name="phone"
                defaultValue={editingGuest?.phone || ''}
                placeholder="0812xxxx"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Catatan Tambahan</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingGuest?.notes || ''}
              placeholder="Perlu kirim undangan fisik / titip kado..."
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Tamu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
