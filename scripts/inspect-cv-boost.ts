/**
 * Inspect CV boost state for a job seeker by email.
 * Prints user and their CV(s) with featured, featuredUntil.
 *
 * Usage (from chickenloop dir):
 *   npx tsx scripts/inspect-cv-boost.ts <email>
 * Example:
 *   npx tsx scripts/inspect-cv-boost.ts s.venkelling@gmail.com
 *
 * Loads MONGODB_URI from .env.local if present.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  // ignore
}

import mongoose from 'mongoose';
import connectDB from '../lib/db';
import User from '../models/User';
import CV from '../models/CV';

async function inspectCvBoost(email: string) {
  try {
    await connectDB();
    console.log('[inspect-cv-boost] Connected to database.\n');

    const user = await User.findOne({ email: email.trim().toLowerCase(), role: 'job-seeker' })
      .select('_id name email role createdAt')
      .lean();
    if (!user) {
      console.log(`[inspect-cv-boost] No job-seeker found with email: ${email}`);
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    const userId = user._id.toString();
    console.log('[inspect-cv-boost] User:');
    console.log('  _id:', userId);
    console.log('  name:', (user as any).name);
    console.log('  email:', (user as any).email);
    console.log('');

    const cvs = await CV.find({ jobSeeker: user._id })
      .select('_id fullName featured featuredUntil published updatedAt createdAt')
      .lean();

    if (cvs.length === 0) {
      console.log('[inspect-cv-boost] No CVs found for this user.');
      await mongoose.disconnect();
      process.exit(0);
      return;
    }

    const now = new Date();
    console.log('[inspect-cv-boost] CV(s):');
    for (const cv of cvs) {
      const c = cv as any;
      const id = c._id.toString();
      const featuredUntil = c.featuredUntil
        ? (c.featuredUntil instanceof Date ? c.featuredUntil : new Date(c.featuredUntil))
        : null;
      const isCurrentlyFeatured =
        c.featured === true || (featuredUntil != null && featuredUntil > now);
      console.log('  ---');
      console.log('  _id:', id);
      console.log('  fullName:', c.fullName ?? '—');
      console.log('  featured (stored):', c.featured);
      console.log('  featuredUntil (stored):', featuredUntil?.toISOString() ?? 'null');
      console.log(
        '  would show as featured:',
        isCurrentlyFeatured,
        isCurrentlyFeatured ? '(featuredUntil in future or featured=true)' : '(featuredUntil missing/expired and featured not true)'
      );
      console.log('  published:', c.published);
      console.log('  updatedAt:', c.updatedAt);
    }
    console.log('  ---');
    console.log('');
    console.log('[inspect-cv-boost] If paid but not featured: webhook may not have run, or resumeId in Stripe metadata may not match this CV _id. Check Stripe Dashboard > Developers > Webhooks and payment session metadata (type=cv_boost, resumeId=<CV _id>).');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[inspect-cv-boost] Error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/inspect-cv-boost.ts <email>');
  process.exit(1);
}
inspectCvBoost(email);
