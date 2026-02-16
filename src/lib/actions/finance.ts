'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Transaction, Budget, TransactionType, BudgetPeriod, SavingsAccount, SavingsTransaction } from '@/types'

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

// ============== SAVINGS ACCOUNTS ==============

export async function getSavingsAccounts(): Promise<SavingsAccount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('savings_accounts')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching savings accounts:', error)
    return []
  }

  return data || []
}

export async function createSavingsAccount(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const type = formData.get('type') as 'cash' | 'digital'
  const bank_code = formData.get('bank_code') as string
  const balance = parseFloat(formData.get('balance') as string) || 0
  const icon = formData.get('icon') as string

  if (!name?.trim()) {
    return { error: 'Name is required' }
  }

  const { error } = await supabase.from('savings_accounts').insert({
    user_id: user.id,
    name: name.trim(),
    type: type || 'cash',
    bank_code: bank_code || null,
    balance,
    icon: icon || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

export async function updateSavingsBalance(accountId: string, amount: number, type: 'deposit' | 'withdraw', description: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get current balance
  const { data: account } = await supabase
    .from('savings_accounts')
    .select('balance')
    .eq('id', accountId)
    .single()

  if (!account) return { error: 'Account not found' }

  const newBalance = type === 'deposit'
    ? account.balance + amount
    : account.balance - amount

  // Update balance
  const { error: updateError } = await supabase
    .from('savings_accounts')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', accountId)

  if (updateError) return { error: updateError.message }

  // Record transaction
  const { error: txError } = await supabase.from('savings_transactions').insert({
    account_id: accountId,
    user_id: user.id,
    amount,
    type,
    description: description || null,
    date: new Date().toISOString().split('T')[0],
  })

  if (txError) return { error: txError.message }

  revalidatePath('/finance')
  return { success: true }
}

export async function deleteSavingsAccount(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('savings_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}