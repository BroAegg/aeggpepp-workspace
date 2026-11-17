import { config } from '../config.js';
import { logger } from '../logger.js';

export interface ParsedTaskOrList {
  isTaskIntent: boolean;
  title: string;
  description?: string;
  category?: string;
  items: string[];
}

const GEMINI_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

export function isTaskOrListTrigger(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const taskKeywords = [
    'list',
    'catat',
    'catatkan',
    'tulis',
    'tambahin',
    'masukin',
    'to-do',
    'todo',
    'tugas',
    'catatan',
    'belanjaan',
    'daftar',
    'checklist',
    'reminder',
    'ingetin',
  ];

  return taskKeywords.some((kw) => lower.includes(kw));
}

export function resolveTaskScope(
  isGroup: boolean,
  text: string,
  userRole: 'aegg' | 'peppaa'
): { scope: 'aegg' | 'peppaa' | 'joint'; isPrivate: boolean } {
  const lower = text.toLowerCase();
  const personalKeywords = [
    'pribadi',
    'untukku',
    'rahasia',
    'sendiri',
    'punyaku',
    'dompetku',
    'buatku',
    'khususku',
  ];
  const jointKeywords = [
    'bersama',
    'gabungan',
    'kita',
    'berdua',
    'nikah',
    'wedding',
    'kas',
    'bareng',
    'rumah',
  ];

  if (isGroup) {
    if (personalKeywords.some((kw) => lower.includes(kw))) {
      return { scope: userRole, isPrivate: true };
    }
    return { scope: 'joint', isPrivate: false };
  } else {
    if (jointKeywords.some((kw) => lower.includes(kw))) {
      return { scope: 'joint', isPrivate: false };
    }
    return { scope: userRole, isPrivate: false };
  }
}

function parseTaskRegexFallback(text: string): ParsedTaskOrList {
  const clean = text
    .replace(/\b(n+a+n+a*n*g*|n+a+n+g+|n+a+n+k+|nanang|nang)\b/gi, '')
    .trim();

  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

  // Check if first line contains title or colon
  const firstLine = lines[0] || '';
  let title = '';
  let category = 'Tugas';
  const items: string[] = [];

  const lower = clean.toLowerCase();
  if (lower.includes('belanja') || lower.includes('shopping')) {
    category = 'Belanja';
  } else if (lower.includes('nikah') || lower.includes('wedding')) {
    category = 'Wedding';
  } else if (lower.includes('rumah') || lower.includes('kost')) {
    category = 'Rumah';
  }

  // Pattern 1: Colon separation (e.g., "list belanja: telur, beras, minyak")
  if (firstLine.includes(':')) {
    const parts = firstLine.split(':');
    title = parts[0].replace(/^(catat|tulis|tambahin|buatkan|bikin)\s+/i, '').trim();
    if (!title) title = category === 'Belanja' ? 'List Belanjaan' : 'Daftar Catatan';

    // The rest of the first line + following lines
    const remainder = parts.slice(1).join(':').trim();
    if (remainder) {
      const splitItems = remainder
        .split(/[,;\n]+/)
        .map((s) => s.replace(/^[-*•\d\.\s]+/, '').trim())
        .filter(Boolean);
      items.push(...splitItems);
    }

    for (let i = 1; i < lines.length; i++) {
      const lineItem = lines[i].replace(/^[-*•\d\.\s]+/, '').trim();
      if (lineItem) items.push(lineItem);
    }
  } else if (lines.length > 1) {
    // Pattern 2: Multiline bullet list
    title = firstLine.replace(/^(catat|tulis|tambahin|buatkan|bikin)\s+/i, '').trim();
    if (!title) title = 'Daftar Catatan';

    for (let i = 1; i < lines.length; i++) {
      const lineItem = lines[i].replace(/^[-*•\d\.\s]+/, '').trim();
      if (lineItem) items.push(lineItem);
    }
  } else {
    // Pattern 3: Single line note/todo
    // Check if comma separated items
    const stripped = clean
      .replace(/^(catat|tulis|tambahin|tolong catat|masukin)\s+(list|catatan|to-do|todo)?\s*/i, '')
      .trim();

    if (stripped.includes(',') && !stripped.includes(' dan ')) {
      const splitItems = stripped
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (splitItems.length > 1) {
        title = category === 'Belanja' ? 'List Belanjaan' : 'Daftar Catatan';
        items.push(...splitItems);
      } else {
        title = stripped;
      }
    } else {
      title = stripped || 'Catatan Baru';
    }
  }

  // Ensure title is capitalize and clean
  if (!title) title = 'Catatan Nanang';
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    isTaskIntent: true,
    title,
    category,
    items,
  };
}

const buildTaskNlpPrompt = (text: string) => `
Analisis pesan teks berikut apakah ini adalah permintaan membuat catatan, to-do, list belanjaan, atau checklist tugas:
"${text}"

Tugas Anda:
1. Identifikasi apakah pesan ini berisi instruksi mencatat hal/list/tugas.
2. Jika ini pencatatan transaksi keuangan murni dengan nominal harga belanja yang SUDAH dibayar (contoh: "catat makan 25rb"), set isTaskIntent = false.
   Tapi jika ini daftar barang yang AKAN dibeli / list belanjaan / todo / catatan (contoh: "list belanja: beras, telur", atau "catat jangan lupa bayar listrik"), set isTaskIntent = true.
3. Pecah item-item terpisah jika ada (misal belanjaan atau checklist langkah).
4. Buatkan judul ringkas dan kategori yang sesuai (contoh: "Belanja", "Wedding", "Tugas", "Pribadi", "Rumah").

Format output HANYA JSON murni tanpa markdown:
{
  "isTaskIntent": true | false,
  "title": "Judul Catatan / List Utama",
  "category": "Belanja" | "Wedding" | "Tugas" | "Rumah" | "Pribadi",
  "items": ["Item 1", "Item 2", "Item 3"] // Array string item-item list, kosong jika hanya catatan biasa
}
`;

function cleanAndParseJson<T>(rawContent: string): T | null {
  try {
    let cleaned = rawContent.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
    }
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function parseWithGroqTaskNlp(text: string): Promise<ParsedTaskOrList | null> {
  if (!config.groqApiKey) return null;

  try {
    const model = config.groqModel || 'llama-3.3-70b-versatile';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildTaskNlpPrompt(text) }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    return cleanAndParseJson<ParsedTaskOrList>(content);
  } catch {
    return null;
  }
}

async function parseWithGeminiTaskNlp(text: string): Promise<ParsedTaskOrList | null> {
  if (!config.geminiApiKey) return null;

  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildTaskNlpPrompt(text) }] }],
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

      const parsed = cleanAndParseJson<ParsedTaskOrList>(candidate);
      if (parsed) return parsed;
    } catch {}
  }

  return null;
}

export async function parseTaskOrListText(text: string): Promise<ParsedTaskOrList> {
  if (config.groqApiKey) {
    const groqResult = await parseWithGroqTaskNlp(text);
    if (groqResult && typeof groqResult.isTaskIntent === 'boolean') {
      return groqResult;
    }
  }

  if (config.geminiApiKey) {
    const geminiResult = await parseWithGeminiTaskNlp(text);
    if (geminiResult && typeof geminiResult.isTaskIntent === 'boolean') {
      return geminiResult;
    }
  }

  return parseTaskRegexFallback(text);
}
