import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import MarketingPlacement from '@/models/MarketingPlacement';
import MarketingBanner from '@/models/MarketingBanner';
import Experiment from '@/models/Experiment';
import { ensureDefaultMarketingExperiments } from '@/lib/marketing/experimentsSeed';

type RouteContext = { params: Promise<{ key: string }> };

/** GET - Active banner for a placement (public) */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { key } = await context.params;
    const placementKey = key.trim().toLowerCase();

    let placement = await MarketingPlacement.findOne({
      key: placementKey,
      enabled: true,
    }).lean();

    if (!placement) {
      const experimentCount = await Experiment.countDocuments({});
      if (experimentCount === 0) {
        await ensureDefaultMarketingExperiments();
      }
      placement = await MarketingPlacement.findOne({
        key: placementKey,
        enabled: true,
      }).lean();
    }

    if (!placement || !placement.activeBannerId) {
      return NextResponse.json({ banner: null }, { status: 200 });
    }

    const [banner, experiment] = await Promise.all([
      MarketingBanner.findOne({
        _id: placement.activeBannerId,
        enabled: true,
      }).lean(),
      Experiment.findById(placement.experimentId).lean(),
    ]);

    if (!banner || !experiment || experiment.status !== 'active') {
      return NextResponse.json({ banner: null }, { status: 200 });
    }

    const landingPath = experiment.landingPath || '/';
    const href = `${landingPath}?source=${encodeURIComponent(banner.analyticsSource)}`;

    return NextResponse.json({
      banner: {
        id: String(banner._id),
        variantKey: banner.variantKey,
        headline: banner.headline,
        subheadline: banner.subheadline,
        cta: banner.cta,
        image: banner.image,
        analyticsSource: banner.analyticsSource,
        styleKey: banner.styleKey,
        href,
        experimentKey: experiment.key,
        placementKey: placement.key,
      },
    });
  } catch (error) {
    console.error('[API /marketing/placement GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
