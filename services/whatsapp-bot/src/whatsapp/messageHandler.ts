import {
  downloadMediaMessage,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import { v5 as uuidv5 } from 'uuid';
import { logger } from '../logger.js';
import { config, saveCoupleGroupJid } from '../config.js';
import {
  resolveUser,
  isAuthorizedUser,
  uploadReceiptImage,
  saveReceiptTransaction,
  saveQuickTransaction,
  softDeleteTransaction,
} from '../database/supabase.js';
import {
  recordBotTransaction,
  findTransactionByReplyId,
  findLatestTransactionBySender,
  deleteBotTransactionRecord,
} from '../database/sqliteStore.js';
import { parseReceiptWithVision, formatRupiah } from '../ai/receiptVision.js';
import { parseFinanceText } from '../ai/expenseNlp.js';
import { compressReceiptImage } from '../services/imageService.js';
import { multiModalDebouncer } from '../ai/debouncer.js';
import {
  getNanangName,
  formatNanangReceipt,
  formatNanangFinance,
  formatNanangUndoSuccess,
  isNanangTrigger,
  NANANG_TRIGGER_REGEX,
} from '../ai/persona.js';

// Deterministic UUID v5 namespace for WhatsApp message idempotency
const IDEMPOTENCY_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function unwrapMessage(msg: any): any {
  if (!msg) return {};
  if (msg.ephemeralMessage?.message) return unwrapMessage(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage?.message) return unwrapMessage(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2?.message) return unwrapMessage(msg.viewOnceMessageV2.message);
  if (msg.documentWithCaptionMessage?.message) return unwrapMessage(msg.documentWithCaptionMessage.message);
  return msg;
}

export async function handleIncomingMessage(sock: WASocket, msg: WAMessage): Promise<void> {
  try {
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    if (!from || from === 'status@broadcast') return;

    // 1. Immediate Double Blue Tick (Receipt Acknowledgement)
    sock.readMessages([msg.key]).catch(() => {});

    const content = unwrapMessage(msg.message);

    const isImage = !!(
      content.imageMessage ||
      content.documentMessage?.mimetype?.startsWith('image/')
    );

    let textBody = (
      content.conversation ||
      content.extendedTextMessage?.text ||
      content.imageMessage?.caption ||
      content.videoMessage?.caption ||
      content.documentMessage?.caption ||
      ''
    ).trim();

    // Check if message is from bot itself
    if (msg.key.fromMe) {
      const isManualCommand =
        textBody.startsWith('!') ||
        NANANG_TRIGGER_REGEX.test(textBody) ||
        textBody.toLowerCase().startsWith('catat') ||
        textBody.toLowerCase().startsWith('batal') ||
        textBody.toLowerCase().startsWith('hapus');
      if (!isManualCommand && !isImage) {
        return;
      }
    }

    const isGroup = from.endsWith('@g.us');
    const rawSender =
      (msg as any).key?.participantPn ||
      (msg as any).participantPn ||
      msg.key.participant ||
      (msg as any).participant ||
      from;

    const senderNumber = rawSender.split('@')[0].split(':')[0].replace(/[\+\s]/g, '');

    const lower = textBody.toLowerCase();
    const isSetGroupCmd = lower === '!setgroup' || lower === 'setgroup';
    const isCoupleGroup = isGroup && !!config.coupleGroupJid && from === config.coupleGroupJid;

    // Whitelist Authorization Guard
    const isAuthorized =
      msg.key.fromMe ||
      isAuthorizedUser(senderNumber) ||
      (isGroup && isSetGroupCmd) ||
      isCoupleGroup;

    if (!isAuthorized) {
      if (!isGroup) {
        await sock.sendMessage(from, {
          text: 'Halo, salam kenal! Nanang adalah asisten pribadi khusus untuk Aegg & Peppaa. Untuk privasi, Nanang hanya merespons Aegg dan Peppaa ya.',
        });
      }
      return;
    }

    const user = await resolveUser(senderNumber);

    // ========================================================
    // 2. CHECK FOR INSTANT UNDO / CANCEL (Reply-to-Undo)
    // ========================================================
    const undoTriggers = ['batal', 'hapus', 'undo', 'cancel', 'batalin', 'salah'];
    const isUndoRequest = undoTriggers.some((t) => lower === t || lower.startsWith(`${t} `) || lower.endsWith(` ${t}`));

    if (isUndoRequest && !isImage) {
      const contextInfo = content.extendedTextMessage?.contextInfo;
      const quotedStanzaId = contextInfo?.stanzaId;

      let targetRecord = null;
      if (quotedStanzaId) {
        targetRecord = findTransactionByReplyId(quotedStanzaId);
      }
      if (!targetRecord) {
        // Fallback: lookup latest transaction from this sender in last 15 minutes
        targetRecord = findLatestTransactionBySender(from, 15);
      }

      if (targetRecord) {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
        const success = await softDeleteTransaction(targetRecord.transaction_id, user.id);
        if (success) {
          deleteBotTransactionRecord(targetRecord.transaction_id);
          await sock.sendMessage(from, { react: { text: '❌', key: msg.key } }).catch(() => {});
          const confirmText = formatNanangUndoSuccess({
            amount: targetRecord.amount,
            merchant: targetRecord.merchant,
            userRole: user.role,
          });
          await sock.sendMessage(from, { text: confirmText }, { quoted: msg });
          logger.info(
            { transactionId: targetRecord.transaction_id, merchant: targetRecord.merchant },
            '[Undo] Transaction successfully soft-deleted via WhatsApp command'
          );
          return;
        } else {
          await sock.sendMessage(
            from,
            { text: `Waduh gagal membatalkan transaksi dari database nih ${user.displayName}. Boleh coba cek dashboard langsung ya.` },
            { quoted: msg }
          );
          return;
        }
      } else {
        await sock.sendMessage(
          from,
          {
            text: `Tidak ada transaksi baru yang bisa dibatalkan dalam 15 menit terakhir nih ${user.displayName}. Pastikan me-reply pesan struk yang ingin dihapus ya.`,
          },
          { quoted: msg }
        );
        return;
      }
    }

    // Download image if present
    let imageBuffer: Buffer | undefined;
    let imageMimeType: string | undefined;

    if (isImage) {
      try {
        imageBuffer = (await downloadMediaMessage(
          msg,
          'buffer',
          {},
          { logger: logger as any, reuploadRequest: (sock as any).updateMediaMessage } as any
        )) as Buffer;
        imageMimeType = content.imageMessage?.mimetype || content.documentMessage?.mimetype || 'image/jpeg';
      } catch (err: any) {
        logger.error({ err: err.message }, '[MessageHandler] Error downloading image media');
      }
    }

    // Enqueue into multiModalDebouncer (merges quick photo + caption)
    const debounceKey = isGroup ? `${from}_${senderNumber}` : from;
    multiModalDebouncer.enqueue(
      debounceKey,
      {
        senderNumber,
        from,
        isGroup,
        pushName: msg.pushName || user.displayName,
        text: textBody,
        imageBuffer,
        imageMimeType,
        rawMsg: msg,
      },
      async (payload) => {
        await processFlushedPayload(sock, payload, user);
      }
    );
  } catch (err: any) {
    logger.error({ err: err.message }, '[MessageHandler] Error processing inbound message');
  }
}

/**
 * Heuristic auto-scope routing:
 * - In Couple Group: defaults to 'joint' (Kas Bersama). If message mentions explicit personal keywords ("pribadi", "uangku", "punyaku", "dompetku", "kantongku", "sendiri"), route to user's role.
 * - In Private DM: defaults to user's role (Personal). If message mentions explicit joint keywords ("gabungan", "bersama", "nikah", "wedding", "kas", "patungan", "berdua", "kita"), route to 'joint'.
 */
export function resolveTransactionScope(
  isGroup: boolean,
  text: string,
  userRole: 'aegg' | 'peppaa'
): 'aegg' | 'peppaa' | 'joint' {
  const lower = text.toLowerCase();
  const jointKeywords = ['gabungan', 'bersama', 'nikah', 'wedding', 'kas', 'patungan', 'berdua', 'kita'];
  const personalKeywords = ['pribadi', 'uangku', 'punyaku', 'dompetku', 'kantongku', 'sendiri'];

  if (isGroup) {
    if (personalKeywords.some((kw) => lower.includes(kw))) {
      return userRole;
    }
    return 'joint';
  } else {
    if (jointKeywords.some((kw) => lower.includes(kw))) {
      return 'joint';
    }
    return userRole;
  }
}

async function processFlushedPayload(
  sock: WASocket,
  payload: {
    senderNumber: string;
    from: string;
    isGroup: boolean;
    pushName?: string;
    combinedText: string;
    imageBuffer?: Buffer;
    imageMimeType?: string;
    lastMsg: WAMessage;
  },
  user: { id: string; role: 'aegg' | 'peppaa'; displayName: string }
) {
  const { from, combinedText, imageBuffer, imageMimeType, lastMsg, isGroup } = payload;
  const userName = getNanangName(user.role);

  if (isGroup && !config.coupleGroupJid) {
    saveCoupleGroupJid(from);
    logger.info({ groupJid: from }, '[WhatsApp] Auto-registered couple group JID');
  }

  const startTypingHeartbeat = () => {
    sock.sendPresenceUpdate('composing', from).catch(() => {});
    const interval = setInterval(() => {
      sock.sendPresenceUpdate('composing', from).catch(() => {});
    }, 4000);
    return () => {
      clearInterval(interval);
      sock.sendPresenceUpdate('paused', from).catch(() => {});
    };
  };

  // ========================================================
  // CASE A: PHOTO ATTACHMENT (DIRECT AUTO-INSERT + INSTANT UNDO)
  // ========================================================
  if (imageBuffer) {
    const stopTyping = startTypingHeartbeat();
    await sock.sendMessage(from, { react: { text: '⏳', key: lastMsg.key } }).catch(() => {});

    try {
      // 1. Sharp Image Compression (OOM safe on 2GB VPS)
      const compressed = await compressReceiptImage(imageBuffer, imageMimeType || 'image/jpeg');

      // 2. Upload to Supabase Private Bucket 'receipts'
      const receiptPath = await uploadReceiptImage(
        compressed.buffer,
        compressed.mimeType,
        `${user.role}_${Date.now()}`,
        user.id
      );

      // 3. Gemini Vision Extraction with Year Validation
      const parsedReceipt = await parseReceiptWithVision(compressed.buffer, compressed.mimeType);

      if (!parsedReceipt || parsedReceipt.totalAmount <= 0) {
        stopTyping();
        await sock.sendMessage(from, { react: { text: '❓', key: lastMsg.key } }).catch(() => {});
        await sock.sendMessage(
          from,
          {
            text: `Foto struknya kurang terbaca jelas nih ${userName}. Boleh coba foto ulang yang lebih terang dan dekat?`,
          },
          { quoted: lastMsg }
        );
        return;
      }

      // Check split preference
      const isSplit =
        combinedText.toLowerCase().includes('split') ||
        combinedText.toLowerCase().includes('patungan') ||
        combinedText.toLowerCase().includes('berdua') ||
        combinedText.toLowerCase().includes('50:50');

      // Auto-resolve transaction scope (joint vs personal)
      const scope = resolveTransactionScope(isGroup, combinedText, user.role);

      // 4. Deterministic Idempotency Key (UUID v5 based on WhatsApp message key)
      const rawMsgId = lastMsg.key.id || `${Date.now()}_${user.id}`;
      const idempotencyKey = uuidv5(rawMsgId, IDEMPOTENCY_NAMESPACE);

      // 5. DIRECT AUTO-INSERT to Supabase
      const { transactionId } = await saveReceiptTransaction({
        user,
        merchant: parsedReceipt.merchant,
        totalAmount: parsedReceipt.totalAmount,
        category: parsedReceipt.category,
        date: parsedReceipt.date,
        receiptPath,
        isSplit,
        idempotencyKey,
        items: parsedReceipt.items,
        scope,
      });

      // 6. Format Nanang Receipt Reply with Undo Prompt
      const reply = formatNanangReceipt({
        merchant: parsedReceipt.merchant,
        date: parsedReceipt.date,
        totalAmount: parsedReceipt.totalAmount,
        category: parsedReceipt.category,
        items: parsedReceipt.items,
        paidByRole: user.role,
        isSplit,
        scope,
      });

      stopTyping();
      const sentMsg = await sock.sendMessage(from, { text: reply }, { quoted: lastMsg });

      // 7. Store Bot Reply Message ID in SQLite for Instant Undo
      if (sentMsg?.key?.id && transactionId) {
        recordBotTransaction(
          sentMsg.key.id,
          transactionId,
          from,
          parsedReceipt.totalAmount,
          parsedReceipt.merchant
        );
      }

      // 8. Reaction confirmation
      await sock.sendMessage(from, { react: { text: '🧾', key: lastMsg.key } }).catch(() => {});
      return;
    } catch (err: any) {
      stopTyping();
      logger.error({ err: err.message }, '[MessageHandler] Error processing receipt image');
      await sock.sendMessage(
        from,
        {
          text: `Waduh ada kendala saat mencatat struk nih ${userName}: ${err.message}`,
        },
        { quoted: lastMsg }
      );
      return;
    }
  }

  // ========================================================
  // CASE B: TEXT-BASED EXPENSE / INCOME INTENT
  // ========================================================
  if (combinedText) {
    const isTriggered = !isGroup || isNanangTrigger(combinedText) || combinedText.startsWith('!');
    if (!isTriggered) return;

    try {
      const financeResult = await parseFinanceText(combinedText);
      if (financeResult.isFinanceIntent && financeResult.amount && financeResult.amount > 0) {
        const stopTyping = startTypingHeartbeat();
        await sock.sendMessage(from, { react: { text: '⏳', key: lastMsg.key } }).catch(() => {});

        const rawMsgId = lastMsg.key.id || `${Date.now()}_${user.id}`;
        const idempotencyKey = uuidv5(rawMsgId, IDEMPOTENCY_NAMESPACE);
        const scope = resolveTransactionScope(isGroup, combinedText, user.role);

        const { transactionId } = await saveQuickTransaction({
          user,
          type: financeResult.type,
          amount: financeResult.amount,
          category: financeResult.category || (financeResult.type === 'income' ? 'other_income' : 'food'),
          description: financeResult.description || 'Transaksi Catat Chat',
          merchant: financeResult.merchant,
          isSplit: financeResult.isSplit,
          idempotencyKey,
          scope,
        });

        const reply = formatNanangFinance({
          type: financeResult.type,
          amount: financeResult.amount,
          description: financeResult.description || 'Transaksi Catat Chat',
          category: financeResult.category || (financeResult.type === 'income' ? 'other_income' : 'food'),
          merchant: financeResult.merchant,
          paidByRole: user.role,
          isSplit: financeResult.isSplit,
          scope,
        });

        stopTyping();
        const sentMsg = await sock.sendMessage(from, { text: reply }, { quoted: lastMsg });

        if (sentMsg?.key?.id && transactionId) {
          recordBotTransaction(
            sentMsg.key.id,
            transactionId,
            from,
            financeResult.amount,
            financeResult.merchant || financeResult.description || 'Pengeluaran Teks'
          );
        }

        const reactionEmoji = financeResult.type === 'income' ? '💰' : '💸';
        await sock.sendMessage(from, { react: { text: reactionEmoji, key: lastMsg.key } }).catch(() => {});
        return;
      }
    } catch (err: any) {
      logger.error({ err: err.message }, '[MessageHandler] Error processing finance text');
    }
  }
}
