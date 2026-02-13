'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PortfolioLink, PortfolioCategory } from '@/types'

export async function getPortfolioLinks(): Promise<PortfolioLink[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('portfolio_links')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching portfolio links:', error)
    return []
  }

  return data || []
}

export async function createPortfolioLink(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as PortfolioCategory
  const icon = formData.get('icon') as string

  if (!title || !url) {
    return { error: 'Title and URL are required' }
  }

  const { error } = await supabase.from('portfolio_links').insert({
    user_id: user.id,
    title,
    url,
    description: description || null,
    category: category || 'other',
    icon: icon || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/portfolio')
  return { success: true }
}

export async function updatePortfolioLink(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const url = formData.get('url') as string
  const description = formData.get('description') as string
  const category = formData.get('category') as PortfolioCategory
  const icon = formData.get('icon') as string

  const { error } = await supabase
    .from('portfolio_links')
    .update({
      title,
      url,
      description: description || null,
      category: category || 'other',
      icon: icon || null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/portfolio')
  return { success: true }
}

export async function deletePortfolioLink(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('portfolio_links')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/portfolio')
  return { success: true }
}
