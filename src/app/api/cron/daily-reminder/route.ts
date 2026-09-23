import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Vercel Cron: setiap hari jam 13:00 UTC = 20:00 WIB
// Schedule di vercel.json: "0 13 * * *"

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

async function sendTelegramMessage(chatId: string, text: string, botToken: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    console.error('Failed to send Telegram notification:', err)
  }
}

export async function GET(request: Request) {
  // Vercel Cron authentication
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const aeggChatId = process.env.TELEGRAM_AEGG_CHAT_ID
  const peppaaChatId = process.env.TELEGRAM_PEPPAA_CHAT_ID

  if (!botToken) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
  }

  const supabase = createAdminClient()

  // Ambil agenda besok (dan hari ini yang belum lewat)
  const now = new Date()
  // Convert to WIB (UTC+7)
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const todayWib = wibNow.toISOString().split('T')[0]
  const tomorrowWib = new Date(wibNow.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('title, start_date, all_day, description')
    .gte('start_date', todayWib)
    .lte('start_date', `${tomorrowWib}T23:59:59`)
    .order('start_date', { ascending: true })
    .limit(5)

  // Ambil tugas yang deadline-nya hari ini atau besok
  const { data: dueTodos } = await supabase
    .from('todos')
    .select('title, due_date, priority')
    .eq('completed', false)
    .not('due_date', 'is', null)
    .gte('due_date', todayWib)
    .lte('due_date', tomorrowWib)
    .order('due_date', { ascending: true })
    .limit(5)

  // Ambil ringkasan keuangan hari ini
  const { data: todayTxs } = await supabase
    .from('transactions')
    .select('type, amount, category, description')
    .eq('date', todayWib)

  const todayExpense = (todayTxs || [])
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)
  const todayIncome = (todayTxs || [])
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)

  // Format pesan
  const dateLabel = wibNow.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  let msg = `🌙 <b>Selamat Malam, Aegg & Peppaa!</b>\n<i>${dateLabel}</i>\n\n`

  // Ringkasan hari ini
  if (todayTxs && todayTxs.length > 0) {
    msg += `<b>💳 Pengeluaran Hari Ini:</b> ${formatIDR(todayExpense)}`
    if (todayIncome > 0) msg += `\n<b>💰 Pemasukan Hari Ini:</b> ${formatIDR(todayIncome)}`
    msg += '\n\n'
  } else {
    msg += `<b>💳 Hari ini belum ada transaksi yang tercatat.</b>\n\n`
  }

  // Agenda besok
  if (upcomingEvents && upcomingEvents.length > 0) {
    msg += `<b>📅 Agenda Besok & Segera:</b>\n`
    for (const ev of upcomingEvents) {
      const evDate = new Date(ev.start_date)
      const evWib = new Date(evDate.getTime() + 7 * 60 * 60 * 1000)
      const isToday = evWib.toISOString().split('T')[0] === todayWib
      const isTomorrow = evWib.toISOString().split('T')[0] === tomorrowWib
      const dayLabel = isToday ? 'Hari ini' : isTomorrow ? 'Besok' : evWib.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
      const timeStr = ev.all_day ? 'Seharian' : evWib.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      msg += `• <b>${ev.title}</b> (${dayLabel}, ${timeStr})\n`
    }
    msg += '\n'
  } else {
    msg += `<b>📅 Tidak ada agenda khusus besok.</b> Waktu bebas untuk bersantai! 🌸\n\n`
  }

  // Deadline tugas
  if (dueTodos && dueTodos.length > 0) {
    msg += `<b>⚠️ Deadline Tugas Segera:</b>\n`
    for (const td of dueTodos) {
      const prio = td.priority === 'high' ? '🔴' : td.priority === 'medium' ? '🟡' : '🟢'
      msg += `${prio} ${td.title} (${td.due_date})\n`
    }
    msg += '\n'
  }

  msg += `<i>Selamat beristirahat dan semangat hari esok! 💕</i>`

  // Kirim ke semua chat ID yang diketahui
  const chatIds: string[] = []
  if (aeggChatId) chatIds.push(aeggChatId)
  if (peppaaChatId) chatIds.push(peppaaChatId)

  if (chatIds.length === 0) {
    // Fallback: fetch chat IDs dari recent updates jika belum di-set di env
    console.warn('TELEGRAM_AEGG_CHAT_ID / TELEGRAM_PEPPAA_CHAT_ID not set. Notification not sent.')
    return NextResponse.json({
      ok: false,
      note: 'Set TELEGRAM_AEGG_CHAT_ID and TELEGRAM_PEPPAA_CHAT_ID in Vercel env vars to enable daily notifications.',
      preview: msg,
    })
  }

  const sentTo: string[] = []
  for (const cid of chatIds) {
    await sendTelegramMessage(cid, msg, botToken)
    sentTo.push(cid)
  }

  return NextResponse.json({
    ok: true,
    sent_to: sentTo.length,
    agenda_count: upcomingEvents?.length || 0,
    todos_due: dueTodos?.length || 0,
    today_expense: todayExpense,
    today_income: todayIncome,
  })
}
