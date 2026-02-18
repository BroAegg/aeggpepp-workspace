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
  const sub_title = formData.get('sub_title') as string | null
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const isSplit = formData.get('is_split') === 'true'
  const splitWith = formData.get('split_with') as string | null
  const paidBy = formData.get('paid_by') as string | null
  const isSettled = formData.get('is_settled') === 'true'
  const receiptFile = formData.get('receipt_file') as File

  let receiptUrl = null

  if (!type || !category || !amount) {
    return { error: 'Type, category, and amount are required' }
  }

  // Handle receipt upload
  if (receiptFile && receiptFile.size > 0) {
    if (receiptFile.size > 5 * 1024 * 1024) {
      return { error: 'Receipt file size must be under 5MB' }
    }
    const fileExt = receiptFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile)

    if (uploadError) {
      console.error('Error uploading receipt:', uploadError)
      // Continue without receipt if upload fails? Or return error?
      // Better to return error
      return { error: 'Failed to upload receipt: ' + uploadError.message }
    }

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    receiptUrl = urlData.publicUrl
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type,
    category,
    sub_title: sub_title?.trim() || null,
    amount,
    description: description || null,
    date: date || new Date().toISOString().split('T')[0],
    is_split: isSplit,
    split_with: isSplit ? (splitWith || 'partner') : null, // Default to partner for now
    paid_by: paidBy || user.id,
    is_settled: isSettled,
    receipt_url: receiptUrl,
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
  const sub_title = formData.get('sub_title') as string | null
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const isSplit = formData.get('is_split') === 'true'
  const splitWith = formData.get('split_with') as string | null
  const paidBy = formData.get('paid_by') as string | null
  const isSettled = formData.get('is_settled') === 'true'
  const receiptFile = formData.get('receipt_file') as File

  const updateData: any = {
    type,
    category,
    sub_title: sub_title?.trim() || null,
    amount,
    description: description || null,
    date,
    is_split: isSplit,
    split_with: isSplit ? (splitWith || 'partner') : null,
    paid_by: paidBy || user.id,
    is_settled: isSettled,
  }

  // Handle receipt upload
  if (receiptFile && receiptFile.size > 0) {
    if (receiptFile.size > 5 * 1024 * 1024) {
      return { error: 'Receipt file size must be under 5MB' }
    }
    const fileExt = receiptFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, receiptFile)

    if (uploadError) {
      return { error: 'Failed to upload receipt: ' + uploadError.message }
    }

    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName)

    updateData.receipt_url = urlData.publicUrl
  }

  const { error } = await supabase
    .from('transactions')
    .update(updateData)
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

// ============== BULK TRANSACTION UPLOAD ==============

export interface BulkTransactionItem {
  type: TransactionType
  category: string
  sub_title?: string
  amount: number
  description: string
  date: string
  receipt_url?: string
}

export async function bulkCreateTransactions(items: BulkTransactionItem[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!items.length) return { error: 'No items provided' }

  const rows = items.map((item) => ({
    user_id: user.id,
    type: item.type,
    category: item.category,
    sub_title: item.sub_title?.trim() || null,
    amount: item.amount,
    description: item.description || null,
    date: item.date || new Date().toISOString().split('T')[0],
    is_split: false,
    split_with: null,
    paid_by: user.id,
    is_settled: false,
    receipt_url: item.receipt_url || null,
  }))

  const { error } = await supabase.from('transactions').insert(rows)

  if (error) return { error: error.message }

  revalidatePath('/finance')
  return { success: true, count: rows.length }
}

// ============== TRANSACTION RECAP (by sub_title or date range) ==============

export async function getTransactionRecap(options: {
  sub_title?: string
  startDate?: string
  endDate?: string
  type?: TransactionType
}) {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select('*, profiles:user_id(display_name, role)')
    .order('date', { ascending: false })

  if (options.sub_title) {
    query = query.eq('sub_title', options.sub_title)
  }
  if (options.startDate) {
    query = query.gte('date', options.startDate)
  }
  if (options.endDate) {
    query = query.lte('date', options.endDate)
  }
  if (options.type) {
    query = query.eq('type', options.type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching recap:', error)
    return { data: [], error: error.message }
  }

  const transactions = data || []
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return {
    data: transactions,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    count: transactions.length,
    error: null,
  }
}

export async function getSubTitles(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('transactions')
    .select('sub_title')
    .not('sub_title', 'is', null)
    .order('sub_title', { ascending: true })

  if (error) return []

  const unique = (data || []).map(t => t.sub_title).filter(Boolean).reduce((acc: string[], v) => {
    if (!acc.includes(v as string)) acc.push(v as string)
    return acc
  }, []).sort()
  return unique
}