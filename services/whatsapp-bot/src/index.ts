import { logger } from './logger.js';
import { config } from './config.js';
import { getSqliteDb } from './database/sqliteStore.js';
import { startWebServer } from './web/server.js';
import { startWhatsAppSocket } from './whatsapp/client.js';

async function main() {
  logger.info(`==================================================`);
  logger.info(`🚀 Starting ${config.botName}...`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`🕒 Timezone: ${config.timezone}`);
  logger.info(`📦 Monorepo Service: services/whatsapp-bot`);
  logger.info(`==================================================`);

  // 1. Initialize SQLite Database & Ensure Tables Exist
  try {
    getSqliteDb();
  } catch (err: any) {
    logger.error({ err: err.message }, '[SQLite] Failed to initialize local database');
    process.exit(1);
  }

  // 2. Start Web Dashboard (Express on port, e.g. 3001)
  try {
    startWebServer();
  } catch (err: any) {
    logger.error({ err: err.message }, '[Web] Failed to start HTTP dashboard');
    process.exit(1);
  }

  // 3. Start WhatsApp Baileys Socket
  try {
    await startWhatsAppSocket();
  } catch (err: any) {
    logger.error({ err: err.message }, '[Baileys] Fatal error starting WhatsApp socket');
    process.exit(1);
  }
}

// Graceful shutdown handling for PM2 and system signals
function handleShutdown(signal: string) {
  logger.info(`[System] Received ${signal}. Shutting down gracefully...`);
  try {
    const db = getSqliteDb();
    if (db && db.open) {
      db.close();
      logger.info('[SQLite] Database connection closed safely.');
    }
  } catch (e: any) {
    logger.warn({ err: e?.message }, '[System] Error while closing SQLite');
  }
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, '[System] Uncaught Exception');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '[System] Unhandled Rejection');
});

main();
