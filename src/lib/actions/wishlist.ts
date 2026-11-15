'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import type { WishlistItem, Priority } from '@/types'

export async function getWishlistItems(): Promise<WishlistItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get own items + shared items from partner (filter out unpurchased surprise gifts from partner)
  const { data, error } = await supabase
    .from('wishlist')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching wishlist:', error)
    return []
  }

  // Filter items: show if own item OR (shared AND not a secret surprise from partner unless already purchased)
  const filtered = (data || []).filter((item: any) => {
    if (item.user_id === user.id) return true
    if (item.is_shared === false) return false
    if (item.is_surprise && !item.is_purchased) return false
    return true
  })

  return filtered as WishlistItem[]
}

export async function createWishlistItem(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const price = parseFloat(formData.get('price') as string) || null
  const currency = (formData.get('currency') as string) || 'IDR'
  const url = formData.get('url') as string
  const imageUrl = formData.get('image_url') as string
  const priority = (formData.get('priority') as Priority) || 'medium'
  const is_surprise = formData.get('is_surprise') === 'true'
  const is_shared = formData.get('is_shared') !== 'false'

  if (!title) {
    return { error: 'Title is required' }
  }

  const payload: any = {
    user_id: user.id,
    title,
    price,
    currency,
    url: url || null,
    image_url: imageUrl || null,
    priority,
    is_purchased: false,
    is_shared,
    is_surprise,
  }

  let { error } = await supabase.from('wishlist').insert(payload)

  // Defensive fallback if is_surprise column is not yet present
  if (error && error.message?.includes('is_surprise')) {
    delete payload.is_surprise
    const retry = await supabase.from('wishlist').insert(payload)
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  logActivity('add_wishlist', 'Wishlist', { title }).catch(() => {})

  revalidatePath('/wishlist')
  return { success: true }
}

export async function updateWishlistItem(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const price = parseFloat(formData.get('price') as string) || null
  const currency = (formData.get('currency') as string) || 'IDR'
  const url = formData.get('url') as string
  const imageUrl = formData.get('image_url') as string
  const priority = (formData.get('priority') as Priority) || 'medium'
  const is_surprise = formData.get('is_surprise') === 'true'
  const is_shared = formData.get('is_shared') !== 'false'

  const payload: any = {
    title,
    price,
    currency,
    url: url || null,
    image_url: imageUrl || null,
    priority,
    is_shared,
    is_surprise,
  }

  let { error } = await supabase
    .from('wishlist')
    .update(payload)
    .eq('id', id)

  if (error && error.message?.includes('is_surprise')) {
    delete payload.is_surprise
    const retry = await supabase.from('wishlist').update(payload).eq('id', id)
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/wishlist')
  return { success: true }
}

export async function toggleWishlistPurchased(id: string, isPurchased: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Allow toggling purchased status for own items OR shared items
  const { data: item } = await supabase
    .from('wishlist')
    .select('user_id, is_shared')
    .eq('id', id)
    .single()

  if (!item) return { error: 'Item not found' }
  if (item.user_id !== user.id && !item.is_shared) {
    return { error: 'Not authorized' }
  }

  const { error } = await supabase
    .from('wishlist')
    .update({ is_purchased: isPurchased })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  if (isPurchased) {
    logActivity('purchase_wishlist', 'Wishlist', { wishlistId: id }).catch(() => {})
  }

  revalidatePath('/wishlist')
  return { success: true }
}

export async function toggleWishlistShared(id: string, isShared: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('wishlist')
    .update({ is_shared: isShared })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/wishlist')
  return { success: true }
}

export async function deleteWishlistItem(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/wishlist')
  return { success: true }
}
