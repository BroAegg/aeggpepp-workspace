'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createTransaction } from '@/lib/actions/finance'
import type { Subscription, Scope } from '@/types'

export async function getSubscriptions(scope?: Scope | 'all'): Promise<Subscription[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('subscriptions')
    .select('*, profiles:user_id(display_name, role)')
    .order('due_day', { ascending: true })

  if (scope && scope !== 'all') {
    query = query.eq('scope', scope)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching subscriptions:', error)
    return []
  }

  return (data || []) as Subscription[]
}

export async function createSubscription(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = formData.get('name') as string
  const amount = parseFloat(formData.get('amount') as string)
  const dueDay = parseInt(formData.get('due_day') as string, 10)
  const billingCycle = (formData.get('billing_cycle') as 'monthly' | 'yearly') || 'monthly'
  const category = (formData.get('category') as string) || 'bills'
  const icon = (formData.get('icon') as string) || '⚡'
  const rawScope = formData.get('scope') as string
  const scope: Scope = (rawScope as Scope) || 'aegg'

  if (!name || isNaN(amount) || isNaN(dueDay)) {
    return { error: 'Nama, nominal, dan tanggal jatuh tempo wajib diisi' }
  }

  const payload: any = {
    user_id: user.id,
    name: name.trim(),
    amount,
    due_day: dueDay,
    billing_cycle: billingCycle,
    category,
    icon,
    is_active: true,
    scope,
  }

  let { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select('id')
    .single()

  if (error && error.message?.includes('scope')) {
    delete payload.scope
    const retry = await supabase.from('subscriptions').insert(payload).select('id').single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finance')
  return { success: true, id: data?.id }
}

export async function deleteSubscription(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/finance')
  return { success: true }
}

export async function paySubscriptionNow(sub: Subscription, accountId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let targetAccountId = accountId

  // Fallback to user's default_account_id if not specified
  if (!targetAccountId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_account_id')
      .eq('id', user.id)
      .single()

    if (profile?.default_account_id) {
      targetAccountId = profile.default_account_id
    } else {
      // Fallback to first operational (unlocked) pocket
      const { data: opAcc } = await supabase
        .from('savings_accounts')
        .select('id')
        .eq('is_locked', false)
        .limit(1)
        .single()
      if (opAcc?.id) {
        targetAccountId = opAcc.id
      }
    }
  }

  // 1. Record an expense transaction with idempotency key
  const txFormData = new FormData()
  txFormData.set('type', 'expense')
  txFormData.set('category', sub.category || 'bills')
  txFormData.set('sub_title', sub.name)
  txFormData.set('amount', sub.amount.toString())
  txFormData.set('description', `Tagihan Rutin: ${sub.name}`)
  txFormData.set('date', new Date().toISOString().split('T')[0])
  txFormData.set('idempotency_key', crypto.randomUUID())
  txFormData.set('source', 'web')
  if (targetAccountId) {
    txFormData.set('account_id', targetAccountId)
  }

  const txRes = await createTransaction(txFormData)
  if (txRes && 'error' in txRes && txRes.error) {
    return { error: txRes.error }
  }

  // 2. Update last_paid_at in subscriptions table
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      last_paid_at: new Date().toISOString(),
    })
    .eq('id', sub.id)

  if (updateError) {
    console.error('Failed to update subscription last_paid_at:', updateError)
  }

  revalidatePath('/finance')
  return { success: true }
}
