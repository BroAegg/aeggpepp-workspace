import type { WAMessage } from '@whiskeysockets/baileys';
import { logger } from '../logger.js';

export interface BufferedMessagePayload {
  key: string;
  senderNumber: string;
  from: string;
  isGroup: boolean;
  pushName?: string;
  texts: string[];
  imageBuffer?: Buffer;
  imageMimeType?: string;
  lastMsg: WAMessage;
  timer: NodeJS.Timeout;
}

export type FlushCallback = (payload: {
  senderNumber: string;
  from: string;
  isGroup: boolean;
  pushName?: string;
  combinedText: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  lastMsg: WAMessage;
}) => Promise<void>;

export class MultiModalDebouncer {
  private buffers = new Map<string, BufferedMessagePayload>();
  private readonly delayMs: number;

  constructor(delayMs = 2500) {
    this.delayMs = delayMs;
  }

  enqueue(
    key: string,
    data: {
      senderNumber: string;
      from: string;
      isGroup: boolean;
      pushName?: string;
      text?: string;
      imageBuffer?: Buffer;
      imageMimeType?: string;
      rawMsg: WAMessage;
    },
    onFlush: FlushCallback
  ): void {
    const existing = this.buffers.get(key);
    const activeDelay = data.imageBuffer || existing?.imageBuffer ? 1500 : 400;

    if (existing) {
      clearTimeout(existing.timer);

      if (data.text) {
        existing.texts.push(data.text);
      }
      if (data.imageBuffer) {
        existing.imageBuffer = data.imageBuffer;
        existing.imageMimeType = data.imageMimeType;
      }
      existing.lastMsg = data.rawMsg;

      existing.timer = setTimeout(() => {
        this.flush(key, onFlush);
      }, activeDelay);

      logger.debug(
        `[Debouncer] Buffered additional item for ${key} (texts: ${existing.texts.length}, hasImage: ${!!existing.imageBuffer})`
      );
      return;
    }

    const timer = setTimeout(() => {
      this.flush(key, onFlush);
    }, activeDelay);

    this.buffers.set(key, {
      key,
      senderNumber: data.senderNumber,
      from: data.from,
      isGroup: data.isGroup,
      pushName: data.pushName,
      texts: data.text ? [data.text] : [],
      imageBuffer: data.imageBuffer,
      imageMimeType: data.imageMimeType,
      lastMsg: data.rawMsg,
      timer,
    });
  }

  private async flush(key: string, onFlush: FlushCallback): Promise<void> {
    const payload = this.buffers.get(key);
    if (!payload) return;

    this.buffers.delete(key);

    const combinedText = payload.texts.join(' ').trim();
    logger.info(
      `[Debouncer] Flushing session for ${key} (combined texts: "${combinedText}", hasImage: ${!!payload.imageBuffer})`
    );

    try {
      await onFlush({
        senderNumber: payload.senderNumber,
        from: payload.from,
        isGroup: payload.isGroup,
        pushName: payload.pushName,
        combinedText,
        imageBuffer: payload.imageBuffer,
        imageMimeType: payload.imageMimeType,
        lastMsg: payload.lastMsg,
      });
    } catch (err: any) {
      logger.error({ err: err.message, key }, '[Debouncer] Error during flush execution');
    }
  }

  cancel(key: string): void {
    const existing = this.buffers.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.buffers.delete(key);
    }
  }
}

export const multiModalDebouncer = new MultiModalDebouncer(2500);
