import { config } from '../config.js';
import { logger } from '../logger.js';

type Task<T> = () => Promise<T>;

interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

export class MessageQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private isPaused = false;
  private readonly baseDelayMs: number;

  constructor(baseDelayMs: number = config.messageDelayMs) {
    this.baseDelayMs = baseDelayMs;
  }

  async add<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: task,
        resolve,
        reject,
      });

      this.processNext();
    });
  }

  pauseForConnection(): void {
    if (!this.isPaused) {
      this.isPaused = true;
      logger.warn('[MessageQueue] Socket disconnected. Queue paused to prevent failed messages.');
    }
  }

  resumeForConnection(): void {
    if (this.isPaused) {
      this.isPaused = false;
      logger.info('[MessageQueue] Socket reconnected. Resuming message queue.');
      this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.isPaused || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.queue.shift();

    if (!item) {
      this.isProcessing = false;
      return;
    }

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const result = await item.fn();
        const jitter = Math.floor(Math.random() * 800) + 200;
        const totalDelay = this.baseDelayMs + jitter;

        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        item.resolve(result);
        break;
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes('timed out') ||
          errMsg.includes('Connection Closed') ||
          errMsg.includes('Socket') ||
          errMsg.includes('rate-overlimit');

        if (attempts < maxAttempts && isTransient) {
          logger.warn({ err: errMsg, attempt: attempts }, '[MessageQueue] Transient error, retrying in 2s...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        logger.error({ err: errMsg, attempts }, '[MessageQueue] Failed to execute queued task');
        item.reject(err);
        break;
      }
    }

    this.isProcessing = false;
    this.processNext();
  }

  get size(): number {
    return this.queue.length;
  }
}

export const messageQueue = new MessageQueue();
