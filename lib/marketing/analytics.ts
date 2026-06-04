import mongoose from 'mongoose';
import EquipmentAnalytics from '@/models/EquipmentAnalytics';
import EquipmentWaitlist from '@/models/EquipmentWaitlist';
import MarketingBanner from '@/models/MarketingBanner';
import type { IExperiment } from '@/models/Experiment';

export interface BannerPerformanceRow {
  bannerId: string;
  variantKey: string;
  analyticsSource: string;
  views: number;
  clicks: number;
  ctr: number;
  waitlistSignups: number;
}

export interface ExperimentAnalyticsSummary {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  totalWaitlistSignups: number;
  waitlistLeads: number;
  bannerPerformance: BannerPerformanceRow[];
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export async function getExperimentAnalytics(
  experiment: IExperiment
): Promise<ExperimentAnalyticsSummary> {
  const banners = await MarketingBanner.find({ experimentId: experiment._id })
    .sort({ sortOrder: 1, variantKey: 1 })
    .lean();

  const sources = banners.map((b) => b.analyticsSource);

  if (experiment.dataProfile !== 'equipment_tracking' || sources.length === 0) {
    const waitlistLeads =
      experiment.dataProfile === 'equipment_tracking'
        ? await EquipmentWaitlist.countDocuments({})
        : 0;

    return {
      totalViews: 0,
      totalClicks: 0,
      ctr: 0,
      totalWaitlistSignups: 0,
      waitlistLeads,
      bannerPerformance: banners.map((b) => ({
        bannerId: String(b._id),
        variantKey: b.variantKey,
        analyticsSource: b.analyticsSource,
        views: 0,
        clicks: 0,
        ctr: 0,
        waitlistSignups: 0,
      })),
    };
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database object not available');
  }

  const collection = db.collection('equipmentAnalytics');

  const [viewAgg, clickAgg, signupAgg] = await Promise.all([
    collection
      .aggregate([
        { $match: { event: 'equipment_banner_view', source: { $in: sources } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ])
      .toArray(),
    collection
      .aggregate([
        { $match: { event: 'equipment_banner_click', source: { $in: sources } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ])
      .toArray(),
    collection
      .aggregate([
        { $match: { event: 'equipment_waitlist_signup', source: { $in: sources } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const viewsBySource = new Map(viewAgg.map((r) => [String(r._id), Number(r.count)]));
  const clicksBySource = new Map(clickAgg.map((r) => [String(r._id), Number(r.count)]));
  const signupsBySource = new Map(signupAgg.map((r) => [String(r._id), Number(r.count)]));

  let totalViews = 0;
  let totalClicks = 0;
  let totalWaitlistSignups = 0;

  const bannerPerformance: BannerPerformanceRow[] = banners.map((b) => {
    const source = b.analyticsSource;
    const views = viewsBySource.get(source) ?? 0;
    const clicks = clicksBySource.get(source) ?? 0;
    const waitlistSignups = signupsBySource.get(source) ?? 0;
    totalViews += views;
    totalClicks += clicks;
    totalWaitlistSignups += waitlistSignups;
    return {
      bannerId: String(b._id),
      variantKey: b.variantKey,
      analyticsSource: source,
      views,
      clicks,
      ctr: pct(clicks, views),
      waitlistSignups,
    };
  });

  const [waitlistLeads, pageSignups] = await Promise.all([
    EquipmentWaitlist.countDocuments({}),
    EquipmentAnalytics.countDocuments({ event: 'equipment_waitlist_signup' }),
  ]);

  const totalSignups = Math.max(totalWaitlistSignups, pageSignups);

  return {
    totalViews,
    totalClicks,
    ctr: pct(totalClicks, totalViews),
    totalWaitlistSignups: totalSignups,
    waitlistLeads,
    bannerPerformance,
  };
}
