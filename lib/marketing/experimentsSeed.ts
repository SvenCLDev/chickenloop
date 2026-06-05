import mongoose from 'mongoose';
import Experiment from '@/models/Experiment';
import MarketingBanner from '@/models/MarketingBanner';
import MarketingPlacement from '@/models/MarketingPlacement';
import { equipmentBannerConfig } from '@/lib/equipmentTracking/bannerConfig';
import { EQUIPMENT_ANALYTICS_EVENTS } from '@/models/EquipmentAnalytics';

const EQUIPMENT_EXPERIMENT_KEY = 'equipment-tracking';

const DEFAULT_PLACEMENTS: { key: string; label: string }[] = [
  { key: 'job-seeker-dashboard', label: 'Job seeker dashboard' },
  { key: 'recruiter-dashboard', label: 'Recruiter dashboard' },
  { key: 'jobs-listing-page', label: 'Jobs listing page' },
  { key: 'job-details-page', label: 'Job details page' },
  { key: 'company-details-page', label: 'Company details page' },
  { key: 'company-listing-page', label: 'Company listing page' },
];

/** Older placement keys merged into current defaults */
const PLACEMENT_LEGACY_KEYS: Record<string, string[]> = {
  'jobs-listing-page': ['jobs-listing-sidebar'],
};

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

  const experimentId = experiment._id as mongoose.Types.ObjectId;

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

  await migrateLegacyPlacementKeys();

  const firstBanner = await MarketingBanner.findOne({ experimentId, variantKey: 'A' }).select('_id');

  for (const placement of DEFAULT_PLACEMENTS) {
    const legacyKeys = PLACEMENT_LEGACY_KEYS[placement.key] ?? [];
    const existingPlacement = await MarketingPlacement.findOne({
      key: { $in: [placement.key, ...legacyKeys] },
    });
    if (!existingPlacement) {
      await MarketingPlacement.create({
        key: placement.key,
        label: placement.label,
        experimentId,
        activeBannerId: firstBanner?._id ?? null,
        enabled: true,
      });
    } else if (existingPlacement.key !== placement.key) {
      await MarketingPlacement.updateOne(
        { _id: existingPlacement._id },
        { $set: { key: placement.key, label: placement.label } }
      );
    } else if (existingPlacement.label !== placement.label) {
      await MarketingPlacement.updateOne(
        { _id: existingPlacement._id },
        { $set: { label: placement.label } }
      );
    }
  }

  await migrateLegacyBannerImagePaths(experimentId);
}

/** Rename placements that no longer match UI (sidebar → page below header) */
async function migrateLegacyPlacementKeys(): Promise<void> {
  const legacyKey = 'jobs-listing-sidebar';
  const newKey = 'jobs-listing-page';
  const newLabel = 'Jobs listing page';

  const [legacy, current] = await Promise.all([
    MarketingPlacement.findOne({ key: legacyKey }),
    MarketingPlacement.findOne({ key: newKey }),
  ]);

  if (legacy && current) {
    if (!current.activeBannerId && legacy.activeBannerId) {
      await MarketingPlacement.updateOne(
        { _id: current._id },
        { $set: { activeBannerId: legacy.activeBannerId } }
      );
    }
    await MarketingPlacement.deleteOne({ _id: legacy._id });
    return;
  }

  if (legacy && !current) {
    await MarketingPlacement.updateOne(
      { key: legacyKey },
      { $set: { key: newKey, label: newLabel } }
    );
    return;
  }

  if (current && current.label !== newLabel) {
    await MarketingPlacement.updateOne({ key: newKey }, { $set: { label: newLabel } });
  }
}

/** Point seeded banners at high-res assets when still using removed placeholder paths */
async function migrateLegacyBannerImagePaths(
  experimentId: mongoose.Types.ObjectId
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
