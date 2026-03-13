/**
 * Backfill coordinates for jobs that have city/country but no coordinates.
 * Uses Nominatim (1 req/sec). Run from chickenloop: npx tsx scripts/backfill-job-coordinates.ts
 */
import 'dotenv/config';
import './loadEnvLocal';
import connectDB from '../lib/db';
import Job from '../models/Job';
import { geocodeJobLocation } from '../lib/geocodeJobLocation';

const DELAY_MS = 1100; // Nominatim usage policy: max 1 request per second

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await connectDB();

  const jobs = await Job.find({
    published: { $ne: false },
    $or: [
      { coordinates: { $exists: false } },
      { coordinates: null },
    ],
    $and: [
      {
        $or: [
          { city: { $exists: true, $nin: [null, ''], $type: 'string' } },
          { country: { $exists: true, $nin: [null, ''], $type: 'string' } },
        ],
      },
    ],
  })
    .select('_id title city country coordinates')
    .lean();

  console.log(`Found ${jobs.length} jobs without coordinates to geocode.`);

  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    const city = job.city?.trim();
    const country = job.country?.trim();
    if (!city && !country) continue;

    const coords = await geocodeJobLocation(city, country);
    await sleep(DELAY_MS);

    if (coords) {
      await Job.updateOne(
        { _id: job._id },
        { $set: { coordinates: coords } }
      );
      updated++;
      console.log(`  ${job.title} (${[city, country].filter(Boolean).join(', ')}) → ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    } else {
      failed++;
      console.log(`  [skip] ${job.title} (${[city, country].filter(Boolean).join(', ')}) — no result`);
    }
  }

  console.log(`Done. Updated: ${updated}, no result: ${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
