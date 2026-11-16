'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import type { Transaction, Budget, TransactionType, BudgetPeriod, SavingsAccount, SavingsTransaction, AccountMutationItem, MutationType, Scope } from '@/types'

// ============== UTILS & RPC BALANCE HELPER ==============
export async function adjustAccountBalanceInternal(
  supabase: any,
  accountId: string,
  delta: number
): Promise<number | null> {
  if (!accountId || delta === 0) return null

  // 1. Try atomic PostgreSQL RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('adjust_account_balance', {
      p_account_id: accountId,
      p_delta: delta,
    })
    if (!rpcError && rpcData !== null) {
      return Number(rpcData)
    }
  } catch (err) {
    // Fallback if RPC is not yet created in DB
  }

  // 2. Direct fallback if RPC is not yet active
  const { data: acc } = await supabase
    .from('savings_accounts')
    .select('balance')
    .eq('id', accountId)
    .single()

  if (acc) {
    const newBalance = Number(acc.balance) + delta
    await supabase
      .from('savings_accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', accountId)
    return newBalance
  }

  return null
}
export async function getFinanceProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, billing_cycle_start_day, default_account_id, joint_default_account_id')
    .eq('id', user.id)
    .single()
  if (!profile) return null

  let partnerId = undefined
  if (profile.role === 'aegg' || profile.role === 'peppaa') {
    const partnerRole = profile.role === 'aegg' ? 'peppaa' : 'aegg'
    const { data: partner } = await supabase.from('profiles').select('id').eq('role', partnerRole).single()
    if (partner) partnerId = partner.id
  }

  return {
    id: user.id,
    role: profile.role,
    partnerId,
    billing_cycle_start_day: profile.billing_cycle_start_day,
    default_account_id: profile.default_account_id,
    joint_default_account_id: (profile as any).joint_default_account_id || null,
  }
}

// ============== TRANSACTIONS ==============

export async function getTransactions(
  userId: string | 'all' = 'all',
  scope?: Scope | 'all'
): Promise<Transaction[]> {
  const supabase = await createClient()

  let query = supabase
    .from('transactions')
    .select('*, profiles:user_id(display_name, role)')
    .is('deleted_at', null)
    .not('is_settlement', 'is', true)
    .order('date', { ascending: false })

  if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
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
  const source = ((formData.get('source') as string) || 'web') as 'web' | 'whatsapp' | 'telegram' | 'cron'

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
  } else if (!category && type !== 'adjustment') {
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

  const rawScope = formData.get('scope') as string | null
  let scope: Scope = (rawScope as Scope) || 'aegg'
  let transferCategory: 'internal' | 'contribution' = ((formData.get('transfer_category') as string) || 'internal') as any

  if (type === 'transfer' && fromAccountId && toAccountId) {
    const { data: toAcc } = await supabase
      .from('savings_accounts')
      .select('scope, is_locked')
      .eq('id', toAccountId)
      .maybeSingle()
    if (toAcc && (toAcc.scope === 'joint' || toAcc.is_locked)) {
      transferCategory = 'contribution'
      scope = 'joint'
    }
  }

  const insertPayload: any = {
    user_id: user.id,
    type,
    category: type === 'transfer' ? 'Transfer' : type === 'adjustment' ? 'adjustment' : category,
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
    source,
    scope,
    transfer_category: transferCategory,
  }

  if (idempotencyKey) {
    insertPayload.idempotency_key = idempotencyKey
  }

  let { data: insertedData, error } = await supabase
    .from('transactions')
    .insert(insertPayload)
    .select('id')
    .single()

  // Graceful fallback if account columns or source don't exist yet in DB schema
  if (
    error &&
    (error.message?.includes('from_account_id') ||
      error.message?.includes('to_account_id') ||
      error.message?.includes('account_id') ||
      error.message?.includes('source') ||
      error.message?.includes('scope') ||
      error.message?.includes('transfer_category'))
  ) {
    delete insertPayload.scope
    delete insertPayload.transfer_category
    delete insertPayload.account_id
    delete insertPayload.from_account_id
    delete insertPayload.to_account_id
    delete insertPayload.source
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

  // Dynamic balance synchronization via atomic RPC helper to prevent balance drift
  if (type === 'transfer' && fromAccountId && toAccountId) {
    await adjustAccountBalanceInternal(supabase, fromAccountId, -amount)
    await adjustAccountBalanceInternal(supabase, toAccountId, amount)
  } else if (accountId) {
    if (type === 'income') {
      await adjustAccountBalanceInternal(supabase, accountId, amount)
    } else if (type === 'expense') {
      await adjustAccountBalanceInternal(supabase, accountId, -amount)
    } else if (type === 'adjustment') {
      const isPositive = (sub_title || description || '').includes('(+)')
      await adjustAccountBalanceInternal(supabase, accountId, isPositive ? amount : -amount)
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

  // 1. Fetch old transaction to safely revert previous balance changes (zero drift)
  const { data: oldTx, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, type, amount, account_id, from_account_id, to_account_id, sub_title, description')
    .eq('id', id)
    .single()

  if (fetchErr || !oldTx) {
    return { error: 'Transaksi tidak ditemukan untuk diperbarui' }
  }

  const type = (formData.get('type') as TransactionType) || oldTx.type
  const category = (formData.get('category') as string) || (type === 'transfer' ? 'Transfer' : '')
  const sub_title = formData.get('sub_title') as string | null
  const amount = parseFloat(formData.get('amount') as string) || oldTx.amount
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const paidBy = formData.get('paid_by') as string | null
  const receiptFile = formData.get('receipt_file') as File
  const accountId = (formData.get('account_id') as string | null)?.trim() || null
  const fromAccountId = (formData.get('from_account_id') as string | null)?.trim() || null
  const toAccountId = (formData.get('to_account_id') as string | null)?.trim() || null

  const rawScope = formData.get('scope') as string | null
  let scope: Scope = (rawScope as Scope) || 'aegg'
  let transferCategory: 'internal' | 'contribution' = ((formData.get('transfer_category') as string) || 'internal') as any

  if (type === 'transfer' && fromAccountId && toAccountId) {
    const { data: toAcc } = await supabase
      .from('savings_accounts')
      .select('scope, is_locked')
      .eq('id', toAccountId)
      .maybeSingle()
    if (toAcc && (toAcc.scope === 'joint' || toAcc.is_locked)) {
      transferCategory = 'contribution'
      scope = 'joint'
    }
  }

  let receiptUrl = undefined
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

    receiptUrl = fileName
  }

  // 2. Revert old transaction balances
  const oldAmount = Number(oldTx.amount) || 0
  if (oldTx.type === 'transfer' && oldTx.from_account_id && oldTx.to_account_id) {
    await adjustAccountBalanceInternal(supabase, oldTx.from_account_id, oldAmount)
    await adjustAccountBalanceInternal(supabase, oldTx.to_account_id, -oldAmount)
  } else if (oldTx.account_id) {
    if (oldTx.type === 'income') {
      await adjustAccountBalanceInternal(supabase, oldTx.account_id, -oldAmount)
    } else if (oldTx.type === 'expense') {
      await adjustAccountBalanceInternal(supabase, oldTx.account_id, oldAmount)
    } else if (oldTx.type === 'adjustment') {
      const wasPositive = (oldTx.sub_title || oldTx.description || '').includes('(+)')
      await adjustAccountBalanceInternal(supabase, oldTx.account_id, wasPositive ? -oldAmount : oldAmount)
    }
  }

  // 3. Apply new transaction balances
  if (type === 'transfer' && fromAccountId && toAccountId) {
    await adjustAccountBalanceInternal(supabase, fromAccountId, -amount)
    await adjustAccountBalanceInternal(supabase, toAccountId, amount)
  } else if (accountId) {
    if (type === 'income') {
      await adjustAccountBalanceInternal(supabase, accountId, amount)
    } else if (type === 'expense') {
      await adjustAccountBalanceInternal(supabase, accountId, -amount)
    } else if (type === 'adjustment') {
      const isPositive = (sub_title || description || '').includes('(+)')
      await adjustAccountBalanceInternal(supabase, accountId, isPositive ? amount : -amount)
    }
  }

  const updateData: any = {
    type,
    category: type === 'transfer' ? 'Transfer' : type === 'adjustment' ? 'adjustment' : category,
    sub_title: sub_title?.trim() || null,
    amount,
    description: description || null,
    date,
    paid_by: paidBy || user.id,
    account_id: accountId,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    scope,
    transfer_category: transferCategory,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }

  if (receiptUrl) {
    updateData.receipt_url = receiptUrl
  }

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

export async function quickUpdateTransaction(
  id: string,
  data: {
    category?: string
    account_id?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Fetch current transaction details
  const { data: oldTx, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, type, amount, account_id')
    .eq('id', id)
    .single()

  if (fetchErr || !oldTx) {
    return { error: 'Transaksi tidak ditemukan' }
  }

  // 2. Anti-drift balance adjustments if account_id is changing
  if (data.account_id !== undefined && data.account_id !== oldTx.account_id) {
    const oldAccountId = oldTx.account_id
    const newAccountId = data.account_id
    const amount = Number(oldTx.amount) || 0

    // Revert balance on old account
    if (oldAccountId) {
      if (oldTx.type === 'expense') {
        await adjustAccountBalanceInternal(supabase, oldAccountId, amount)
      } else if (oldTx.type === 'income') {
        await adjustAccountBalanceInternal(supabase, oldAccountId, -amount)
      }
    }

    // Apply balance deduction/addition to new account
    if (newAccountId) {
      if (oldTx.type === 'expense') {
        await adjustAccountBalanceInternal(supabase, newAccountId, -amount)
      } else if (oldTx.type === 'income') {
        await adjustAccountBalanceInternal(supabase, newAccountId, amount)
      }
    }
  }

  // 3. Update database record
  const updatePayload: any = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }
  if (data.category !== undefined) {
    updatePayload.category = data.category
  }
  if (data.account_id !== undefined) {
    updatePayload.account_id = data.account_id || null
  }

  const { error: updateErr } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', id)

  if (updateErr) {
    return { error: updateErr.message }
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
    .select('id, type, amount, sub_title, description, account_id, from_account_id, to_account_id')
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
      await adjustAccountBalanceInternal(supabase, tx.from_account_id, amount)
      await adjustAccountBalanceInternal(supabase, tx.to_account_id, -amount)
    } else if (tx.account_id) {
      if (tx.type === 'income') {
        await adjustAccountBalanceInternal(supabase, tx.account_id, -amount)
      } else if (tx.type === 'expense') {
        await adjustAccountBalanceInternal(supabase, tx.account_id, amount)
      } else if (tx.type === 'adjustment') {
        const wasPositive = (tx.sub_title || tx.description || '').includes('(+)')
        await adjustAccountBalanceInternal(supabase, tx.account_id, wasPositive ? -amount : amount)
      }
    }

    // Revert any associated wedding milestone (DP, Termin 2, Pelunasan)
    try {
      const { data: weddingItems } = await supabase
        .from('wedding_budget_items')
        .select('id, dp_transaction_id, termin2_transaction_id, pelunasan_transaction_id, dp_amount, termin2_amount, pelunasan_amount, paid_amount, actual_cost, estimated_cost')
        .or(`dp_transaction_id.eq.${id},termin2_transaction_id.eq.${id},pelunasan_transaction_id.eq.${id}`)

      if (weddingItems && weddingItems.length > 0) {
        for (const wItem of weddingItems) {
          const updatePayload: any = {}
          let deductedPaid = 0
          if (wItem.dp_transaction_id === id) {
            updatePayload.dp_paid = false
            updatePayload.dp_transaction_id = null
            deductedPaid += Number(wItem.dp_amount) || 0
          }
          if (wItem.termin2_transaction_id === id) {
            updatePayload.termin2_paid = false
            updatePayload.termin2_transaction_id = null
            deductedPaid += Number(wItem.termin2_amount) || 0
          }
          if (wItem.pelunasan_transaction_id === id) {
            updatePayload.pelunasan_paid = false
            updatePayload.pelunasan_transaction_id = null
            deductedPaid += Number(wItem.pelunasan_amount) || 0
          }
          const currentPaid = Number(wItem.paid_amount) || 0
          const newPaid = Math.max(0, currentPaid - deductedPaid)
          updatePayload.paid_amount = newPaid
          const targetCost = wItem.actual_cost && wItem.actual_cost > 0 ? wItem.actual_cost : wItem.estimated_cost
          if (newPaid >= targetCost && targetCost > 0) {
            updatePayload.status = 'paid_off'
          } else if (newPaid > 0 || updatePayload.dp_paid) {
            updatePayload.status = 'booked_dp'
          } else {
            updatePayload.status = 'planned'
          }

          await supabase.from('wedding_budget_items').update(updatePayload).eq('id', wItem.id)
        }
      }
    } catch (wErr) {
      console.warn('[Finance] Warning reverting wedding milestone for deleted tx:', wErr)
    }
  }

  revalidatePath('/finance')
  revalidatePath('/wedding')
  return { success: true }
}

// ============== BUDGETS ==============

export async function getBudgets(
  userId: string | 'all' = 'all',
  scope?: Scope | 'all'
): Promise<Budget[]> {
  const supabase = await createClient()

  let query = supabase
    .from('budgets')
    .select('*')
    .order('category', { ascending: true })

  if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
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
  const rawScope = formData.get('scope') as string
  const scope: Scope = (rawScope as Scope) || 'aegg'

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
    const budgetPayload: any = {
      user_id: user.id,
      category,
      amount,
      period,
      scope,
    }

    let { error } = await supabase.from('budgets').insert(budgetPayload)
    if (error && error.message?.includes('scope')) {
      delete budgetPayload.scope
      const retry = await supabase.from('budgets').insert(budgetPayload)
      error = retry.error
    }

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

export async function getSavingsAccounts(
  userId: string | 'all' = 'all',
  scope?: Scope | 'all'
): Promise<SavingsAccount[]> {
  const supabase = await createClient()

  let query = supabase
    .from('savings_accounts')
    .select('*, profiles:user_id(display_name, role)')
    .order('created_at', { ascending: true })

  if (userId && userId !== 'all') {
    query = query.eq('user_id', userId)
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
  const rawScope = formData.get('scope') as string
  const scope: Scope = (rawScope as Scope) || (is_locked ? 'joint' : 'aegg')

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
    scope,
  }

  let { error } = await supabase.from('savings_accounts').insert(payload)

  // Defensive fallback if scope or is_locked column has not been added to DB yet
  if (error && (error.message?.includes('is_locked') || error.message?.includes('scope'))) {
    delete payload.is_locked
    delete payload.scope
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

// ============== RECONCILE SALDO RIIL & ACCOUNT LEDGER MUTATIONS ==============

export async function reconcileAccountBalance(
  accountId: string,
  actualBalance: number,
  reason?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Fetch current account details
  const { data: acc, error: accError } = await supabase
    .from('savings_accounts')
    .select('id, name, balance')
    .eq('id', accountId)
    .single()

  if (accError || !acc) {
    return { error: 'Rekening tidak ditemukan' }
  }

  const currentBalance = Number(acc.balance) || 0
  const delta = actualBalance - currentBalance

  // 2. Edge-case Guard: Jika selisih 0, kembalikan status sukses tanpa membuat baris transaksi kosong
  if (delta === 0) {
    return { success: true, delta: 0, newBalance: actualBalance, message: 'Saldo sudah sesuai dengan data riil' }
  }

  // 3. Atomically update balance via RPC helper
  await adjustAccountBalanceInternal(supabase, accountId, delta)

  // 4. Record adjustment transaction
  const isPositive = delta > 0
  const subTitle = isPositive ? 'Koreksi Saldo (+)' : 'Koreksi Saldo (-)'
  const defaultDesc = isPositive
    ? `Penyesuaian saldo riil m-banking (Bunga/Topup +Rp ${Math.abs(delta).toLocaleString('id-ID')})`
    : `Penyesuaian saldo riil m-banking (Biaya admin/Koreksi -Rp ${Math.abs(delta).toLocaleString('id-ID')})`

  const insertPayload = {
    user_id: user.id,
    type: 'adjustment' as TransactionType,
    category: 'adjustment',
    sub_title: subTitle,
    amount: Math.abs(delta),
    description: reason?.trim() || defaultDesc,
    date: new Date().toISOString().split('T')[0],
    is_split: false,
    split_with: null,
    paid_by: user.id,
    is_settled: true,
    account_id: accountId,
    source: 'web' as const,
    idempotency_key: crypto.randomUUID(),
  }

  const { error: txError } = await supabase.from('transactions').insert(insertPayload)
  if (txError) {
    console.warn('[Finance] Warning saving adjustment transaction:', txError.message)
  }

  logActivity('reconcile_balance', 'Finance', {
    account: acc.name,
    delta,
    actualBalance,
  }).catch(() => {})

  revalidatePath('/finance')
  return { success: true, delta, newBalance: actualBalance }
}

export async function getAccountMutations(accountId: string): Promise<AccountMutationItem[]> {
  const supabase = await createClient()

  // 1. Fetch transactions involving this account
  const { data: txList, error: txError } = await supabase
    .from('transactions')
    .select('id, date, type, amount, description, category, sub_title, source, account_id, from_account_id, to_account_id, created_at')
    .or(`account_id.eq.${accountId},from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (txError) {
    console.error('Error fetching account transactions for mutations:', txError)
  }

  // 2. Fetch legacy savings transactions if any exist
  const { data: stList } = await supabase
    .from('savings_transactions')
    .select('id, date, type, amount, description, created_at')
    .eq('account_id', accountId)
    .order('date', { ascending: false })

  // 3. Collect counterpart account IDs for transfers
  const counterpartIds = new Set<string>()
  ;(txList || []).forEach((t) => {
    if (t.type === 'transfer') {
      if (t.from_account_id === accountId && t.to_account_id) counterpartIds.add(t.to_account_id)
      if (t.to_account_id === accountId && t.from_account_id) counterpartIds.add(t.from_account_id)
    }
  })

  const counterpartMap = new Map<string, { id: string; name: string; bank_code: string | null }>()
  if (counterpartIds.size > 0) {
    const { data: accData } = await supabase
      .from('savings_accounts')
      .select('id, name, bank_code')
      .in('id', Array.from(counterpartIds))
    if (accData) {
      accData.forEach((a) => counterpartMap.set(a.id, a))
    }
  }

  const mutations: AccountMutationItem[] = []

  // Map transactions
  ;(txList || []).forEach((t) => {
    const amount = Number(t.amount) || 0
    let mType: MutationType = 'debit'
    let counterpart: { id: string; name: string; bank_code: string | null } | null = null
    let desc = t.description || t.sub_title || t.category

    if (t.type === 'transfer') {
      if (t.from_account_id === accountId) {
        mType = 'transfer_out'
        counterpart = t.to_account_id ? counterpartMap.get(t.to_account_id) || null : null
        desc = desc || `Transfer ke ${counterpart?.name || 'Rekening Tujuan'}`
      } else {
        mType = 'transfer_in'
        counterpart = t.from_account_id ? counterpartMap.get(t.from_account_id) || null : null
        desc = desc || `Transfer masuk dari ${counterpart?.name || 'Rekening Asal'}`
      }
    } else if (t.type === 'income') {
      mType = 'credit'
    } else if (t.type === 'expense') {
      mType = 'debit'
    } else if (t.type === 'adjustment') {
      mType = 'adjustment'
    }

    mutations.push({
      id: t.id,
      date: t.date,
      type: mType,
      amount,
      description: desc,
      category: t.category || (t.type === 'transfer' ? 'Transfer' : 'Umum'),
      source: t.source || 'web',
      counterpart_account: counterpart,
      created_at: t.created_at,
    })
  })

  // Map legacy savings_transactions (avoid duplicate if ID overlaps)
  const existingIds = new Set(mutations.map((m) => m.id))
  ;(stList || []).forEach((st) => {
    if (existingIds.has(st.id)) return
    const amount = Number(st.amount) || 0
    mutations.push({
      id: st.id,
      date: st.date,
      type: st.type === 'deposit' ? 'credit' : 'debit',
      amount,
      description: st.description || (st.type === 'deposit' ? 'Setoran Tabungan' : 'Penarikan Tabungan'),
      category: 'savings',
      source: 'web',
      counterpart_account: null,
      created_at: st.created_at,
    })
  })

  // Sort newest first by date then created_at
  mutations.sort((a, b) => {
    const dComp = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dComp !== 0) return dComp
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return mutations
}

export async function updateProfileFinanceSettings(data: {
  billingCycleStartDay?: number
  defaultAccountId?: string | null
  jointDefaultAccountId?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const payload: any = {}
  if (data.billingCycleStartDay !== undefined) {
    payload.billing_cycle_start_day = data.billingCycleStartDay
  }
  if (data.defaultAccountId !== undefined) {
    payload.default_account_id = data.defaultAccountId
  }
  if (data.jointDefaultAccountId !== undefined) {
    payload.joint_default_account_id = data.jointDefaultAccountId
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}