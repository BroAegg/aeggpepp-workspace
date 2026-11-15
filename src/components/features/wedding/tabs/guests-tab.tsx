'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Plus,
  Phone,
  Edit2,
  Trash2,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { exportWeddingGuestsToCsv } from '@/lib/export-utils'
import type { WeddingGuest, WeddingRsvpStatus } from '@/types'
import {
  TARGET_PAX,
  GUEST_GROUP_CONFIG,
  RSVP_CONFIG,
  cleanPhoneForWa,
} from '../wedding-config'

interface GuestsTabProps {
  guests: WeddingGuest[]
  onAddGuest: () => void
  onEditGuest: (guest: WeddingGuest) => void
  onDeleteGuest: (id: string) => void
  onToggleRsvp: (guestId: string, currentStatus: WeddingRsvpStatus) => void
}

export function GuestsTab({
  guests,
  onAddGuest,
  onEditGuest,
  onDeleteGuest,
  onToggleRsvp,
}: GuestsTabProps) {
  const [guestSearch, setGuestSearch] = useState('')
  const [guestGroupFilter, setGuestGroupFilter] = useState<string>('all')
  const [guestRsvpFilter, setGuestRsvpFilter] = useState<string>('all')

  const guestStats = useMemo(() => {
    let totalPax = 0
    let confirmedPax = 0
    let pendingPax = 0
    let declinedPax = 0

    guests.forEach((g) => {
      const p = g.pax || 1
      totalPax += p
      if (g.rsvp_status === 'attending') confirmedPax += p
      else if (g.rsvp_status === 'pending') pendingPax += p
      else if (g.rsvp_status === 'declined') declinedPax += p
    })

    return { totalPax, confirmedPax, pendingPax, declinedPax }
  }, [guests])

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      const matchSearch =
        g.name.toLowerCase().includes(guestSearch.toLowerCase()) ||
        (g.phone && g.phone.includes(guestSearch))
      const matchGroup = guestGroupFilter === 'all' || g.group_type === guestGroupFilter
      const matchRsvp = guestRsvpFilter === 'all' || g.rsvp_status === guestRsvpFilter
      return matchSearch && matchGroup && matchRsvp
    })
  }, [guests, guestSearch, guestGroupFilter, guestRsvpFilter])

  return (
    <div className="space-y-6">
      {/* Guest Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Target Kehadiran
          </span>
          <div className="text-2xl font-bold text-foreground">{TARGET_PAX} Pax</div>
          <div className="text-xs text-muted-foreground">
            Terdata: {guestStats.totalPax} Pax (
            {Math.min(100, Math.round((guestStats.totalPax / TARGET_PAX) * 100))}% kuota)
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Konfirmasi Hadir
          </span>
          <div className="text-2xl font-bold text-emerald-500">{guestStats.confirmedPax} Pax</div>
          <div className="text-xs text-muted-foreground">
            {Math.round((guestStats.confirmedPax / TARGET_PAX) * 100)}% dari target {TARGET_PAX}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Menunggu Konfirmasi
          </span>
          <div className="text-2xl font-bold text-amber-500">{guestStats.pendingPax} Pax</div>
          <div className="text-xs text-muted-foreground">Perlu di-follow up</div>
        </div>

        <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-1 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Berhalangan
          </span>
          <div className="text-2xl font-bold text-rose-500">{guestStats.declinedPax} Pax</div>
          <div className="text-xs text-muted-foreground">Tidak dapat hadir</div>
        </div>
      </div>

      {/* 180 Pax Capacity Progress Bar */}
      <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xs space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" /> Pengisian Kuota Kehadiran ({TARGET_PAX} Pax)
          </span>
          <span className="text-muted-foreground">
            <strong className="text-emerald-500">{guestStats.confirmedPax}</strong> hadir / {TARGET_PAX} pax target (
            {Math.round((guestStats.confirmedPax / TARGET_PAX) * 100)}%)
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (guestStats.confirmedPax / TARGET_PAX) * 100)}%` }}
            title={`Hadir: ${guestStats.confirmedPax} Pax`}
          />
          <div
            className="bg-amber-500/80 h-full transition-all duration-300"
            style={{
              width: `${Math.min(
                100 - (guestStats.confirmedPax / TARGET_PAX) * 100,
                (guestStats.pendingPax / TARGET_PAX) * 100
              )}%`,
            }}
            title={`Menunggu: ${guestStats.pendingPax} Pax`}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-0.5 gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Pasti Hadir (
            {guestStats.confirmedPax} Pax)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Menunggu Konfirmasi (
            {guestStats.pendingPax} Pax)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Berhalangan (
            {guestStats.declinedPax} Pax)
          </span>
          <span className="flex items-center gap-1 font-medium text-foreground">
            <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> Sisa Kuota (
            {Math.max(0, TARGET_PAX - guestStats.confirmedPax)} Pax)
          </span>
        </div>
      </div>

      {/* Filter Bar & Action */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama tamu / no hp..."
            value={guestSearch}
            onChange={(e) => setGuestSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={guestGroupFilter}
            onChange={(e) => setGuestGroupFilter(e.target.value)}
            className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Kelompok</option>
            {Object.entries(GUEST_GROUP_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          <select
            value={guestRsvpFilter}
            onChange={(e) => setGuestRsvpFilter(e.target.value)}
            className="bg-background border border-border text-xs rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Status RSVP</option>
            <option value="attending">Hadir</option>
            <option value="pending">Menunggu</option>
            <option value="declined">Berhalangan</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => exportWeddingGuestsToCsv(filteredGuests)}
            className="rounded-xl shrink-0 text-xs"
            title="Download Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export Excel
          </Button>

          <Button onClick={onAddGuest} size="sm" className="rounded-xl shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Tamu
          </Button>
        </div>
      </div>

      {/* Guest Table */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Tamu</th>
                <th className="py-3 px-4">Kelompok</th>
                <th className="py-3 px-4 text-center">Pax</th>
                <th className="py-3 px-4">Kontak / WA</th>
                <th className="py-3 px-4">RSVP Status</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                    Belum ada daftar tamu yang cocok.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => {
                  const groupCfg =
                    GUEST_GROUP_CONFIG[guest.group_type] || GUEST_GROUP_CONFIG.family_aegg
                  const rsvpCfg = RSVP_CONFIG[guest.rsvp_status] || RSVP_CONFIG.pending
                  const RsvpIcon = rsvpCfg.icon

                  return (
                    <tr key={guest.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground text-xs sm:text-sm">
                        {guest.name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                            groupCfg.color
                          )}
                        >
                          {groupCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-secondary text-xs">
                          {guest.pax || 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {guest.phone ? (
                          <a
                            href={`https://wa.me/${cleanPhoneForWa(guest.phone)}?text=${encodeURIComponent(
                              `Halo ${guest.name}, kami mengundang Anda untuk menghadiri pernikahan kami. Mohon konfirmasi kehadirannya ya!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-500 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {guest.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onToggleRsvp(guest.id, guest.rsvp_status)}
                          className={cn(
                            'text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer',
                            rsvpCfg.color
                          )}
                          title="Klik untuk ubah status RSVP (0ms)"
                        >
                          <RsvpIcon className="w-3.5 h-3.5" />
                          {rsvpCfg.label}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {guest.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditGuest(guest)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                            title="Edit tamu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteGuest(guest.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                            title="Hapus tamu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
