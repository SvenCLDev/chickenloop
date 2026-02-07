/**
 * Migration entry point (dry run).
 * Loads .env.local, imports db connect (no writes), loads CSV exports and prints counts.
 * Runs company inference and prints a human-readable summary.
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/migration/index.ts
 *
 * CSV files are read from project root, /data, or /data/drupal_export/.
 */

import '../loadEnvLocal';
import connectDB from '../../lib/db'; // imported but not called — no MongoDB writes
import { inferCompanies, getInferenceSummary } from './transform/companyInference';
import type { RecruiterRow, CompanyRow, JobRow } from './transform/companyInference';
import * as fs from 'fs';
import * as path from 'path';

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

function countCsvRows(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataRows = Math.max(0, lines.length - 1); // subtract header
  return dataRows;
}

/** Parse CSV into array of objects (first row = headers). Simple split by comma. */
function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    rows.push(row);
  }
  return rows;
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
    const rawUid = r.uid ?? r.UID ?? '';
    return { ...r, uid: Number(rawUid) || 0 };
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

async function main(): Promise<void> {
  console.log('[migration] Dry run — loading CSVs only, no DB writes.\n');

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

  console.log('\n[migration] Done (dry run).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migration] Error:', err);
    process.exit(1);
  });
