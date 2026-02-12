/**
 * Enrich jobs from Drupal CSV exports.
 *
 * Requirements:
 * - Connect via connectDB()
 * - Load CSVs: jobs_core.csv, jobs_activity.csv, jobs_salary.csv, jobs_occupational_field.csv
 * - Build maps by nid
 * - Update only empty fields (idempotent)
 * - Use updateOne with $set
 * - DRY_RUN mode (no writes)
 */

import './loadEnvLocal';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import connectDB from '../lib/db';
import Job from '../models/Job';
import { mapDrupalActivity } from '../lib/mapActivity';

const DRY_RUN = false;

const DATA_DIR = path.join(process.cwd(), 'data', 'drupal_export');
const CORE_CSV = path.join(DATA_DIR, 'jobs_core.csv');
const ACTIVITY_CSV = path.join(DATA_DIR, 'jobs_activity.csv');
const SALARY_CSV = path.join(DATA_DIR, 'jobs_salary.csv');
const OCCUPATIONAL_CSV = path.join(DATA_DIR, 'jobs_occupational_field.csv');

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

async function main(): Promise<void> {
  let updatedCount = 0;
  let skippedCount = 0;
  let unmatchedCount = 0;

  try {
    console.log('[enrichJobsFromDrupal] DRY_RUN:', DRY_RUN);
    console.log('[enrichJobsFromDrupal] Loading CSVs...');
    const coreMap = buildCoreMap();
    const activityMap = buildActivityMap();
    const salaryMap = buildSalaryMap();
    const occupationalMap = buildOccupationalMap();
    console.log('[enrichJobsFromDrupal] Maps loaded:', {
      core: coreMap.size,
      activities: activityMap.size,
      salary: salaryMap.size,
      occupational: occupationalMap.size,
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

      const update: Record<string, unknown> = {};

      const description = (job.description ?? '').trim();
      if ((description === '' || description === 'Migrated job') && core?.body_value) {
        const nextDescription = core.body_value.trim();
        if (nextDescription) {
          update.description = nextDescription;
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
          update.sports = [...mapped];
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
          update.occupationalAreas = [...mapped];
        }
      }

      if ((!job.salary || String(job.salary).trim() === '') && salary) {
        update.salary = salary;
      }

      const updateKeys = Object.keys(update);
      if (updateKeys.length === 0) {
        skippedCount++;
        continue;
      }

      if (!DRY_RUN) {
        await Job.updateOne({ _id: job._id }, { $set: update });
      }

      updatedCount++;
    }

    console.log('');
    console.log('Summary:');
    console.log('  updatedCount:', updatedCount);
    console.log('  skippedCount:', skippedCount);
    console.log('  unmatchedCount:', unmatchedCount);
  } catch (error) {
    console.error('[enrichJobsFromDrupal] Error:', error);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
