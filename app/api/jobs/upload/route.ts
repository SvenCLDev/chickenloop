import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireRole } from '@/lib/auth';
import { resizeImage } from '@/lib/imageOptimization';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// User-friendly message when request body cannot be parsed as multipart (e.g. bad image or size limit)
const FORM_DATA_PARSE_ERROR =
  'The image(s) you selected could not be processed. Please try a different image, use a smaller file (e.g. under 5MB), or use JPEG, PNG, WEBP or GIF.';

// POST - Upload job pictures (recruiters and admins)
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['recruiter', 'admin']);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : '';
      const isFormDataParseError =
        /parse body as FormData|formdata|multipart|body.*limit|payload.*large/i.test(msg) || msg === '';
      return NextResponse.json(
        { error: isFormDataParseError ? FORM_DATA_PARSE_ERROR : `Upload failed: ${msg}` },
        { status: 400 }
      );
    }

    const files = formData.getAll('pictures') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    if (files.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 pictures allowed' },
        { status: 400 }
      );
    }

    const uploadedPaths: string[] = [];
    // In Vercel, always use Blob storage (filesystem is read-only)
    // In local dev, use Blob if token is available, otherwise fallback to filesystem
    const isVercel = !!process.env.VERCEL;
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const useBlobStorage = isVercel || hasBlobToken;
    
    // Log which storage method is being used (for debugging)
    console.log('[Upload] Storage method:', useBlobStorage ? 'Vercel Blob Storage' : 'Local filesystem');
    console.log('[Upload] BLOB_READ_WRITE_TOKEN present:', hasBlobToken);
    console.log('[Upload] Vercel environment:', isVercel);

    if (isVercel && !hasBlobToken) {
      return NextResponse.json(
        { error: 'BLOB_READ_WRITE_TOKEN is required for file uploads in production' },
        { status: 500 }
      );
    }

    for (const file of files) {
      if (!file || !(file instanceof File)) {
        continue;
      }

      // Validate file type
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

      // Generate unique filename (always .jpg after resize)
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const filename = `jobs/job-${timestamp}-${randomStr}.jpg`;

      if (useBlobStorage) {
        // Upload to Vercel Blob (production or local with token)
        const blob = await put(filename, resizedBuffer, {
          access: 'public',
          contentType: 'image/jpeg',
        });
        console.log('[Upload] Uploaded to Blob Storage:', blob.url);
        uploadedPaths.push(blob.url);
      } else {
        // Fallback to filesystem storage (local development only)
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'jobs');
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        const filePath = join(uploadDir, `${timestamp}-${randomStr}.jpg`);
        await writeFile(filePath, resizedBuffer);
        const localPath = `/uploads/jobs/${timestamp}-${randomStr}.jpg`;
        console.log('[Upload] Saved to local filesystem:', localPath);
        uploadedPaths.push(localPath);
      }
    }

    return NextResponse.json(
      {
        message: 'Files uploaded successfully',
        paths: uploadedPaths,
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
    // FormData/body parse errors (e.g. "Failed to parse body as FormData") — return clear message
    if (/parse body as FormData|formdata|multipart|body.*limit|payload.*large/i.test(errorMessage)) {
      return NextResponse.json(
        { error: FORM_DATA_PARSE_ERROR },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
