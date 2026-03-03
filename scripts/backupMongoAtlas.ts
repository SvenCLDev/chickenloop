/**
 * Backup MongoDB Atlas (or any MongoDB) using mongodump.
 * Loads MONGODB_URI from .env.local. Read-only: does not modify the database.
 *
 * Run: npx tsx scripts/backupMongoAtlas.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

function main(): void {
  console.log('');
  console.log('MongoDB Atlas backup');
  console.log('====================');

  if (!MONGODB_URI || MONGODB_URI.trim() === '') {
    console.error('Error: MONGODB_URI is missing. Set it in .env.local');
    process.exit(1);
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `mongo_${date}.archive.gz`;
  const archivePath = path.join(process.cwd(), filename);

  console.log(`Archive: ${archivePath}`);
  console.log('');

  console.log('Running mongodump (read-only, no database changes)...');
  try {
    execSync(
      `mongodump --uri=${JSON.stringify(MONGODB_URI)} --archive=${JSON.stringify(archivePath)} --gzip`,
      { stdio: 'inherit' }
    );
  } catch {
    console.error('');
    console.error('mongodump failed. Check that:');
    console.error('  - mongodump is installed (e.g. MongoDB Database Tools)');
    console.error('  - MONGODB_URI in .env.local is valid (Atlas connection string is supported)');
    process.exit(1);
  }

  console.log('');
  console.log('====================');
  console.log(`Backup completed: ${archivePath}`);
  console.log('');
}

main();
