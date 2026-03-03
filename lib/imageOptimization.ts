import sharp from 'sharp';

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 82;

/**
 * Resize and optimize an image for storage.
 * Allows users to upload large images; only stores smaller optimized versions.
 * - Rotates based on EXIF
 * - Resizes to max 1600px width (maintains aspect ratio, never enlarges)
 * - Converts to JPEG with quality 82
 */
export async function resizeImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({
      width: MAX_WIDTH,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
