import connectDB from '@/lib/db';
import User from '@/models/User';
import { canUseTalentNetworkEditor } from './featureFlag';
import type { TalentNetworkUserContext } from './types';

export async function loadTalentNetworkUserContext(
  userId: string
): Promise<TalentNetworkUserContext> {
  await connectDB();
  const user = await User.findById(userId).select('role talentNetworkBeta').lean();
  return {
    role: user?.role ?? null,
    talentNetworkBeta: user?.talentNetworkBeta === true,
  };
}

export async function canUserWriteTalentNetworkFields(userId: string): Promise<boolean> {
  const context = await loadTalentNetworkUserContext(userId);
  return canUseTalentNetworkEditor(context);
}
