'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import type { GoalPage } from '@/types'

// ============== GOAL PAGES ==============

export async function getGoalPages(goalId: string): Promise<GoalPage[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('goal_pages')
    .select('*')
    .eq('goal_id', goalId)
    .is('parent_page_id', null)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching goal pages:', error)
    return []
  }

  return data || []
}

export async function getGoalPage(pageId: string): Promise<GoalPage | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('goal_pages')
    .select('*')
    .eq('id', pageId)
    .single()

  if (error) {
    console.error('Error fetching goal page:', error)
    return null
  }

  return data
}

export async function getChildPages(parentPageId: string): Promise<GoalPage[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('goal_pages')
    .select('*')
    .eq('parent_page_id', parentPageId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching child pages:', error)
    return []
  }

  return data || []
}

export async function createGoalPage(
  goalId: string,
  title: string = 'Untitled',
  icon?: string,
  parentPageId?: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify goal ownership
  const { data: goal } = await supabase
    .from('goals')
    .select('id, title')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (!goal) {
    return { error: 'Goal not found or not authorized' }
  }

  // Get max position
  const query = supabase
    .from('goal_pages')
    .select('position')
    .eq('goal_id', goalId)
    .order('position', { ascending: false })
    .limit(1)

  if (parentPageId) {
    query.eq('parent_page_id', parentPageId)
  } else {
    query.is('parent_page_id', null)
  }

  const { data: maxPos } = await query.single()
  const position = (maxPos?.position || 0) + 1

  const { data: newPage, error } = await supabase
    .from('goal_pages')
    .insert({
      goal_id: goalId,
      parent_page_id: parentPageId || null,
      title,
      icon: icon || null,
      content: [],
      position,
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  logActivity('create_goal_page', 'Goals', { goalId, title }).catch(() => {})

  revalidatePath('/goals')
  return { success: true, id: newPage.id }
}

export async function updateGoalPage(
  pageId: string,
  updates: {
    title?: string
    icon?: string | null
    content?: any[]
  }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership via parent goal
  const { data: page } = await supabase
    .from('goal_pages')
    .select('goal_id, goals!inner(user_id)')
    .eq('id', pageId)
    .single()

  if (!page || (page as any).goals?.user_id !== user.id) {
    return { error: 'Page not found or not authorized' }
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.icon !== undefined) updateData.icon = updates.icon
  if (updates.content !== undefined) updateData.content = updates.content

  const { error } = await supabase
    .from('goal_pages')
    .update(updateData)
    .eq('id', pageId)

  if (error) {
    return { error: error.message }
  }

  // Only log for title/content changes (not auto-save spam)
  if (updates.title !== undefined) {
    logActivity('update_goal_page', 'Goals', { pageId, title: updates.title }).catch(() => {})
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function deleteGoalPage(pageId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership via parent goal
  const { data: page } = await supabase
    .from('goal_pages')
    .select('title, goal_id, goals!inner(user_id)')
    .eq('id', pageId)
    .single()

  if (!page || (page as any).goals?.user_id !== user.id) {
    return { error: 'Page not found or not authorized' }
  }

  const { error } = await supabase
    .from('goal_pages')
    .delete()
    .eq('id', pageId)

  if (error) {
    return { error: error.message }
  }

  logActivity('delete_goal_page', 'Goals', { title: page.title }).catch(() => {})

  revalidatePath('/goals')
  return { success: true }
}
