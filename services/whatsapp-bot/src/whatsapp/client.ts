import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { useSqliteAuthState } from '../database/sqliteStore.js';
import { setConnectionStatus, setLatestQr } from '../web/server.js';
import { handleIncomingMessage } from './messageHandler.js';
import { messageQueue } from '../queue/messageQueue.js';

let sock: WASocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;

export async function startWhatsAppSocket(): Promise<WASocket> {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Use Atomic SQLite Auth State (Anti-Corrupt & OOM-safe)
  const { state, saveCreds } = await useSqliteAuthState();
  const { version, isLatest } = await fetchLatestBaileysVersion();

  logger.info({ version, isLatest }, `[Baileys] Initializing ${config.botName}...`);

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: logger as any,
    browser: [config.botName, 'Chrome', '124.0.0'],
    syncFullHistory: false,
    markOnlineOnConnect: true,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      setLatestQr(qr);
      logger.info(`[Baileys] New QR Code generated for ${config.botName}. Scan from terminal or Web Dashboard.`);
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === 'close') {
      setConnectionStatus('close');
      setLatestQr(null);
      messageQueue.pauseForConnection();

      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      logger.warn(
        { statusCode, isLoggedOut, reconnectAttempts },
        `[Baileys] Connection closed for ${config.botName}.`
      );

      if (isLoggedOut) {
        logger.error(
          `[Baileys] Logged out from WhatsApp! Session terminated by phone. Stop reconnect loop. Please restart and scan QR.`
        );
        return;
      }

      // Exponential Backoff: 5s, 7.5s, 11s, up to max 60s + random jitter
      reconnectAttempts++;
      const baseDelay = Math.min(60000, 5000 * Math.pow(1.5, reconnectAttempts - 1));
      const jitter = Math.floor(Math.random() * 2000);
      const totalDelay = Math.round(baseDelay + jitter);

      logger.info(`[Baileys] Reconnecting in ${(totalDelay / 1000).toFixed(1)}s (attempt ${reconnectAttempts})...`);
      reconnectTimeout = setTimeout(() => {
        startWhatsAppSocket().catch((err) => {
          logger.error({ err: err?.message }, '[Baileys] Socket restart failed');
        });
      }, totalDelay);
    } else if (connection === 'open') {
      reconnectAttempts = 0;
      const botNumber = sock?.user?.id?.replace(/:.*$/, '') || 'Unknown';
      setConnectionStatus('open', botNumber);
      setLatestQr(null);
      messageQueue.resumeForConnection();

      logger.info(
        { botNumber, botName: sock?.user?.name || config.botName },
        `🚀 [Baileys] ${config.botName} connected successfully to WhatsApp!`
      );
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    logger.debug({ count: messages.length, type }, '[Baileys] messages.upsert event');
    for (const msg of messages) {
      await handleIncomingMessage(sock!, msg);
    }
  });

  return sock;
}
