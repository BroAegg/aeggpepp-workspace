'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function resetAllDataAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized: Harap login terlebih dahulu' }

  const hasAdmin = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const client = hasAdmin ? createAdminClient() : supabase

  const tables = [
    'transactions',
    'budgets',
    'savings_accounts',
    'todos',
    'todo_categories',
    'events',
    'goals',
    'gallery',
    'wishlist',
    'portfolio_links',
    'activity_logs',
  ]

  for (const table of tables) {
    try {
      await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    } catch (err) {
      console.error(`Failed to clear table ${table}:`, err)
    }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
