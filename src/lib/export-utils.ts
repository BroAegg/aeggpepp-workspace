'use client'

import type { Transaction, WeddingGuest } from '@/types'

/**
 * Downloads tabular data as an Excel-compatible CSV file with UTF-8 BOM.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const headerLine = headers.map(escapeCell).join(',')
  const bodyLines = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const csvContent = `\uFEFF${headerLine}\r\n${bodyLines}`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports financial transactions to an Excel-friendly CSV
 */
export function exportTransactionsToCsv(transactions: Transaction[], monthLabel: string = 'All') {
  const headers = [
    'Tanggal',
    'Tipe',
    'Kategori',
    'Sub Judul / Label',
    'Deskripsi',
    'Nominal (IDR)',
    'Pembayar',
    'Patungan (Split)',
    'Status Pelunasan',
    'Sumber',
  ]

  const rows = transactions.map((t) => [
    t.date,
    t.type.toUpperCase(),
    t.category,
    t.sub_title || '-',
    t.description || '-',
    t.amount,
    (t.profiles?.display_name || t.paid_by || 'Unknown'),
    t.is_split ? 'Ya (50:50)' : 'Tidak',
    t.is_settlement ? 'Pelunasan Settlement' : t.is_settled ? 'Lunas' : 'Belum',
    t.source || 'Web',
  ])

  const dateStr = new Date().toISOString().split('T')[0]
  downloadCsv(`AeggPepp_Keuangan_${monthLabel}_${dateStr}`, headers, rows)
}

/**
 * Exports wedding guest list to an Excel-friendly CSV
 */
export function exportWeddingGuestsToCsv(guests: WeddingGuest[]) {
  const headers = [
    'Nama Tamu',
    'Kelompok / Rombongan',
    'Jumlah Pax',
    'Status RSVP',
    'Nomor WhatsApp / HP',
    'Catatan Khusus',
    'Tanggal Ditambahkan',
  ]

  const groupLabels: Record<string, string> = {
    family_aegg: 'Keluarga Aegg',
    family_peppaa: 'Keluarga Peppaa',
    friends_aegg: 'Teman Aegg',
    friends_peppaa: 'Teman Peppaa',
    vip: 'VIP',
    other: 'Lainnya',
  }

  const rsvpLabels: Record<string, string> = {
    attending: 'Hadir (Confirmed)',
    pending: 'Menunggu Konfirmasi',
    declined: 'Tidak Hadir',
  }

  const rows = guests.map((g) => [
    g.name,
    groupLabels[g.group_type] || g.group_type,
    g.pax,
    rsvpLabels[g.rsvp_status] || g.rsvp_status,
    g.phone || '-',
    g.notes || '-',
    g.created_at ? g.created_at.split('T')[0] : '-',
  ])

  const dateStr = new Date().toISOString().split('T')[0]
  downloadCsv(`AeggPepp_Daftar_Tamu_Wedding_${dateStr}`, headers, rows)
}
