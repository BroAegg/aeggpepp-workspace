import { config } from '../config.js';
import { logger } from '../logger.js';
import { formatRupiah } from './receiptVision.js';

export interface ParsedFinanceText {
  isFinanceIntent: boolean;
  type: 'income' | 'expense';
  amount?: number;
  category?: string;
  merchant?: string;
  description?: string;
  isSplit?: boolean;
}

export type ParsedExpenseText = ParsedFinanceText;

const GEMINI_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

function parseRegexFallback(text: string): ParsedFinanceText {
  const match = text.match(/(\d+[\d\.,]*)\s*(k|rb|ribu|jt|juta)?/i);
  if (!match) return { isFinanceIntent: false, type: 'expense' };

  let num = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'rb' || unit === 'ribu') num *= 1000;
  if (unit === 'jt' || unit === 'juta') num *= 1000000;

  const lower = text.toLowerCase();

  const isIncome =
    lower.includes('pemasukan') ||
    lower.includes('gaji') ||
    lower.includes('income') ||
    lower.includes('cair') ||
    lower.includes('transferan') ||
    lower.includes('freelance') ||
    lower.includes('honor') ||
    lower.includes('bonus') ||
    lower.includes('hadiah') ||
    lower.includes('thr') ||
    lower.includes('dapat uang') ||
    lower.includes('dapet uang');

  const cleanDesc = text
    .replace(/\b(n+a+n+a*n*g*|n+a+n+g+|n+a+n+k+|nanang|nang)\b/gi, '')
    .replace(/\b(catat|catatkan|tolong|dong|ya|nih|pemasukan|pengeluaran)\b/gi, '')
    .trim();

  let category = isIncome ? 'other_income' : 'food';
  if (isIncome) {
    if (lower.includes('gaji')) category = 'salary';
    else if (lower.includes('freelance') || lower.includes('proyek') || lower.includes('project')) category = 'freelance';
    else if (lower.includes('asprak')) category = 'asprak';
    else if (lower.includes('volunteer')) category = 'volunteer';
    else if (lower.includes('invest') || lower.includes('dividen')) category = 'investment';
    else if (lower.includes('hadiah') || lower.includes('bonus') || lower.includes('thr')) category = 'gift';
  } else {
    if (lower.includes('bensin') || lower.includes('pertamax') || lower.includes('pertalite') || lower.includes('ojol') || lower.includes('grab') || lower.includes('gojek') || lower.includes('parkir') || lower.includes('tol')) category = 'transport';
    else if (lower.includes('indomaret') || lower.includes('alfamart') || lower.includes('superindo') || lower.includes('sabun')) category = 'daily_needs';
    else if (lower.includes('makan') || lower.includes('minum') || lower.includes('gacoan') || lower.includes('kopi') || lower.includes('cafe')) category = 'food';
    else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('air') || lower.includes('wifi') || lower.includes('pulsa') || lower.includes('kuota')) category = 'utilities';
    else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('apotek')) category = 'health';
  }

  return {
    isFinanceIntent: true,
    type: isIncome ? 'income' : 'expense',
    amount: Math.round(num),
    category,
    description: cleanDesc || (isIncome ? 'Pemasukan' : 'Pengeluaran'),
    isSplit: lower.includes('split') || lower.includes('patungan') || lower.includes('berdua'),
  };
}

const buildFinanceNlpPrompt = (text: string) => `
Analisis pesan teks berikut apakah ini adalah pencatatan keuangan (pemasukan ATAU pengeluaran) untuk couple (Aegg & Peppaa):
"${text}"

Panduan Jenis Transaksi:
- "income": uang masuk, terima gaji, pemasukan, dapat transferan, fee freelance, honor, bonus, hadiah, dividen, cair.
- "expense": uang keluar, belanja makanan/barang, bayar tagihan, bensin, tiket, perawatan, servis, jajan.

Kategori yang didukung di AeggPepp:
Untuk income: salary, freelance, asprak, volunteer, investment, gift, other_income.
Untuk expense: food, daily_needs, shopping, transport, clothing, treatment, sedekah, gift_giving, vacation, entertainment, bills, utilities, internet, health, vehicle, furniture, education, saving, ewallet, date, other_expense.

Jika YA (ini transaksi):
Ekstrak dalam format JSON murni:
{
  "isFinanceIntent": true,
  "type": "income" | "expense",
  "amount": 50000,
  "category": "nama_kategori_di_atas",
  "merchant": "Nama Toko / Klien / Sumber jika ada",
  "description": "Deskripsi singkat dan rapi",
  "isSplit": true jika ada kata 'split' / 'patungan' / 'bagi dua', false jika tidak
}

Jika BUKAN transaksi keuangan:
{
  "isFinanceIntent": false
}
Output HANYA JSON tanpa markdown.
`;

async function parseWithGroqNlp(text: string): Promise<ParsedFinanceText | null> {
  if (!config.groqApiKey) return null;
  const model = config.groqModel || 'llama-3.3-70b-versatile';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildFinanceNlpPrompt(text) }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch {
    return null;
  }
}

async function parseWithGeminiNlp(text: string): Promise<ParsedFinanceText | null> {
  if (!config.geminiApiKey) return null;

  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildFinanceNlpPrompt(text) }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) continue;
      const data = (await res.json()) as any;
      const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) continue;

      return JSON.parse(candidate.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch {}
  }

  return null;
}

export async function parseFinanceText(text: string): Promise<ParsedFinanceText> {
  if (config.groqApiKey) {
    const groqResult = await parseWithGroqNlp(text);
    if (groqResult && typeof groqResult.isFinanceIntent === 'boolean') {
      return groqResult;
    }
  }

  if (config.geminiApiKey) {
    const geminiResult = await parseWithGeminiNlp(text);
    if (geminiResult && typeof geminiResult.isFinanceIntent === 'boolean') {
      return geminiResult;
    }
  }

  return parseRegexFallback(text);
}

export const parseExpenseText = parseFinanceText;
