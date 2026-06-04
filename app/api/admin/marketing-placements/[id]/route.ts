import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import MarketingBanner from '@/models/MarketingBanner';
import MarketingPlacement from '@/models/MarketingPlacement';
import { serializePlacement } from '@/lib/marketing/serialize';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';
import mongoose from 'mongoose';

type RouteContext = { params: Promise<{ id: string }> };

/** PUT - Update placement (active banner, label, enabled) */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid placement id' }, { status: 400 });
    }

    const placement = await MarketingPlacement.findById(id);
    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.label === 'string' && body.label.trim()) {
      updates.label = body.label.trim();
    }
    if (typeof body.enabled === 'boolean') {
      updates.enabled = body.enabled;
    }

    if (body.activeBannerId === null) {
      updates.activeBannerId = null;
    } else if (typeof body.activeBannerId === 'string' && body.activeBannerId) {
      if (!mongoose.Types.ObjectId.isValid(body.activeBannerId)) {
        return NextResponse.json({ error: 'Invalid activeBannerId' }, { status: 400 });
      }
      const banner = await MarketingBanner.findOne({
        _id: body.activeBannerId,
        experimentId: placement.experimentId,
        enabled: true,
      });
      if (!banner) {
        return NextResponse.json(
          { error: 'Active banner must belong to this experiment and be enabled' },
          { status: 400 }
        );
      }
      updates.activeBannerId = banner._id;
    }

    const updated = await MarketingPlacement.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    let activeBannerVariantKey: string | null = null;
    if (updated.activeBannerId) {
      const b = await MarketingBanner.findById(updated.activeBannerId).select('variantKey').lean();
      activeBannerVariantKey = b?.variantKey ?? null;
    }

    return NextResponse.json({
      placement: serializePlacement(updated, { activeBannerVariantKey }),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

/** DELETE - Remove placement */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid placement id' }, { status: 400 });
    }

    const deleted = await MarketingPlacement.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
