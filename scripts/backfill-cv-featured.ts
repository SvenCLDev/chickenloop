/**
 * MongoDB migration: backfill CV.featured = false for existing CVs.
 *
 * - Sets featured=false only where the field is missing or null.
 * - Does not modify CVs that already have featured=true (or featured=false).
 * - Safe to run multiple times (idempotent).
 * - Logs the number of affected documents.
 *
 * Usage (from repo root):
 *   npx ts-node --project tsconfig.json scripts/backfill-cv-featured.ts
 * Or with tsx:
 *   npx tsx scripts/backfill-cv-featured.ts
 *
 * Requires MONGODB_URI in .env.local (or environment).
 */

import mongoose from 'mongoose';
import connectDB from '../lib/db';

async function backfillCvFeatured() {
  try {
    console.log('[backfill-cv-featured] Starting migration...');

    await connectDB();
    console.log('[backfill-cv-featured] Connected to database.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collection = db.collection('cvs');

    // Match only documents where featured is missing or null (do not touch featured=true or featured=false)
    const filter = {
      $or: [
        { featured: { $exists: false } },
        { featured: null },
      ],
    };

    const result = await collection.updateMany(filter, { $set: { featured: false } });

    console.log('[backfill-cv-featured] Matched documents:', result.matchedCount);
    console.log('[backfill-cv-featured] Modified documents:', result.modifiedCount);

    if (result.modifiedCount > 0) {
      console.log('[backfill-cv-featured] Migration completed. Set featured=false on', result.modifiedCount, 'CV(s).');
    } else {
      console.log('[backfill-cv-featured] No CVs needed updating (all already have featured set).');
    }

    await mongoose.disconnect();
    console.log('[backfill-cv-featured] Disconnected.');
    process.exit(0);
  } catch (error) {
    console.error('[backfill-cv-featured] Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

backfillCvFeatured();
