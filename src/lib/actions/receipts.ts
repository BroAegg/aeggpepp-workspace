'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ReceiptItem } from '@/types'

/**
 * Fetch line items for a specific receipt / transaction
 */
export async function getReceiptItems(transactionId: string): Promise<ReceiptItem[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('receipt_items')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })

    if (error) {
      // Table might not exist yet if migration hasn't been run
      console.warn('Warning fetching receipt_items (table might need migration):', error.message)
      return []
    }

    return (data as ReceiptItem[]) || []
  } catch (err) {
    console.error('Unexpected error fetching receipt items:', err)
    return []
  }
}

/**
 * Save / insert line items for a transaction
 */
export async function saveReceiptItems(
  transactionId: string,
  items: Array<{
    item_name: string
    quantity: number
    unit_price?: number | null
    total_price: number
    category?: string | null
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    if (!items || items.length === 0) {
      return { success: true }
    }

    const rowsToInsert = items.map((item) => ({
      transaction_id: transactionId,
      item_name: item.item_name,
      quantity: item.quantity || 1,
      unit_price: item.unit_price ?? null,
      total_price: item.total_price,
      category: item.category || null,
    }))

    const { error } = await supabase.from('receipt_items').insert(rowsToInsert)

    if (error) {
      console.error('Error saving receipt items:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/finance')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan item struk' }
  }
}

/**
 * Upload receipt image directly via Web and link to transaction
 */
export async function uploadReceiptDirect(formData: FormData): Promise<{
  success: boolean
  receipt_url?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const transactionId = formData.get('transaction_id') as string
    const file = formData.get('receipt_file') as File | null

    if (!transactionId || !file) {
      return { success: false, error: 'File atau ID transaksi tidak ditemukan' }
    }

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      return { success: false, error: 'Ukuran foto struk maksimal 8MB' }
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${user.id}/${transactionId}_${Date.now()}.${ext}`

    // Upload to receipts bucket
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error for receipt:', uploadError)
      return { success: false, error: `Gagal upload gambar: ${uploadError.message}` }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    const receiptUrl = publicUrlData?.publicUrl || null

    if (receiptUrl) {
      // Update transaction receipt_url and source
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          receipt_url: receiptUrl,
          source: 'web',
        })
        .eq('id', transactionId)

      if (updateError) {
        console.error('Error updating transaction with receipt_url:', updateError)
      }
    }

    revalidatePath('/finance')
    return { success: true, receipt_url: receiptUrl || undefined }
  } catch (err: any) {
    console.error('Direct receipt upload error:', err)
    return { success: false, error: err?.message || 'Terjadi kesalahan saat upload struk' }
  }
}

/**
 * Delete a specific line item from a receipt
 */
export async function deleteReceiptItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('receipt_items').delete().eq('id', itemId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/finance')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghapus item struk' }
  }
}
