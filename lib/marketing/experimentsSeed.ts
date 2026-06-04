import Experiment from '@/models/Experiment';
import MarketingBanner from '@/models/MarketingBanner';
import MarketingPlacement from '@/models/MarketingPlacement';
import { equipmentBannerConfig } from '@/lib/equipmentTracking/bannerConfig';
import { EQUIPMENT_ANALYTICS_EVENTS } from '@/models/EquipmentAnalytics';

const EQUIPMENT_EXPERIMENT_KEY = 'equipment-tracking';

const DEFAULT_PLACEMENTS: { key: string; label: string }[] = [
  { key: 'job-seeker-dashboard', label: 'Job seeker dashboard' },
  { key: 'recruiter-dashboard', label: 'Recruiter dashboard' },
  { key: 'jobs-listing-sidebar', label: 'Jobs listing sidebar' },
];

/** Ensure default equipment-tracking experiment, banners, and placements exist */
export async function ensureDefaultMarketingExperiments(): Promise<void> {
  let experiment = await Experiment.findOne({ key: EQUIPMENT_EXPERIMENT_KEY });

  if (!experiment) {
    experiment = await Experiment.create({
      key: EQUIPMENT_EXPERIMENT_KEY,
      name: 'Equipment Tracking',
      description: 'Early-access marketing for kitesurf school equipment tracking SaaS',
      type: 'marketing_banner',
      status: 'active',
      landingPath: '/tools/equipment-tracking',
      dataProfile: 'equipment_tracking',
      analyticsEvents: [...EQUIPMENT_ANALYTICS_EVENTS],
    });
  }

  const experimentId = experiment._id;

  for (const variant of ['A', 'B', 'C'] as const) {
    const config = equipmentBannerConfig[variant];
    const existing = await MarketingBanner.findOne({ experimentId, variantKey: variant });
    if (!existing) {
      await MarketingBanner.create({
        experimentId,
        variantKey: variant,
        headline: config.headline,
        subheadline: config.subheadline,
        cta: config.cta,
        image: config.image,
        analyticsSource: config.source,
        styleKey: variant,
        enabled: true,
        sortOrder: variant === 'A' ? 0 : variant === 'B' ? 1 : 2,
      });
    }
  }

  const firstBanner = await MarketingBanner.findOne({ experimentId, variantKey: 'A' }).select('_id');

  for (const placement of DEFAULT_PLACEMENTS) {
    const existingPlacement = await MarketingPlacement.findOne({ key: placement.key });
    if (!existingPlacement) {
      await MarketingPlacement.create({
        key: placement.key,
        label: placement.label,
        experimentId,
        activeBannerId: firstBanner?._id ?? null,
        enabled: true,
      });
    }
  }

  await migrateLegacyBannerImagePaths(experimentId);
}

/** Point seeded banners at high-res assets when still using removed placeholder paths */
async function migrateLegacyBannerImagePaths(
  experimentId: import('mongoose').Types.ObjectId
): Promise<void> {
  const legacyByVariant: Record<string, string[]> = {
    A: ['/images/equipment-tracking/banner-chaos.jpg'],
    B: ['/images/equipment-tracking/banner-qr.jpg'],
  };

  for (const variant of ['A', 'B', 'C'] as const) {
    const legacyPaths = legacyByVariant[variant];
    if (!legacyPaths?.length) continue;
    const config = equipmentBannerConfig[variant];
    await MarketingBanner.updateMany(
      { experimentId, variantKey: variant, image: { $in: legacyPaths } },
      { $set: { image: config.image } }
    );
  }
}
