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
async function sendTelegramMessage(chatId: number | string, text: string, botToken: string) {
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
    console.error('Failed to send Telegram message:', err)
  }
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

// Gemini 1.5 Flash Vision receipt image parsing
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

    // 2. Telegram Update Handling
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

    // Handle /start or /help command
    if (text === '/start' || text === '/help') {
      const welcome = `🌸 <b>Halo ${displayName}!</b>

Bot Pencatatan Keuangan <b>AeggPepp Workspace</b> siap menemani hari-hari kalian berdua.

<b>Cara Menggunakan:</b>
1. <b>Ketik Catatan Cepat:</b>
   • <code>Beli kopi kenangan 24rb</code>
   • <code>Makan siang soto ayam 25000</code>
   • <code>Isi bensin pertamax 50rb</code>
   • <code>Gaji kantor masuk 8.5jt</code>

2. <b>Kirim Foto Struk / Nota:</b>
   Cukup kirim foto struk belanjaanmu. AI Gemini Flash akan otomatis membaca total belanja, nama toko, dan kategorinya!

3. <b>Cek Keuangan:</b>
   Ketik <code>/saldo</code> atau <code>/rekap</code> untuk melihat ringkasan bulan ini.

<i>Data langsung tersinkronisasi ke Dashboard web secara real-time.</i>`
      if (botToken) await sendTelegramMessage(chatId, welcome, botToken)
      return NextResponse.json({ ok: true })
    }

    // Handle /saldo or /rekap command
    if (text === '/saldo' || text === '/rekap') {
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

    // 7. Send confirmation to Telegram
    const typeLabel = parsedResult.type === 'income' ? 'Pemasukan 💰' : 'Pengeluaran 💳'
    const confirmationText = `✅ <b>Berhasil Dicatat!</b>

• <b>Jenis:</b> ${typeLabel}
• <b>Toko / Ket:</b> ${parsedResult.store}
• <b>Nominal:</b> <b>${formatIDR(parsedResult.total_amount)}</b>
• <b>Kategori:</b> ${cleanCategory}
• <b>Tanggal:</b> ${parsedResult.date}
• <b>Dicatat untuk:</b> ${displayName}

<i>Tersimpan otomatis di AeggPepp Workspace.</i>`

    if (botToken && chatId) {
      await sendTelegramMessage(chatId, confirmationText, botToken)
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
