'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { GalleryItem } from '@/types'

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('gallery')
    .select('*, profiles:user_id(display_name, role)')
    .order('taken_at', { ascending: false })

  if (error) {
    console.error('Error fetching gallery:', error)
    return []
  }

  return data || []
}

export async function createGalleryItem(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  const caption = formData.get('caption') as string
  const takenAt = formData.get('taken_at') as string

  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  // Validate file type and size
  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are allowed' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'File size must be under 10MB' }
  }

  // Upload to Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('gallery')
    .upload(fileName, file)

  if (uploadError) {
    return { error: uploadError.message }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('gallery')
    .getPublicUrl(fileName)

  // Insert into gallery table
  const { error: insertError } = await supabase.from('gallery').insert({
    user_id: user.id,
    image_url: urlData.publicUrl,
    caption: caption || null,
    taken_at: takenAt || null,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath('/gallery')
  return { success: true }
}

export async function updateGalleryItem(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const caption = formData.get('caption') as string
  const takenAt = formData.get('taken_at') as string

  const { error } = await supabase
    .from('gallery')
    .update({
      caption: caption || null,
      taken_at: takenAt || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/gallery')
  return { success: true }
}

export async function deleteGalleryItem(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the item first to delete from storage
  const { data: item } = await supabase
    .from('gallery')
    .select('image_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (item) {
    // Extract file path from URL and delete from storage
    const url = new URL(item.image_url)
    const pathParts = url.pathname.split('/storage/v1/object/public/gallery/')
    if (pathParts[1]) {
      await supabase.storage.from('gallery').remove([pathParts[1]])
    }
  }

  const { error } = await supabase
    .from('gallery')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/gallery')
  return { success: true }
}

export async function toggleGalleryLike(id: string, liked: boolean) {
  // Note: likes are stored client-side for now
  // Could add a likes table later for persistence
  revalidatePath('/gallery')
  return { success: true, liked }
}
