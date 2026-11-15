import sharp from 'sharp';
import { logger } from '../logger.js';

// Restrict Sharp resources on 2GB RAM VPS to prevent memory spikes
sharp.concurrency(1);
sharp.cache(false);

export interface CompressedImageResult {
  buffer: Buffer;
  mimeType: string;
  sizeKb: number;
}

/**
 * Compresses incoming photo/receipt into optimized WebP (< 150 KB target)
 * Max resolution 1200px width/height while maintaining high OCR legibility
 */
export async function compressReceiptImage(
  inputBuffer: Buffer,
  originalMimeType: string = 'image/jpeg'
): Promise<CompressedImageResult> {
  const initialSizeKb = Math.round(inputBuffer.length / 1024);
  logger.info({ initialSizeKb, originalMimeType }, '[ImageService] Compressing receipt image with Sharp...');

  try {
    const pipeline = sharp(inputBuffer, { failOn: 'none' })
      .rotate() // Auto-orient based on EXIF
      .resize({
        width: 1200,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
        effort: 4,
      });

    const compressedBuffer = await pipeline.toBuffer();
    const sizeKb = Math.round(compressedBuffer.length / 1024);

    logger.info(
      { beforeKb: initialSizeKb, afterKb: sizeKb, ratio: `${Math.round((sizeKb / initialSizeKb) * 100)}%` },
      '[ImageService] Compression completed successfully'
    );

    return {
      buffer: compressedBuffer,
      mimeType: 'image/webp',
      sizeKb,
    };
  } catch (err: any) {
    logger.warn({ err: err.message }, '[ImageService] Sharp compression failed, falling back to original buffer');
    return {
      buffer: inputBuffer,
      mimeType: originalMimeType,
      sizeKb: initialSizeKb,
    };
  }
}
