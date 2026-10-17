'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import type { Goal, GoalTask, GoalPage, GoalStatus, Priority } from '@/types'

// ============== GOALS ==============

export async function getGoals(): Promise<Goal[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      goal_tasks(*),
      goal_pages(*),
      profiles:user_id(display_name, role)
    `)
    .order('position', { ascending: true })

  if (error) {
    console.error('Error fetching goals:', error)
    return []
  }

  return data || []
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      goal_tasks(*),
      goal_pages(*),
      profiles:user_id(display_name, role)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching goal:', error)
    return null
  }

  return data
}

export async function createGoal(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const status = (formData.get('status') as GoalStatus) || 'backlog'
  const priority = (formData.get('priority') as Priority) || 'medium'
  const dueDate = formData.get('due_date') as string

  if (!title) {
    return { error: 'Title is required' }
  }

  // Get max position for the status column
  const { data: maxPos } = await supabase
    .from('goals')
    .select('position')
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (maxPos?.position || 0) + 1

  const tag = formData.get('tag') as string

  const { data: newGoal, error } = await supabase.from('goals').insert({
    user_id: user.id,
    title,
    description: description || null,
    status,
    priority,
    position,
    due_date: dueDate || null,
    tag: tag || null,
  }).select('id').single()

  if (error) {
    return { error: error.message }
  }

  logActivity('create_goal', 'Goals', { title }).catch(() => {})

  revalidatePath('/goals')
  return { success: true, id: newGoal.id }
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = (formData.get('priority') as Priority) || 'medium'
  const dueDate = formData.get('due_date') as string

  const tag = formData.get('tag') as string

  const { error } = await supabase
    .from('goals')
    .update({
      title,
      description: description || null,
      priority,
      due_date: dueDate || null,
      tag: tag || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function updateGoalStatus(id: string, status: GoalStatus) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get max position for the new status column
  const { data: maxPos } = await supabase
    .from('goals')
    .select('position')
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (maxPos?.position || 0) + 1

  const { error } = await supabase
    .from('goals')
    .update({ status, position })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  if (status === 'completed') {
    logActivity('complete_goal', 'Goals', { goalId: id }).catch(() => {})
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function updateGoalIcon(id: string, icon: string | null) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .update({ icon })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}

// ============== GOAL TASKS ==============

export async function createGoalTask(goalId: string, title: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify goal exists
  const { data: goal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goalId)
    .single()

  if (!goal) {
    return { error: 'Goal not found' }
  }

  // Get max position
  const { data: maxPos } = await supabase
    .from('goal_tasks')
    .select('position')
    .eq('goal_id', goalId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (maxPos?.position || 0) + 1

  const { error } = await supabase.from('goal_tasks').insert({
    goal_id: goalId,
    title,
    completed: false,
    position,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function toggleGoalTask(taskId: string, completed: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('goal_tasks')
    .update({ completed })
    .eq('id', taskId)

  if (error) {
    console.error('Toggle task error:', error)
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}

export async function deleteGoalTask(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify goal task exists
  const { data: task } = await supabase
    .from('goal_tasks')
    .select('goal_id')
    .eq('id', taskId)
    .single()

  if (!task) {
    return { error: 'Task not found' }
  }

  const { error } = await supabase
    .from('goal_tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/goals')
  return { success: true }
}
