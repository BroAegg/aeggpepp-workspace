import { config } from '../config.js';
import { logger } from '../logger.js';
import { validateTransactionDate } from '../database/supabase.js';

export interface ParsedReceiptItem {
  item_name: string;
  quantity: number;
  unit_price?: number;
  total_price: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string;
  totalAmount: number;
  category: string;
  items: ParsedReceiptItem[];
  paymentMethod?: string;
}

const systemInstruction = `
Kamu adalah asisten keuangan AI cerdas untuk pasangan "Aegg & Peppaa" di Indonesia.
Tugasmu: Ekstrak data dari GAMBAR STRUK BELANJA, BON RESTO, BUKTI TRANSFER, atau SCREENSHOT PEMBAYARAN secara akurat.

JENIS GAMBAR:
1. SCREENSHOT BUKTI TRANSFER M-BANKING (BCA, Mandiri, BRImo, BNI, Seabank, Bank Jago):
   - "merchant": Nama penerima transfer atau bank & penerima (contoh: "Transfer BCA ke Budi", "Seabank ke Peppaa").
   - "totalAmount": Nominal transfer yang berhasil dikirim (integer murni).
   - "category": "Food & Drinks" / "Shopping" / "Bills & Utilities" / "Other".
   - "paymentMethod": Nama bank.

2. SCREENSHOT PEMBAYARAN QRIS / E-WALLET (GoPay, OVO, DANA, ShopeePay, QRIS BCA):
   - "merchant": Nama merchant penerima QRIS (contoh: "Mie Gacoan", "Kopi Kenangan", "Indomaret").
   - "totalAmount": Total pembayaran yang tertera pada bukti transaksi (contoh: 45000).
   - "category": Food & Drinks / Groceries / Transport / Shopping / dll.
   - "paymentMethod": "QRIS" atau nama e-wallet.

3. STRUK KASIR FISIK (Indomaret, Alfamart, Superindo, Restoran, SPBU, Apotek):
   - "merchant": Nama toko / restoran di bagian atas struk.
   - "totalAmount": Nominal TOTAL / GRAND TOTAL yang dibayar konsumen (JANGAN ambil uang diterima atau kembalian).
   - "category":
     - Makanan/minuman/cafe/resto -> "Food & Drinks"
     - Minimarket/supermarket -> "Groceries"
     - Bensin/SPBU/parkir/tol -> "Transport"
     - Obat/vitamin/kesehatan -> "Health & Personal Care"
     - Baju/fashion/alat -> "Shopping"
   - "items": Rincian barang dengan quantity, unit_price, total_price.

KATEGORI YANG DIPERBOLEHKAN (PILIH 1):
- Food & Drinks
- Groceries
- Transport
- Shopping
- Bills & Utilities
- Entertainment
- Health & Personal Care
- Other

OUTPUT HARUS BERUPA JSON MURNI (VALID JSON) TANPA PENJELASAN LAIN:
{
  "merchant": "Nama Toko / Penerima Transfer",
  "date": "YYYY-MM-DD",
  "totalAmount": 45000,
  "category": "Food & Drinks",
  "paymentMethod": "QRIS",
  "items": [
    {
      "item_name": "Mie Gacoan Level 2",
      "quantity": 1,
      "unit_price": 15000,
      "total_price": 15000
    }
  ]
}
`;

export function parseIndonesianCurrency(val: any): number {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  let str = String(val).trim();
  str = str.replace(/^(Rp|IDR)\s*/i, '');
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(/,/g, '.');
  } else if (str.includes('.') && !str.includes(',')) {
    const parts = str.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      str = str.replace(/\./g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(/,/g, '.');
  }
  str = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

function sanitizeReceiptJson(jsonString: string): ParsedReceipt | null {
  try {
    let cleaned = jsonString.trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
    }
    const parsed = JSON.parse(cleaned);

    const total = parseIndonesianCurrency(parsed.totalAmount || parsed.total_amount || parsed.total);
    if (total <= 0) return null;

    const merchant = String(
      parsed.merchant || parsed.merchant_name || parsed.store_name || parsed.recipient || 'Struk / Bukti Pembayaran'
    ).trim();

    const rawDate = String(parsed.date || '').trim();
    const validatedDate = validateTransactionDate(rawDate);

    let items: ParsedReceiptItem[] = [];
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      items = parsed.items.map((it: any) => {
        const itemTotal = parseIndonesianCurrency(it.total_price || it.total || it.price);
        const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
        const unit = it.unit_price
          ? parseIndonesianCurrency(it.unit_price)
          : itemTotal > 0 && qty > 0
          ? Math.round(itemTotal / qty)
          : itemTotal;
        return {
          item_name: String(it.item_name || it.name || it.description || 'Item Belanja').trim(),
          quantity: qty,
          unit_price: unit,
          total_price: itemTotal > 0 ? itemTotal : unit * qty,
        };
      });
    } else {
      items = [
        {
          item_name: merchant,
          quantity: 1,
          unit_price: total,
          total_price: total,
        },
      ];
    }

    return {
      merchant,
      date: validatedDate,
      totalAmount: total,
      category: String(parsed.category || 'Other').trim(),
      paymentMethod: parsed.paymentMethod ? String(parsed.paymentMethod).trim() : undefined,
      items,
    };
  } catch (err: any) {
    logger.error({ err: err.message }, '[Receipt Vision] Failed to parse JSON response');
    return null;
  }
}

const GEMINI_VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

async function parseWithGeminiVision(base64Image: string, mimeType: string): Promise<ParsedReceipt | null> {
  if (!config.geminiApiKey) {
    logger.error('[Gemini Vision] No GEMINI_API_KEY configured');
    return null;
  }

  const cleanMimeType = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

  for (const model of GEMINI_VISION_MODELS) {
    try {
      logger.info({ model }, `[Gemini Vision] Analyzing receipt with ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`;

      const body = {
        contents: [
          {
            parts: [
              { text: systemInstruction },
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn({ model, status: response.status, errorText }, '[Gemini Vision] Model call failed, trying next...');
        continue;
      }

      const resData = (await response.json()) as any;
      const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        const parsed = sanitizeReceiptJson(text);
        if (parsed) {
          logger.info(
            { model, merchant: parsed.merchant, total: parsed.totalAmount },
            '[Gemini Vision] Receipt successfully parsed'
          );
          return parsed;
        }
      }
    } catch (err: any) {
      logger.warn({ model, err: err.message }, '[Gemini Vision] Error calling model');
    }
  }

  return null;
}

export async function parseReceiptWithVision(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ParsedReceipt | null> {
  const base64Image = imageBuffer.toString('base64');
  return await parseWithGeminiVision(base64Image, mimeType);
}

export function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
}
