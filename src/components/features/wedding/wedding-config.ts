import { CheckCircle2, Clock, X } from 'lucide-react'
import type { WeddingCategory, WeddingGuestGroup, WeddingRsvpStatus } from '@/types'

export const TARGET_BUDGET = 25000000 // Rp 25.000.000 Target Anggaran
export const TARGET_PAX = 180 // Skala 180 Pax Undangan Aegg & Peppaa

export const CATEGORY_CONFIG: Record<WeddingCategory, { label: string; color: string; badge: string }> = {
  kua: { label: 'KUA & Berkas', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', badge: 'KUA' },
  venue: { label: 'Venue & Tempat', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', badge: 'Venue' },
  catering: { label: 'Katering / Makan', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', badge: 'Katering' },
  attire_mua: { label: 'MUA & Busana', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20', badge: 'MUA/Busana' },
  documentation: { label: 'Dokumentasi', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', badge: 'Dokumentasi' },
  decor: { label: 'Dekorasi Backdrop', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20', badge: 'Dekorasi' },
  invitation_souvenir: { label: 'Undangan & Souvenir', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', badge: 'Undangan' },
  ring: { label: 'Cincin Kawin', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', badge: 'Cincin' },
  other: { label: 'Lainnya / Cadangan', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20', badge: 'Lainnya' },
}

export const GUEST_GROUP_CONFIG: Record<WeddingGuestGroup, { label: string; color: string }> = {
  family_aegg: { label: 'Keluarga Aegg', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  family_peppaa: { label: 'Keluarga Peppaa', color: 'bg-pink-500/15 text-pink-500 border-pink-500/30' },
  friends_aegg: { label: 'Teman Aegg', color: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30' },
  friends_peppaa: { label: 'Teman Peppaa', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
  vip: { label: 'VIP / Tamu Khusus', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  other: { label: 'Lainnya / Umum', color: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30' },
}

export const RSVP_CONFIG: Record<WeddingRsvpStatus, { label: string; color: string; icon: any }> = {
  attending: { label: 'Hadir', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', icon: CheckCircle2 },
  pending: { label: 'Menunggu', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', icon: Clock },
  declined: { label: 'Berhalangan', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30', icon: X },
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatShort = (amount: number) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`
  return amount.toString()
}

export const cleanPhoneForWa = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  return cleaned
}
