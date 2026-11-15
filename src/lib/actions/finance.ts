'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import type { Transaction, Budget, TransactionType, BudgetPeriod, SavingsAccount, SavingsTransaction } from '@/types'

// ============== UTILS ==============
export async function getFinanceProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
  if (!profile) return null

  let partnerId = undefined
  if (profile.role === 'aegg' || profile.role === 'peppaa') {
    const partnerRole = profile.role === 'aegg' ? 'peppaa' : 'aegg'
    const { data: partner } = await supabase.from('profiles').select('id').eq('role', partnerRole).single()
    if (partner) partnerId = partner.id
  }

  return { id: user.id, role: profile.role, partnerId }
}

// ============== TRANSACTIONS ==============

export async function getTransactions(userId?: string | 'all'): Promise<Transaction[]> {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select('*, profiles:user_id(display_name, role)')
    .is('deleted_at', null)
    .not('is_settlement', 'is', true)
    .order('date', { ascending: false })

  // If userId is specific string (not 'all' and not undefined), filter by it
  // If undefined, default to current user (legacy behavior, but we should be explicit given the new requirement)
  // Actually, to support "Combined", we want 'all' to NOT filter by user_id.
  // Unless we want to enforce only seeing own + partner? 
  // RLS allows seeing all, so 'all' means all.

  if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
  } else if (!userId) {
    // Default: View own transactions if no arg provided
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      query = query.eq('user_id', user.id)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  const txList = (data || []) as Transaction[]

  // Enrich transactions with account metadata if accounts are linked
  const referencedAccountIds = new Set<string>()
  txList.forEach((t) => {
    if (t.account_id) referencedAccountIds.add(t.account_id)
    if (t.from_account_id) referencedAccountIds.add(t.from_account_id)
    if (t.to_account_id) referencedAccountIds.add(t.to_account_id)
  })

  if (referencedAccountIds.size > 0) {
    const { data: accountsData } = await supabase
      .from('savings_accounts')
      .select('id, name, bank_code')
      .in('id', Array.from(referencedAccountIds))

    if (accountsData) {
      const accMap = new Map(accountsData.map((a) => [a.id, a]))
      txList.forEach((t) => {
        if (t.account_id) t.account = accMap.get(t.account_id) || null
        if (t.from_account_id) t.from_account = accMap.get(t.from_account_id) || null
        if (t.to_account_id) t.to_account = accMap.get(t.to_account_id) || null
      })
    }
  }

  return txList
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const type = formData.get('type') as TransactionType
  const category = (formData.get('category') as string) || (type === 'transfer' ? 'Transfer' : '')
  const sub_title = formData.get('sub_title') as string | null
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const isSplit = formData.get('is_split') === 'true'
  const splitWith = formData.get('split_with') as string | null
  const paidBy = formData.get('paid_by') as string | null
  const isSettled = formData.get('is_settled') === 'true'
  const receiptFile = formData.get('receipt_file') as File
  const idempotencyKey = (formData.get('idempotency_key') as string | null)?.trim() || null
  const accountId = (formData.get('account_id') as string | null)?.trim() || null
  const fromAccountId = (formData.get('from_account_id') as string | null)?.trim() || null
  const toAccountId = (formData.get('to_account_id') as string | null)?.trim() || null

  let receiptUrl = null

  if (!type || !amount) {
    return { error: 'Jenis transaksi dan nominal wajib diisi' }
  }

  if (type === 'transfer') {
    if (!fromAccountId || !toAccountId) {
      return { error: 'Pilih rekening asal dan rekening tujuan untuk transfer' }
    }
    if (fromAccountId === toAccountId) {
      return { error: 'Rekening asal dan tujuan tidak boleh sama' }
    }
  } else if (!category) {
    return { error: 'Kategori transaksi wajib dipilih' }
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
      return { error: 'Failed to upload receipt: ' + uploadError.message }
    }

    receiptUrl = fileName
  }

  const insertPayload: any = {
    user_id: user.id,
    type,
    category: type === 'transfer' ? 'Transfer' : category,
    sub_title: sub_title?.trim() || null,
    amount,
    description: description || null,
    date: date || new Date().toISOString().split('T')[0],
    is_split: false,
    split_with: null,
    paid_by: paidBy || user.id,
    is_settled: false,
    receipt_url: receiptUrl,
    account_id: accountId,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
  }

  if (idempotencyKey) {
    insertPayload.idempotency_key = idempotencyKey
  }

  let { data: insertedData, error } = await supabase
    .from('transactions')
    .insert(insertPayload)
    .select('id')
    .single()

  // Graceful fallback if account columns don't exist yet in DB schema
  if (error && (error.message?.includes('from_account_id') || error.message?.includes('to_account_id') || error.message?.includes('account_id'))) {
    delete insertPayload.account_id
    delete insertPayload.from_account_id
    delete insertPayload.to_account_id
    const retry = await supabase.from('transactions').insert(insertPayload).select('id').single()
    insertedData = retry.data
    error = retry.error
  }

  if (error) {
    // If error is unique constraint violation on idempotency_key (code 23505), treat as idempotent success
    if (error.code === '23505' && idempotencyKey) {
      console.warn(`[Finance] Idempotent retry detected for key: ${idempotencyKey}`)
      return { success: true, idempotent: true }
    }
    return { error: error.message }
  }

  // Dynamic balance synchronization to prevent balance drift
  if (type === 'transfer' && fromAccountId && toAccountId) {
    const { data: fromAcc } = await supabase.from('savings_accounts').select('balance').eq('id', fromAccountId).single()
    if (fromAcc) {
      await supabase.from('savings_accounts').update({ balance: Number(fromAcc.balance) - amount, updated_at: new Date().toISOString() }).eq('id', fromAccountId)
    }
    const { data: toAcc } = await supabase.from('savings_accounts').select('balance').eq('id', toAccountId).single()
    if (toAcc) {
      await supabase.from('savings_accounts').update({ balance: Number(toAcc.balance) + amount, updated_at: new Date().toISOString() }).eq('id', toAccountId)
    }
  } else if (accountId) {
    const { data: acc } = await supabase.from('savings_accounts').select('balance').eq('id', accountId).single()
    if (acc) {
      const delta = type === 'income' ? amount : -amount
      await supabase.from('savings_accounts').update({ balance: Number(acc.balance) + delta, updated_at: new Date().toISOString() }).eq('id', accountId)
    }
  }

  logActivity('add_transaction', 'Finance', { type, category: insertPayload.category, amount }).catch(() => {})

  revalidatePath('/finance')
  return { success: true, id: insertedData?.id }
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
    is_split: false,
    split_with: null,
    paid_by: paidBy || user.id,
    is_settled: false,
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

    updateData.receipt_url = fileName
  }

  updateData.updated_by = user.id

  const { error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)

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

  // Fetch transaction details before deletion to revert balances
  const { data: tx } = await supabase
    .from('transactions')
    .select('id, type, amount, account_id, from_account_id, to_account_id')
    .eq('id', id)
    .single()

  // Soft delete pattern
  const { error } = await supabase
    .from('transactions')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // Revert balance adjustments dynamically
  if (tx) {
    const amount = Number(tx.amount) || 0
    if (tx.type === 'transfer' && tx.from_account_id && tx.to_account_id) {
      const { data: fromAcc } = await supabase.from('savings_accounts').select('balance').eq('id', tx.from_account_id).single()
      if (fromAcc) {
        await supabase.from('savings_accounts').update({ balance: Number(fromAcc.balance) + amount }).eq('id', tx.from_account_id)
      }
      const { data: toAcc } = await supabase.from('savings_accounts').select('balance').eq('id', tx.to_account_id).single()
      if (toAcc) {
        await supabase.from('savings_accounts').update({ balance: Number(toAcc.balance) - amount }).eq('id', tx.to_account_id)
      }
    } else if (tx.account_id) {
      const { data: acc } = await supabase.from('savings_accounts').select('balance').eq('id', tx.account_id).single()
      if (acc) {
        const revertDelta = tx.type === 'income' ? -amount : amount
        await supabase.from('savings_accounts').update({ balance: Number(acc.balance) + revertDelta }).eq('id', tx.account_id)
      }
    }
  }

  revalidatePath('/finance')
  return { success: true }
}

// ============== BUDGETS ==============

export async function getBudgets(userId?: string | 'all'): Promise<Budget[]> {
  const supabase = await createClient()

  let query = supabase
    .from('budgets')
    .select('*')
    .order('category', { ascending: true })

  if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
  } else if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      query = query.eq('user_id', user.id)
    }
  }

  const { data, error } = await query

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

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

// ============== SAVINGS ACCOUNTS ==============

export async function getSavingsAccounts(userId?: string | 'all'): Promise<SavingsAccount[]> {
  const supabase = await createClient()

  let query = supabase
    .from('savings_accounts')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: true })

  if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
  } else if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      query = query.eq('user_id', user.id)
    }
  }

  const { data, error } = await query

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
  const type = (formData.get('type') as any) || 'cash'
  const bank_code = formData.get('bank_code') as string
  const balance = parseFloat(formData.get('balance') as string) || 0
  const icon = formData.get('icon') as string
  const is_locked = formData.get('is_locked') === 'true'

  if (!name?.trim()) {
    return { error: 'Nama lokasi uang wajib diisi' }
  }

  const payload: any = {
    user_id: user.id,
    name: name.trim(),
    type: type || 'cash',
    bank_code: bank_code || null,
    balance,
    icon: icon || null,
    is_locked,
  }

  let { error } = await supabase.from('savings_accounts').insert(payload)

  // Defensive fallback if is_locked column has not been added to DB yet
  if (error && error.message?.includes('is_locked')) {
    delete payload.is_locked
    const retry = await supabase.from('savings_accounts').insert(payload)
    error = retry.error
  }

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

  logActivity('add_savings', 'Finance', { type, amount }).catch(() => {})

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

  const transactions = (data || []) as any[]
  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0)
  const totalExpense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)

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

  const unique = (data || []).map((t: any) => t.sub_title).filter(Boolean).reduce((acc: string[], v: any) => {
    if (!acc.includes(v as string)) acc.push(v as string)
    return acc
  }, []).sort()
  return unique
}