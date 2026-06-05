import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Experiment from '@/models/Experiment';
import MarketingBanner from '@/models/MarketingBanner';
import MarketingPlacement from '@/models/MarketingPlacement';
import { serializePlacement } from '@/lib/marketing/serialize';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';
import mongoose from 'mongoose';

/** GET - List placements (optional ?experimentId=) */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const experimentId = searchParams.get('experimentId');

    const filter: Record<string, unknown> = {};
    if (experimentId) {
      if (!mongoose.Types.ObjectId.isValid(experimentId)) {
        return NextResponse.json({ error: 'Invalid experimentId' }, { status: 400 });
      }
      filter.experimentId = experimentId;
    }

    const placements = await MarketingPlacement.find(filter).sort({ label: 1 }).lean();
    const experimentIds = [...new Set(placements.map((p) => String(p.experimentId)))];
    const bannerIds = placements
      .map((p) => p.activeBannerId)
      .filter((id): id is mongoose.Types.ObjectId => !!id);

    const [experiments, banners] = await Promise.all([
      Experiment.find({ _id: { $in: experimentIds } }).lean(),
      MarketingBanner.find({ _id: { $in: bannerIds } }).lean(),
    ]);

    const experimentById = new Map(experiments.map((e) => [String(e._id), e]));
    const bannerById = new Map(banners.map((b) => [String(b._id), b]));

    return NextResponse.json({
      placements: placements.map((p) => {
        const exp = experimentById.get(String(p.experimentId));
        const banner = p.activeBannerId
          ? bannerById.get(String(p.activeBannerId))
          : undefined;
        return serializePlacement(p, {
          experimentKey: exp?.key,
          experimentName: exp?.name,
          activeBannerVariantKey: banner?.variantKey ?? null,
        });
      }),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** POST - Create placement */
export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const body = await request.json();
    const key = typeof body.key === 'string' ? body.key.trim().toLowerCase() : '';
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const experimentId = typeof body.experimentId === 'string' ? body.experimentId : '';

    if (!key || !label || !experimentId) {
      return NextResponse.json({ error: 'key, label, and experimentId are required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(experimentId)) {
      return NextResponse.json({ error: 'Invalid experimentId' }, { status: 400 });
    }

    const experiment = await Experiment.findById(experimentId);
    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    const existing = await MarketingPlacement.findOne({ key });
    if (existing) {
      return NextResponse.json({ error: 'Placement key already exists' }, { status: 409 });
    }

    let activeBannerId: mongoose.Types.ObjectId | null = null;
    if (body.activeBannerId) {
      if (!mongoose.Types.ObjectId.isValid(body.activeBannerId)) {
        return NextResponse.json({ error: 'Invalid activeBannerId' }, { status: 400 });
      }
      const banner = await MarketingBanner.findOne({
        _id: body.activeBannerId,
        experimentId,
      });
      if (!banner) {
        return NextResponse.json({ error: 'Banner not found for this experiment' }, { status: 400 });
      }
      activeBannerId = banner._id as mongoose.Types.ObjectId;
    }

    const placement = await MarketingPlacement.create({
      key,
      label,
      experimentId,
      activeBannerId,
      enabled: body.enabled !== false,
    });

    return NextResponse.json(
      {
        placement: serializePlacement(placement, {
          experimentKey: experiment.key,
          experimentName: experiment.name,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
