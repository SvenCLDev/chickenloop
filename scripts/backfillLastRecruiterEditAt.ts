/**
 * One-time backfill: set lastRecruiterEditAt = updatedAt (or createdAt) for every job.
 * Run from chickenloop: npx tsx scripts/backfillLastRecruiterEditAt.ts
 */

// Load .env.local before any module that reads MONGODB_URI (imports are hoisted, so this must run first)
import './loadEnvLocal';
import connectDB from '../lib/db';
import Job from '../models/Job';

async function main(): Promise<void> {
  console.log('');
  console.log('Backfill lastRecruiterEditAt');
  console.log('============================');

  await connectDB();

  const jobs = await Job.find({})
    .select({ _id: 1, updatedAt: 1, createdAt: 1 })
    .lean();

  console.log(`Found ${jobs.length} job(s).`);

  let updated = 0;
  let skipped = 0;

  for (const job of jobs) {
    const value = job.updatedAt ?? job.createdAt;
    if (!value) {
      console.warn(`Job ${job._id}: no updatedAt or createdAt, skipping.`);
      skipped++;
      continue;
    }
    await Job.updateOne(
      { _id: job._id },
      { $set: { lastRecruiterEditAt: value } }
    );
    updated++;
    if (updated % 100 === 0) {
      console.log(`Updated ${updated}...`);
    }
  }

  console.log('');
  console.log(`Done. Updated: ${updated}, skipped: ${skipped}`);
  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
