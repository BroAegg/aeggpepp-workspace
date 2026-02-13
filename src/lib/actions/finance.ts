'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Transaction, Budget, TransactionType, BudgetPeriod } from '@/types'

// ============== TRANSACTIONS ==============

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('*, profiles:user_id(display_name, role)')
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data || []
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as TransactionType
  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string

  if (!type || !category || !amount) {
    return { error: 'Type, category, and amount are required' }
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type,
    category,
    amount,
    description: description || null,
    date: date || new Date().toISOString().split('T')[0],
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as TransactionType
  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string

  const { error } = await supabase
    .from('transactions')
    .update({
      type,
      category,
      amount,
      description: description || null,
      date,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

// ============== BUDGETS ==============

export async function getBudgets(): Promise<Budget[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('category', { ascending: true })

  if (error) {
    console.error('Error fetching budgets:', error)
    return []
  }

  return data || []
}

export async function createBudget(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const period = (formData.get('period') as BudgetPeriod) || 'monthly'

  if (!category || !amount) {
    return { error: 'Category and amount are required' }
  }

  // Check if budget already exists for this category
  const { data: existing } = await supabase
    .from('budgets')
    .select('id')
    .eq('user_id', user.id)
    .eq('category', category)
    .single()

  if (existing) {
    // Update existing budget
    const { error } = await supabase
      .from('budgets')
      .update({ amount, period })
      .eq('id', existing.id)

    if (error) {
      return { error: error.message }
    }
  } else {
    // Create new budget
    const { error } = await supabase.from('budgets').insert({
      user_id: user.id,
      category,
      amount,
      period,
    })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/finance')
  return { success: true }
}

export async function updateBudget(id: string, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const period = (formData.get('period') as BudgetPeriod) || 'monthly'

  const { error } = await supabase
    .from('budgets')
    .update({ category, amount, period })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

export async function deleteBudget(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}
