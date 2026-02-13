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
const EXPERIENCE_CSV = path.join(DATA_DIR, 'jobs_experience.csv');
const LANGUAGES_CSV = path.join(DATA_DIR, 'jobs_languages.csv');
const DATES_CSV = path.join(DATA_DIR, 'jobs_dates.csv');

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

const EXPERIENCE_MAP: Record<string, 'internship' | 'junior' | 'senior' | 'expert' | 'manager'> = {
  '1 - 2 years': 'junior',
  '3 - 5 years': 'senior',
  '5 - 10 years': 'expert',
  'more than 10 years': 'manager',
};

const LANGUAGE_MAP: Record<string, string> = {
  'english': 'English',
  'englis': 'English',
  'engl': 'English',
  'english + 1': 'English',

  'german': 'German',
  'spanish': 'Spanish',
  'french': 'French',
  'italian': 'Italian',
  'italy': 'Italian',

  'dutch': 'Dutch',
  'portuguese': 'Portuguese',
  'arabic': 'Arabic',
  'chinese': 'Chinese',
  'russian': 'Russian',
  'polish': 'Polish',
  'romanian': 'Romanian',
  'turkish': 'Turkish',
  'bulgarian': 'Bulgarian',
  'thai': 'Thai',
  'danish': 'Danish',
  'greek': 'Greek',
  'swedish': 'Swedish',
  'norwegian': 'Norwegian',
  'japanese': 'Japanese',
};

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

function loadMultiValueMap(
  filePath: string,
  nidKey: string = 'nid',
  valueKey: string = 'language'
): Map<string, string[]> {
  const rows = loadCSVSync(filePath);
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const rawNid = String(row[nidKey] ?? row.drupal_nid ?? row.entity_id ?? '').trim();
    const rawValue = String(row[valueKey] ?? row.name ?? '').trim();
    if (!rawNid || !rawValue) continue;
    const list = map.get(rawNid) ?? [];
    list.push(rawValue);
    map.set(rawNid, list);
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

function cleanCsvValue(value: string): string {
  return value.replace(/^"(.*)"$/, '$1').trim();
}

function loadDateMap(
  filePath: string,
  nidKey = 'nid',
  createdKey = 'created_at',
  updatedKey = 'updated_at'
): Map<string, { createdAt?: string; updatedAt?: string }> {
  const map = new Map<string, { createdAt?: string; updatedAt?: string }>();

  if (!fs.existsSync(filePath)) {
    console.warn(`[loadDateMap] File not found: ${filePath}`);
    return map;
  }

  const raw = fs.readFileSync(filePath, 'utf-8').trim();

  const delimiter = raw.includes(';') ? ';' : ',';

  const lines = raw.split('\n').filter(Boolean);

  const headers = lines[0]
    .split(delimiter)
    .map(h => cleanCsvValue(h));

  const nidIndex = headers.indexOf(nidKey);
  const createdIndex = headers.indexOf(createdKey);
  const updatedIndex = headers.indexOf(updatedKey);

  if (nidIndex === -1) {
    console.error("[loadDateMap] 'nid' column not found in CSV headers:", headers);
    return map;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(delimiter)
      .map(c => cleanCsvValue(c));

    const nid = cols[nidIndex];
    if (!nid) continue;

    map.set(String(nid), {
      createdAt: createdIndex !== -1 ? cols[createdIndex] : undefined,
      updatedAt: updatedIndex !== -1 ? cols[updatedIndex] : undefined,
    });
  }

  return map;
}

async function main(): Promise<void> {
  let updatedCount = 0;
  let skippedCount = 0;
  let unmatchedCount = 0;
  let locationUpdatedCount = 0;
  let countryBackfilledCount = 0;
  let employmentUpdatedCount = 0;
  let experienceUpdatedCount = 0;
  let languageUpdatedCount = 0;
  let dateUpdatedCount = 0;
  const unmappedEmploymentValues = new Set<string>();
  const unmappedExperienceValues = new Set<string>();

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

    const jobsExperienceCsv = loadCSVSync(EXPERIENCE_CSV);
    const experienceMap = new Map<string, string>();

    for (const row of jobsExperienceCsv) {
      const rawNid = String(row.nid || row.entity_id || '').trim();
      const rawValue = String(row.experience || row.name || '').trim();

      if (!rawNid || !rawValue) continue;

      experienceMap.set(rawNid, rawValue);
    }

    console.log('[DEBUG EXPERIENCE MAP SIZE]', experienceMap.size);
    console.log(
      '[DEBUG SAMPLE EXPERIENCE ENTRY]',
      Array.from(experienceMap.entries()).slice(0, 5)
    );

    const languageMap = loadMultiValueMap(LANGUAGES_CSV, 'nid', 'language');
    const dateMap = loadDateMap(DATES_CSV);
    console.log('[DEBUG LANGUAGE MAP SIZE]', languageMap.size);
    const firstFew = Array.from(languageMap.entries()).slice(0, 5);
    console.log('[DEBUG LANGUAGE SAMPLE]', firstFew);

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
      dates: dateMap.size,
      employmentType: employmentTypeMap.size,
      experience: experienceMap.size,
      language: languageMap.size,
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

      const rawExperience = experienceMap.get(String(nid).trim());

      let mappedExperience:
        | 'internship'
        | 'junior'
        | 'senior'
        | 'expert'
        | 'manager'
        | undefined;

      if (rawExperience) {
        mappedExperience = EXPERIENCE_MAP[rawExperience.trim()];
      }

      console.log('[DEBUG EXPERIENCE MAP]', {
        nid,
        rawExperience,
        mappedExperience,
      });

      if (mappedExperience) {
        updatePayload.experience = mappedExperience;
        experienceUpdatedCount++;
      } else if (rawExperience && rawExperience.trim()) {
        unmappedExperienceValues.add(rawExperience.trim());
      }

      console.log('[DEBUG CHECK NID]', {
        currentNid: nid,
        hasLanguages: languageMap.has(nid),
        mapValue: languageMap.get(nid),
      });
      const rawLanguages = languageMap.get(nid) || [];
      const normalizedLanguages = rawLanguages
        .map(l => l.trim())
        .map(l => l.replace(/\s*\+\s*\d+$/, '')) // remove " + 1"
        .map(l => l.toLowerCase())
        .map(l => LANGUAGE_MAP[l] || null)
        .filter(Boolean) as string[];
      const uniqueLanguages = Array.from(new Set(normalizedLanguages));

      if (uniqueLanguages.length > 0) {
        updatePayload.languages = uniqueLanguages;
        languageUpdatedCount++;
      }

      const dateInfo = dateMap.get(String(nid));
      if (nid === '11974') {
        console.log('[DEBUG DATE LOOKUP]', {
          nid,
          dateInfo,
        });
      }
      if (dateInfo) {
        const { createdAt, updatedAt } = dateInfo;

        const parsedCreated = createdAt ? new Date(createdAt) : undefined;
        const parsedUpdated = updatedAt ? new Date(updatedAt) : undefined;

        if (parsedCreated && !isNaN(parsedCreated.getTime())) {
          updatePayload.createdAt = parsedCreated;
        }

        if (parsedUpdated && !isNaN(parsedUpdated.getTime())) {
          updatePayload.updatedAt = parsedUpdated;
        }

        if (updatePayload.createdAt || updatePayload.updatedAt) {
          dateUpdatedCount++;
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

      console.log('[DEBUG FINAL UPDATE]', {
        jobId: job._id,
        experience: updatePayload.experience,
        fullPayload: updatePayload,
      });

      if (DRY_RUN) {
        console.log(`[DRY_RUN] Would update job ${job._id} (nid=${nid}):`, updatePayload);
      } else {
        if (updatePayload.languages) {
          console.log("[DEBUG LANG WRITE]", {
            jobId: job._id,
            languages: updatePayload.languages,
          });
        }
        await Job.updateOne(
          { _id: job._id },
          { $set: updatePayload }
        );
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

    if (unmappedExperienceValues.size > 0) {
      console.log('');
      console.log('[Unmapped experience values]:');
      for (const val of [...unmappedExperienceValues].sort()) {
        console.log('  -', val);
      }
    }

    console.log('\nSummary:');
    console.log({
      updatedCount,
      skippedCount,
      unmatchedCount,
      locationUpdatedCount,
      countryBackfilledCount,
      employmentUpdatedCount,
      experienceUpdatedCount,
      languageUpdatedCount,
      dateUpdatedCount,
    });
  } catch (error) {
    console.error('[enrichJobsFromDrupal] Error:', error);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
