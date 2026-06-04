import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Experiment from '@/models/Experiment';
import { ensureDefaultMarketingExperiments } from '@/lib/marketing/experimentsSeed';
import { serializeExperiment } from '@/lib/marketing/serialize';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';

/** GET - List experiments (admin). Seeds defaults when collection is empty. */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const count = await Experiment.countDocuments({});
    if (count === 0) {
      await ensureDefaultMarketingExperiments();
    }

    const experiments = await Experiment.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({
      experiments: experiments.map((e) => serializeExperiment(e)),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** POST - Create experiment (admin) */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const body = await request.json();
    const key = typeof body.key === 'string' ? body.key.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!key || !name) {
      return NextResponse.json({ error: 'key and name are required' }, { status: 400 });
    }

    const existing = await Experiment.findOne({ key });
    if (existing) {
      return NextResponse.json({ error: 'Experiment key already exists' }, { status: 409 });
    }

    const experiment = await Experiment.create({
      key,
      name,
      description: typeof body.description === 'string' ? body.description.trim() : undefined,
      type: body.type === 'other' ? 'other' : 'marketing_banner',
      status: ['active', 'paused', 'archived'].includes(body.status) ? body.status : 'active',
      landingPath: typeof body.landingPath === 'string' ? body.landingPath.trim() : undefined,
      dataProfile: body.dataProfile === 'equipment_tracking' ? 'equipment_tracking' : 'generic',
      analyticsEvents: Array.isArray(body.analyticsEvents)
        ? body.analyticsEvents.filter((e: unknown) => typeof e === 'string')
        : [],
    });

    return NextResponse.json({ experiment: serializeExperiment(experiment) }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
