/**
 * Corrective one-time script: set lastRecruiterEditAt = createdAt for every job.
 *
 * The initial backfill used lastRecruiterEditAt = updatedAt. That made jobs appear
 * at the top when updatedAt was changed by system actions (Instagram post, admin
 * edit, featured toggle, etc.). Listing order should be by "last recruiter edit"
 * only. This script resets lastRecruiterEditAt to createdAt so order is by
 * creation date. After this, only recruiter create (POST) and recruiter edit
 * (PUT /api/jobs/[id]) set lastRecruiterEditAt.
 *
 * Run from chickenloop: npx tsx scripts/correctLastRecruiterEditAtToCreatedAt.ts
 */

import './loadEnvLocal';
import connectDB from '../lib/db';
import Job from '../models/Job';

async function main(): Promise<void> {
  console.log('');
  console.log('Correct lastRecruiterEditAt -> createdAt (listing order fix)');
  console.log('===========================================================');

  await connectDB();

  const jobs = await Job.find({})
    .select({ _id: 1, createdAt: 1 })
    .lean();

  console.log(`Found ${jobs.length} job(s).`);

  let updated = 0;
  let skipped = 0;

  for (const job of jobs) {
    const createdAt = job.createdAt;
    if (!createdAt) {
      console.warn(`Job ${job._id}: no createdAt, skipping.`);
      skipped++;
      continue;
    }
    await Job.updateOne(
      { _id: job._id },
      { $set: { lastRecruiterEditAt: createdAt } }
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
