'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateFinancialHealth } from '@/lib/financial-health'
import type { Transaction, Budget, SavingsAccount } from '@/types'

// Supported models in priority order
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
]

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Builds a comprehensive couple financial context prompt for the AI Advisor
 */
export async function getFinancialAdvisorContext() {
  const supabase = await createClient()

  // 1. Fetch current user and partner
  const { data: { user } } = await supabase.auth.getUser()
  let currentUserName = 'Aegg / Peppaa'
  let role = 'partner'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('display_name, role').eq('id', user.id).single()
    if (profile?.display_name) currentUserName = profile.display_name
    if (profile?.role) role = profile.role
  }

  // 2. Fetch all transactions (for current month and overall trends)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const [txRes, budgetsRes, savingsRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, profiles:user_id(display_name, role)')
      .gte('date', startOfMonth.split('T')[0])
      .lte('date', endOfMonth.split('T')[0])
      .order('date', { ascending: false }),
    supabase.from('budgets').select('*'),
    supabase.from('savings_accounts').select('*').order('balance', { ascending: false }),
  ])

  const currentMonthTx: Transaction[] = txRes.data || []
  const budgets: Budget[] = budgetsRes.data || []
  const savingsAccounts: SavingsAccount[] = savingsRes.data || []

  // 3. Calculate health metrics
  const healthReport = calculateFinancialHealth(currentMonthTx, budgets, savingsAccounts, now)

  // 4. Group expenses by category
  const categoryTotals: Record<string, number> = {}
  currentMonthTx
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const cat = t.category || 'other'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0)
    })

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => `- ${cat}: ${formatIDR(amt)}`)
    .join('\n')

  // 5. Asset / Money Pockets distribution
  const pocketSummary = savingsAccounts
    .map((acc) => `- ${acc.name} (${acc.type}): ${formatIDR(acc.balance)}`)
    .join('\n')

  // 6. Assemble context string
  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  const contextText = `
[DATA KEUANGAN REAL-TIME BULAN ${monthName.toUpperCase()}]
- Pengguna yang sedang chat: ${currentUserName} (${role})
- Total Pemasukan Bulan Ini: ${formatIDR(healthReport.monthlyIncome)}
- Total Pengeluaran Bulan Ini: ${formatIDR(healthReport.monthlyExpense)}
- Net Tabungan (Surplus/Defisit): ${formatIDR(healthReport.netSavings)}
- Tingkat Tabungan (Savings Rate): ${healthReport.savingsRate.toFixed(1)}% (Benchmark Sehat: >= 20%)
- Rasio Pengeluaran terhadap Pemasukan: ${healthReport.expenseRatio.toFixed(1)}%
- Financial Health Score: ${healthReport.score}/100 (${healthReport.statusLabel})
- Proyeksi Pengeluaran Akhir Bulan: ${formatIDR(healthReport.burnRateVelocity.projectedMonthEnd)} (Rata-rata harian: ${formatIDR(healthReport.burnRateVelocity.dailyAverage)})
- Cadangan Dana Likuid (Runway): ${healthReport.liquidBufferMonths.toFixed(1)} Bulan Pengeluaran

[SPENDING FAIRNESS PASANGAN (AEGG vs PEPPAA)]
- Pengeluaran Aegg: ${formatIDR(healthReport.coupleSplit.aeggTotal)} (${healthReport.coupleSplit.aeggPercent.toFixed(1)}%)
- Pengeluaran Peppaa: ${formatIDR(healthReport.coupleSplit.peppaaTotal)} (${healthReport.coupleSplit.peppaaPercent.toFixed(1)}%)
- Rasio Keseimbangan: ${healthReport.coupleSplit.fairnessRatio}

[TOP 5 PENGELUARAN BULAN INI]
${topCategories || '- Belum ada pengeluaran tercatat bulan ini'}

[LOKASI UANG & ASSET POCKETS ("Di Mana Uang Kita?")]
- Total Dana di Seluruh Kantong: ${formatIDR(healthReport.totalLiquidAssets)}
${pocketSummary || '- Belum ada kantong tabungan/rekening tercatat'}

[ALERTS FINANSIAL AKTIF]
${healthReport.alerts.map((a) => `[${a.type.toUpperCase()}] ${a.title}: ${a.message}`).join('\n') || '- Tidak ada alert merah saat ini. Arus kas dalam batas aman.'}

[TARGET & PROJECT BERSAMA]
- Intimate Wedding Preparation: Target Pagu Anggaran Rp 25.000.000 (Skala 180 pax).
`.trim()

  return {
    contextText,
    currentUserName,
    healthReport,
    monthName,
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

/**
 * Server action to chat with AI Financial Advisor
 */
export async function askFinancialAdvisor(
  history: ChatMessage[],
  newMessage: string
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        success: false,
        error: 'GEMINI_API_KEY belum dikonfigurasi di server. Silakan hubungi admin.',
      }
    }

    // 1. Gather fresh context
    const { contextText, currentUserName } = await getFinancialAdvisorContext()

    // 2. Build system instruction
    const systemInstruction = `
Anda adalah "AeggPepp Financial Advisor", konsultan dan sahabat keuangan pribadi terpercaya untuk pasangan Aegg (Software Engineer 👨‍💻) dan Peppaa (Game Dev PM 👩‍💼).
Anda berbicara langsung dengan ${currentUserName}.

MISI UTAMA ANDA:
1. Memberikan saran finansial yang cerdas, realistis, anti-lebay, dan langsung bisa dieksekusi (Actionable Steps).
2. Membantu mereka mencapai target masa depan, khususnya rencana Intimate Wedding (Budget Rp 25.000.000, 180 pax) dan dana darurat/tabungan bersama.
3. Menjaga transparansi dan keadilan pengeluaran (fairness) tanpa menimbulkan rasa bersalah.

PEDOMAN GAYA & KOMUNIKASI:
- Nada bicara: Hangat, empatik, suportif, santai namun profesional seperti financial planner pribadi yang sudah akrab (bisa menyapa Bro Aegg / Sis Peppaa).
- JAWAB BERDASARKAN FAKTA & DATA RIIL yang disediakan di bawah. Jangan pernah mengarang angka pengeluaran, saldo bank, atau rasio jika tidak ada di data.
- Format respon rapi: Gunakan bullet point, cetak tebal (**bold**) angka nominal atau persentase penting.
- Berikan solusi nyata: Jika ada pos yang boros, berikan tips hemat yang tidak menyiksa. Jika ada piutang di teman atau saldo ngendap di e-wallet, berikan saran pengalihan yang cerdas.
- Jawaban padat, bernas, dan tidak bertele-tele (maksimal 3-4 paragraf atau daftar rekomendasi terstruktur).

${contextText}
`.trim()

    // 3. Format contents for Gemini API
    // Gemini expects 'user' and 'model' roles
    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = []

    // Add recent history (last 8 messages to keep tokens optimal)
    const recentHistory = history.slice(-8)
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: newMessage }],
    })

    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1200,
      },
    }

    // 4. Try models in fallback cascade
    let responseText: string | null = null
    let lastError: string | null = null

    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const data = await res.json()
          const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (candidateText) {
            responseText = candidateText
            break
          }
        } else {
          const errData = await res.text()
          console.warn(`Gemini model ${model} returned HTTP ${res.status}: ${errData}`)
          lastError = `Model ${model} status ${res.status}`
        }
      } catch (err: any) {
        console.warn(`Fetch error for model ${model}:`, err?.message)
        lastError = err?.message || 'Network error'
      }
    }

    if (!responseText) {
      return {
        success: false,
        error: lastError || 'Gagal menghubungi Gemini AI. Silakan coba sesaat lagi.',
      }
    }

    return {
      success: true,
      reply: responseText,
    }
  } catch (err: any) {
    console.error('Error in askFinancialAdvisor:', err)
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan sistem saat memproses konsultasi finansial.',
    }
  }
}
