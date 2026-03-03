/**
 * Re-flag a recruiter for password migration: set a new secure password and migration flags.
 *
 * Usage (from chickenloop directory):
 *   npx tsx scripts/reFlagRecruiterForMigration.ts <recruiter@example.com>
 *
 * Requires MONGODB_URI in .env.local or environment.
 */

import 'dotenv/config';
import './loadEnvLocal';
import mongoose from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import connectDB from '../lib/db';
import User from '../models/User';

async function main(): Promise<void> {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error('Usage: npx tsx scripts/reFlagRecruiterForMigration.ts <recruiter@example.com>');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email: email.toLowerCase() })
    .select('role')
    .lean() as { role: string } | null;
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  if (user.role !== 'recruiter') {
    console.error(`User ${email} is not a recruiter (role: ${user.role})`);
    process.exit(1);
  }

  const plainPassword = crypto.randomUUID();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const result = await User.updateOne(
    { email: email.toLowerCase() },
    {
      $set: {
        password: hashedPassword,
        mustResetPassword: true,
        passwordMigrated: true,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    console.error('Update failed: user no longer found');
    process.exit(1);
  }

  console.log(`[reFlagRecruiterForMigration] Recruiter re-flagged for migration successfully.`);
  console.log(`  Email: ${email}`);
  console.log(`  New password (one-time, share securely): ${plainPassword}`);
  console.log(`  User must reset password on next login.`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Error:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
