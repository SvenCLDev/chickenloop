/**
 * Enrich jobs from Drupal CSV exports.
 *
 * Requirements:
 * - Connect via connectDB()
 * - Load CSVs: jobs_core.csv, jobs_activity.csv, jobs_salary.csv, jobs_occupational_field.csv
 * - Build maps by nid
 * - Update only empty fields (idempotent)
 * - Use updateOne with $set
 * - DRY_RUN mode (no writes): pass --dry-run to enable
 */

import './loadEnvLocal';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import connectDB from '../lib/db';
import Job, { EMPLOYMENT_TYPES } from '../models/Job';
import User from '../models/User';
import { mapDrupalActivity } from '../lib/mapActivity';
import { normalizeCountryForStorage } from '../lib/countryUtils';

const DRY_RUN = process.argv.includes('--dry-run');

const DATA_DIR = path.join(process.cwd(), 'data', 'drupal_export');
const CORE_CSV = path.join(DATA_DIR, 'jobs_core.csv');
const ACTIVITY_CSV = path.join(DATA_DIR, 'jobs_activity.csv');
const SALARY_CSV = path.join(DATA_DIR, 'jobs_salary.csv');
const OCCUPATIONAL_CSV = path.join(DATA_DIR, 'jobs_occupational_field.csv');
const LOCATION_CSV = path.join(DATA_DIR, 'jobs_location.csv');
const REGION_CSV = path.join(DATA_DIR, 'jobs_region.csv');
const EMPLOYMENT_TYPE_CSV = path.join(DATA_DIR, 'jobs_employment_type.csv');

async function loadCSV(filePath: string): Promise<Record<string, string>[]> {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const rows = parseCsv(filePath).map(normalizeCsvRow);
  return rows;
}

const EMPLOYMENT_TYPE_MAP: Record<string, (typeof EMPLOYMENT_TYPES)[number]> = {
  "full time": "full_time",
  "part time / side job": "part_time",
  "freelancer / self-employed": "freelance",
  "internship / trainee": "internship",
  "marginal employment": "part_time",
  "project work / diploma": "project",
};

const EMPLOYMENT_PRIORITY: (typeof EMPLOYMENT_TYPES)[number][] = [
  'full_time',
  'part_time',
  'freelance',
  'internship',
  'project',
  'other',
];

const OCCUPATIONAL_MAP: Record<string, string> = {
  'Instructor / Coach': 'instructor',
  'Customer Support': 'customer_support',
  'Sales / Retail': 'sales',
  'Hospitality': 'hospitality',
  'Marketing': 'marketing',
  'IT': 'other',
  'Project / Program Management': 'management',
  'Operations': 'other',
};

interface CoreRow {
  nid: string;
  title?: string;
  created?: string;
  changed?: string;
  body_value?: string;
}

function normalizeCsvRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const newKey = key.replace(/^"+|"+$/g, '');
    out[newKey] = value ?? '';
  }
  return out;
}

function parseCsv(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function buildCoreMap(): Map<string, CoreRow> {
  const rows = parseCsv(CORE_CSV).map(normalizeCsvRow);
  const map = new Map<string, CoreRow>();
  for (const row of rows) {
    const nid = (row.nid ?? '').trim();
    if (!nid) continue;
    map.set(nid, {
      nid,
      title: row.title ?? '',
      created: row.created ?? '',
      changed: row.changed ?? '',
      body_value: row.body_value ?? '',
    });
  }
  return map;
}

function buildActivityMap(): Map<string, string[]> {
  const rows = parseCsv(ACTIVITY_CSV).map(normalizeCsvRow);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const nid = (row.nid ?? '').trim();
    const activity = (row.activity ?? '').trim();
    if (!nid || !activity) continue;
    const list = map.get(nid) ?? [];
    list.push(activity);
    map.set(nid, list);
  }
  return map;
}

function buildSalaryMap(): Map<string, string> {
  const rows = parseCsv(SALARY_CSV).map(normalizeCsvRow);
  const map = new Map<string, string>();
  for (const row of rows) {
    const nid = (row.nid ?? '').trim();
    const salary = (row.salary ?? '').trim();
    if (!nid || salary === '') continue;
    map.set(nid, salary);
  }
  return map;
}

function buildOccupationalMap(): Map<string, string[]> {
  const rows = parseCsv(OCCUPATIONAL_CSV).map(normalizeCsvRow);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const nid = (row.nid ?? '').trim();
    const occupational = (row.occupational ?? '').trim();
    if (!nid || !occupational) continue;
    const list = map.get(nid) ?? [];
    list.push(occupational);
    map.set(nid, list);
  }
  return map;
}

function buildEmploymentTypeMap(): Map<string, string[]> {
  const rows = loadCSVSync(EMPLOYMENT_TYPE_CSV);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const nid = (row.nid ?? row.drupal_nid ?? '').toString().trim();
    const employmentType = (row.employment_type ?? '').trim().toLowerCase();
    if (!nid || !employmentType) continue;
    const list = map.get(nid) ?? [];
    list.push(employmentType);
    map.set(nid, list);
  }
  return map;
}

function loadCSVSync(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(filePath).map(normalizeCsvRow);
}

async function main(): Promise<void> {
  let updatedCount = 0;
  let skippedCount = 0;
  let unmatchedCount = 0;
  let locationUpdatedCount = 0;
  let countryBackfilledCount = 0;
  let employmentUpdatedCount = 0;
  const unmappedEmploymentValues = new Set<string>();

  try {
    console.log('[enrichJobsFromDrupal] DRY_RUN:', DRY_RUN);
    console.log('[enrichJobsFromDrupal] Loading CSVs...');
    const coreMap = buildCoreMap();
    const activityMap = buildActivityMap();
    const salaryMap = buildSalaryMap();
    const occupationalMap = buildOccupationalMap();

    const locationRows = await loadCSV(LOCATION_CSV);
    const regionRows = await loadCSV(REGION_CSV);
    const employmentTypeMap = buildEmploymentTypeMap();

    const locationMap = new Map<string, string>();
    locationRows.forEach((row: Record<string, string>) => {
      const nid = row.drupal_nid ?? row.nid;
      const city = row.city;
      if (nid && city) {
        locationMap.set(String(nid).trim(), city.trim());
      }
    });

    const regionMap = new Map<string, string>();
    regionRows.forEach((row: Record<string, string>) => {
      const nid = row.drupal_nid ?? row.nid;
      const countryName = row.country_name;
      if (nid && countryName) {
        regionMap.set(String(nid).trim(), countryName.trim());
      }
    });

    console.log('[enrichJobsFromDrupal] Maps loaded:', {
      core: coreMap.size,
      activities: activityMap.size,
      salary: salaryMap.size,
      occupational: occupationalMap.size,
      location: locationMap.size,
      region: regionMap.size,
      employmentType: employmentTypeMap.size,
    });

    await connectDB();

    const jobs = await Job.find({ 'legacy.drupalNid': { $exists: true } });
    for (const job of jobs) {
      const drupalNid = job.legacy?.drupalNid;
      if (drupalNid === undefined || drupalNid === null) {
        skippedCount++;
        continue;
      }
      const nid = String(drupalNid).trim();

      const core = coreMap.get(nid);
      const activities = activityMap.get(nid);
      const salary = salaryMap.get(nid);
      const occupational = occupationalMap.get(nid);

      if (!core && !activities && !salary && !occupational) {
        unmatchedCount++;
        continue;
      }

      const updatePayload: any = {};

      const description = (job.description ?? '').trim();
      if ((description === '' || description === 'Migrated job') && core?.body_value) {
        const nextDescription = core.body_value.trim();
        if (nextDescription) {
          updatePayload.description = nextDescription;
        }
      }

      const sports = (job as any).sports as string[] | undefined;
      if ((!sports || sports.length === 0) && activities && activities.length > 0) {
        const mapped = new Set<string>();
        for (const a of activities) {
          const canonical = mapDrupalActivity(a);
          if (canonical) mapped.add(canonical);
        }
        if (mapped.size > 0) {
          updatePayload.sports = [...mapped];
        }
      }

      const occupationalAreas = (job as any).occupationalAreas as string[] | undefined;
      if ((!occupationalAreas || occupationalAreas.length === 0) && occupational && occupational.length > 0) {
        const mapped = new Set<string>();
        for (const o of occupational) {
          const normalized = OCCUPATIONAL_MAP[o] ?? 'other';
          mapped.add(normalized);
        }
        if (mapped.size > 0) {
          updatePayload.occupationalAreas = [...mapped];
        }
      }

      if ((!job.salary || String(job.salary).trim() === '') && salary) {
        updatePayload.salary = salary;
      }

      const city = locationMap.get(nid);
      const resolvedCity = city || (job.city ?? '').trim();

      if (resolvedCity) {
        updatePayload.city = resolvedCity;
        if (city && city !== (job.city ?? '').trim()) {
          locationUpdatedCount++;
        }
      }

      const regionName = regionMap.get(nid);
      if (!job.country && regionName) {
        console.log(
          `[DEBUG REGION RAW] nid=${nid}, region="${regionName}", length=${regionName?.length}`
        );
        const cleanedRegion = regionName
          ?.normalize("NFKC")
          .trim()
          .replace(/\s+/g, " ");
        const isoCode = normalizeCountryForStorage(cleanedRegion);
        if (isoCode) {
          updatePayload.country = isoCode.toUpperCase();
          countryBackfilledCount++;
        } else {
          console.warn(`[Country Mapping Failed] nid=${nid}, region="${regionName}"`);
        }
      }

      // Employment Type
      const employmentValues = employmentTypeMap.get(nid);

      if (employmentValues && employmentValues.length > 0) {
        // Prefer full_time if multiple values exist
        let mappedType: string | null = null;

        for (const rawValue of employmentValues) {
          const normalized = rawValue.trim().toLowerCase();

          if (normalized === 'full time') {
            mappedType = 'full_time';
            break;
          }

          if (normalized === 'part time / side job') {
            mappedType = 'part_time';
          }

          if (normalized === 'freelancer / self-employed') {
            mappedType = 'freelance';
          }

          if (normalized === 'internship / trainee') {
            mappedType = 'internship';
          }

          if (normalized === 'project work / diploma') {
            mappedType = 'project';
          }

          if (normalized === 'marginal employment') {
            mappedType = 'other';
          }
        }

        if (mappedType) {
          updatePayload.type = mappedType;
          employmentUpdatedCount++;
        }
      }

      updatePayload.applyViaATS = true;
      updatePayload.applyByEmail = true;
      updatePayload.applyByWebsite = false;
      updatePayload.applyByWhatsApp = false;

      const recruiter = await User.findById(job.recruiter)
        .select('email')
        .lean();
      if (recruiter?.email) {
        updatePayload.applicationEmail = recruiter.email;
      }

      const updateKeys = Object.keys(updatePayload);
      if (updateKeys.length === 0) {
        skippedCount++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`[DRY_RUN] Would update job ${job._id} (nid=${nid}):`, updatePayload);
      } else {
        console.log("[DEBUG FINAL UPDATE]", {
          jobId: job._id,
          type: updatePayload.type,
          fullPayload: updatePayload
        });
        await Job.updateOne({ _id: job._id }, { $set: updatePayload });
      }

      updatedCount++;
    }

    if (unmappedEmploymentValues.size > 0) {
      console.log('');
      console.log('[Unmapped employment values]:');
      for (const val of [...unmappedEmploymentValues].sort()) {
        console.log('  -', val);
      }
    }

    console.log('');
    console.log('Summary:');
    console.log('  updatedCount:', updatedCount);
    console.log('  skippedCount:', skippedCount);
    console.log('  unmatchedCount:', unmatchedCount);
    console.log('  locationUpdatedCount:', locationUpdatedCount);
    console.log('  countryBackfilledCount:', countryBackfilledCount);
    console.log('  employmentUpdatedCount:', employmentUpdatedCount);
  } catch (error) {
    console.error('[enrichJobsFromDrupal] Error:', error);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
