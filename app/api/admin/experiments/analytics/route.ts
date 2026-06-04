import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Experiment from '@/models/Experiment';
import { getExperimentAnalytics } from '@/lib/marketing/analytics';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';
import mongoose from 'mongoose';

/** GET - Analytics summary and banner performance (?experimentId=) */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');

    if (!experimentId || !mongoose.Types.ObjectId.isValid(experimentId)) {
      return NextResponse.json({ error: 'experimentId is required' }, { status: 400 });
    }

    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    const analytics = await getExperimentAnalytics(experiment);

    return NextResponse.json({ analytics });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
