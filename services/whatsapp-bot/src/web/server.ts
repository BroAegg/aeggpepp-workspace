import express, { Request, Response } from 'express';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { logger } from '../logger.js';

let latestQrRaw: string | null = null;
let latestQrDataUrl: string | null = null;
let connectionStatus: 'connecting' | 'open' | 'close' = 'connecting';
let connectedPhone: string | null = null;
const startTime = new Date();

export function setLatestQr(qr: string | null): void {
  latestQrRaw = qr;
  if (!qr) {
    latestQrDataUrl = null;
  }
}

export function setConnectionStatus(
  status: 'connecting' | 'open' | 'close',
  phone?: string | null
): void {
  connectionStatus = status;
  if (phone) connectedPhone = phone;
  if (status === 'open') {
    latestQrRaw = null;
    latestQrDataUrl = null;
  }
}

export function startWebServer(): void {
  const app = express();
  app.use(express.json());

  app.get('/', async (_req: Request, res: Response) => {
    let qrImgTag = '';
    if (connectionStatus === 'open') {
      qrImgTag = `
        <div class="status-box online">
          <div class="dot online-dot"></div>
          <div>
            <h3>WhatsApp Bot Terhubung! 🟢</h3>
            <p>Nomor Bot: <strong>+${connectedPhone || config.botPhone || 'Connected'}</strong></p>
          </div>
        </div>
      `;
    } else if (latestQrRaw) {
      try {
        if (!latestQrDataUrl) {
          latestQrDataUrl = await QRCode.toDataURL(latestQrRaw, {
            width: 280,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
        }
        qrImgTag = `
          <div class="qr-container">
            <img src="${latestQrDataUrl}" alt="Scan QR Code" />
            <p class="scan-hint">Buka WhatsApp di HP ➜ Perangkat Tertaut ➜ Tautkan Perangkat</p>
          </div>
        `;
      } catch (err: any) {
        qrImgTag = `<p style="color: #ef4444;">Error generating QR: ${err?.message}</p>`;
      }
    } else {
      qrImgTag = `
        <div class="status-box waiting">
          <div class="spinner"></div>
          <p>Sedang menginisialisasi socket Baileys...</p>
        </div>
      `;
    }

    const uptimeMinutes = Math.round((Date.now() - startTime.getTime()) / 60000);
    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.botName} - Service Status</title>
        <meta http-equiv="refresh" content="${connectionStatus === 'open' ? 30 : 5}">
        <style>
          :root {
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #f8fafc;
            --muted: #94a3b8;
            --primary: #38bdf8;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 32px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
          }
          h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
          .subtitle { color: var(--muted); font-size: 13px; margin-bottom: 24px; }
          .qr-container img {
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            margin-bottom: 12px;
            background: white;
            padding: 8px;
          }
          .scan-hint { font-size: 12px; color: var(--muted); }
          .status-box {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-radius: 12px;
            background: rgba(255,255,255,0.05);
            text-align: left;
            margin: 20px 0;
          }
          .dot {
            width: 12px; height: 12px; border-radius: 50%;
          }
          .online-dot { background: var(--success); box-shadow: 0 0 10px var(--success); }
          .footer { font-size: 11px; color: var(--muted); margin-top: 24px; line-height: 1.6; }
          .spinner {
            width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.2);
            border-top-color: var(--primary); border-radius: 50%;
            animation: spin 1s linear infinite; margin: 0 auto;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${config.botName}</h1>
          <p class="subtitle">Sahabat Pintar & Asisten Pribadi Aegg & Peppaa 🐾</p>
          ${qrImgTag}
          <div class="footer">
            Server Uptime: ${uptimeMinutes} menit<br/>
            Direct Auto-Insert + Instant Undo (SQLite & Supabase)<br/>
            Connected to Supabase: AeggPepp Workspace
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  app.get('/status', (_req: Request, res: Response) => {
    const memory = process.memoryUsage();
    res.json({
      botName: config.botName,
      status: connectionStatus,
      phone: connectedPhone,
      hasQr: !!latestQrRaw,
      uptimeSeconds: Math.round((Date.now() - startTime.getTime()) / 1000),
      memory: {
        rssMB: (memory.rss / (1024 * 1024)).toFixed(2),
        heapUsedMB: (memory.heapUsed / (1024 * 1024)).toFixed(2),
        heapTotalMB: (memory.heapTotal / (1024 * 1024)).toFixed(2),
      },
    });
  });

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`[Web Dashboard] Running at http://0.0.0.0:${config.port}`);
  });
}
