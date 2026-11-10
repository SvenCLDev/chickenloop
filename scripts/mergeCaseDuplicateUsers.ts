/**
 * Audit / merge users that differ only by email casing (e.g. Flovejoy@ vs flovejoy@).
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/mergeCaseDuplicateUsers.ts --audit
 *   npx tsx scripts/mergeCaseDuplicateUsers.ts --normalize-safe
 *   npx tsx scripts/mergeCaseDuplicateUsers.ts --merge flovejoy@keepsailing.co.uk
 *   npx tsx scripts/mergeCaseDuplicateUsers.ts --merge flovejoy@keepsailing.co.uk --apply
 *
 * Requires MONGODB_URI in .env.local or environment.
 * Default is dry-run for --merge / --normalize-safe unless --apply is passed.
 */

import './loadEnvLocal';
import mongoose from 'mongoose';
import connectDB from '../lib/db';

const FREDDIE_EMAIL = 'flovejoy@keepsailing.co.uk';

type UserDoc = {
  _id: mongoose.Types.ObjectId;
  email: string;
  name?: string;
  role?: string | null;
  companyId?: mongoose.Types.ObjectId | null;
  providers?: { google?: { id?: string } };
};

type CompanyDoc = {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownerRecruiter?: mongoose.Types.ObjectId;
};

type DupeGroup = {
  _id: string;
  count: number;
  emails: string[];
  ids: mongoose.Types.ObjectId[];
};

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const audit = argv.includes('--audit');
  const normalizeSafe = argv.includes('--normalize-safe');
  const mergeIdx = argv.indexOf('--merge');
  const mergeEmail =
    mergeIdx >= 0 && argv[mergeIdx + 1] && !argv[mergeIdx + 1].startsWith('--')
      ? argv[mergeIdx + 1].trim().toLowerCase()
      : null;
  return { apply, audit, normalizeSafe, mergeEmail };
}

async function auditCaseDuplicates(db: mongoose.mongo.Db): Promise<DupeGroup[]> {
  const groups = (await db
    .collection('users')
    .aggregate([
      {
        $group: {
          _id: { $toLower: '$email' },
          count: { $sum: 1 },
          emails: { $addToSet: '$email' },
          ids: { $push: '$_id' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray()) as DupeGroup[];

  console.log(`\nCase-only email duplicates: ${groups.length} group(s)\n`);

  const jobs = db.collection('jobs');
  const companies = db.collection('companies');

  for (const g of groups) {
    console.log(`=== ${g._id} (${g.count} users) ===`);
    console.log(`  Variants: ${g.emails.join(' | ')}`);
    for (const id of g.ids) {
      const u = await db.collection<UserDoc>('users').findOne({ _id: id });
      if (!u) continue;
      const jobCount = await jobs.countDocuments({ recruiter: id });
      const ownedCompanies = await companies
        .find({ ownerRecruiter: id })
        .project({ name: 1 })
        .toArray();
      const companyViaId = u.companyId
        ? await companies.findOne({ _id: u.companyId }, { projection: { name: 1 } })
        : null;
      console.log(
        `  - ${u.email} id=${String(u._id)} role=${u.role ?? 'n/a'} name=${u.name ?? 'n/a'} ` +
          `jobs=${jobCount} companyId=${companyViaId?.name ?? 'none'} ` +
          `owns=[${ownedCompanies.map((c) => c.name).join(', ') || 'none'}]`
      );
    }
    console.log('');
  }

  return groups;
}

/**
 * Lowercase User.email for rows whose lowercased form is unique (no case twin).
 */
async function normalizeSafeEmails(db: mongoose.mongo.Db, apply: boolean): Promise<void> {
  const users = db.collection('users');
  const conflictKeys = new Set(
    (
      await users
        .aggregate([
          {
            $group: {
              _id: { $toLower: '$email' },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ])
        .toArray()
    ).map((g) => String(g._id))
  );

  const mixed = await users
    .find({
      email: { $regex: /[A-Z]/ },
    })
    .project({ email: 1 })
    .toArray();

  const safe = mixed.filter((u) => !conflictKeys.has(String(u.email).toLowerCase()));
  const skipped = mixed.length - safe.length;

  console.log(
    `\nSafe normalize: ${safe.length} user(s) with uppercase letters and no case twin; ` +
      `skipped ${skipped} in conflict groups`
  );

  if (!apply) {
    for (const u of safe.slice(0, 30)) {
      console.log(`  [DRY-RUN] ${u.email} → ${String(u.email).toLowerCase()}`);
    }
    if (safe.length > 30) console.log(`  ... and ${safe.length - 30} more`);
    console.log('Re-run with --normalize-safe --apply to mutate.');
    return;
  }

  let modified = 0;
  for (const u of safe) {
    const lower = String(u.email).toLowerCase();
    const res = await users.updateOne(
      { _id: u._id, email: u.email },
      { $set: { email: lower, updatedAt: new Date() } }
    );
    modified += res.modifiedCount;
  }
  console.log(`Normalized ${modified} user email(s) to lowercase.`);
}

function scoreUser(
  u: UserDoc,
  jobCount: number,
  ownedCompanyCount: number
): number {
  return (
    jobCount * 100 +
    ownedCompanyCount * 50 +
    (u.companyId ? 20 : 0) +
    (u.role === 'recruiter' ? 5 : 0)
  );
}

async function mergeEmailGroup(
  db: mongoose.mongo.Db,
  canonicalEmail: string,
  apply: boolean
): Promise<void> {
  const usersCol = db.collection<UserDoc>('users');
  const companies = db.collection<CompanyDoc>('companies');
  const jobs = db.collection('jobs');
  const applications = db.collection('applications');
  const emailpreferences = db.collection('emailpreferences');
  const savedsearches = db.collection('savedsearches');
  const talentSearchAnalytics = db.collection('talentSearchAnalytics');
  const accounts = db.collection('accounts');

  const matches = await usersCol
    .find({
      $expr: { $eq: [{ $toLower: '$email' }, canonicalEmail] },
    })
    .toArray();

  if (matches.length === 0) {
    throw new Error(`No users found for email ${canonicalEmail}`);
  }
  if (matches.length === 1) {
    const only = matches[0];
    console.log(
      `\nOnly one user for ${canonicalEmail}: ${only.email} (${String(only._id)}). Nothing to merge.`
    );
    if (only.email !== canonicalEmail) {
      console.log(
        apply
          ? `Normalizing sole user email → ${canonicalEmail}`
          : `[DRY-RUN] Would normalize email ${only.email} → ${canonicalEmail}`
      );
      if (apply) {
        await usersCol.updateOne(
          { _id: only._id },
          { $set: { email: canonicalEmail, updatedAt: new Date() } }
        );
      }
    }
    return;
  }

  const scored: {
    user: UserDoc;
    jobCount: number;
    owned: CompanyDoc[];
    score: number;
  }[] = [];

  for (const u of matches) {
    const jobCount = await jobs.countDocuments({ recruiter: u._id });
    const owned = await companies.find({ ownerRecruiter: u._id }).toArray();
    scored.push({
      user: u,
      jobCount,
      owned,
      score: scoreUser(u, jobCount, owned.length),
    });
  }

  scored.sort((a, b) => b.score - a.score || String(a.user._id).localeCompare(String(b.user._id)));
  const survivor = scored[0];
  const drops = scored.slice(1);

  console.log(`\nMerge plan for ${canonicalEmail}`);
  console.log(
    `  SURVIVOR: ${survivor.user.email} id=${String(survivor.user._id)} ` +
      `jobs=${survivor.jobCount} owns=${survivor.owned.map((c) => c.name).join(', ') || 'none'} score=${survivor.score}`
  );
  for (const d of drops) {
    console.log(
      `  DROP: ${d.user.email} id=${String(d.user._id)} jobs=${d.jobCount} ` +
        `owns=${d.owned.map((c) => c.name).join(', ') || 'none'} score=${d.score}`
    );
  }

  const survivorId = survivor.user._id;
  const dropIds = drops.map((d) => d.user._id);
  const survivorCompanyId =
    survivor.user.companyId ||
    survivor.owned[0]?._id ||
    null;

  // Prefer Keep Sailing company if present among owned
  let targetCompanyId = survivorCompanyId;
  for (const d of drops) {
    for (const c of d.owned) {
      if (/keep\s*sailing/i.test(c.name)) {
        targetCompanyId = c._id;
      }
    }
  }
  for (const c of survivor.owned) {
    if (/keep\s*sailing/i.test(c.name)) {
      targetCompanyId = c._id;
    }
  }

  const dropCompanyIds = drops.flatMap((d) => d.owned.map((c) => c._id));

  const jobsOnDrops = await jobs.countDocuments({ recruiter: { $in: dropIds } });
  const appsOnDrops = await applications.countDocuments({
    recruiterId: { $in: dropIds },
  });
  const accountsOnDrops = await accounts.countDocuments({
    userId: { $in: dropIds },
  });

  console.log(`\n  Jobs to reassign (by drop recruiter): ${jobsOnDrops}`);
  console.log(`  Applications to remap: ${appsOnDrops}`);
  console.log(`  NextAuth accounts to re-point: ${accountsOnDrops}`);
  console.log(
    `  Target companyId: ${targetCompanyId ? String(targetCompanyId) : 'none'}`
  );
  console.log(
    `  Drop-owned companies: ${dropCompanyIds.map(String).join(', ') || 'none'}`
  );

  // App unique conflict check (jobId: null)
  const dupNullJobApps = await applications
    .find({ recruiterId: { $in: dropIds }, jobId: null })
    .project({ candidateId: 1 })
    .toArray();
  for (const app of dupNullJobApps) {
    const conflict = await applications.findOne({
      recruiterId: survivorId,
      candidateId: app.candidateId,
      jobId: null,
    });
    if (conflict) {
      throw new Error(
        `Cannot remap Application: survivor already has jobId:null app for candidate ${String(app.candidateId)}`
      );
    }
  }

  if (!apply) {
    console.log('\n[DRY-RUN] Would:');
    console.log(`  - Set survivor email to ${canonicalEmail}`);
    if (targetCompanyId) {
      console.log(`  - Set survivor.companyId + ownerRecruiter on company ${String(targetCompanyId)}`);
    }
    console.log(`  - Reassign ${jobsOnDrops} jobs.recruiter → survivor`);
    if (targetCompanyId) {
      console.log(`  - Point those jobs (and drop-company jobs) at company ${String(targetCompanyId)}`);
    }
    console.log(`  - Remap ${appsOnDrops} applications.recruiterId`);
    console.log(`  - Re-point ${accountsOnDrops} accounts.userId`);
    console.log(`  - Delete drop emailprefs / savedsearches / talentSearchAnalytics`);
    console.log(`  - Delete drop users: ${drops.map((d) => d.user.email).join(', ')}`);
    console.log(
      `  - Delete empty drop-owned companies (if no remaining jobs): ${dropCompanyIds.map(String).join(', ') || 'none'}`
    );
    console.log('Re-run with --apply to mutate.');
    return;
  }

  // Apply — free canonical email on drop users first (unique index is case-sensitive).
  for (const d of drops) {
    const parking = `${canonicalEmail}.__merged__.${String(d.user._id)}`;
    await usersCol.updateOne(
      { _id: d.user._id },
      { $set: { email: parking, updatedAt: new Date() } }
    );
    console.log(`Parked drop email ${d.user.email} → ${parking}`);
  }

  if (targetCompanyId) {
    await companies.updateOne(
      { _id: targetCompanyId },
      { $set: { ownerRecruiter: survivorId, updatedAt: new Date() } }
    );
  }

  const jobSet: Record<string, unknown> = {
    recruiter: survivorId,
    updatedAt: new Date(),
  };
  if (targetCompanyId) jobSet.companyId = targetCompanyId;

  const jobsByRecruiter = await jobs.updateMany(
    { recruiter: { $in: dropIds } },
    { $set: jobSet }
  );
  console.log(`Reassigned jobs by recruiter: ${jobsByRecruiter.modifiedCount}`);

  if (targetCompanyId && dropCompanyIds.length > 0) {
    const jobsByCompany = await jobs.updateMany(
      { companyId: { $in: dropCompanyIds } },
      { $set: { companyId: targetCompanyId, updatedAt: new Date() } }
    );
    console.log(`Reassigned jobs by drop companyId: ${jobsByCompany.modifiedCount}`);
  }

  const appsRemap = await applications.updateMany(
    { recruiterId: { $in: dropIds } },
    { $set: { recruiterId: survivorId, updatedAt: new Date() } }
  );
  console.log(`Remapped applications: ${appsRemap.modifiedCount}`);

  const accountsRemap = await accounts.updateMany(
    { userId: { $in: dropIds } },
    { $set: { userId: survivorId } }
  );
  console.log(`Re-pointed NextAuth accounts: ${accountsRemap.modifiedCount}`);

  // Merge google provider id onto survivor if missing
  for (const d of drops) {
    const gid = d.user.providers?.google?.id;
    if (gid && !survivor.user.providers?.google?.id) {
      await usersCol.updateOne(
        { _id: survivorId },
        { $set: { 'providers.google.id': gid, updatedAt: new Date() } }
      );
    }
  }

  for (const uid of dropIds) {
    await emailpreferences.deleteMany({ userId: uid });
    await savedsearches.deleteMany({ userId: uid });
    await talentSearchAnalytics.deleteMany({ recruiterId: uid });
  }

  const userDelete = await usersCol.deleteMany({ _id: { $in: dropIds } });
  console.log(`Deleted drop users: ${userDelete.deletedCount}`);

  // Canonical email is free now — normalize survivor
  await usersCol.updateOne(
    { _id: survivorId },
    {
      $set: {
        email: canonicalEmail,
        ...(targetCompanyId ? { companyId: targetCompanyId } : {}),
        updatedAt: new Date(),
      },
    }
  );
  console.log(`Survivor email set to ${canonicalEmail}`);

  if (dropCompanyIds.length > 0) {
    const remaining = await jobs.countDocuments({
      companyId: { $in: dropCompanyIds },
    });
    if (remaining === 0) {
      // Don't delete target company if it was in drop list
      const toDelete = dropCompanyIds.filter(
        (id) => !targetCompanyId || String(id) !== String(targetCompanyId)
      );
      if (toDelete.length > 0) {
        const companyDelete = await companies.deleteMany({ _id: { $in: toDelete } });
        console.log(`Deleted empty drop companies: ${companyDelete.deletedCount}`);
      }
    } else {
      console.log(
        `Skipped company delete: ${remaining} job(s) still reference drop company IDs`
      );
    }
  }

  // Verify
  const remainingUsers = await usersCol
    .find({ $expr: { $eq: [{ $toLower: '$email' }, canonicalEmail] } })
    .toArray();
  console.log('\n--- Verify ---');
  console.log(
    `Users for ${canonicalEmail}: ${remainingUsers.length} → ${remainingUsers.map((u) => `${u.email}/${String(u._id)}`).join(', ')}`
  );
  if (remainingUsers.length !== 1 || remainingUsers[0].email !== canonicalEmail) {
    throw new Error('Verification failed: expected exactly one lowercased survivor');
  }
  console.log(`[merge] APPLY completed for ${canonicalEmail}`);
}

async function main(): Promise<void> {
  const { apply, audit, normalizeSafe, mergeEmail } = parseArgs(process.argv.slice(2));

  if (!audit && !normalizeSafe && !mergeEmail) {
    console.log(`Usage:
  npx tsx scripts/mergeCaseDuplicateUsers.ts --audit
  npx tsx scripts/mergeCaseDuplicateUsers.ts --normalize-safe [--apply]
  npx tsx scripts/mergeCaseDuplicateUsers.ts --merge ${FREDDIE_EMAIL} [--apply]
`);
    process.exit(1);
  }

  console.log(
    `\n[mergeCaseDuplicateUsers] apply=${apply} audit=${audit} normalizeSafe=${normalizeSafe} merge=${mergeEmail ?? 'n/a'}\n`
  );

  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('No MongoDB database handle');

  if (audit) {
    await auditCaseDuplicates(db);
  }

  if (normalizeSafe) {
    await normalizeSafeEmails(db, apply);
  }

  if (mergeEmail) {
    await mergeEmailGroup(db, mergeEmail, apply);
  }
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Error:', err);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
