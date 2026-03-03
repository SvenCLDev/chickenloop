import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Company from '@/models/Company';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

/** POST body for repairing company ↔ recruiter relationships */
type RepairBody = {
  companyId: string;
  ownerRecruiterId?: string;
  recruiterIds?: string[];
};

/**
 * GET - Load company and recruiters assigned to it (admin only).
 * Query: companyId
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId')?.trim();
    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId query is required' },
        { status: 400 }
      );
    }

    let companyOid: mongoose.Types.ObjectId;
    try {
      companyOid = new mongoose.Types.ObjectId(companyId);
    } catch {
      return NextResponse.json(
        { error: 'companyId must be a valid MongoDB ObjectId' },
        { status: 400 }
      );
    }

    const company = await Company.findById(companyOid)
      .populate('ownerRecruiter', 'name email')
      .lean();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const recruiters = await User.find({ companyId: companyOid })
      .select('name email role')
      .lean();

    return NextResponse.json(
      { company, recruiters },
      { status: 200 }
    );
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

/**
 * Admin-only: repair company–recruiter relationships (owner + User.companyId).
 * Does not modify jobs.
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

    const { companyId, ownerRecruiterId, recruiterIds } = body;
    if (!companyId || typeof companyId !== 'string' || !companyId.trim()) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    let companyOid: mongoose.Types.ObjectId;
    try {
      companyOid = new mongoose.Types.ObjectId(companyId.trim());
    } catch {
      return NextResponse.json(
        { error: 'companyId must be a valid MongoDB ObjectId' },
        { status: 400 }
      );
    }

    const recruiterIdStrings: string[] = [];
    if (ownerRecruiterId && typeof ownerRecruiterId === 'string' && ownerRecruiterId.trim()) {
      recruiterIdStrings.push(ownerRecruiterId.trim());
    }
    if (Array.isArray(recruiterIds)) {
      for (const id of recruiterIds) {
        if (id && typeof id === 'string' && id.trim()) {
          const trimmed = id.trim();
          if (!recruiterIdStrings.includes(trimmed)) recruiterIdStrings.push(trimmed);
        }
      }
    }

    const recruiterOids: mongoose.Types.ObjectId[] = [];
    for (const id of recruiterIdStrings) {
      try {
        recruiterOids.push(new mongoose.Types.ObjectId(id));
      } catch {
        return NextResponse.json(
          { error: `Invalid recruiter ID: ${id}` },
          { status: 400 }
        );
      }
    }

    const company = await Company.findById(companyOid).lean();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const users = recruiterOids.length > 0
      ? await User.find({ _id: { $in: recruiterOids } }).select('_id role').lean()
      : [];
    const userMap = new Map<string, { _id: mongoose.Types.ObjectId; role?: string }>();
    for (const u of users) {
      const doc = u as unknown as { _id: mongoose.Types.ObjectId; role?: string };
      userMap.set(String(doc._id), doc);
    }

    for (const oid of recruiterOids) {
      const u = userMap.get(String(oid));
      if (!u) {
        return NextResponse.json(
          { error: `User not found: ${oid}` },
          { status: 404 }
        );
      }
      if (u.role !== 'recruiter') {
        return NextResponse.json(
          { error: 'All listed users must have role "recruiter"' },
          { status: 400 }
        );
      }
    }

    const recruiterOidSet = new Set(recruiterOids.map((id) => id.toString()));

    try {
      const session = await mongoose.connection.startSession();
      try {
        await session.withTransaction(async () => {
          // Unlink any recruiters no longer in the list (so removals persist)
          const currentlyAssigned = await User.find(
            { companyId: companyOid },
            '_id',
            { session }
          ).lean();
          for (const u of currentlyAssigned) {
            const id = (u as unknown as { _id: mongoose.Types.ObjectId })._id;
            if (!recruiterOidSet.has(id.toString())) {
              await User.findByIdAndUpdate(
                id,
                { $set: { companyId: null } },
                { session }
              );
            }
          }

          if (ownerRecruiterId && ownerRecruiterId.trim()) {
            const ownerOid = new mongoose.Types.ObjectId(ownerRecruiterId.trim());
            await Company.findByIdAndUpdate(
              companyOid,
              { $set: { ownerRecruiter: ownerOid } },
              { session }
            );
          } else {
            await Company.findByIdAndUpdate(
              companyOid,
              { $unset: { ownerRecruiter: 1 } },
              { session }
            );
          }

          for (const recruiterOid of recruiterOids) {
            await User.findByIdAndUpdate(
              recruiterOid,
              { $set: { companyId: companyOid } },
              { session }
            );
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

    const updatedCompany = await Company.findById(companyOid)
      .populate('ownerRecruiter', 'name email')
      .lean();

    const recruiters = await User.find({ companyId: companyOid })
      .select('name email role')
      .lean();

    return NextResponse.json(
      { company: updatedCompany, recruiters },
      { status: 200 }
    );
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
