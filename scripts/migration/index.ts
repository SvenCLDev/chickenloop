/**
 * Migration entry point (dry run by default).
 * Loads .env.local, loads CSV exports, runs company inference.
 * When DRY_RUN=false: connects to DB and persists inferred companies.
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/migration/index.ts
 *   DRY_RUN=false npx tsx scripts/migration/index.ts
 *
 * CSV files are read from project root, /data, or /data/drupal_export/.
 */

import '../loadEnvLocal';
import connectDB from '../../lib/db';
import Company from '../../models/Company';
import User from '../../models/User';
import Job from '../../models/Job';
import { inferCompanies, getInferenceSummary } from './transform/companyInference';
import type { CompanyInferenceResult, RecruiterRow, CompanyRow, JobRow } from './transform/companyInference';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const CSV_FILES = {
  recruiters: 'recruiter-export.csv',
  companies: 'company-export.csv',
  jobs: 'job-export.csv',
} as const;

function findCsvPath(filename: string): string | null {
  const cwd = process.cwd();
  const inRoot = path.join(cwd, filename);
  if (fs.existsSync(inRoot)) return inRoot;
  const inData = path.join(cwd, 'data', filename);
  if (fs.existsSync(inData)) return inData;
  const inDataAbsolute = path.join('/data', filename);
  if (fs.existsSync(inDataAbsolute)) return inDataAbsolute;
  const inDrupalExport = path.join(cwd, 'data', 'drupal_export', filename);
  if (fs.existsSync(inDrupalExport)) return inDrupalExport;
  const inDrupalExportAbsolute = path.join('/data', 'drupal_export', filename);
  if (fs.existsSync(inDrupalExportAbsolute)) return inDrupalExportAbsolute;
  return null;
}

function parseCsv(filePath: string): Record<string, string>[] {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function countCsvRows(filePath: string): number {
  return parseCsv(filePath).length;
}

/** Strip surrounding double quotes from CSV row keys so e.g. '"job_organization"' → 'job_organization'. Values unchanged. */
function normalizeCsvRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const newKey = key.replace(/^"+|"+$/g, '');
    out[newKey] = value;
  }
  return out;
}

function loadRecruiters(filePath: string): RecruiterRow[] {
  const rows = parseCsv(filePath).map(normalizeCsvRow);
  return rows.map((r) => {
    const rawUid = String(r.uid ?? r.UID ?? '').trim();
    const cleanedUid = rawUid
      .replace(/^"+|"+$/g, '')
      .replace(/^'+|'+$/g, '')
      .trim();
    return { ...r, uid: cleanedUid };
  });
}

function loadCompanies(filePath: string): CompanyRow[] {
  const rows = parseCsv(filePath).map(normalizeCsvRow);
  return rows.map((r) => {
    const ownerUidRaw = r.owner_uid ?? r.ownerUid ?? r.uid ?? r.UID ?? '';
    const ownerUid = Number(ownerUidRaw) || 0;
    return {
      ...r,
      nid: r.nid ?? r.NID ?? '',
      uid: String(ownerUidRaw).trim(),
      ownerUid,
      owner_uid: r.owner_uid ?? ownerUidRaw,
      name: r.name ?? r.title ?? '',
      title: r.title ?? r.name ?? '',
    };
  });
}

function trimToUndefined(s: string | undefined): string | undefined {
  const t = (s ?? '').trim();
  return t === '' ? undefined : t;
}

function loadJobs(filePath: string): JobRow[] {
  const rows = parseCsv(filePath).map(normalizeCsvRow);
  if (rows.length > 0) {
    console.log('Job CSV keys:', Object.keys(rows[0]));
  }
  return rows.map((r) => {
    const ownerUidRaw = r.owner_uid ?? '';
    const ownerUidNum = Number(ownerUidRaw);
    const ownerUid =
      ownerUidRaw !== '' && !Number.isNaN(ownerUidNum) ? ownerUidNum : undefined;
    const jobOrganizationRaw =
      r.job_organization ?? r.Job_organization ?? r.jobOrganization ?? r.organization ?? '';
    const jobWebsiteRaw =
      r.job_website ?? r.Job_website ?? r.website ?? r.field_website ?? '';
    const jobEmailRaw =
      r.job_email ?? r.Job_email ?? r.email ?? r.field_job_email ?? '';
    return {
      ...r,
      uid: (r.uid ?? r.UID ?? '').trim(),
      ownerUid,
      nid: r.nid ?? r.NID ?? '',
      title: r.title ?? '',
      status: r.status ?? '',
      created: r.created ?? '',
      changed: r.changed ?? '',
      organization: r.organization ?? r.Organization ?? '',
      company_nid: r.company_nid ?? r.company_nid ?? '',
      job_organization: trimToUndefined(jobOrganizationRaw),
      job_website: trimToUndefined(jobWebsiteRaw),
      job_email: trimToUndefined(jobEmailRaw),
    };
  });
}

function normalizeCompanyName(name: string): string {
  let s = (name ?? '');

  // Remove CR, LF, tabs
  s = s.replace(/[\r\n\t]/g, '');

  // Remove non-breaking spaces
  s = s.replace(/\u00A0/g, ' ');

  // Trim first
  s = s.trim();

  // Remove any trailing commas
  s = s.replace(/,+$/, '').trim();

  // Remove trailing (Legacy)
  if (s.endsWith(' (Legacy)')) {
    s = s.slice(0, -' (Legacy)'.length).trim();
  }

  // Remove ALL leading/trailing quotes robustly
  s = s.replace(/^[\"']+/, '').replace(/[\"']+$/, '').trim();

  // If still ends with a quote after trimming whitespace, remove again
  while (s.endsWith('"') || s.endsWith("'")) {
    s = s.slice(0, -1).trim();
  }

  // Convert to Title Case
  s = s
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return s.trim();
}

async function persistCompanies(
  inferenceResults: CompanyInferenceResult[],
  placeholderOwnerId: import('mongoose').Types.ObjectId
): Promise<number> {
  let count = 0;
  for (const result of inferenceResults) {
    const recruiterUid = result.recruiterUid;
    const inferredName = result.inferredName ?? '';
    const cleanedName = normalizeCompanyName(inferredName);
    const strategy = result.strategy;
    const rawNid = result.sourceCompanyNid;
    const nidStr =
      rawNid == null || rawNid === ''
        ? ''
        : String(rawNid).replace(/^"+|"+$/g, '').trim();
    const sourceCompanyNidNum =
      nidStr === '' ? null : (Number(nidStr) || null);
    const confidence = result.confidence ?? 0;

    const filter = {
      'legacy.recruiterUid': recruiterUid,
    };
    const update = {
      $set: {
        name: cleanedName,
        ownerRecruiter: placeholderOwnerId,
        legacy: {
          source: 'drupal',
          recruiterUid,
          inferenceStrategy: strategy,
          sourceCompanyNid: sourceCompanyNidNum,
          confidence,
          migratedAt: new Date(),
        },
      },
    };
    const options = { upsert: true };

    const res = await Company.updateOne(filter, update, options);
    count += (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
  }
  return count;
}

async function persistRecruiters(recruiters: RecruiterRow[]): Promise<number> {
  let count = 0;
  for (const recruiter of recruiters) {
    const cleanedName = recruiter.name
      ?.replace(/[\r\n\t]/g, '')
      ?.replace(/\u00A0/g, ' ')
      ?.replace(/^["']+/, '')
      ?.replace(/["']+$/, '')
      ?.trim();

    const cleanedEmail = recruiter.mail
      ?.replace(/[\r\n\t]/g, '')
      ?.replace(/\u00A0/g, ' ')
      ?.replace(/^["']+/, '')
      ?.replace(/["']+$/, '')
      ?.trim()
      ?.toLowerCase();

    if (!cleanedEmail) continue;

    const company = await Company.findOne({
      'legacy.recruiterUid': recruiter.uid,
    });
    if (!company) {
      throw new Error(`Company not found for recruiter UID ${recruiter.uid}`);
    }

    const user = await User.findOneAndUpdate(
      { email: cleanedEmail },
      {
        $set: {
          name: cleanedName ?? '',
          email: cleanedEmail,
          role: 'recruiter',
          companyId: company._id,
          isActive: true,
          legacy: {
            source: 'drupal',
            drupalUid: normalizeUid(recruiter.uid),
            migratedAt: new Date(),
          },
        },
        $setOnInsert: {
          password: 'MIGRATION_PLACEHOLDER_CHANGE_ME',
        },
      },
      { upsert: true, new: true }
    );

    await Company.updateOne(
      { _id: company._id },
      { $set: { ownerRecruiter: user._id } }
    );
    count += 1;
  }
  return count;
}

function normalizeUid(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const str = String(value)
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();

  return str.length ? str : null;
}

async function persistJobs(jobs: JobRow[]): Promise<number> {
  const recruiterMap = new Map<string, Awaited<ReturnType<typeof User.findOne>>>();
  const users = await User.find({
    role: 'recruiter',
    'legacy.drupalUid': { $exists: true, $ne: null },
  });
  for (const user of users) {
    const normalizedUid = normalizeUid(user.legacy?.drupalUid);
    if (normalizedUid) {
      recruiterMap.set(normalizedUid, user);
    }
  }

  let count = 0;
  for (const job of jobs) {
    const rawTitle = (job.title ?? '').trim();
    if (!rawTitle) continue;

    const normalizedJobUid = normalizeUid((job as Record<string, unknown>).recruiter_uid);
    if (!normalizedJobUid) {
      console.warn(`[migration] Invalid recruiter_uid for job ${(job as Record<string, unknown>).nid ?? job.nid}`);
      continue;
    }
    const recruiter = recruiterMap.get(normalizedJobUid);
    if (!recruiter) {
      console.warn(
        `[migration] No recruiter found for job "${(job as Record<string, unknown>).title ?? rawTitle}" (legacy.drupalUid=${normalizedJobUid}). Skipping.`
      );
      continue;
    }
    const companyId = recruiter.companyId;
    if (!companyId) {
      console.warn(`[migration] Recruiter ${recruiter.email} has no companyId. Skipping job "${rawTitle.slice(0, 40)}...".`);
      continue;
    }

    const cleanedTitle = rawTitle
      .replace(/[\r\n\t]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/^["']+/, '')
      .replace(/["']+$/, '')
      .trim();

    const filter = { 'legacy.drupalNid': job.nid };
    const update = {
      $set: {
        title: cleanedTitle,
        companyId,
        recruiter: recruiter._id,
        status: (job as Record<string, unknown>).status === '1' ? 'active' : 'inactive',
        description: ((job as Record<string, unknown>).description ?? '').toString().trim() || 'Migrated job',
        city: ((job as Record<string, unknown>).city ?? '').toString().trim() || 'Unknown',
        type: 'other',
        createdAt: (job as Record<string, unknown>).created
          ? new Date(Number((job as Record<string, unknown>).created) * 1000)
          : new Date(),
        updatedAt: (job as Record<string, unknown>).changed
          ? new Date(Number((job as Record<string, unknown>).changed) * 1000)
          : new Date(),
      },
      $setOnInsert: {
        legacy: {
          source: 'drupal',
          drupalNid: job.nid,
          migratedAt: new Date(),
        },
      },
    };
    const options = { upsert: true };
    await Job.updateOne(filter, update, options);
    count += 1;
  }
  return count;
}

async function main(): Promise<void> {
  const dryRun = false;
  if (dryRun) {
    console.log('[migration] Dry run — loading CSVs only, no DB writes.\n');
  } else {
    console.log('[migration] Persist mode (DRY_RUN=false).\n');
    await connectDB();
  }

  const recruiterPath = findCsvPath(CSV_FILES.recruiters);
  const companyPath = findCsvPath(CSV_FILES.companies);
  const jobPath = findCsvPath(CSV_FILES.jobs);

  const numRecruiters = recruiterPath ? countCsvRows(recruiterPath) : 0;
  const numCompanies = companyPath ? countCsvRows(companyPath) : 0;
  const numJobs = jobPath ? countCsvRows(jobPath) : 0;

  if (!recruiterPath) console.warn(`[migration] Not found: ${CSV_FILES.recruiters}`);
  if (!companyPath) console.warn(`[migration] Not found: ${CSV_FILES.companies}`);
  if (!jobPath) console.warn(`[migration] Not found: ${CSV_FILES.jobs}`);

  console.log('Counts:');
  console.log('  Recruiters:', numRecruiters);
  console.log('  Companies:', numCompanies);
  console.log('  Jobs:', numJobs);

  // Load CSV data and run company inference (dry run)
  const recruiters: RecruiterRow[] = recruiterPath ? loadRecruiters(recruiterPath) : [];
  const companies: CompanyRow[] = companyPath ? loadCompanies(companyPath) : [];
  const jobs: JobRow[] = jobPath ? loadJobs(jobPath) : [];

  const inferenceResults = inferCompanies(recruiters, companies, jobs);
  const summary = getInferenceSummary(inferenceResults, companies);

  console.log('\nCompany inference summary:');
  console.log('  Total recruiters:', inferenceResults.length);
  console.log('  Inferred from jobs:', summary.inferredFromJobs);
  console.log('  Enriched from Drupal companies:', summary.enrichedFromDrupal);
  console.log('  Placeholders:', summary.placeholders);
  console.log('  Ignored Drupal companies:', summary.ignoredDrupalCompanies);

  if (!dryRun) {
    const admin = await User.findOne({ email: 'rooster@chickenloop.com' }).select('_id').lean();
    if (!admin) {
      throw new Error('[migration] Admin user (rooster@chickenloop.com) not found. Cannot persist companies.');
    }
    const companyCount = await persistCompanies(inferenceResults, admin._id);
    console.log(`[migration] Persisted ${companyCount} companies`);
    const recruiterCount = await persistRecruiters(recruiters);
    console.log(`[migration] Persisted ${recruiterCount} recruiters`);
    const jobCount = await persistJobs(jobs);
    console.log(`[migration] Persisted ${jobCount} jobs`);
  }

  console.log(dryRun ? '\n[migration] Done (dry run).' : '\n[migration] Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migration] Error:', err);
    process.exit(1);
  });
