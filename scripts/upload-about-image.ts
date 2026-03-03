/**
 * One-off script to upload the About page image (Sven) to Vercel Blob.
 * Run from chickenloop dir: npx tsx scripts/upload-about-image.ts [path-to-image]
 * Example: npx tsx scripts/upload-about-image.ts public/Sven-Rooster.png
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local.
 * Prints the blob URL to use in the About page.
 */

import * as fs from 'fs';
import * as path from 'path';
import { put } from '@vercel/blob';

async function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    });
  }
}

async function main() {
  await loadEnv();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN not set in .env.local');
    process.exit(1);
  }

  const inputPath = process.argv[2] || path.resolve(process.cwd(), 'public', 'Sven-Rooster.png');
  const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absolutePath)) {
    console.error('Image not found:', absolutePath);
    console.log('Usage: npx tsx scripts/upload-about-image.ts <path-to-image>');
    process.exit(1);
  }

  const buffer = fs.readFileSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase() || '.png';
  const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
  const blobPath = `about/sven-rooster${ext}`;

  const blob = await put(blobPath, buffer, {
    access: 'public',
    contentType,
  });

  console.log('Uploaded to Vercel Blob:');
  console.log(blob.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
