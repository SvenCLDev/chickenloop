import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import MarketingBanner from '@/models/MarketingBanner';
import MarketingPlacement from '@/models/MarketingPlacement';
import { serializeBanner } from '@/lib/marketing/serialize';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

/** PUT - Update marketing banner */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid banner id' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.variantKey === 'string' && body.variantKey.trim()) {
      updates.variantKey = body.variantKey.trim();
    }
    if (typeof body.headline === 'string') updates.headline = body.headline.trim();
    if (typeof body.subheadline === 'string') updates.subheadline = body.subheadline.trim();
    if (typeof body.cta === 'string') updates.cta = body.cta.trim();
    if (typeof body.image === 'string') updates.image = body.image.trim();
    if (typeof body.analyticsSource === 'string') {
      updates.analyticsSource = body.analyticsSource.trim();
    }
    if (typeof body.styleKey === 'string') updates.styleKey = body.styleKey.trim();
    if (typeof body.enabled === 'boolean') updates.enabled = body.enabled;
    if (typeof body.sortOrder === 'number') updates.sortOrder = body.sortOrder;

    const banner = await MarketingBanner.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json({ banner: serializeBanner(banner) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** DELETE - Remove banner; clear from placements */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid banner id' }, { status: 400 });
    }

    const banner = await MarketingBanner.findById(id);
    if (!banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    await MarketingPlacement.updateMany({ activeBannerId: id }, { $set: { activeBannerId: null } });
    await MarketingBanner.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
