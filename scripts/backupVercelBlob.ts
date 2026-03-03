/**
 * Backup Vercel Blob store: list all blobs, download to temp folder, compress to tar.gz.
 * Read-only: does not modify any blobs.
 * Requires BLOB_READ_WRITE_TOKEN in env (e.g. .env.local).
 *
 * Run: npx tsx scripts/backupVercelBlob.ts
 */

import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const TEMP_FOLDER = 'blob_backup';

async function main(): Promise<void> {
  if (!BLOB_READ_WRITE_TOKEN || BLOB_READ_WRITE_TOKEN.trim() === '') {
    console.error('Error: BLOB_READ_WRITE_TOKEN is missing. Set it in .env.local or env.');
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);
  const archiveName = `vercel_blob_${date}.tar.gz`;
  const cwd = process.cwd();
  const tempDir = path.join(cwd, TEMP_FOLDER);
  const archivePath = path.join(cwd, archiveName);

  try {
    console.log('Listing blobs...');
    const { blobs } = await list({ token: BLOB_READ_WRITE_TOKEN });

    if (blobs.length === 0) {
      console.log('No blobs to backup.');
      return;
    }

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    console.log(`Downloading ${blobs.length} blob(s)...`);
    for (let i = 0; i < blobs.length; i++) {
      const blob = blobs[i];
      const filePath = path.join(tempDir, path.normalize(blob.pathname));
      const relative = path.relative(tempDir, filePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        console.error(`Skipping invalid pathname: ${blob.pathname}`);
        continue;
      }
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const res = await fetch(blob.url, {
        headers: { Authorization: `Bearer ${BLOB_READ_WRITE_TOKEN}` },
      });
      if (!res.ok) {
        throw new Error(`Download failed ${res.status}: ${blob.url}`);
      }
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      if ((i + 1) % 50 === 0 || i === blobs.length - 1) {
        console.log(`Downloaded ${i + 1}/${blobs.length}`);
      }
    }

    console.log('Compressing...');
    execSync('tar', ['-czf', archivePath, TEMP_FOLDER], { cwd, stdio: 'inherit' });

    console.log('Removing temp folder...');
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`Backup completed: ${archivePath}`);
  } catch (err) {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    console.error(err);
    process.exit(1);
  }
}

main();
