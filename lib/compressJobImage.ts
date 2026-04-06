import imageCompression from 'browser-image-compression';
import {
  JOB_PHOTO_MAX_BYTES_PER_FILE,
  validateOriginalJobPhotoFiles,
} from '@/lib/jobPostPayload';

const MAX_WIDTH_OR_HEIGHT = 1600;
const SIZE_TARGETS_MB = [0.8, 0.5, 0.35, 0.25] as const;

function toFile(blob: File | Blob, fileName: string): File {
  if (blob instanceof File) {
    return blob;
  }
  return new File([blob], fileName, {
    type: blob.type || 'image/jpeg',
  });
}

/**
 * Resize/compress in the browser so POST /api/jobs/upload stays under Vercel body limits.
 * Retries with lower maxSizeMB targets until output is under JOB_PHOTO_MAX_BYTES_PER_FILE.
 */
export async function compressJobImageForUpload(file: File): Promise<File> {
  let last: File | null = null;

  for (const maxSizeMB of SIZE_TARGETS_MB) {
    const compressed = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
      useWebWorker: true,
    });
    last = toFile(compressed, file.name);
    if (last.size <= JOB_PHOTO_MAX_BYTES_PER_FILE) {
      return last;
    }
  }

  throw new Error('COMPRESS_TOO_LARGE');
}

/**
 * Validates originals (≤6 MB), then compresses each file for upload.
 */
export async function compressIncomingJobPhotoFiles(
  files: File[],
  onProgress?: (message: string) => void
): Promise<{ ok: true; files: File[] } | { ok: false; error: string }> {
  const origErr = validateOriginalJobPhotoFiles(files);
  if (origErr) {
    return { ok: false, error: origErr };
  }

  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.(`Optimizing image ${i + 1} of ${files.length}…`);
    try {
      out.push(await compressJobImageForUpload(f));
    } catch (e) {
      const msg =
        e instanceof Error && e.message === 'COMPRESS_TOO_LARGE'
          ? `Could not reduce "${f.name}" enough for upload. Try a smaller or simpler image.`
          : `Could not optimize "${f.name}". Try another image.`;
      return { ok: false, error: msg };
    }
  }
  return { ok: true, files: out };
}
