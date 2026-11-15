import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../logger.js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase URL or Key is missing in environment variables.');
    }
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseInstance;
}

export interface ResolvedUser {
  id: string;
  role: 'aegg' | 'peppaa';
  displayName: string;
}

const userProfileCache = new Map<'aegg' | 'peppaa', ResolvedUser>();

function matchesPhone(cleanSender: string, targetPhone?: string): boolean {
  if (!targetPhone) return false;
  const targetClean = targetPhone.replace(/[\s\-\(\)\+]/g, '');
  if (!targetClean) return false;
  if (cleanSender.includes(targetClean)) return true;
  const targetWithout62 = targetClean.startsWith('62')
    ? targetClean.slice(2)
    : targetClean.startsWith('0')
    ? targetClean.slice(1)
    : targetClean;
  const senderWithout62 = cleanSender.startsWith('62')
    ? cleanSender.slice(2)
    : cleanSender.startsWith('0')
    ? cleanSender.slice(1)
    : cleanSender;
  return senderWithout62.includes(targetWithout62) || targetWithout62.includes(senderWithout62);
}

export function isAuthorizedUser(senderPhone: string): boolean {
  const cleanSender = senderPhone.replace(/[\s\-\(\)\+]/g, '');
  const isAegg = matchesPhone(cleanSender, config.aeggPhone);
  const isPeppaa1 = matchesPhone(cleanSender, config.peppaaPhone);
  const isPeppaa2 = matchesPhone(cleanSender, config.peppaaPhone2);
  const isBot = matchesPhone(cleanSender, config.botPhone);
  return isAegg || isPeppaa1 || isPeppaa2 || isBot;
}

export async function resolveUser(senderPhone: string): Promise<ResolvedUser> {
  const cleanSender = senderPhone.replace(/[\s\-\(\)\+]/g, '');
  const isPeppaa =
    matchesPhone(cleanSender, config.peppaaPhone) ||
    matchesPhone(cleanSender, config.peppaaPhone2);

  const role: 'aegg' | 'peppaa' = isPeppaa ? 'peppaa' : 'aegg';
  const defaultDisplayName = isPeppaa ? 'Peppaa' : 'Aegg';

  const knownId =
    role === 'aegg'
      ? 'dc59b2fc-d4bc-48da-bb41-ac112a562ea7'
      : '5ad432db-a45d-49a5-8b03-ed09e1afd97d';

  if (userProfileCache.has(role)) {
    return userProfileCache.get(role)!;
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, display_name')
      .eq('role', role)
      .limit(1)
      .maybeSingle();

    if (data && !error && data.id) {
      const user: ResolvedUser = {
        id: data.id,
        role: data.role as 'aegg' | 'peppaa',
        displayName: data.display_name || defaultDisplayName,
      };
      userProfileCache.set(role, user);
      return user;
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, '[Supabase] Could not fetch profile by role, falling back to known UUID');
  }

  const fallbackUser: ResolvedUser = {
    id: knownId,
    role,
    displayName: defaultDisplayName,
  };
  userProfileCache.set(role, fallbackUser);
  return fallbackUser;
}

/**
 * Upload compressed image to Supabase Private Bucket 'receipts'
 * Returns relative storage path (never returns raw public URL)
 */
export async function uploadReceiptImage(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  userId: string
): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'jpg';
    const filePath = `${userId}/${Date.now()}_${filename}.${ext}`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      logger.warn({ error: error.message }, '[Supabase] Failed to upload receipt to private bucket');
      return null;
    }

    logger.info({ filePath }, '[Supabase] Receipt uploaded to private bucket');
    return filePath;
  } catch (err: any) {
    logger.error({ err: err.message }, '[Supabase] Exception during receipt image upload');
    return null;
  }
}

export interface ReceiptItemInput {
  item_name: string;
  quantity: number;
  unit_price?: number | null;
  total_price: number;
  category?: string | null;
}

export interface SaveReceiptPayload {
  user: ResolvedUser;
  merchant: string;
  totalAmount: number;
  category: string;
  date: string;
  description?: string;
  receiptPath?: string | null;
  isSplit?: boolean;
  idempotencyKey?: string | null;
  items: ReceiptItemInput[];
  scope?: 'aegg' | 'peppaa' | 'joint';
}

/**
 * Validates date string to avoid year hallucinations from OCR (e.g. 2018 or 2029)
 * Fallback to today if outside reasonable range
 */
export function validateTransactionDate(rawDate?: string): string {
  const todayStr = new Date().toISOString().split('T')[0];
  if (!rawDate || !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    return todayStr;
  }
  const year = parseInt(rawDate.split('-')[0], 10);
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 1 || year > currentYear + 1) {
    return todayStr;
  }
  return rawDate;
}

/**
 * Resolves target account for user based on scope ('aegg' | 'peppaa' | 'joint')
 */
export async function getTargetAccountForUser(
  userId: string,
  scope?: 'aegg' | 'peppaa' | 'joint'
): Promise<string | null> {
  const supabase = getSupabase();
  try {
    if (scope === 'joint') {
      // 1. Try profiles.joint_default_account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('joint_default_account_id, default_account_id')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.joint_default_account_id) {
        return profile.joint_default_account_id;
      }

      // 2. Fallback to first joint or locked savings account
      const { data: jointAccounts } = await supabase
        .from('savings_accounts')
        .select('id, is_locked, scope')
        .or('scope.eq.joint,is_locked.eq.true')
        .order('created_at', { ascending: true })
        .limit(1);

      if (jointAccounts && jointAccounts.length > 0) {
        return jointAccounts[0].id;
      }

      // 3. Fallback to profile.default_account_id
      if (profile?.default_account_id) {
        return profile.default_account_id;
      }
    } else {
      // Personal scope ('aegg' | 'peppaa')
      // 1. Try profiles.default_account_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_account_id')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.default_account_id) {
        return profile.default_account_id;
      }

      // 2. Fallback to user's first personal operational pocket
      const { data: accounts } = await supabase
        .from('savings_accounts')
        .select('id, is_locked, scope')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      const operational = accounts?.find((a: any) => !a.is_locked && a.scope !== 'joint');
      if (operational) return operational.id;
      if (accounts && accounts.length > 0) return accounts[0].id;
    }
  } catch (err: any) {
    logger.warn({ err: err?.message, userId, scope }, '[Supabase] Error resolving target account');
  }
  return null;
}

/**
 * Resolves user's default operational account from profiles or savings_accounts
 */
export async function getDefaultAccountForUser(userId: string): Promise<string | null> {
  return getTargetAccountForUser(userId);
}

/**
 * Adjust account balance atomically via PostgreSQL RPC adjust_account_balance
 */
async function adjustAccountBalanceRpc(accountId: string, delta: number): Promise<void> {
  if (!accountId || delta === 0) return;
  try {
    const supabase = getSupabase();
    const { error } = await supabase.rpc('adjust_account_balance', {
      p_account_id: accountId,
      p_delta: delta,
    });
    if (error) {
      logger.warn({ error: error.message, accountId, delta }, '[Supabase] adjust_account_balance RPC error');
    } else {
      logger.info({ accountId, delta }, '[Supabase] adjust_account_balance applied successfully');
    }
  } catch (err: any) {
    logger.warn({ err: err?.message, accountId, delta }, '[Supabase] Exception calling adjust_account_balance');
  }
}

/**
 * Direct Auto-Insert transaction to Supabase
 */
export async function saveReceiptTransaction(payload: SaveReceiptPayload): Promise<{ transactionId: string }> {
  const supabase = getSupabase();
  const validDate = validateTransactionDate(payload.date);
  const targetScope = payload.scope || (payload.user.role === 'peppaa' ? 'peppaa' : 'aegg');
  const targetAccountId = await getTargetAccountForUser(payload.user.id, targetScope);

  const insertData: any = {
    user_id: payload.user.id,
    paid_by: payload.user.id,
    type: 'expense',
    category: payload.category || 'Groceries',
    sub_title: payload.merchant || 'Struk Belanja',
    amount: payload.totalAmount,
    description: payload.description || `Belanja di ${payload.merchant}`,
    date: validDate,
    source: 'whatsapp',
    scope: targetScope,
    account_id: targetAccountId,
    is_split: false,
    is_settled: true,
    is_settlement: false,
    receipt_url: payload.receiptPath || null,
  };

  if (payload.idempotencyKey) {
    insertData.idempotency_key = payload.idempotencyKey;
  }

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert(insertData)
    .select('id')
    .single();

  if (txError) {
    // If unique constraint on idempotency_key triggered, fetch existing transaction
    if (txError.code === '23505' && payload.idempotencyKey) {
      logger.info({ key: payload.idempotencyKey }, '[Supabase] Idempotent retry detected for receipt');
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('idempotency_key', payload.idempotencyKey)
        .single();
      if (existing?.id) return { transactionId: existing.id };
    }
    throw new Error(`Failed to save transaction: ${txError.message}`);
  }

  // Deduct balance from account atomically (zero-drift)
  if (targetAccountId) {
    await adjustAccountBalanceRpc(targetAccountId, -payload.totalAmount);
  }

  // Insert line items if available
  if (payload.items && payload.items.length > 0) {
    const itemsToInsert = payload.items.map((it) => ({
      transaction_id: tx.id,
      item_name: it.item_name,
      quantity: it.quantity || 1,
      unit_price: it.unit_price ?? Math.round(it.total_price / (it.quantity || 1)),
      total_price: it.total_price,
      category: it.category || payload.category,
    }));

    try {
      const { error: itemsErr } = await supabase
        .from('receipt_items')
        .insert(itemsToInsert);
      if (itemsErr) {
        logger.warn({ err: itemsErr.message }, '[Supabase] Could not insert receipt_items');
      }
    } catch (err: any) {
      logger.warn({ err: err?.message }, '[Supabase] Could not insert receipt_items');
    }
  }

  return { transactionId: tx.id };
}

/**
 * Soft delete transaction for Instant Undo with balance restoration (zero-drift)
 */
export async function softDeleteTransaction(transactionId: string, userId: string): Promise<boolean> {
  try {
    const supabase = getSupabase();

    // 1. Fetch current transaction details before soft deleting
    const { data: tx, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, type, amount, account_id, deleted_at')
      .eq('id', transactionId)
      .maybeSingle();

    if (fetchErr) {
      logger.error({ error: fetchErr.message, transactionId }, '[Supabase] Failed to fetch transaction before undo');
    }

    // 2. Perform soft delete
    const { error } = await supabase
      .from('transactions')
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', transactionId);

    if (error) {
      logger.error({ error: error.message, transactionId }, '[Supabase] Failed to soft-delete transaction');
      return false;
    }

    // 3. Atomically restore balance if not previously deleted
    if (tx && !tx.deleted_at && tx.account_id) {
      const amount = Number(tx.amount) || 0;
      // Reversal: if it was an expense, refund (+amount); if income, remove (-amount)
      const delta = tx.type === 'expense' ? amount : -amount;
      await adjustAccountBalanceRpc(tx.account_id, delta);
      logger.info({ transactionId, accountId: tx.account_id, delta }, '[Supabase] Account balance restored on Undo');
    }

    logger.info({ transactionId, userId }, '[Supabase] Transaction successfully soft-deleted');
    return true;
  } catch (err: any) {
    logger.error({ err: err.message, transactionId }, '[Supabase] Exception during soft delete');
    return false;
  }
}

/**
 * Save quick text-based expense with default account & atomic balance update
 */
export async function saveQuickTransaction(params: {
  user: ResolvedUser;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  merchant?: string;
  isSplit?: boolean;
  idempotencyKey?: string;
  scope?: 'aegg' | 'peppaa' | 'joint';
}): Promise<{ transactionId: string }> {
  const supabase = getSupabase();
  const dateStr = new Date().toISOString().split('T')[0];
  const targetScope = params.scope || (params.user.role === 'peppaa' ? 'peppaa' : 'aegg');
  const targetAccountId = await getTargetAccountForUser(params.user.id, targetScope);

  const insertData: any = {
    user_id: params.user.id,
    paid_by: params.user.id,
    type: params.type,
    category: params.category || (params.type === 'income' ? 'other_income' : 'food'),
    sub_title: params.merchant || null,
    amount: params.amount,
    description: params.description,
    date: dateStr,
    source: 'whatsapp',
    scope: targetScope,
    account_id: targetAccountId,
    is_split: false,
    is_settled: true,
    is_settlement: false,
  };

  if (params.idempotencyKey) {
    insertData.idempotency_key = params.idempotencyKey;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505' && params.idempotencyKey) {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('idempotency_key', params.idempotencyKey)
        .single();
      if (existing?.id) return { transactionId: existing.id };
    }
    throw new Error(`Failed to save quick transaction: ${error.message}`);
  }

  // Atomically adjust account balance (deduct for expense, add for income)
  if (targetAccountId) {
    const delta = params.type === 'expense' ? -params.amount : params.amount;
    await adjustAccountBalanceRpc(targetAccountId, delta);
  }

  return { transactionId: data.id };
}
