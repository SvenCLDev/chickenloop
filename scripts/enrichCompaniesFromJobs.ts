/**
 * Enrich companies from job data.
 *
 * For each company with jobs:
 * - City: most frequent job.city → address.city (if missing)
 * - Country: most frequent job.country → address.country (if missing)
 * - Activities: flatten + dedupe job.sports → offeredActivities (if empty)
 * - Email: first job.applicationEmail (if missing)
 * - Pictures: first job.pictures[0] (if empty)
 *
 * Does NOT overwrite existing non-empty company fields.
 *
 * --dry-run: log what would be done, do not update.
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/enrichCompaniesFromJobs.ts
 *   npx tsx scripts/enrichCompaniesFromJobs.ts --dry-run
 *
 * Requires MONGODB_URI in .env.local or environment.
 */

import './loadEnvLocal';
import mongoose from 'mongoose';
import connectDB from '../lib/db';
import { OFFERED_ACTIVITIES_LIST } from '../lib/offeredActivities';

const DRY_RUN = process.argv.includes('--dry-run');

function mostFrequent(values: (string | null | undefined)[]): string | null {
  const trimmed = values
    .map((v) => (v != null ? String(v).trim() : ''))
    .filter((v) => v.length > 0);
  if (trimmed.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of trimmed) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let maxCount = 0;
  let result: string | null = null;
  for (const [val, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      result = val;
    }
  }
  return result;
}

function flattenAndDedupe(arrays: (string[] | null | undefined)[]): string[] {
  const validSet = new Set(OFFERED_ACTIVITIES_LIST);
  const seen = new Set<string>();
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const s = typeof item === 'string' ? item.trim() : '';
      if (s && validSet.has(s)) seen.add(s);
    }
  }
  return Array.from(seen);
}

function isEmpty<T>(arr: T[] | null | undefined): boolean {
  return !arr || arr.length === 0;
}

function isMissing(str: string | null | undefined): boolean {
  return str == null || String(str).trim() === '';
}

async function main(): Promise<void> {
  if (DRY_RUN) {
    console.log('[enrichCompaniesFromJobs] --dry-run: no updates will be performed.');
  }

  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const companiesColl = db.collection('companies');
    const jobsColl = db.collection('jobs');

    const allCompanies = await companiesColl.find({}).toArray();

    let companiesWithJobs = 0;
    let companiesUpdated = 0;
    let cityUpdatedCount = 0;
    let countryUpdatedCount = 0;
    let activitiesUpdatedCount = 0;
    let emailUpdatedCount = 0;
    let picturesUpdatedCount = 0;

    const bulkOps: mongoose.mongo.AnyBulkWriteOperation[] = [];

    for (const company of allCompanies) {
      const companyId = company._id as mongoose.Types.ObjectId;

      const jobs = await jobsColl
        .find(
          { companyId },
          { projection: { city: 1, country: 1, sports: 1, applicationEmail: 1, pictures: 1 } }
        )
        .toArray();

      if (!jobs || jobs.length === 0) continue;
      companiesWithJobs++;

      const update: Record<string, unknown> = {};
      let hasUpdate = false;

      // City: most frequent job.city → address.city
      const companyCity = company.address?.city;
      if (isMissing(companyCity)) {
        const city = mostFrequent(jobs.map((j) => j.city));
        if (city) {
          update['address.city'] = city;
          cityUpdatedCount++;
          hasUpdate = true;
        }
      }

      // Country: most frequent job.country → address.country
      const companyCountry = company.address?.country;
      if (isMissing(companyCountry)) {
        const country = mostFrequent(jobs.map((j) => j.country));
        if (country) {
          update['address.country'] = country;
          countryUpdatedCount++;
          hasUpdate = true;
        }
      }

      // Activities: flatten + dedupe job.sports → offeredActivities
      const companyActivities = company.offeredActivities;
      if (isEmpty(companyActivities)) {
        const activities = flattenAndDedupe(jobs.map((j) => j.sports));
        if (activities.length > 0) {
          update.offeredActivities = activities;
          activitiesUpdatedCount++;
          hasUpdate = true;
        }
      }

      // Email: first job.applicationEmail
      const companyEmail = company.email;
      if (isMissing(companyEmail)) {
        const email = jobs.map((j) => j.applicationEmail).find((e) => !isMissing(e));
        if (email) {
          update.email = String(email).trim();
          emailUpdatedCount++;
          hasUpdate = true;
        }
      }

      // Pictures: first job.pictures[0]
      const companyPictures = company.pictures;
      if (isEmpty(companyPictures)) {
        for (const j of jobs) {
          const pics = j.pictures;
          if (Array.isArray(pics) && pics.length > 0 && pics[0]) {
            update.pictures = [pics[0]];
            picturesUpdatedCount++;
            hasUpdate = true;
            break;
          }
        }
      }

      if (hasUpdate && !DRY_RUN) {
        bulkOps.push({
          updateOne: {
            filter: { _id: companyId },
            update: { $set: update },
          },
        });
        companiesUpdated++;
      } else if (hasUpdate && DRY_RUN) {
        companiesUpdated++;
      }
    }

    if (!DRY_RUN && bulkOps.length > 0) {
      await companiesColl.bulkWrite(bulkOps, { ordered: false });
    }

    console.log('');
    console.log('[enrichCompaniesFromJobs] Summary:');
    console.log('  companiesWithJobs:', companiesWithJobs);
    console.log('  companiesUpdated:', companiesUpdated);
    console.log('  cityUpdatedCount:', cityUpdatedCount);
    console.log('  countryUpdatedCount:', countryUpdatedCount);
    console.log('  activitiesUpdatedCount:', activitiesUpdatedCount);
    console.log('  emailUpdatedCount:', emailUpdatedCount);
    console.log('  picturesUpdatedCount:', picturesUpdatedCount);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[enrichCompaniesFromJobs] Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
