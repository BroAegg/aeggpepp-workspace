import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Standard category normalization
const CATEGORY_MAP: Record<string, string> = {
  // Food & Drinks
  food: 'food',
  makan: 'food',
  minum: 'food',
  kopi: 'food',
  kuliner: 'food',
  restoran: 'food',
  kafe: 'food',
  cafe: 'food',
  jajan: 'food',
  // Daily Needs / Groceries
  daily_needs: 'daily_needs',
  groceries: 'daily_needs',
  supermarket: 'daily_needs',
  indomaret: 'daily_needs',
  alfamart: 'daily_needs',
  // Transport
  transport: 'transport',
  transportation: 'transport',
  bensin: 'transport',
  pertamax: 'transport',
  pertalite: 'transport',
  gojek: 'transport',
  grab: 'transport',
  maxim: 'transport',
  parkir: 'transport',
  tol: 'transport',
  // Shopping & Fashion
  shopping: 'shopping',
  belanja: 'shopping',
  clothing: 'clothing',
  pakaian: 'clothing',
  baju: 'clothing',
  // Couple & Lifestyle
  date: 'date',
  kencan: 'date',
  treatment: 'treatment',
  skincare: 'treatment',
  vacation: 'vacation',
  liburan: 'vacation',
  sedekah: 'sedekah',
  gift: 'gift',
  gift_giving: 'gift_giving',
  // Bills & Utilities
  bills: 'bills',
  tagihan: 'bills',
  utilities: 'utilities',
  listrik: 'utilities',
  pln: 'utilities',
  internet: 'internet',
  wifi: 'internet',
  pulsa: 'internet',
  kuota: 'internet',
  // Health & Vehicle
  health: 'health',
  kesehatan: 'health',
  obat: 'health',
  apotek: 'health',
  vehicle: 'vehicle',
  service: 'vehicle',
  bengkel: 'vehicle',
  // Incomes
  salary: 'salary',
  gaji: 'salary',
  freelance: 'freelance',
  investment: 'investment',
  other_income: 'other_income',
  other: 'other_expense',
  other_expense: 'other_expense',
}

interface ParsedTransaction {
  type: 'expense' | 'income'
  total_amount: number
  category: string
  store: string
  description: string
  date: string
  items?: Array<{ name: string; price: number }>
}

// Telegram reply helper
async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  botToken: string,
  replyMarkup?: any
) {
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }
    if (replyMarkup) {
      payload.reply_markup = replyMarkup
    }
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (err) {
    console.error('Failed to send Telegram message:', err)
  }
}

// Telegram edit message helper
async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string,
  botToken: string,
  replyMarkup?: any
) {
  try {
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    }
    if (replyMarkup !== undefined) {
      payload.reply_markup = replyMarkup
    }
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('Failed to edit Telegram message:', err)
  }
}

// Telegram answer callback query (toast / notification)
async function answerTelegramCallback(
  callbackQueryId: string,
  text: string,
  botToken: string
) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: false,
      }),
    })
  } catch (err) {
    console.error('Failed to answer Telegram callback query:', err)
  }
}

// Interactive Category Inline Keyboard (Shopee-style click buttons)
function buildCategoryKeyboard(txId: string, activeCat?: string) {
  const categories = [
    { code: 'food', label: '🍽️ Makanan' },
    { code: 'daily_needs', label: '🏪 Kebutuhan' },
    { code: 'shopping', label: '🛍️ Belanja' },
    { code: 'transport', label: '🚗 Transport' },
    { code: 'date', label: '🌹 Kencan' },
    { code: 'bills', label: '💡 Tagihan' },
    { code: 'health', label: '🏥 Kesehatan' },
    { code: 'other_expense', label: '💳 Lainnya' },
  ]

  const inlineKeyboard: any[][] = []
  for (let i = 0; i < categories.length; i += 2) {
    const row = []
    const cat1 = categories[i]
    row.push({
      text: (activeCat === cat1.code ? '✓ ' : '') + cat1.label,
      callback_data: `c:${cat1.code}:${txId}`,
    })
    if (categories[i + 1]) {
      const cat2 = categories[i + 1]
      row.push({
        text: (activeCat === cat2.code ? '✓ ' : '') + cat2.label,
        callback_data: `c:${cat2.code}:${txId}`,
      })
    }
    inlineKeyboard.push(row)
  }

  // Cancel / Delete button
  inlineKeyboard.push([
    {
      text: '❌ Batalkan & Hapus Transaksi',
      callback_data: `d:${txId}`,
    },
  ])

  return { inline_keyboard: inlineKeyboard }
}

// Persistent bottom menu (Shopee-style quick action buttons)
const persistentMenuMarkup = {
  keyboard: [
    [{ text: '🛒 Daftar Belanja' }, { text: '💳 Cek Saldo' }],
    [{ text: '📅 Jadwal Minggu Ini' }, { text: '📋 Daftar Tugas' }],
    [{ text: '❓ Bantuan' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
}

// Format currency IDR
function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Gemini 1.5 Flash text parsing
async function parseTextWithGemini(text: string, geminiKey: string): Promise<ParsedTransaction | null> {
  const todayStr = new Date().toISOString().split('T')[0]
  const prompt = `Anda adalah asisten keuangan pribadi cerdas untuk pasangan (Aegg & Peppaa) di Indonesia.
Ekstrak rincian keuangan dari pesan berikut: "${text}".
Tanggal hari ini: ${todayStr}.

Aturan konversi nominal:
- "50rb" / "50k" / "50 ribu" = 50000
- "1.5jt" / "1,5 juta" = 1500000
- "25000" = 25000

Pilihan Kategori:
- food (makan, minum, kopi, kafe, jajan)
- daily_needs (belanja supermarket, indomaret, alfamart, sabun, beras)
- shopping (belanja online, pakaian, barang)
- transport (bensin, gojek, grab, tol, parkir)
- clothing (baju, sepatu, celana)
- treatment (skincare, salon, potong rambut)
- date (agenda kencan berdua, nonton bioskop bareng)
- bills (tagihan bulanan, langganan)
- utilities (listrik, air, pdam, token pln)
- internet (wifi, kuota hp, pulsa)
- health (obat, dokter, rumah sakit, vitamin)
- vehicle (service motor/mobil, ganti oli)
- sedekah (infaq, sedekah, zakat)
- salary (gaji kantor)
- freelance (honor proyek freelance)
- other_expense (pengeluaran lainnya)
- other_income (pemasukan lainnya)

Kembalikan HANYA format JSON valid tanpa tanda markdown (blok code json):
{
  "type": "expense" atau "income",
  "total_amount": <angka bulat integer IDR>,
  "store": "<nama toko / penjual / penerima>",
  "category": "<kategori dari daftar di atas>",
  "description": "<ringkasan catatan pengeluaran/pemasukan>",
  "date": "YYYY-MM-DD"
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    )

    if (!res.ok) {
      console.error('Gemini API error:', await res.text())
      return null
    }

    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) return null

    const parsed = JSON.parse(content)
    if (!parsed.total_amount || isNaN(Number(parsed.total_amount))) return null

    return {
      type: parsed.type === 'income' ? 'income' : 'expense',
      total_amount: Math.abs(Number(parsed.total_amount)),
      store: parsed.store || parsed.description || 'Pengeluaran',
      category: parsed.category || 'other_expense',
      description: parsed.description || parsed.store || 'Tercatat via Telegram',
      date: parsed.date || todayStr,
    }
  } catch (err) {
    console.error('Gemini text parsing error:', err)
    return null
  }
}

interface ParsedEvent {
  title: string
  start_date: string
  end_date?: string
  all_day: boolean
  description?: string
}

async function parseEventWithGemini(text: string, geminiKey: string): Promise<ParsedEvent | null> {
  const now = new Date()
  const todayIso = now.toISOString()
  const prompt = `Anda adalah asisten penjadwalan kalender cerdas untuk pasangan di Indonesia.
Ekstrak detail acara dari pesan berikut: "${text}".
Waktu saat ini (ISO): ${todayIso}, Hari ini: ${now.toLocaleDateString('id-ID', { weekday: 'long' })}.

Aturan:
- Cari judul acara (e.g. "Dinner di Senopati", "Nonton Bioskop", "Kencan").
- Tentukan tanggal dan jam mulai (start_date ISO YYYY-MM-DDTHH:mm:ss).
- Jika ada perkiraan durasi atau jam selesai, tentukan end_date (ISO YYYY-MM-DDTHH:mm:ss). Jika tidak ada, buat 1-2 jam setelah start_date.
- Jika pengguna hanya menyebut tanggal tanpa jam, set all_day = true.
- Catat deskripsi singkat jika ada.

Kembalikan HANYA format JSON valid tanpa markdown backticks:
{
  "title": "<judul acara>",
  "start_date": "YYYY-MM-DDTHH:mm:ss",
  "end_date": "YYYY-MM-DDTHH:mm:ss",
  "all_day": false,
  "description": "<deskripsi>"
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    )

    if (!res.ok) return null
    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) return null

    const parsed = JSON.parse(content)
    if (!parsed.title || !parsed.start_date) return null

    return {
      title: parsed.title,
      start_date: new Date(parsed.start_date).toISOString(),
      end_date: parsed.end_date
        ? new Date(parsed.end_date).toISOString()
        : new Date(new Date(parsed.start_date).getTime() + 3600000).toISOString(),
      all_day: Boolean(parsed.all_day),
      description: parsed.description || 'Dibuat via Telegram Bot',
    }
  } catch (err) {
    console.error('Gemini event parsing error:', err)
    return null
  }
}

// Gemini Vision receipt image parsing
async function parseReceiptImageWithGemini(
  base64Image: string,
  caption: string | undefined,
  geminiKey: string
): Promise<ParsedTransaction | null> {
  const todayStr = new Date().toISOString().split('T')[0]
  const prompt = `Anda adalah asisten audit keuangan yang sangat teliti dalam membaca struk belanja, invoice, nota, atau bukti transfer QRIS di Indonesia.
Caption tambahan dari pengguna: "${caption || 'Tidak ada'}".
Tanggal hari ini: ${todayStr}.

Tugas:
1. Cari TOTAL AKHIR (Grand Total / Total Tagihan / Jumlah Pembayaran) dalam Rupiah.
2. Identifikasi Nama Toko/Merchant (contoh: Indomaret, Starbucks, Kopi Kenangan, SPBU Pertamina, dll).
3. Tentukan kategori yang paling tepat:
   - food, daily_needs, shopping, transport, clothing, treatment, date, bills, utilities, internet, health, vehicle, other_expense.
4. Cari tanggal pada struk (format YYYY-MM-DD). Jika tidak terbaca atau buram, gunakan tanggal hari ini: ${todayStr}.
5. Ekstrak ringkasan item yang dibeli jika terlihat.

Kembalikan HANYA format JSON valid tanpa markdown backticks:
{
  "type": "expense",
  "total_amount": <angka bulat integer total akhir rupiah>,
  "store": "<nama toko/merchant>",
  "category": "<kategori di atas>",
  "description": "<ringkasan belanja singkat>",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "<nama item>", "price": <harga> }
  ]
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    )

    if (!res.ok) {
      console.error('Gemini Vision error:', await res.text())
      return null
    }

    const data = await res.json()
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!content) return null

    const parsed = JSON.parse(content)
    if (!parsed.total_amount || isNaN(Number(parsed.total_amount))) return null

    return {
      type: 'expense',
      total_amount: Math.abs(Number(parsed.total_amount)),
      store: parsed.store || 'Struk Belanja',
      category: parsed.category || 'daily_needs',
      description: parsed.description || parsed.store || 'Belanja via Struk',
      date: parsed.date || todayStr,
      items: parsed.items || [],
    }
  } catch (err) {
    console.error('Gemini image parsing error:', err)
    return null
  }
}

// Fallback regex parser when Gemini key is not provided
function fallbackParseText(text: string): ParsedTransaction | null {
  const lower = text.toLowerCase()
  const todayStr = new Date().toISOString().split('T')[0]

  // Detect nominal: e.g. 50rb, 50k, 50.000, 1.5jt, Rp 25000
  const match = lower.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(rb|k|ribu|jt|juta)?\b/)
  if (!match) return null

  let rawNum = parseFloat(match[1].replace(',', '.'))
  const unit = match[2]

  if (unit === 'rb' || unit === 'k' || unit === 'ribu') {
    rawNum *= 1000
  } else if (unit === 'jt' || unit === 'juta') {
    rawNum *= 1000000
  } else if (rawNum < 1000 && (lower.includes('kopi') || lower.includes('makan') || lower.includes('bensin'))) {
    // e.g. "kopi 25" -> 25000
    rawNum *= 1000
  }

  if (isNaN(rawNum) || rawNum <= 0) return null

  // Detect type
  const isIncome = /gaji|transferan|fee|honor|bonus|masuk|terima/.test(lower)

  // Detect category
  let category = isIncome ? 'other_income' : 'other_expense'
  if (/makan|kopi|minum|kafe|resto|jajan|soto|bakso|mie|nasi|ayam/.test(lower)) category = 'food'
  else if (/bensin|pertamax|pertalite|gojek|grab|maxim|tol|parkir/.test(lower)) category = 'transport'
  else if (/indomaret|alfamart|superindo|sabun|beras|minyak|odol/.test(lower)) category = 'daily_needs'
  else if (/listrik|pln|token|air|pdam|wifi|kuota|pulsa/.test(lower)) category = 'utilities'
  else if (/baju|celana|sepatu|tas|kaos/.test(lower)) category = 'clothing'
  else if (/kencan|nonton|bioskop|date/.test(lower)) category = 'date'
  else if (/obat|dokter|apotek|sakit|klinik/.test(lower)) category = 'health'
  else if (/sedekah|infaq|zakat/.test(lower)) category = 'sedekah'
  else if (/gaji/.test(lower)) category = 'salary'
  else if (/freelance|proyek/.test(lower)) category = 'freelance'

  return {
    type: isIncome ? 'income' : 'expense',
    total_amount: Math.round(rawNum),
    store: text.slice(0, 40),
    description: text,
    category,
    date: todayStr,
  }
}

// GET handler: Health check & setup verification
export async function GET() {
  const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN)
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY)
  const hasSupabaseKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  return NextResponse.json({
    status: 'online',
    service: 'AeggPepp Telegram Webhook Service',
    configured: {
      telegram_bot: hasBotToken,
      gemini_flash_ai: hasGeminiKey,
      supabase_admin: hasSupabaseKey,
    },
    message: hasBotToken && hasGeminiKey && hasSupabaseKey
      ? 'Bot siap menerima pesan & foto struk 100% gratis!'
      : 'Harap lengkapi env: TELEGRAM_BOT_TOKEN, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY',
    instructions: {
      set_webhook_url: 'https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_DOMAIN>/api/webhooks/telegram-expense',
    },
  })
}

// POST handler: Webhook receiver
export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
    const geminiKey = process.env.GEMINI_API_KEY || ''
    const supabase = createAdminClient()

    const body = await request.json()

    // 1. Direct JSON payload check (backward compatibility with scripts/N8N)
    if (body.total_amount && !body.message) {
      const amount = Math.abs(Number(body.total_amount))
      const targetRole = (body.sender_role || body.sender_name || 'aegg').toLowerCase().includes('pep') ? 'peppaa' : 'aegg'
      const { data: userProfile } = await supabase.from('profiles').select('id, display_name').eq('role', targetRole).limit(1).maybeSingle()
      const userId = userProfile?.id

      if (!userId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

      const mappedCat = CATEGORY_MAP[body.category?.toLowerCase() || ''] || 'other_expense'
      const { data: tx, error: txErr } = await supabase.from('transactions').insert({
        user_id: userId,
        type: body.type || 'expense',
        category: mappedCat,
        amount,
        description: body.store || body.description || 'Pengeluaran',
        date: body.date || new Date().toISOString().split('T')[0],
        receipt_url: body.receipt_image_url || null,
        paid_by: userId,
      }).select().single()

      if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })
      return NextResponse.json({ success: true, id: tx.id })
    }

    // 2. Telegram Callback Query Handling (Shopee-style Interactive Category Buttons & Undo)
    const callbackQuery = body?.callback_query
    if (callbackQuery) {
      const cqId = callbackQuery.id
      const data = callbackQuery.data || ''
      const msg = callbackQuery.message
      const chatId = msg?.chat?.id
      const messageId = msg?.message_id
      const sender = callbackQuery.from || {}
      const senderName = sender.first_name || 'Partner'

      // Check if it's category update: c:<cat>:<txId>
      if (data.startsWith('c:')) {
        const parts = data.split(':')
        const newCat = parts[1]
        const txId = parts[2]

        if (txId && newCat) {
          const { data: updatedTx, error: upErr } = await supabase
            .from('transactions')
            .update({ category: newCat })
            .eq('id', txId)
            .select('amount, description, date, type')
            .single()

          if (!upErr && updatedTx) {
            const catMap: Record<string, string> = {
              food: '🍽️ Makanan & Minuman',
              daily_needs: '🏪 Kebutuhan Harian',
              shopping: '🛍️ Belanja Keperluan',
              transport: '🚗 Transportasi & Bensin',
              date: '🌹 Agenda Berdua (Kencan)',
              bills: '💡 Tagihan & Utilitas',
              health: '🏥 Kesehatan & Obat',
              other_expense: '💳 Pengeluaran Lainnya',
            }
            const cleanCat = catMap[newCat] || newCat
            if (botToken) {
              await answerTelegramCallback(cqId, `✅ Kategori diubah ke ${cleanCat}!`, botToken)
              const updatedText = `✅ <b>Berhasil Dicatat!</b>\n\n• <b>Jenis:</b> Pengeluaran 💳\n• <b>Toko / Ket:</b> ${updatedTx.description || 'Pengeluaran'}\n• <b>Nominal:</b> <b>${formatIDR(Number(updatedTx.amount))}</b>\n• <b>Kategori:</b> ${cleanCat}\n• <b>Tanggal:</b> ${updatedTx.date}\n• <b>Diperbarui oleh:</b> ${senderName}\n\n<i>Kategori tersinkronisasi otomatis ke AeggPepp Workspace.</i>`
              await editTelegramMessage(chatId, messageId, updatedText, botToken, buildCategoryKeyboard(txId, newCat))
            }
            return NextResponse.json({ ok: true, updated_category: newCat })
          }
        }
        if (botToken) await answerTelegramCallback(cqId, 'Gagal memperbarui kategori.', botToken)
        return NextResponse.json({ ok: true })
      }

      // Check if it's transaction cancellation: d:<txId>
      if (data.startsWith('d:')) {
        const txId = data.replace('d:', '').trim()
        if (txId) {
          const { data: deletedTx } = await supabase
            .from('transactions')
            .delete()
            .eq('id', txId)
            .select('description, amount')
            .single()

          if (botToken) {
            await answerTelegramCallback(cqId, 'Transaksi berhasil dibatalkan dan dihapus.', botToken)
            const cancelText = `❌ <b>Transaksi Dibatalkan</b>\n\n<s>${deletedTx?.description || 'Pengeluaran'} (${formatIDR(Number(deletedTx?.amount || 0))})</s>\n\n<i>Dihapus dari buku kas oleh ${senderName}.</i>`
            await editTelegramMessage(chatId, messageId, cancelText, botToken, { inline_keyboard: [] })
          }
          return NextResponse.json({ ok: true, deleted_tx: txId })
        }
      }

      return NextResponse.json({ ok: true })
    }

    // 3. Telegram Message Handling
    const message = body?.message || body?.edited_message
    if (!message) {
      return NextResponse.json({ ok: true, note: 'No message in update' })
    }

    const chatId = message.chat?.id
    const sender = message.from || {}
    const senderName = sender.first_name || sender.username || 'Partner'
    const username = (sender.username || '').toLowerCase()
    const firstName = (sender.first_name || '').toLowerCase()
    const text = (message.text || message.caption || '').trim()

    // Identify Aegg vs Peppaa
    let targetRole: 'aegg' | 'peppaa' = 'aegg'
    if (
      username.includes('peppaa') ||
      username.includes('pepa') ||
      firstName.includes('peppaa') ||
      firstName.includes('pepa') ||
      sender.id?.toString() === process.env.TELEGRAM_PEPPAA_CHAT_ID
    ) {
      targetRole = 'peppaa'
    } else if (
      username.includes('aegg') ||
      firstName.includes('aegg') ||
      sender.id?.toString() === process.env.TELEGRAM_AEGG_CHAT_ID
    ) {
      targetRole = 'aegg'
    }

    // Fetch user from DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, role')
      .eq('role', targetRole)
      .limit(1)
      .maybeSingle()

    const userId = profile?.id
    const displayName = profile?.display_name || (targetRole === 'peppaa' ? 'Peppaa' : 'Aegg')

    // Lowercase version for easy matching
    const lowerText = text.toLowerCase()

    // 1. Handle /start or /help command
    if (text === '/start' || text === '/help' || text === '/menu' || lowerText === 'bantuan' || lowerText === 'menu' || lowerText === '❓ bantuan') {
      const welcome = `🌸 <b>Halo ${displayName}!</b>

Asisten Pribadi <b>AeggPepp Workspace</b> siap mendampingi hari-hari kalian berdua.

<b>1. 💳 Catat Keuangan Cepat:</b>
   • Ketik langsung: <code>Kopi kenangan 24rb</code>
   • <code>Makan siang soto 35000</code>, <code>Gaji 8.5jt</code>
   • Kirim <b>Foto Struk / Nota</b> (AI membaca otomatis & muncul tombol kategori)
   • Ketik <code>/saldo</code> untuk ringkasan bulan ini

<b>2. 🛒 Daftar Belanja (Smart Grocery):</b>
   • <code>/belanja Susu kotak & Telur 1kg</code>
   • Ketik <code>/belanja</code> untuk melihat daftar belanjaan
   • <i>Kirim foto struk saat belanja, item belanjaan otomatis dicoret selesai!</i>

<b>3. 📅 Jadwal & Kalender:</b>
   • <code>/jadwal Kencan dinner di Senopati Sabtu 19:00</code>
   • <code>jadwal: Nonton bioskop besok jam 3 sore</code>
   • Ketik <code>/agenda</code> untuk melihat jadwal minggu ini

<b>4. 📋 Kelola Tugas & Todo:</b>
   • <code>/todo Beli tiket konser</code>
   • Ketik <code>/todos</code> untuk melihat tugas pending
   • <code>/done 1</code> untuk menyelesaikan tugas

<b>5. 📝 Catatan Bersama:</b>
   • <code>/note Ide liburan akhir tahun ke Bandung</code>
   • <code>catatan: Ukuran cincin nikah</code>

<i>Sentuh tombol menu di bawah layar untuk akses cepat instan!</i>`
      if (botToken && chatId) await sendTelegramMessage(chatId, welcome, botToken, persistentMenuMarkup)
      return NextResponse.json({ ok: true })
    }

    // 2. Handle /todos or /tugas (List pending tasks)
    if (text === '/todos' || text === '/tugas' || lowerText === 'daftar tugas' || lowerText === '📋 daftar tugas') {
      const { data: pendingTodos } = await supabase
        .from('todos')
        .select('id, title, priority, due_date')
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!pendingTodos || pendingTodos.length === 0) {
        if (botToken && chatId) {
          await sendTelegramMessage(chatId, `✨ <b>Tidak ada tugas pending!</b> Semua tugas sudah selesai.`, botToken)
        }
        return NextResponse.json({ ok: true })
      }

      const listStr = pendingTodos.map((t, idx) => {
        const pLabel = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'
        const dueStr = t.due_date ? ` <i>(Jatuh tempo: ${t.due_date})</i>` : ''
        return `${idx + 1}. ${pLabel} <b>${t.title}</b>${dueStr}`
      }).join('\n')

      const msg = `📋 <b>Daftar Tugas Pending (${pendingTodos.length})</b>\n\n${listStr}\n\n<i>Ketik <code>/done &lt;nomor&gt;</code> untuk menyelesaikan tugas.</i>`
      if (botToken && chatId) await sendTelegramMessage(chatId, msg, botToken)
      return NextResponse.json({ ok: true })
    }

    // 3. Handle /done or /selesai (Complete a task)
    if (text.startsWith('/done') || text.startsWith('/selesai')) {
      const query = text.replace(/^\/(done|selesai)\s*/i, '').trim()
      if (!query) {
        if (botToken && chatId) await sendTelegramMessage(chatId, `Ketik nomor atau nama tugas yang selesai, contoh: <code>/done 1</code>`, botToken)
        return NextResponse.json({ ok: true })
      }

      const num = parseInt(query, 10)
      let targetTodoId: string | null = null
      let targetTitle = ''

      if (!isNaN(num) && num > 0) {
        const { data: pendingTodos } = await supabase
          .from('todos')
          .select('id, title')
          .eq('completed', false)
          .order('created_at', { ascending: false })
          .limit(15)
        if (pendingTodos && pendingTodos[num - 1]) {
          targetTodoId = pendingTodos[num - 1].id
          targetTitle = pendingTodos[num - 1].title
        }
      } else {
        const { data: matched } = await supabase
          .from('todos')
          .select('id, title')
          .ilike('title', `%${query}%`)
          .eq('completed', false)
          .limit(1)
          .maybeSingle()
        if (matched) {
          targetTodoId = matched.id
          targetTitle = matched.title
        }
      }

      if (!targetTodoId) {
        if (botToken && chatId) await sendTelegramMessage(chatId, `⚠️ Tugas "${query}" tidak ditemukan atau sudah selesai.`, botToken)
        return NextResponse.json({ ok: true })
      }

      await supabase.from('todos').update({
        completed: true,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', targetTodoId)

      if (botToken && chatId) {
        await sendTelegramMessage(chatId, `🎉 <b>Tugas Selesai!</b>\n\n✅ <b>${targetTitle}</b>\nDiselesaikan oleh: ${displayName}`, botToken)
      }
      return NextResponse.json({ ok: true })
    }

    // 4. Handle /todo or "todo:" or "tugas:" (Create task)
    if (text.startsWith('/todo ') || lowerText.startsWith('todo:') || lowerText.startsWith('tugas:')) {
      let rawTodo = text.replace(/^\/todo\s+|^todo:\s*|^tugas:\s*/i, '').trim()
      if (rawTodo && userId) {
        let priority: 'low' | 'medium' | 'high' = 'medium'
        if (rawTodo.includes('!high') || rawTodo.includes('!tinggi') || rawTodo.includes('!urgent')) {
          priority = 'high'
          rawTodo = rawTodo.replace(/!(high|tinggi|urgent)/gi, '').trim()
        } else if (rawTodo.includes('!low') || rawTodo.includes('!rendah')) {
          priority = 'low'
          rawTodo = rawTodo.replace(/!(low|rendah)/gi, '').trim()
        }

        const { data: newTodo, error: todoErr } = await supabase.from('todos').insert({
          user_id: userId,
          title: rawTodo,
          priority,
          category: 'general',
          completed: false,
          status: 'todo',
        }).select().single()

        if (todoErr) {
          if (botToken && chatId) await sendTelegramMessage(chatId, `❌ Gagal menyimpan tugas: ${todoErr.message}`, botToken)
          return NextResponse.json({ error: todoErr.message }, { status: 500 })
        }

        const prioTag = priority === 'high' ? '🔴 Tinggi' : priority === 'low' ? '🟢 Ringan' : '🟡 Menengah'
        const msg = `✅ <b>Tugas Berhasil Ditambahkan!</b>\n\n• <b>Tugas:</b> ${rawTodo}\n• <b>Prioritas:</b> ${prioTag}\n• <b>Dibuat untuk:</b> ${displayName}\n\n<i>Tersinkronisasi otomatis ke Dashboard Tasks.</i>`
        if (botToken && chatId) await sendTelegramMessage(chatId, msg, botToken)
        return NextResponse.json({ ok: true, todo_id: newTodo?.id })
      }
    }

    // 4b. Handle /belanja (tanpa teks) or /grocery (List shopping items)
    if (text === '/belanja' || text === '/grocery' || lowerText === 'daftar belanja' || lowerText === '🛒 daftar belanja') {
      const { data: shoppingTodos } = await supabase
        .from('todos')
        .select('id, title')
        .eq('category', 'shopping')
        .eq('completed', false)
        .order('created_at', { ascending: false })

      if (!shoppingTodos || shoppingTodos.length === 0) {
        if (botToken && chatId) {
          await sendTelegramMessage(
            chatId,
            `🛒 <b>Daftar Belanjaan Bersama Kosong!</b>\n\nSemua kebutuhan sudah terbeli. Ketik <code>/belanja &lt;nama barang&gt;</code> untuk menambah barang baru.`,
            botToken
          )
        }
        return NextResponse.json({ ok: true })
      }

      const listStr = shoppingTodos.map((t, idx) => `${idx + 1}. 🛒 <b>${t.title}</b>`).join('\n')
      const msg = `🛒 <b>Daftar Belanjaan Belum Dibeli (${shoppingTodos.length})</b>\n\n${listStr}\n\n<i>Kirim foto struk saat belanja untuk mencoret otomatis!</i>`
      if (botToken && chatId) await sendTelegramMessage(chatId, msg, botToken)
      return NextResponse.json({ ok: true })
    }

    // 4c. Handle /belanja <item> or "belanja: <item>" or "beli: <item>" (Add shopping item)
    if (text.startsWith('/belanja ') || lowerText.startsWith('belanja:') || lowerText.startsWith('beli:')) {
      const rawItem = text.replace(/^\/belanja\s+|^belanja:\s*|^beli:\s*/i, '').trim()
      if (rawItem && userId) {
        const { data: newTodo, error: todoErr } = await supabase
          .from('todos')
          .insert({
            user_id: userId,
            title: rawItem,
            category: 'shopping',
            status: 'todo',
            priority: 'medium',
            completed: false,
          })
          .select()
          .single()

        if (todoErr) {
          if (botToken && chatId) await sendTelegramMessage(chatId, `❌ Gagal menambah belanjaan: ${todoErr.message}`, botToken)
          return NextResponse.json({ error: todoErr.message }, { status: 500 })
        }

        const msg = `🛒 <b>Barang Belanjaan Ditambahkan!</b>\n\n• <b>Barang:</b> ${rawItem}\n• <b>Dicatat oleh:</b> ${displayName}\n\n<i>Otomatis dicoret jika struk belanja dikirimkan nanti.</i>`
        if (botToken && chatId) await sendTelegramMessage(chatId, msg, botToken)
        return NextResponse.json({ ok: true, todo_id: newTodo?.id })
      }
    }

    // 5. Handle /agenda or /jadwal (Upcoming events & deadlines)
    if (text === '/agenda' || text === '/jadwal' || lowerText === 'jadwal hari ini' || lowerText === 'jadwal minggu ini' || lowerText === '📅 jadwal minggu ini') {
      const now = new Date()
      const todayIso = now.toISOString()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data: upcomingEvents } = await supabase
        .from('events')
        .select('title, start_date, all_day')
        .gte('start_date', todayIso.split('T')[0])
        .lte('start_date', nextWeek)
        .order('start_date', { ascending: true })
        .limit(8)

      const { data: dueTodos } = await supabase
        .from('todos')
        .select('title, due_date')
        .eq('completed', false)
        .not('due_date', 'is', null)
        .gte('due_date', todayIso.split('T')[0])
        .lte('due_date', nextWeek.split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5)

      let agendaMsg = `📅 <b>Agenda & Jadwal Bersama (7 Hari ke Depan)</b>\n\n`
      if ((!upcomingEvents || upcomingEvents.length === 0) && (!dueTodos || dueTodos.length === 0)) {
        agendaMsg += `<i>Belum ada agenda atau deadline dalam 7 hari ini. Waktu santai berdua! ✨</i>`
      } else {
        if (upcomingEvents && upcomingEvents.length > 0) {
          agendaMsg += `<b>Acara / Kencan:</b>\n`
          for (const ev of upcomingEvents) {
            const evDate = new Date(ev.start_date)
            const dateStr = evDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
            const timeStr = ev.all_day ? 'Seharian' : evDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            agendaMsg += `• <b>${ev.title}</b> (${dateStr}, ${timeStr})\n`
          }
          agendaMsg += `\n`
        }

        if (dueTodos && dueTodos.length > 0) {
          agendaMsg += `<b>Deadline Tugas:</b>\n`
          for (const td of dueTodos) {
            agendaMsg += `• ${td.title} (${td.due_date})\n`
          }
        }
      }

      if (botToken && chatId) await sendTelegramMessage(chatId, agendaMsg, botToken)
      return NextResponse.json({ ok: true })
    }

    // 6. Handle /event or /jadwal or "event:" or "jadwal:" (Create calendar event)
    if (text.startsWith('/event ') || text.startsWith('/jadwal ') || text.startsWith('/agenda ') || lowerText.startsWith('event:') || lowerText.startsWith('jadwal:')) {
      const rawEventText = text.replace(/^\/(event|jadwal|agenda)\s+|^event:\s*|^jadwal:\s*/i, '').trim()
      if (rawEventText && userId) {
        let parsedEv: ParsedEvent | null = null
        if (geminiKey) {
          parsedEv = await parseEventWithGemini(rawEventText, geminiKey)
        }
        if (!parsedEv) {
          const tomorrow = new Date(Date.now() + 86400000)
          parsedEv = {
            title: rawEventText,
            start_date: tomorrow.toISOString(),
            end_date: new Date(tomorrow.getTime() + 3600000).toISOString(),
            all_day: false,
            description: 'Dibuat via Telegram Bot',
          }
        }

        const { data: newEv, error: evErr } = await supabase.from('events').insert({
          user_id: userId,
          title: parsedEv.title,
          description: parsedEv.description || 'Dibuat via Telegram Bot',
          start_date: parsedEv.start_date,
          end_date: parsedEv.end_date,
          all_day: parsedEv.all_day,
          color: '#E11D48',
        }).select().single()

        if (evErr) {
          if (botToken && chatId) await sendTelegramMessage(chatId, `❌ Gagal menyimpan jadwal: ${evErr.message}`, botToken)
          return NextResponse.json({ error: evErr.message }, { status: 500 })
        }

        const dateFormatted = new Date(parsedEv.start_date).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        const timeFormatted = parsedEv.all_day ? 'Sepanjang Hari' : new Date(parsedEv.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

        const confMsg = `📅 <b>Jadwal Berhasil Disimpan!</b>\n\n• <b>Acara:</b> ${parsedEv.title}\n• <b>Hari & Tanggal:</b> ${dateFormatted}\n• <b>Waktu:</b> ${timeFormatted}\n• <b>Dibuat oleh:</b> ${displayName}\n\n<i>Tersinkronisasi otomatis ke Kalender Web & Google Calendar.</i>`
        if (botToken && chatId) await sendTelegramMessage(chatId, confMsg, botToken)
        return NextResponse.json({ ok: true, event_id: newEv?.id })
      }
    }

    // 7. Handle /note or "note:" or "catatan:" (Create note)
    if (text.startsWith('/note ') || lowerText.startsWith('note:') || lowerText.startsWith('catatan:')) {
      const noteContent = text.replace(/^\/note\s+|^note:\s*|^catatan:\s*/i, '').trim()
      if (noteContent && userId) {
        try {
          // 1. Log to activity_logs
          await supabase.from('activity_logs').insert({
            user_id: userId,
            action: 'create_note',
            entity_type: 'note',
            details: {
              content: noteContent,
              author: displayName,
            },
          })

          // 2. Also save to todos as memo so it appears in workspace
          await supabase.from('todos').insert({
            user_id: userId,
            title: `📝 ${noteContent}`,
            category: 'other',
            completed: false,
            status: 'todo',
            priority: 'medium',
          })
        } catch (logErr) {
          console.error('Failed to log note:', logErr)
        }

        const noteMsg = `📝 <b>Catatan Berhasil Disimpan!</b>\n\n"<i>${noteContent}</i>"\n\n• <b>Penulis:</b> ${displayName}\n<i>Tersimpan dan dapat diakses di AeggPepp Workspace.</i>`
        if (botToken && chatId) await sendTelegramMessage(chatId, noteMsg, botToken)
        return NextResponse.json({ ok: true })
      }
    }

    // 8. Handle /saldo or /rekap command
    if (text === '/saldo' || text === '/rekap' || lowerText === 'cek saldo' || lowerText === '💳 cek saldo') {
      const now = new Date()
      const cm = now.getMonth(), cy = now.getFullYear()
      const { data: monthlyTxs } = await supabase
        .from('transactions')
        .select('type, amount, date')

      const currentMonthTxs = (monthlyTxs || []).filter(t => {
        const d = new Date(t.date)
        return d.getMonth() === cm && d.getFullYear() === cy
      })

      const totalIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const totalExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const cashFlow = totalIncome - totalExpense

      const { data: savings } = await supabase.from('savings_accounts').select('balance')
      const totalSavings = (savings || []).reduce((s, a) => s + Number(a.balance), 0)

      const rekapMsg = `📊 <b>Ringkasan Keuangan (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})</b>

• <b>Pemasukan:</b> ${formatIDR(totalIncome)}
• <b>Pengeluaran:</b> ${formatIDR(totalExpense)}
• <b>Arus Kas:</b> ${formatIDR(cashFlow)}
• <b>Total Tabungan:</b> ${formatIDR(totalSavings)}

<i>Selalu jaga kesehatan finansial bersama untuk masa depan yang tenang ✨</i>`
      if (botToken) await sendTelegramMessage(chatId, rekapMsg, botToken)
      return NextResponse.json({ ok: true })
    }

    let parsedResult: ParsedTransaction | null = null

    // 3. Process Photo / Receipt
    if (message.photo && message.photo.length > 0) {
      if (!botToken) {
        return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 })
      }

      // Pick the highest resolution photo
      const highestResPhoto = message.photo[message.photo.length - 1]
      const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${highestResPhoto.file_id}`)
      const fileData = await fileRes.json()

      if (fileData.ok && fileData.result?.file_path) {
        const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`)
        const arrayBuffer = await downloadRes.arrayBuffer()
        const base64Image = Buffer.from(arrayBuffer).toString('base64')

        if (geminiKey) {
          parsedResult = await parseReceiptImageWithGemini(base64Image, text, geminiKey)
        }
      }
    } else if (text) {
      // 4. Process Text Message
      if (geminiKey) {
        parsedResult = await parseTextWithGemini(text, geminiKey)
      }
      if (!parsedResult) {
        // Fallback to local regex parser
        parsedResult = fallbackParseText(text)
      }
    }

    if (!parsedResult || !parsedResult.total_amount) {
      if (botToken && chatId) {
        await sendTelegramMessage(
          chatId,
          `⚠️ Maaf ${displayName}, nominal tidak terbaca dengan jelas.\n\nContoh yang bisa dibaca:\n• <code>Kopi kenangan 24rb</code>\n• <code>Makan siang 35.000</code>\nAtau coba kirim foto struk dengan pencahayaan yang cukup jelas ya!`,
          botToken
        )
      }
      return NextResponse.json({ ok: true, note: 'Could not parse financial data' })
    }

    // 5. Insert into Supabase
    if (!userId) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const cleanCategory = CATEGORY_MAP[parsedResult.category.toLowerCase()] || 'other_expense'

    let finalDescription = parsedResult.store || parsedResult.description || 'Pengeluaran'
    if (parsedResult.items && parsedResult.items.length > 0) {
      const itemsSummary = parsedResult.items.map(i => `${i.name} (${formatIDR(i.price)})`).join(', ')
      finalDescription = `${finalDescription} • ${itemsSummary}`
    }

    const { data: newTx, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: parsedResult.type,
        category: cleanCategory,
        amount: parsedResult.total_amount,
        description: finalDescription,
        date: parsedResult.date,
        paid_by: userId,
        is_split: false,
        is_settled: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting transaction:', insertError)
      if (botToken && chatId) {
        await sendTelegramMessage(chatId, `❌ Gagal menyimpan transaksi: ${insertError.message}`, botToken)
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 6. Log to activity_logs
    try {
      await supabase.from('activity_logs').insert({
        user_id: userId,
        action: 'add_transaction',
        page: 'Finance',
        metadata: {
          amount: parsedResult.total_amount,
          category: cleanCategory,
          description: parsedResult.store,
          via: 'telegram_bot',
          transaction_id: newTx?.id,
        },
      })
    } catch (logErr) {
      console.error('Failed to log telegram activity:', logErr)
    }

    // 7. Auto check-off grocery / shopping items if receipt items match
    const checkedOffItems: string[] = []
    if (parsedResult.items && parsedResult.items.length > 0) {
      try {
        const { data: shoppingTodos } = await supabase
          .from('todos')
          .select('id, title')
          .eq('category', 'shopping')
          .eq('completed', false)

        if (shoppingTodos && shoppingTodos.length > 0) {
          for (const item of parsedResult.items) {
            const itemLower = item.name.toLowerCase()
            const matched = shoppingTodos.find((t) => {
              const todoLower = t.title.toLowerCase()
              return todoLower.includes(itemLower) || itemLower.includes(todoLower)
            })

            if (matched && !checkedOffItems.includes(matched.title)) {
              await supabase
                .from('todos')
                .update({
                  completed: true,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('id', matched.id)

              checkedOffItems.push(matched.title)
            }
          }
        }
      } catch (checkErr) {
        console.error('Failed to auto check-off grocery items:', checkErr)
      }
    }

    // 8. Send confirmation to Telegram
    const typeLabel = parsedResult.type === 'income' ? 'Pemasukan 💰' : 'Pengeluaran 💳'
    const catMap: Record<string, string> = {
      food: '🍽️ Makanan & Minuman',
      daily_needs: '🏪 Kebutuhan Harian',
      shopping: '🛍️ Belanja Keperluan',
      transport: '🚗 Transportasi & Bensin',
      date: '🌹 Agenda Berdua (Kencan)',
      bills: '💡 Tagihan & Utilitas',
      health: '🏥 Kesehatan & Obat',
      other_expense: '💳 Pengeluaran Lainnya',
      salary: '💰 Gaji',
      freelance: '💻 Freelance',
      investment: '📈 Investasi',
      gift: '🎁 Hadiah',
      other_income: '💵 Pemasukan Lainnya',
    }
    const cleanCategoryDisplay = catMap[cleanCategory] || cleanCategory

    let confirmationText = `✅ <b>Berhasil Dicatat!</b>

• <b>Jenis:</b> ${typeLabel}
• <b>Toko / Ket:</b> ${parsedResult.store}
• <b>Nominal:</b> <b>${formatIDR(parsedResult.total_amount)}</b>
• <b>Kategori:</b> ${cleanCategoryDisplay}
• <b>Tanggal:</b> ${parsedResult.date}
• <b>Dicatat untuk:</b> ${displayName}`

    if (checkedOffItems.length > 0) {
      confirmationText += `\n\n🛒 <b>Daftar Belanjaan Dicoret Otomatis:</b>\n` + checkedOffItems.map((i) => `• <s>${i}</s> ✅`).join('\n')
    }

    if (parsedResult.type === 'expense' && newTx?.id) {
      confirmationText += `\n\n<i>Kategori kurang sesuai? Klik tombol di bawah untuk langsung ubah:</i>`
    } else {
      confirmationText += `\n\n<i>Tersimpan otomatis di AeggPepp Workspace.</i>`
    }

    const keyboard = parsedResult.type === 'expense' && newTx?.id
      ? buildCategoryKeyboard(newTx.id, cleanCategory)
      : undefined

    if (botToken && chatId) {
      await sendTelegramMessage(chatId, confirmationText, botToken, keyboard)
    }

    return NextResponse.json({
      success: true,
      transaction_id: newTx.id,
      recorded: parsedResult,
    })
  } catch (error: any) {
    console.error('Telegram webhook global error:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
