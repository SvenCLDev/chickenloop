import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { resizeImage } from '@/lib/imageOptimization';
import {
  CERTIFICATE_UPLOAD_MAX_BYTES,
  CERTIFICATE_UPLOAD_MIME_TYPES,
} from '@/lib/talentNetwork/constants';

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function uploadCertificateDocument(file: File): Promise<string> {
  if (!CERTIFICATE_UPLOAD_MIME_TYPES.includes(file.type as (typeof CERTIFICATE_UPLOAD_MIME_TYPES)[number])) {
    throw new Error(
      `Invalid file type: ${file.type}. Allowed: PDF, JPEG, PNG, WEBP.`
    );
  }

  const bytes = await file.arrayBuffer();
  const inputBuffer = Buffer.from(bytes);

  if (inputBuffer.length > CERTIFICATE_UPLOAD_MAX_BYTES) {
    throw new Error('File exceeds maximum size of 5MB.');
  }

  const isVercel = !!process.env.VERCEL;
  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const useBlobStorage = isVercel || hasBlobToken;

  if (isVercel && !hasBlobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for file uploads in production');
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const isPdf = file.type === 'application/pdf';
  const extension = isPdf ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
  const filename = `certificates/cert-${timestamp}-${randomStr}.${extension}`;

  let uploadBuffer = inputBuffer;
  let contentType = file.type;

  if (!isPdf && IMAGE_TYPES.includes(file.type)) {
    uploadBuffer = Buffer.from(await resizeImage(inputBuffer));
    contentType = 'image/jpeg';
  }

  if (useBlobStorage) {
    const blob = await put(filename, uploadBuffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'certificates');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  const localName = `cert-${timestamp}-${randomStr}.${extension}`;
  const filePath = join(uploadDir, localName);
  await writeFile(filePath, uploadBuffer);
  return `/uploads/certificates/${localName}`;
}
