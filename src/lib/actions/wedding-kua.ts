'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WeddingKuaChecklistItem } from '@/types'

const DEFAULT_KUA_DOCUMENTS = [
  {
    document_name: 'Surat Pengantar Nikah (Model N1)',
    description: 'Surat pengantar nikah dari RT/RW dan Kelurahan domisili masing-masing calon pengantin.',
    position: 1,
  },
  {
    document_name: 'Surat Permohonan Kehendak Nikah (Model N2)',
    description: 'Surat resmi pemberitahuan dan permohonan kehendak nikah di KUA.',
    position: 2,
  },
  {
    document_name: 'Surat Persetujuan Mempelai (Model N4)',
    description: 'Surat persetujuan tertulis yang ditandatangani oleh kedua calon mempelai.',
    position: 3,
  },
  {
    document_name: 'Fotokopi KTP, KK, & Akta Kelahiran',
    description: 'Fotokopi KTP elektronik, Kartu Keluarga, dan Akta Kelahiran asli & legalisir.',
    position: 4,
  },
  {
    document_name: 'Fotokopi Ijazah Terakhir',
    description: 'Fotokopi ijazah SD/SMP/SMA/S1 untuk pencocokan data nama dan tanggal lahir.',
    position: 5,
  },
  {
    document_name: 'Surat Keterangan Sehat & Sertifikat Elsimil / Imunisasi TT',
    description: 'Pemeriksaan kesehatan catin di Puskesmas, tes darah, dan sertifikat vaksinasi TT (calon pengantin wanita).',
    position: 6,
  },
  {
    document_name: 'Pasfoto 2x3 (4 Lembar) & 4x6 (2 Lembar) Latar Biru',
    description: 'Foto formal berlatar belakang biru dengan pakaian rapi / berkerah (dan jilbab/busana sopan).',
    position: 7,
  },
  {
    document_name: 'Rekomendasi Nikah (Jika Menikah di Luar Kecamatan)',
    description: 'Surat numpang nikah dari KUA asal jika akad nikah diselenggarakan di luar kecamatan domisili.',
    position: 8,
  },
]

export async function getKuaChecklist(): Promise<WeddingKuaChecklistItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wedding_kua_checklist')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching KUA checklist:', error)
    return []
  }

  // If table is empty, auto-seed default KUA documents
  if (!data || data.length === 0) {
    const seedPayload = DEFAULT_KUA_DOCUMENTS.map((doc) => ({
      ...doc,
      user_id: user.id,
      is_completed_aegg: false,
      is_completed_peppaa: false,
    }))

    const { data: seeded, error: seedError } = await supabase
      .from('wedding_kua_checklist')
      .insert(seedPayload)
      .select('*')
      .order('position', { ascending: true })

    if (seedError) {
      console.error('Failed to seed KUA checklist:', seedError)
      return []
    }
    return (seeded || []) as WeddingKuaChecklistItem[]
  }

  return data as WeddingKuaChecklistItem[]
}

export async function toggleKuaItem(
  id: string,
  person: 'aegg' | 'peppaa',
  completed: boolean
) {
  const supabase = await createClient()
  const fieldName = person === 'aegg' ? 'is_completed_aegg' : 'is_completed_peppaa'

  const { error } = await supabase
    .from('wedding_kua_checklist')
    .update({ [fieldName]: completed })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/wedding')
  return { success: true }
}

export async function updateKuaItemNotes(id: string, notes: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('wedding_kua_checklist')
    .update({ notes: notes.trim() || null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/wedding')
  return { success: true }
}
