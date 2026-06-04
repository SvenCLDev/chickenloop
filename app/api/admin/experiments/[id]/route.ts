import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Experiment from '@/models/Experiment';
import MarketingBanner from '@/models/MarketingBanner';
import MarketingPlacement from '@/models/MarketingPlacement';
import { serializeExperiment } from '@/lib/marketing/serialize';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

/** GET - Single experiment */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid experiment id' }, { status: 400 });
    }

    const experiment = await Experiment.findById(id).lean();
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    return NextResponse.json({ experiment: serializeExperiment(experiment) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** PUT - Update experiment */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid experiment id' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (['active', 'paused', 'archived'].includes(body.status)) updates.status = body.status;
    if (['marketing_banner', 'other'].includes(body.type)) updates.type = body.type;
    if (typeof body.landingPath === 'string') updates.landingPath = body.landingPath.trim();
    if (['equipment_tracking', 'generic'].includes(body.dataProfile)) {
      updates.dataProfile = body.dataProfile;
    }
    if (Array.isArray(body.analyticsEvents)) {
      updates.analyticsEvents = body.analyticsEvents.filter((e: unknown) => typeof e === 'string');
    }

    const experiment = await Experiment.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    return NextResponse.json({ experiment: serializeExperiment(experiment) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** DELETE - Remove experiment and related banners/placements */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid experiment id' }, { status: 400 });
    }

    const experiment = await Experiment.findById(id);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    await MarketingBanner.deleteMany({ experimentId: id });
    await MarketingPlacement.deleteMany({ experimentId: id });
    await Experiment.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
