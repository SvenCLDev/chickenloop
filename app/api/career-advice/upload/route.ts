import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireRole } from '@/lib/auth';
import { resizeImage } from '@/lib/imageOptimization';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST - Upload career advice picture (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const formData = await request.formData();
    const file = formData.get('picture') as File;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Only images (JPEG, PNG, WEBP, GIF) are allowed.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);
    let resizedBuffer: Buffer;
    try {
      resizedBuffer = await resizeImage(inputBuffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Image processing failed';
      return NextResponse.json(
        { error: `Failed to process image ${file.name}: ${msg}` },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const filename = `career-advice/article-${timestamp}-${randomStr}.jpg`;

    const isVercel = !!process.env.VERCEL;
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const useBlobStorage = isVercel || hasBlobToken;

    if (isVercel && !hasBlobToken) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN is required for file uploads in production' },
        { status: 500 }
      );
    }

    let fileUrl: string;

    if (useBlobStorage) {
      const blob = await put(filename, resizedBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });
      console.log('[Upload] Uploaded to Blob Storage:', blob.url);
      fileUrl = blob.url;
    } else {
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'career-advice');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const filePath = join(uploadDir, `${timestamp}-${randomStr}.jpg`);
      await writeFile(filePath, resizedBuffer);
      const localPath = `/uploads/career-advice/${timestamp}-${randomStr}.jpg`;
      console.log('[Upload] Saved to local filesystem:', localPath);
      fileUrl = localPath;
    }

    return NextResponse.json(
      {
        message: 'File uploaded successfully',
        url: fileUrl,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}


