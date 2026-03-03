/**
 * Find jobs with empty or whitespace-only titles.
 * These cause Google Search Console "Missing field 'title'" errors for JobPosting schema.
 *
 * Usage (from chickenloop dir):
 *   npx tsx scripts/findJobsWithInvalidTitle.ts
 *
 * Loads MONGODB_URI from .env.local if present.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local BEFORE importing db (db.ts checks MONGODB_URI at load time)
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

function hasInvalidTitle(title: unknown): boolean {
  if (title == null) return true;
  const s = String(title).trim();
  return s.length === 0;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI not set. Ensure .env.local exists with MONGODB_URI.');
    process.exit(1);
  }

  const { default: connectDB } = await import('../lib/db');
  const { default: Job } = await import('../models/Job');

  await connectDB();
  console.log('[findJobsWithInvalidTitle] Connected to database.\n');

  const jobs = await Job.find({})
    .select('_id title city country published createdAt legacySlug')
    .lean();

  const invalid = jobs.filter((j: any) => hasInvalidTitle(j.title));

  console.log(`Total jobs in database: ${jobs.length}`);
  console.log(`Jobs with empty or whitespace-only title: ${invalid.length}`);
  console.log('');

  if (invalid.length === 0) {
    console.log('No jobs with invalid titles found.');
    process.exit(0);
    return;
  }

  console.log('Jobs with invalid title:');
  console.log('-'.repeat(80));
  for (const j of invalid) {
    const id = (j as any)._id?.toString() ?? '—';
    const title = JSON.stringify((j as any).title ?? '');
    const city = (j as any).city ?? '—';
    const country = (j as any).country ?? '—';
    const published = (j as any).published ?? '—';
    const legacySlug = (j as any).legacySlug ?? '—';
    console.log(`  _id: ${id}`);
    console.log(`  title: ${title}`);
    console.log(`  city: ${city}, country: ${country}`);
    console.log(`  published: ${published}, legacySlug: ${legacySlug}`);
    console.log('');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[findJobsWithInvalidTitle] Error:', err);
  process.exit(1);
});
