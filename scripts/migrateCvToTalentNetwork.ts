/**
 * Migration Script: Legacy CV → Verified Talent Network (v2)
 *
 * Maps professionalCertifications, experience, and languages into v2 structures
 * for job seekers with talentNetworkBeta enabled (default) or all CVs with --all.
 *
 * Usage:
 *   npx tsx scripts/migrateCvToTalentNetwork.ts --dry-run
 *   npx tsx scripts/migrateCvToTalentNetwork.ts
 *   npx tsx scripts/migrateCvToTalentNetwork.ts --all
 *
 * Idempotent: skips CVs where profileSchemaVersion is already 2.
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import CV from '../models/CV';
import User from '../models/User';
import { type IssuingBody } from '../lib/talentNetwork/types';
import { syncLegacyFieldsFromTalentNetwork } from '../lib/talentNetwork/syncLegacyFields';

function loadEnv() {
  try {
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
  } catch {
    console.warn('Could not load .env.local');
  }
}

loadEnv();

const dryRun = process.argv.includes('--dry-run');
const migrateAll = process.argv.includes('--all');

function parseIssuingBody(label: string): IssuingBody {
  const upper = label.toUpperCase();
  if (upper.includes('IKO')) return 'IKO';
  if (upper.includes('VDWS/WWS') || upper.includes('WWS')) return 'VDWS_WWS';
  if (upper.includes('VDWS')) return 'VDWS';
  if (upper.includes('RYA')) return 'RYA';
  if (upper.includes('SSI')) return 'SSI';
  if (upper.includes('PADI')) return 'PADI';
  return 'OTHER';
}

function parseExperienceDates(startDate?: string, endDate?: string) {
  const parse = (value?: string) => {
    if (!value) return { month: undefined as number | undefined, year: undefined as number | undefined };
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { month: undefined, year: undefined };
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  };
  return { start: parse(startDate), end: parse(endDate) };
}

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri);

  let betaUserIds: Set<string> | null = null;
  if (!migrateAll) {
    const betaUsers = await User.find({ role: 'job-seeker', talentNetworkBeta: true })
      .select('_id')
      .lean();
    betaUserIds = new Set(betaUsers.map((u) => String(u._id)));
    console.log(`Beta users: ${betaUserIds.size}`);
  }

  const query: Record<string, unknown> = { profileSchemaVersion: { $ne: 2 } };
  if (betaUserIds) {
    query.jobSeeker = { $in: [...betaUserIds].map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const cvs = await CV.find(query);
  console.log(`Found ${cvs.length} CV(s) to migrate${dryRun ? ' (dry run)' : ''}`);

  let migrated = 0;
  for (const cv of cvs) {
    const verifiedCertificates = [
      ...(cv.professionalCertifications ?? []).map((label) => ({
        issuingBody: parseIssuingBody(label),
        certificateLevel: label,
        disciplines: [] as string[],
        verificationStatus: 'unverified' as const,
        legacySource: 'professionalCertifications',
      })),
      ...(cv.certifications ?? [])
        .filter((label) => label.trim())
        .map((label) => ({
          issuingBody: 'OTHER' as const,
          certificateLevel: label,
          disciplines: [] as string[],
          verificationStatus: 'unverified' as const,
          legacySource: 'certifications',
        })),
    ];

    const seasonalExperience = (cv.experience ?? []).map((exp) => {
      const { start, end } = parseExperienceDates(exp.startDate, exp.endDate);
      return {
        schoolName: exp.company,
        role: exp.position,
        startMonth: start.month ?? 1,
        startYear: start.year ?? new Date().getFullYear(),
        endMonth: end.month ?? null,
        endYear: end.year ?? null,
        seasonTag: exp.description || undefined,
        verificationStatus: 'self_reported' as const,
      };
    });

    const languageSkills = (cv.languages ?? []).map((language) => ({
      language,
      proficiency: 'conversational' as const,
      verificationStatus: 'self_assessed' as const,
    }));

    console.log(`- ${cv.fullName} (${cv._id}): certs=${verifiedCertificates.length}, exp=${seasonalExperience.length}, langs=${languageSkills.length}`);

    if (!dryRun) {
      cv.profileSchemaVersion = 2;
      cv.verifiedCertificates = verifiedCertificates;
      cv.seasonalExperience = seasonalExperience;
      cv.languageSkills = languageSkills;
      const legacy = syncLegacyFieldsFromTalentNetwork({
        verifiedCertificates,
        seasonalExperience,
        languageSkills,
      });
      cv.professionalCertifications = legacy.professionalCertifications;
      cv.certifications = legacy.certifications;
      cv.experience = legacy.experience;
      cv.languages = legacy.languages;
      await cv.save();
    }
    migrated += 1;
  }

  console.log(`${dryRun ? 'Would migrate' : 'Migrated'} ${migrated} CV(s)`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
