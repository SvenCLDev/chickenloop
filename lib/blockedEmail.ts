import connectDB from '@/lib/db';
import BlockedEmail from '@/models/BlockedEmail';

export function normalizeBlockedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  const normalized = normalizeBlockedEmail(email);
  if (!normalized) return false;

  await connectDB();
  const doc = await BlockedEmail.findOne({ email: normalized }).select('_id').lean();
  return Boolean(doc);
}

export async function blockEmail(email: string, blockedByUserId?: string): Promise<string> {
  const normalized = normalizeBlockedEmail(email);
  if (!normalized) {
    throw new Error('Email is required');
  }

  await connectDB();
  const update: { blockedAt: Date; blockedBy?: string } = { blockedAt: new Date() };
  if (blockedByUserId) {
    update.blockedBy = blockedByUserId;
  }

  await BlockedEmail.updateOne(
    { email: normalized },
    { $set: update, $setOnInsert: { email: normalized } },
    { upsert: true }
  );

  return normalized;
}

export async function unblockEmail(email: string): Promise<void> {
  const normalized = normalizeBlockedEmail(email);
  if (!normalized) return;

  await connectDB();
  await BlockedEmail.deleteOne({ email: normalized });
}

export async function getBlockedEmailSet(): Promise<Set<string>> {
  await connectDB();
  const docs = await BlockedEmail.find({}).select('email').lean();
  return new Set(docs.map((doc) => doc.email));
}
