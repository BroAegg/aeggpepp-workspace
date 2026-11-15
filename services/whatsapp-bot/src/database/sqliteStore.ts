import Database from 'better-sqlite3';
import {
  initAuthCreds,
  BufferJSON,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
  type SignalKeyStoreWithTransaction,
} from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { logger } from '../logger.js';

let dbInstance: Database.Database | null = null;

export function getSqliteDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(config.sqliteDbPath);
    // Performance PRAGMAs for durability & low memory on 2GB VPS
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('temp_store = MEMORY');

    initSchema(dbInstance);
    logger.info(`[SQLite] Database initialized at ${config.sqliteDbPath}`);
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS baileys_auth (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_transactions (
      reply_message_id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      sender_jid TEXT NOT NULL,
      amount INTEGER NOT NULL,
      merchant TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bot_tx_sender 
      ON bot_transactions(sender_jid, created_at);
  `);
}

/**
 * Robust SQLite-backed Auth State for Baileys
 * Eliminates multi-file corruption during PM2 / VPS restarts
 */
export async function useSqliteAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => void;
}> {
  const db = getSqliteDb();

  const getStmt = db.prepare('SELECT value FROM baileys_auth WHERE id = ?');
  const setStmt = db.prepare('INSERT OR REPLACE INTO baileys_auth (id, value) VALUES (?, ?)');
  const delStmt = db.prepare('DELETE FROM baileys_auth WHERE id = ?');

  // Load or initialize credentials
  const credsRow = getStmt.get('creds') as { value: string } | undefined;
  let creds: AuthenticationCreds;

  if (credsRow) {
    try {
      creds = JSON.parse(credsRow.value, BufferJSON.reviver);
    } catch (err) {
      logger.warn('[SQLite Auth] Corrupt creds found in DB, reinitializing new creds');
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  const saveCreds = () => {
    try {
      const serialized = JSON.stringify(creds, BufferJSON.replacer);
      setStmt.run('creds', serialized);
    } catch (err: any) {
      logger.error({ err: err.message }, '[SQLite Auth] Failed to save creds');
    }
  };

  const keys: SignalKeyStoreWithTransaction = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Promise<{ [key: string]: SignalDataTypeMap[T] }> => {
      const result: { [key: string]: SignalDataTypeMap[T] } = {};
      for (const id of ids) {
        const keyId = `${type}-${id}`;
        const row = getStmt.get(keyId) as { value: string } | undefined;
        if (row?.value) {
          try {
            result[id] = JSON.parse(row.value, BufferJSON.reviver);
          } catch {}
        }
      }
      return result;
    },

    set: async (data: SignalDataSet): Promise<void> => {
      const runTransaction = db.transaction(() => {
        for (const type of Object.keys(data)) {
          const typeData = (data as any)[type];
          for (const id of Object.keys(typeData)) {
            const val = typeData[id];
            const keyId = `${type}-${id}`;
            if (val) {
              const serialized = JSON.stringify(val, BufferJSON.replacer);
              setStmt.run(keyId, serialized);
            } else {
              delStmt.run(keyId);
            }
          }
        }
      });
      runTransaction();
    },

    isInTransaction: () => false,
    transaction: async <T>(work: () => Promise<T>): Promise<T> => {
      return await work();
    },
  };

  return {
    state: {
      creds,
      keys,
    },
    saveCreds,
  };
}

/**
 * Transaction Mapping & Instant Undo helpers
 */
export interface BotTransactionRecord {
  reply_message_id: string;
  transaction_id: string;
  sender_jid: string;
  amount: number;
  merchant: string;
  created_at: string;
}

export function recordBotTransaction(
  replyMessageId: string,
  transactionId: string,
  senderJid: string,
  amount: number,
  merchant: string
): void {
  try {
    const db = getSqliteDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO bot_transactions 
      (reply_message_id, transaction_id, sender_jid, amount, merchant, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(replyMessageId, transactionId, senderJid, Math.round(amount), merchant);
    logger.info(
      { replyMessageId, transactionId, senderJid, amount, merchant },
      '[SQLite] Recorded transaction mapping for instant undo'
    );
  } catch (err: any) {
    logger.error({ err: err.message }, '[SQLite] Failed to record bot transaction mapping');
  }
}

export function findTransactionByReplyId(replyMessageId: string): BotTransactionRecord | null {
  try {
    const db = getSqliteDb();
    const stmt = db.prepare('SELECT * FROM bot_transactions WHERE reply_message_id = ?');
    const row = stmt.get(replyMessageId) as BotTransactionRecord | undefined;
    return row || null;
  } catch (err: any) {
    logger.error({ err: err.message }, '[SQLite] Failed to find transaction by reply id');
    return null;
  }
}

export function findLatestTransactionBySender(
  senderJid: string,
  withinMinutes: number = 15
): BotTransactionRecord | null {
  try {
    const db = getSqliteDb();
    const cleanJid = senderJid.replace(/@.+$/, '');
    const stmt = db.prepare(`
      SELECT * FROM bot_transactions 
      WHERE sender_jid LIKE ? 
        AND created_at >= datetime('now', '-' || ? || ' minutes')
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const row = stmt.get(`%${cleanJid}%`, withinMinutes) as BotTransactionRecord | undefined;
    return row || null;
  } catch (err: any) {
    logger.error({ err: err.message }, '[SQLite] Failed to find latest transaction by sender');
    return null;
  }
}

export function deleteBotTransactionRecord(transactionId: string): void {
  try {
    const db = getSqliteDb();
    const stmt = db.prepare('DELETE FROM bot_transactions WHERE transaction_id = ?');
    stmt.run(transactionId);
  } catch (err: any) {
    logger.error({ err: err.message }, '[SQLite] Failed to delete transaction record');
  }
}
