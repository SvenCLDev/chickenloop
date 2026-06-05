import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import Experiment from '@/models/Experiment';
import MarketingBanner from '@/models/MarketingBanner';
import { serializeBanner } from '@/lib/marketing/serialize';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

/** GET - Banners for an experiment */
export async function GET(request: NextRequest, context: RouteContext) {
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

    const banners = await MarketingBanner.find({ experimentId: id })
      .sort({ sortOrder: 1, variantKey: 1 })
      .lean();

    return NextResponse.json({ banners: banners.map((b) => serializeBanner(b)) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** POST - Create banner for experiment */
export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const variantKey = typeof body.variantKey === 'string' ? body.variantKey.trim() : '';
    const headline = typeof body.headline === 'string' ? body.headline.trim() : '';
    const subheadline = typeof body.subheadline === 'string' ? body.subheadline.trim() : '';
    const cta = typeof body.cta === 'string' ? body.cta.trim() : '';
    const image = typeof body.image === 'string' ? body.image.trim() : '';
    const analyticsSource =
      typeof body.analyticsSource === 'string' ? body.analyticsSource.trim() : '';

    if (!variantKey || !headline || !subheadline || !cta || !image || !analyticsSource) {
      return NextResponse.json(
        { error: 'variantKey, headline, subheadline, cta, image, and analyticsSource are required' },
        { status: 400 }
      );
    }

    const duplicate = await MarketingBanner.findOne({ experimentId: id, variantKey });
    if (duplicate) {
      return NextResponse.json({ error: 'Variant key already exists for this experiment' }, { status: 409 });
    }

    const banner = await MarketingBanner.create({
      experimentId: id,
      variantKey,
      headline,
      subheadline,
      cta,
      image,
      analyticsSource,
      styleKey: typeof body.styleKey === 'string' ? body.styleKey.trim() : 'A',
      enabled: body.enabled !== false,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    });

    return NextResponse.json({ banner: serializeBanner(banner) }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
