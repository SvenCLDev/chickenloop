import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireRole } from '@/lib/auth';
import { resizeImage } from '@/lib/imageOptimization';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST - Upload company pictures (recruiters and admins)
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['recruiter', 'admin']);

    const formData = await request.formData();
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
    const isVercel = !!process.env.VERCEL;
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const useBlobStorage = isVercel || hasBlobToken;

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
      const filename = `companies/company-${timestamp}-${randomStr}.jpg`;

      if (useBlobStorage) {
        const blob = await put(filename, resizedBuffer, {
          access: 'public',
          contentType: 'image/jpeg',
        });
        uploadedPaths.push(blob.url);
      } else {
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'companies');
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }
        const filePath = join(uploadDir, `company-${timestamp}-${randomStr}.jpg`);
        await writeFile(filePath, resizedBuffer);
        uploadedPaths.push(`/uploads/companies/company-${timestamp}-${randomStr}.jpg`);
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
    if (error instanceof Error && error.message === "COMPANY_PROFILE_INCOMPLETE") {
      return NextResponse.json(
        { error: "COMPANY_PROFILE_INCOMPLETE" },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
