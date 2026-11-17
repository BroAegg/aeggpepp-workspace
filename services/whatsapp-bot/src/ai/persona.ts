import { formatRupiah } from './receiptVision.js';

export const NANANG_TRIGGER_REGEX = /\b(n+a+n+a*n*g*|n+a+n+g+|n+a+n+k+|nanang|nang)\b/i;

export function isNanangTrigger(text: string): boolean {
  return NANANG_TRIGGER_REGEX.test(text);
}

export function getNanangName(role: 'aegg' | 'peppaa'): string {
  if (role === 'peppaa') {
    const nicknames = ['Peppaa', 'Bos Cantik', 'Peppaa Cantik'];
    return nicknames[Math.floor(Math.random() * nicknames.length)];
  } else {
    const nicknames = ['Aegg', 'Bos'];
    return nicknames[Math.floor(Math.random() * nicknames.length)];
  }
}

export function formatScopeLabel(scope?: 'aegg' | 'peppaa' | 'joint'): string {
  if (scope === 'joint') return '💍 Kas Bersama';
  if (scope === 'peppaa') return '👩 Peppaa (Pribadi)';
  if (scope === 'aegg') return '👨 Aegg (Pribadi)';
  return '';
}

export function formatNanangReceipt(params: {
  merchant: string;
  date: string;
  totalAmount: number;
  category: string;
  items: Array<{ item_name: string; quantity: number; unit_price?: number; total_price: number }>;
  paidByRole: 'aegg' | 'peppaa';
  isSplit?: boolean;
  scope?: 'aegg' | 'peppaa' | 'joint';
}): string {
  const buyer = getNanangName(params.paidByRole);
  const merchantName = params.merchant || 'Struk Belanja';
  const splitText = params.isSplit ? ' (Split 50:50)' : '';
  const scopeText = params.scope ? `\n🏢 Ruang: *${formatScopeLabel(params.scope)}*` : '';

  const lines: string[] = [
    `🧾 *Struk Berhasil Dicatat!*`,
    `Aman ${buyer}, struk *${merchantName}* langsung masuk ke dashboard web.`,
    ``,
    `💰 Total: *${formatRupiah(params.totalAmount)}*${splitText}`,
    `📅 Tanggal: ${params.date}`,
    `🏷️ Kategori: ${params.category}`,
    `👤 Pembayar: ${buyer}${scopeText}`,
  ];

  if (params.items && params.items.length > 0 && params.items.length <= 10) {
    lines.push('');
    lines.push('📝 *Rincian Belanja:*');
    params.items.forEach((item, idx) => {
      const qtyStr = item.quantity > 1 ? ` (${item.quantity}x)` : '';
      lines.push(`${idx + 1}. ${item.item_name}${qtyStr} — ${formatRupiah(item.total_price)}`);
    });
  }

  lines.push('');
  lines.push('💡 *Reply pesan ini dengan "batal" atau "hapus" jika ada kesalahan.*');

  return lines.join('\n');
}

export function formatNanangFinance(params: {
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category: string;
  merchant?: string;
  paidByRole: 'aegg' | 'peppaa';
  isSplit?: boolean;
  scope?: 'aegg' | 'peppaa' | 'joint';
}): string {
  const userGreeting = getNanangName(params.paidByRole);
  const scopeBadge = params.scope ? ` [${formatScopeLabel(params.scope)}]` : '';

  if (params.type === 'income') {
    const sourceText = params.merchant ? ` dari ${params.merchant}` : '';
    return [
      `💰 *Pemasukan Dicatat!*`,
      `Mantap ${userGreeting}! Pemasukan *${formatRupiah(params.amount)}* (${params.description}${sourceText})${scopeBadge} berhasil dicatat ke dashboard web.`,
      ``,
      `💡 *Reply pesan ini dengan "batal" jika ada kesalahan.*`,
    ].join('\n');
  } else {
    const splitText = params.isSplit ? ' (Split 50:50)' : '';
    const merchantText = params.merchant ? ` di ${params.merchant}` : '';
    return [
      `💸 *Pengeluaran Dicatat!*`,
      `Siap ${userGreeting}, pengeluaran *${formatRupiah(params.amount)}* (${params.description}${merchantText})${splitText}${scopeBadge} udah masuk ke dashboard.`,
      ``,
      `💡 *Reply pesan ini dengan "batal" jika ada kesalahan.*`,
    ].join('\n');
  }
}

export function formatNanangExpense(params: {
  description: string;
  amount: number;
  category: string;
  merchant?: string;
  paidByRole: 'aegg' | 'peppaa';
  isSplit?: boolean;
}): string {
  return formatNanangFinance({
    ...params,
    type: 'expense',
  });
}

export function formatNanangUndoSuccess(params: {
  amount: number;
  merchant: string;
  userRole: 'aegg' | 'peppaa';
}): string {
  const userName = getNanangName(params.userRole);
  return `❌ *Transaksi Berhasil Dibatalkan!*\nTransaksi senilai *${formatRupiah(params.amount)}* di *${params.merchant}* telah dihapus dari dashboard web, ${userName}.`;
}

export function formatNanangScheduleConfirmation(params: {
  title: string;
  startDateFormatted: string;
  leadMinutes: number;
  createdByName: string;
}): string {
  return [
    `Beres ${params.createdByName}, agenda *${params.title}* udah masuk kalender buat ${params.startDateFormatted} WIB.`,
    `Nanti ${params.leadMinutes} menit sebelumnya bakal gue ingetin kalian berdua ya.`,
  ].join('\n');
}

export function formatNanangTodoConfirmation(params: {
  title: string;
  createdByName: string;
}): string {
  return `Sip ${params.createdByName}, to-do *${params.title}* udah masuk ke Kanban board ya. Gas selesaikan!`;
}

export function formatNanangTaskAndListConfirmation(params: {
  title: string;
  items?: string[];
  category?: string;
  scope: 'aegg' | 'peppaa' | 'joint';
  userName: string;
}): string {
  const scopeLabel = formatScopeLabel(params.scope);
  const lines: string[] = [
    `📝 *Catatan / List Berhasil Masuk!*`,
    `Siap ${params.userName}, catatan *"${params.title}"* sudah Nanang simpan ke halaman *Task & Payment* workspace.`,
    `🏢 Ruang: *${scopeLabel}*`,
  ];

  if (params.category) {
    lines.push(`🏷️ Kategori: *${params.category}*`);
  }

  if (params.items && params.items.length > 0) {
    lines.push('');
    lines.push(`📋 *Daftar Checklist (${params.items.length} item):*`);
    params.items.forEach((item, idx) => {
      lines.push(`${idx + 1}. ▢ ${item}`);
    });
    lines.push('');
    lines.push('💡 _Tiap item sudah dibuatkan checklist rapi di web dan siap dicentang saat selesai!_');
  }

  return lines.join('\n');
}

