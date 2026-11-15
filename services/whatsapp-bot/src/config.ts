import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface AppConfig {
  botName: string;
  port: number;
  nodeEnv: string;
  supabaseUrl: string;
  supabaseKey: string;
  geminiApiKey: string;
  groqApiKey: string;
  groqModel: string;
  aeggPhone: string;
  peppaaPhone: string;
  peppaaPhone2: string;
  botPhone: string;
  coupleGroupJid?: string;
  sessionDir: string;
  dataDir: string;
  sqliteDbPath: string;
  timezone: string;
  reminderAdvanceMinutes: number;
  messageDelayMs: number;
}

function cleanPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const sessionDir = process.env.SESSION_DIR || path.join(dataDir, 'session');
const sqliteDbPath = path.join(dataDir, 'bot_database.sqlite');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

function getStoredGroupJid(): string | undefined {
  if (process.env.COUPLE_GROUP_JID) return process.env.COUPLE_GROUP_JID;
  const filePath = path.join(dataDir, 'couple_group.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return data.coupleGroupJid;
    } catch {}
  }
  return undefined;
}

export function saveCoupleGroupJid(jid: string): void {
  config.coupleGroupJid = jid;
  try {
    const filePath = path.join(dataDir, 'couple_group.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({ coupleGroupJid: jid, updatedAt: new Date().toISOString() }, null, 2)
    );
  } catch (err: any) {
    console.error('Failed to save coupleGroupJid:', err.message);
  }
}

export const config: AppConfig = {
  botName: process.env.BOT_NAME || 'Nanang 🐈‍⬛',
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'production',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  aeggPhone: cleanPhone(process.env.AEGG_PHONE || '62895416185355'),
  peppaaPhone: cleanPhone(process.env.PEPPAA_PHONE || '6285717917058'),
  peppaaPhone2: cleanPhone(process.env.PEPPAA_PHONE_2 || '6289528371422'),
  botPhone: cleanPhone(process.env.BOT_PHONE || '6285117200792'),
  coupleGroupJid: getStoredGroupJid(),
  sessionDir,
  dataDir,
  sqliteDbPath,
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  reminderAdvanceMinutes: parseInt(process.env.REMINDER_ADVANCE_MINUTES || '30', 10),
  messageDelayMs: parseInt(process.env.MESSAGE_DELAY_MS || '2500', 10),
};
