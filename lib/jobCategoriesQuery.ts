import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import { JOB_CATEGORY_VALUES } from '@/lib/jobCategories';

/**
 * Distinct job category values that appear on at least one published job.
 */
export async function getDistinctJobCategories(): Promise<string[]> {
  await connectDB();

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  const raw = await db
    .collection('jobs')
    .distinct('occupationalAreas', { published: { $ne: false } });

  const allowed = new Set<string>(JOB_CATEGORY_VALUES);
  const values = raw
    .map((value) => String(value || '').trim())
    .filter((value) => value && allowed.has(value));

  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
