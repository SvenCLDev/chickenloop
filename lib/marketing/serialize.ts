import type { IExperiment } from '@/models/Experiment';
import type { IMarketingBanner } from '@/models/MarketingBanner';
import type { IMarketingPlacement } from '@/models/MarketingPlacement';

export function serializeExperiment(doc: IExperiment | Record<string, unknown>) {
  const d = doc as IExperiment;
  return {
    id: String(d._id),
    key: d.key,
    name: d.name,
    description: d.description ?? '',
    type: d.type,
    status: d.status,
    landingPath: d.landingPath ?? '',
    dataProfile: d.dataProfile,
    analyticsEvents: d.analyticsEvents ?? [],
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function serializeBanner(doc: IMarketingBanner | Record<string, unknown>) {
  const d = doc as IMarketingBanner;
  return {
    id: String(d._id),
    experimentId: String(d.experimentId),
    variantKey: d.variantKey,
    headline: d.headline,
    subheadline: d.subheadline,
    cta: d.cta,
    image: d.image,
    analyticsSource: d.analyticsSource,
    styleKey: d.styleKey,
    backgroundColor: d.backgroundColor ?? '',
    enabled: d.enabled,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function serializePlacement(
  doc: IMarketingPlacement | Record<string, unknown>,
  extras?: { experimentKey?: string; experimentName?: string; activeBannerVariantKey?: string | null }
) {
  const d = doc as IMarketingPlacement;
  return {
    id: String(d._id),
    key: d.key,
    label: d.label,
    experimentId: String(d.experimentId),
    activeBannerId: d.activeBannerId ? String(d.activeBannerId) : null,
    enabled: d.enabled,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    ...extras,
  };
}
