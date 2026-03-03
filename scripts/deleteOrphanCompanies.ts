/**
 * Delete orphan companies.
 *
 * Orphan = Company._id NOT referenced in any job.companyId
 *
 * Safety: Only deletes companies where:
 *   legacy.source === "drupal"
 *   legacy.inferenceStrategy === "inferred_from_jobs"
 *
 * --dry-run: log what would be done, do not delete.
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/deleteOrphanCompanies.ts
 *   npx tsx scripts/deleteOrphanCompanies.ts --dry-run
 *
 * Requires MONGODB_URI in .env.local or environment.
 */

import './loadEnvLocal';
import mongoose from 'mongoose';
import connectDB from '../lib/db';

function parseDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

async function main(): Promise<void> {
  const dryRun = parseDryRun();

  if (dryRun) {
    console.log('[deleteOrphanCompanies] --dry-run: no deletes will be performed.');
  }

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const jobsColl = db.collection('jobs');
    const companiesColl = db.collection('companies');

    // 1. Build set of used companyIds from jobs
    const usedCompanyIds = await jobsColl.distinct('companyId');
    const usedSet = new Set(usedCompanyIds.map((id: mongoose.Types.ObjectId) => id.toString()));

    // 2. Find companies not in that set (orphans)
    const allCompanies = await companiesColl
      .find({}, { projection: { _id: 1, name: 1, 'legacy.source': 1, 'legacy.inferenceStrategy': 1 } })
      .toArray();

    const orphanCompanies = allCompanies.filter(
      (c) => !usedSet.has((c._id as mongoose.Types.ObjectId).toString())
    );

    // 3. Filter by legacy.source and inferenceStrategy
    const toDelete = orphanCompanies.filter(
      (c) =>
        (c.legacy as { source?: string; inferenceStrategy?: string })?.source === 'drupal' &&
        (c.legacy as { source?: string; inferenceStrategy?: string })?.inferenceStrategy === 'inferred_from_jobs'
    );

    // Log summary
    console.log('');
    console.log('[deleteOrphanCompanies] Summary:');
    console.log('  total companies:', allCompanies.length);
    console.log('  companies with jobs:', usedSet.size);
    console.log('  orphan companies:', orphanCompanies.length);
    console.log('  companies to delete (drupal + inferred_from_jobs):', toDelete.length);
    console.log('');

    if (toDelete.length === 0) {
      console.log('[deleteOrphanCompanies] Nothing to delete.');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    if (dryRun) {
      console.log('[deleteOrphanCompanies] Dry run: would delete', toDelete.length, 'orphan companies.');
      console.log('  Sample IDs:', toDelete.slice(0, 5).map((c) => c._id.toString()).join(', '));
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    // 6. Use bulkWrite for deletion
    const bulkOps: mongoose.mongo.AnyBulkWriteOperation[] = toDelete.map((c) => ({
      deleteOne: { filter: { _id: c._id } },
    }));
    const result = await companiesColl.bulkWrite(bulkOps, { ordered: false });
    const deletedCount = result.deletedCount ?? 0;

    console.log('[deleteOrphanCompanies] Deleted', deletedCount, 'orphan companies.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[deleteOrphanCompanies] Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
