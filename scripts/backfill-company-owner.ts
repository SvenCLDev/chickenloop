/**
 * One-off migration: backfill Company.ownerRecruiter from legacy owner/recruiter.
 *
 * - Finds companies where ownerRecruiter is missing (or null).
 * - If the document has an old recruiter field (e.g. owner or recruiter), copies it to ownerRecruiter.
 * - Saves the updated document.
 * - Safe to run multiple times (idempotent for already-backfilled docs).
 * - Development-only; safety over speed.
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/backfill-company-owner.ts
 * Or:
 *   npx ts-node --project tsconfig.json scripts/backfill-company-owner.ts
 *
 * Requires MONGODB_URI in .env.local or environment.
 */

import './loadEnvLocal'; // must run before lib/db so MONGODB_URI is set
import mongoose from 'mongoose';
import connectDB from '../lib/db';
import Company from '../models/Company';

async function backfillCompanyOwner() {
  try {
    console.log('[backfill-company-owner] Starting...');

    await connectDB();
    console.log('[backfill-company-owner] Connected to database.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collection = db.collection('companies');

    const filter = {
      $or: [
        { ownerRecruiter: { $exists: false } },
        { ownerRecruiter: null },
      ],
    };

    const cursor = collection.find(filter);
    let updated = 0;
    let skipped = 0;

    for await (const doc of cursor) {
      const source = (doc as Record<string, unknown>).owner ?? (doc as Record<string, unknown>).recruiter;
      if (source == null || source === '') {
        console.warn(`[backfill-company-owner] Skipping company _id=${doc._id} (no owner/recruiter to copy).`);
        skipped++;
        continue;
      }

      const ownerRecruiter =
        source instanceof mongoose.Types.ObjectId
          ? source
          : new mongoose.Types.ObjectId(String(source));

      await collection.updateOne(
        { _id: doc._id },
        { $set: { ownerRecruiter } }
      );
      updated++;
      console.log(`[backfill-company-owner] Updated company _id=${doc._id}`);
    }

    console.log('[backfill-company-owner] Done. Companies updated:', updated);
    if (skipped > 0) {
      console.log('[backfill-company-owner] Companies skipped (no source):', skipped);
    }

    await mongoose.disconnect();
    console.log('[backfill-company-owner] Disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('[backfill-company-owner] Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

backfillCompanyOwner();
