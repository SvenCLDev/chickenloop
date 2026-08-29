import type { Document } from 'mongoose';
import Company, { type ICompany } from '@/models/Company';
import User from '@/models/User';

export type RecruiterCompanySource = 'companyId' | 'ownerRecruiter' | null;

export async function resolveRecruiterCompany(
  userId: string,
  options?: { repairLink?: boolean }
): Promise<{
  company: (Document & ICompany) | null;
  source: RecruiterCompanySource;
  companyId: string | null;
}> {
  const repairLink = options?.repairLink !== false;
  const userDoc = await User.findById(userId).select('companyId').lean();
  if (!userDoc) {
    return { company: null, source: null, companyId: null };
  }

  if (userDoc.companyId) {
    const company = await Company.findById(userDoc.companyId);
    if (company) {
      return {
        company,
        source: 'companyId',
        companyId: String(userDoc.companyId),
      };
    }
  }

  const companyByOwner = await Company.findOne({ ownerRecruiter: userId });
  if (companyByOwner) {
    if (repairLink) {
      await User.findByIdAndUpdate(userId, { $set: { companyId: companyByOwner._id } });
    }
    return {
      company: companyByOwner,
      source: 'ownerRecruiter',
      companyId: String(companyByOwner._id),
    };
  }

  return {
    company: null,
    source: null,
    companyId: userDoc.companyId ? String(userDoc.companyId) : null,
  };
}
