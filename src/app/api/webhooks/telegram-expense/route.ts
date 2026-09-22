import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Map natural language or AI categories to system categories
const CATEGORY_MAP: Record<string, string> = {
  food: 'food',
  makan: 'food',
  minum: 'food',
  kopi: 'food',
  kuliner: 'food',
  restoran: 'food',
  groceries: 'daily_needs',
  supermarket: 'daily_needs',
  transport: 'transport',
  transportation: 'transport',
  bensin: 'transport',
  gojek: 'transport',
  grab: 'transport',
  shopping: 'shopping',
  belanja: 'shopping',
  date: 'date',
  kencan: 'date',
  entertainment: 'entertainment',
  hiburan: 'entertainment',
  nonton: 'entertainment',
  bills: 'bills',
  tagihan: 'bills',
  utilities: 'utilities',
  listrik: 'utilities',
  internet: 'internet',
  health: 'health',
  kesehatan: 'health',
  obat: 'health',
  other: 'other_expense',
}

export async function POST(request: Request) {
  try {
    // 1. Authorization check
    const secret = request.headers.get('x-webhook-secret') || request.headers.get('authorization')
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET

    if (expectedSecret && secret !== expectedSecret && secret !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
    }

    const payload = await request.json()
    const {
      store,
      total_amount,
      category = 'food',
      description,
      date,
      items = [],
      sender_name,
      sender_role,
      telegram_user_id,
      receipt_image_url,
      payment_method = 'cash',
      is_shared = false,
    } = payload

    if (!total_amount || isNaN(Number(total_amount))) {
      return NextResponse.json(
        { error: 'Invalid or missing total_amount' },
        { status: 400 }
      )
    }

    const amount = Math.abs(Number(total_amount))
    const supabase = createAdminClient()

    // 2. Identify user profile (Aegg or Peppaa)
    // Can match by role ('aegg' | 'peppaa'), sender_name, or telegram_user_id
    let targetRole = 'aegg' // default

    const lowerSender = (sender_name || '').toLowerCase()
    const lowerRole = (sender_role || '').toLowerCase()

    if (
      lowerRole === 'peppaa' ||
      lowerSender.includes('peppaa') ||
      lowerSender.includes('pepa') ||
      lowerSender.includes('pep') ||
      telegram_user_id === process.env.TELEGRAM_PEPPAA_ID
    ) {
      targetRole = 'peppaa'
    }

    // Fetch user profile from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('role', targetRole)
      .limit(1)
      .maybeSingle()

    // Fallback: get any profile if role query is empty
    let userId = profile?.id
    if (!userId) {
      const { data: anyUser } = await supabase.from('profiles').select('id, display_name').limit(1).single()
      userId = anyUser?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user profile found in database' }, { status: 404 })
    }

    // 3. Normalize category
    const cleanCategoryKey = (category || 'other').toString().toLowerCase().trim()
    const mappedCategory = CATEGORY_MAP[cleanCategoryKey] || 'other_expense'

    // Formulate clean title/description
    const txDescription = store || description || 'Pengeluaran via Telegram'
    const txDate = date || new Date().toISOString().split('T')[0]

    // 4. Insert into transactions table
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'expense',
        category: mappedCategory,
        amount,
        description: txDescription,
        date: txDate,
        receipt_url: receipt_image_url || null,
        receipt_metadata: items && items.length > 0 ? { items, store, via: 'telegram' } : null,
        payment_method: payment_method || 'cash',
        is_shared: Boolean(is_shared) || mappedCategory === 'date',
      })
      .select()
      .single()

    if (txError) {
      console.error('Error inserting transaction from Telegram webhook:', txError)
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    // 5. Log activity
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action: 'created',
      entity_type: 'transaction',
      entity_id: transaction.id,
      details: {
        description: txDescription,
        amount,
        category: mappedCategory,
        via: 'telegram_bot',
        receipt: Boolean(receipt_image_url),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dicatat ke sistem!',
      data: {
        id: transaction.id,
        store: txDescription,
        amount,
        category: mappedCategory,
        date: txDate,
        recorded_for: profile?.display_name || targetRole,
      },
    })
  } catch (error: any) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
