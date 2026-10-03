'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type {
  WeddingBudgetItem,
  WeddingCategory,
  WeddingItemStatus,
  WeddingGuest,
  WeddingGuestGroup,
  WeddingRsvpStatus,
  WeddingRundownItem,
} from '@/types'

// Default template for Rp 25.000.000 wedding (180 pax scale)
const DEFAULT_25JT_TEMPLATE = [
  {
    category: 'kua' as WeddingCategory,
    title: 'KUA & Administrasi Nikah',
    estimated_cost: 1000000,
    notes: 'Biaya nikah luar kantor KUA (Rp 600rb) + berkas kelurahan, surat sehat & materai',
  },
  {
    category: 'venue' as WeddingCategory,
    title: 'Tempat Akad & Ramah Tamah (Venue)',
    estimated_cost: 3500000,
    notes: 'Aula masjid agung / gedung serbaguna terjangkau / private resto',
  },
  {
    category: 'catering' as WeddingCategory,
    title: 'Katering / Konsumsi (180 Pax)',
    estimated_cost: 11700000,
    notes: '180 pax × Rp 65.000 (Paket prasmanan hemat / semi-buffet)',
  },
  {
    category: 'attire_mua' as WeddingCategory,
    title: 'MUA, Hijabdo & Busana Pengantin',
    estimated_cost: 3200000,
    notes: 'Rias & busana pengantin akad/resepsi + rias & kain ibu bapak',
  },
  {
    category: 'documentation' as WeddingCategory,
    title: 'Dokumentasi (Foto & Video Highlight)',
    estimated_cost: 2200000,
    notes: '1 fotografer + 1 videografer liputan acara + 1 min video reels',
  },
  {
    category: 'ring' as WeddingCategory,
    title: 'Cincin Kawin (Sepasang)',
    estimated_cost: 2000000,
    notes: 'Sepasang cincin emas/palladium/perak simple & box cincin',
  },
  {
    category: 'decor' as WeddingCategory,
    title: 'Dekorasi Minimalis Backdrop Akad',
    estimated_cost: 800000,
    notes: 'Backdrop bunga aesthetic, meja akad, 4 kursi & welcome sign',
  },
  {
    category: 'invitation_souvenir' as WeddingCategory,
    title: 'Undangan Digital & Souvenir (180 pcs)',
    estimated_cost: 600000,
    notes: 'Website undangan digital (Rp 100rb) + souvenir 180 pcs @ Rp 2.700',
  },
]

// ==========================================
// 1. BUDGET & VENDOR SERVER ACTIONS
// ==========================================

export async function getWeddingBudgetItems(): Promise<WeddingBudgetItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wedding_budget_items')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching wedding budget items:', error)
    return []
  }

  // Auto-seed default 25jt template if empty
  if (!data || data.length === 0) {
    const toInsert = DEFAULT_25JT_TEMPLATE.map((item) => ({
      user_id: user.id,
      category: item.category,
      title: item.title,
      estimated_cost: item.estimated_cost,
      actual_cost: 0,
      paid_amount: 0,
      status: 'planned' as WeddingItemStatus,
      notes: item.notes,
    }))

    const { data: seeded, error: seedError } = await supabase
      .from('wedding_budget_items')
      .insert(toInsert)
      .select('*, profiles:user_id(display_name, role)')

    if (!seedError && seeded) {
      return seeded as WeddingBudgetItem[]
    }
  }

  return (data || []) as WeddingBudgetItem[]
}

export async function createWeddingBudgetItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string)?.trim()
  const category = (formData.get('category') as WeddingCategory) || 'other'
  const estimated_cost = parseFloat((formData.get('estimated_cost') as string) || '0')
  const actual_cost = parseFloat((formData.get('actual_cost') as string) || '0')
  const paid_amount = parseFloat((formData.get('paid_amount') as string) || '0')
  const status = (formData.get('status') as WeddingItemStatus) || 'planned'
  const due_date = (formData.get('due_date') as string) || null
  const vendor_name = (formData.get('vendor_name') as string)?.trim() || null
  const vendor_contact = (formData.get('vendor_contact') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!title) return { error: 'Judul pos pengeluaran wajib diisi' }

  const { data, error } = await supabase
    .from('wedding_budget_items')
    .insert({
      user_id: user.id,
      title,
      category,
      estimated_cost,
      actual_cost,
      paid_amount,
      status,
      due_date,
      vendor_name,
      vendor_contact,
      notes,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating wedding budget item:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true, id: data?.id }
}

export async function updateWeddingBudgetItem(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string)?.trim()
  const category = (formData.get('category') as WeddingCategory) || 'other'
  const estimated_cost = parseFloat((formData.get('estimated_cost') as string) || '0')
  const actual_cost = parseFloat((formData.get('actual_cost') as string) || '0')
  const paid_amount = parseFloat((formData.get('paid_amount') as string) || '0')
  const status = (formData.get('status') as WeddingItemStatus) || 'planned'
  const due_date = (formData.get('due_date') as string) || null
  const vendor_name = (formData.get('vendor_name') as string)?.trim() || null
  const vendor_contact = (formData.get('vendor_contact') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!title) return { error: 'Judul pos pengeluaran wajib diisi' }

  const { error } = await supabase
    .from('wedding_budget_items')
    .update({
      title,
      category,
      estimated_cost,
      actual_cost,
      paid_amount,
      status,
      due_date,
      vendor_name,
      vendor_contact,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating wedding budget item:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}

export async function deleteWeddingBudgetItem(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('wedding_budget_items').delete().eq('id', id)

  if (error) {
    console.error('Error deleting wedding budget item:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}

// ==========================================
// 2. GUEST LIST SERVER ACTIONS
// ==========================================

export async function getWeddingGuests(): Promise<WeddingGuest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wedding_guests')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching wedding guests:', error)
    return []
  }

  return (data || []) as WeddingGuest[]
}

export async function createWeddingGuest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const group_type = (formData.get('group_type') as WeddingGuestGroup) || 'family_aegg'
  const pax = parseInt((formData.get('pax') as string) || '1', 10)
  const rsvp_status = (formData.get('rsvp_status') as WeddingRsvpStatus) || 'pending'
  const phone = (formData.get('phone') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!name) return { error: 'Nama tamu wajib diisi' }

  const { data, error } = await supabase
    .from('wedding_guests')
    .insert({
      user_id: user.id,
      name,
      group_type,
      pax: Math.max(1, pax),
      rsvp_status,
      phone,
      notes,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating wedding guest:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true, id: data?.id }
}

export async function updateWeddingGuestRsvp(id: string, rsvp_status: WeddingRsvpStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('wedding_guests')
    .update({ rsvp_status })
    .eq('id', id)

  if (error) {
    console.error('Error updating wedding guest RSVP:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}

export async function updateWeddingGuest(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const group_type = (formData.get('group_type') as WeddingGuestGroup) || 'family_aegg'
  const pax = parseInt((formData.get('pax') as string) || '1', 10)
  const rsvp_status = (formData.get('rsvp_status') as WeddingRsvpStatus) || 'pending'
  const phone = (formData.get('phone') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!name) return { error: 'Nama tamu wajib diisi' }

  const { error } = await supabase
    .from('wedding_guests')
    .update({
      name,
      group_type,
      pax: Math.max(1, pax),
      rsvp_status,
      phone,
      notes,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating wedding guest:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}

export async function deleteWeddingGuest(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('wedding_guests').delete().eq('id', id)

  if (error) {
    console.error('Error deleting wedding guest:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}

// ==========================================
// 3. RUNDOWN SERVER ACTIONS
// ==========================================

export async function getWeddingRundown(): Promise<WeddingRundownItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wedding_rundown')
    .select('*, profiles:user_id(display_name, role)')
    .order('time_start', { ascending: true })

  if (error) {
    console.error('Error fetching wedding rundown:', error)
    return []
  }

  return (data || []) as WeddingRundownItem[]
}

export async function createWeddingRundownItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string)?.trim()
  const time_start = (formData.get('time_start') as string)?.trim()
  const time_end = (formData.get('time_end') as string)?.trim() || null
  const pic = (formData.get('pic') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!title || !time_start) return { error: 'Judul sesi & jam mulai wajib diisi' }

  const { data, error } = await supabase
    .from('wedding_rundown')
    .insert({
      user_id: user.id,
      title,
      time_start,
      time_end,
      pic,
      notes,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating wedding rundown item:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true, id: data?.id }
}

export async function updateWeddingRundownItem(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = (formData.get('title') as string)?.trim()
  const time_start = (formData.get('time_start') as string)?.trim()
  const time_end = (formData.get('time_end') as string)?.trim() || null
  const pic = (formData.get('pic') as string)?.trim() || null
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!title || !time_start) return { error: 'Judul sesi & jam mulai wajib diisi' }

  const { error } = await supabase
    .from('wedding_rundown')
    .update({
      title,
      time_start,
      time_end,
      pic,
      notes,
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating wedding rundown item:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}

export async function deleteWeddingRundownItem(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('wedding_rundown').delete().eq('id', id)

  if (error) {
    console.error('Error deleting wedding rundown item:', error)
    return { error: error.message }
  }

  revalidatePath('/wedding')
  return { success: true }
}
