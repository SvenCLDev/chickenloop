import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import Company from '@/models/Company';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

/** POST body for repairing job ↔ company ↔ recruiter relationships */
type RepairBody = {
  jobId: string;
  recruiterId: string;
  /** Use existing company */
  companyId?: string;
  /** Or create a new company (when the correct company doesn't exist) */
  createCompany?: { name: string };
};

/**
 * Admin-only: repair job–company–recruiter relationships in a single transaction.
 * Use when a job's companyId or recruiter is wrong or out of sync.
 * Provide either companyId (existing company) or createCompany: { name } to create a new company and assign it.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    let body: RepairBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { jobId, companyId, recruiterId, createCompany } = body;
    if (!jobId || !recruiterId) {
      return NextResponse.json(
        { error: 'jobId and recruiterId are required' },
        { status: 400 }
      );
    }
    const useExistingCompany = !!companyId && !createCompany;
    const useCreateCompany = !!createCompany?.name?.trim();
    if (!useExistingCompany && !useCreateCompany) {
      return NextResponse.json(
        { error: 'Provide either companyId (existing company) or createCompany: { name } to create a new company.' },
        { status: 400 }
      );
    }
    if (useExistingCompany && useCreateCompany) {
      return NextResponse.json(
        { error: 'Provide either companyId or createCompany, not both.' },
        { status: 400 }
      );
    }

    let jobOid: mongoose.Types.ObjectId;
    let companyOid: mongoose.Types.ObjectId;
    let recruiterOid: mongoose.Types.ObjectId;
    try {
      jobOid = new mongoose.Types.ObjectId(jobId);
      recruiterOid = new mongoose.Types.ObjectId(recruiterId);
      if (useExistingCompany && companyId) {
        companyOid = new mongoose.Types.ObjectId(companyId);
      } else {
        companyOid = new mongoose.Types.ObjectId(); // placeholder; will be set when we create company
      }
    } catch {
      return NextResponse.json(
        { error: 'jobId and recruiterId must be valid MongoDB ObjectIds' },
        { status: 400 }
      );
    }

    const [job, recruiter] = await Promise.all([
      Job.findById(jobOid).lean(),
      User.findById(recruiterOid).lean(),
    ]);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter (User) not found' }, { status: 404 });
    }

    const recruiterRole = (recruiter as { role?: string }).role;
    if (recruiterRole !== 'recruiter') {
      return NextResponse.json(
        { error: 'Recruiter user must have role "recruiter"' },
        { status: 400 }
      );
    }

    let company: { _id: mongoose.Types.ObjectId; ownerRecruiter?: mongoose.Types.ObjectId } | null = null;
    if (useExistingCompany) {
      company = await Company.findById(companyOid).lean() as { _id: mongoose.Types.ObjectId; ownerRecruiter?: mongoose.Types.ObjectId } | null;
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }
      const companyOwnerId = company.ownerRecruiter;
      const userCompanyId = (recruiter as { companyId?: mongoose.Types.ObjectId }).companyId;
      const recruiterBelongsToCompany =
        (companyOwnerId && String(companyOwnerId) === String(recruiterId)) ||
        (userCompanyId && String(userCompanyId) === String(companyId));
      if (!recruiterBelongsToCompany) {
        return NextResponse.json(
          { error: 'Recruiter must belong to the company (company.ownerRecruiter or user.companyId)' },
          { status: 400 }
        );
      }
    }

    try {
      const session = await mongoose.connection.startSession();
      try {
        await session.withTransaction(async () => {
          if (useCreateCompany && createCompany?.name?.trim()) {
            const newCompany = await Company.create(
              [{ name: createCompany.name.trim(), ownerRecruiter: recruiterOid }],
              { session }
            );
            const created = newCompany[0];
            companyOid = created._id as mongoose.Types.ObjectId;

            await User.findByIdAndUpdate(
              recruiterOid,
              { $set: { companyId: companyOid } },
              { session }
            );
          }

          await Job.findByIdAndUpdate(
            jobOid,
            { $set: { companyId: companyOid, recruiter: recruiterOid } },
            { session }
          );

          if (useExistingCompany && company) {
            const ownerId = company.ownerRecruiter;
            if (ownerId == null || String(ownerId) !== String(recruiterId)) {
              await Company.findByIdAndUpdate(
                companyOid,
                { $set: { ownerRecruiter: recruiterOid } },
                { session }
              );
            }
            const userCompanyId = (recruiter as { companyId?: mongoose.Types.ObjectId }).companyId;
            if (userCompanyId == null || String(userCompanyId) !== String(companyOid)) {
              await User.findByIdAndUpdate(
                recruiterOid,
                { $set: { companyId: companyOid } },
                { session }
              );
            }
          }
        });
      } finally {
        await session.endSession();
      }
    } catch (txErr) {
      const msg = txErr instanceof Error ? txErr.message : 'Transaction failed';
      return NextResponse.json(
        { error: `Repair failed: ${msg}` },
        { status: 500 }
      );
    }

    const updatedJob = await Job.findById(jobOid)
      .populate('recruiter', 'name email')
      .populate('companyId', 'name')
      .lean();

    return NextResponse.json({ job: updatedJob }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
