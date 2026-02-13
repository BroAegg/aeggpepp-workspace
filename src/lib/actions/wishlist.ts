'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { WishlistItem, Priority } from '@/types'

export async function getWishlistItems(): Promise<WishlistItem[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get own items + shared items from partner
  const { data, error } = await supabase
    .from('wishlist')
    .select('*, profiles:user_id(display_name, role)')
    .or(`user_id.eq.${user.id},is_shared.eq.true`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching wishlist:', error)
    return []
  }

  return data || []
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
  const isShared = formData.get('is_shared') === 'true'

  if (!title) {
    return { error: 'Title is required' }
  }

  const { error } = await supabase.from('wishlist').insert({
    user_id: user.id,
    title,
    price,
    currency,
    url: url || null,
    image_url: imageUrl || null,
    priority,
    is_purchased: false,
    is_shared: isShared,
  })

  if (error) {
    return { error: error.message }
  }

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
  const isShared = formData.get('is_shared') === 'true'

  const { error } = await supabase
    .from('wishlist')
    .update({
      title,
      price,
      currency,
      url: url || null,
      image_url: imageUrl || null,
      priority,
      is_shared: isShared,
    })
    .eq('id', id)
    .eq('user_id', user.id)

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
    .eq('user_id', user.id)

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
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/wishlist')
  return { success: true }
}
