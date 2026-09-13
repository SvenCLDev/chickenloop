import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TalentSearchAnalytics from '@/models/TalentSearchAnalytics';
import User from '@/models/User';
import { labelForFilterKey } from '@/lib/talentSearchAnalytics';

export type TalentUsagePeriodDays = 7 | 30 | 90;

export interface TalentUsageSummary {
  uniqueRecruitersSearching: number;
  totalSearches: number;
  totalSearchPages: number;
  totalProfileViews: number;
  avgSearchesPerActiveRecruiter: number;
  searchToViewRate: number;
}

export interface TalentUsageDailyPoint {
  date: string;
  searches: number;
  uniqueRecruiters: number;
  profileViews: number;
}

export interface TalentUsageTopFilter {
  key: string;
  label: string;
  count: number;
}

export interface TalentUsageTopKeyword {
  keyword: string;
  count: number;
}

export interface TalentUsageTopRecruiter {
  recruiterId: string;
  name: string;
  email: string;
  searches: number;
  profileViews: number;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function summarizePeriod(
  from: Date,
  to: Date,
  roles: string[]
): Promise<TalentUsageSummary> {
  const matchBase = {
    createdAt: { $gte: from, $lt: to },
    role: { $in: roles },
  };

  const [searchStats, pageStats, viewStats, searchers, viewers] = await Promise.all([
    TalentSearchAnalytics.countDocuments({ ...matchBase, event: 'talent_search' }),
    TalentSearchAnalytics.countDocuments({ ...matchBase, event: 'talent_search_page' }),
    TalentSearchAnalytics.countDocuments({ ...matchBase, event: 'talent_profile_view' }),
    TalentSearchAnalytics.distinct('recruiterId', {
      ...matchBase,
      event: 'talent_search',
    }),
    TalentSearchAnalytics.distinct('recruiterId', {
      ...matchBase,
      event: 'talent_profile_view',
    }),
  ]);

  const uniqueRecruitersSearching = searchers.length;
  const viewerSet = new Set(viewers.map((id) => String(id)));
  const searchersWithView = searchers.filter((id) => viewerSet.has(String(id))).length;

  return {
    uniqueRecruitersSearching,
    totalSearches: searchStats,
    totalSearchPages: pageStats,
    totalProfileViews: viewStats,
    avgSearchesPerActiveRecruiter:
      uniqueRecruitersSearching > 0
        ? Math.round((searchStats / uniqueRecruitersSearching) * 10) / 10
        : 0,
    searchToViewRate:
      uniqueRecruitersSearching > 0
        ? Math.round((searchersWithView / uniqueRecruitersSearching) * 1000) / 1000
        : 0,
  };
}

async function dailySeries(
  from: Date,
  to: Date,
  roles: string[]
): Promise<TalentUsageDailyPoint[]> {
  const rows = await TalentSearchAnalytics.aggregate<{
    _id: { day: string; event: string };
    count: number;
    recruiters: mongoose.Types.ObjectId[];
  }>([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        role: { $in: roles },
        event: { $in: ['talent_search', 'talent_profile_view'] },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
          },
          event: '$event',
        },
        count: { $sum: 1 },
        recruiters: { $addToSet: '$recruiterId' },
      },
    },
  ]);

  const byDay = new Map<string, TalentUsageDailyPoint>();
  // Pre-fill every day in range so gaps show as zeros
  for (
    let cursor = startOfUtcDay(from);
    cursor < to;
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const key = toDateKey(cursor);
    byDay.set(key, {
      date: key,
      searches: 0,
      uniqueRecruiters: 0,
      profileViews: 0,
    });
  }

  for (const row of rows) {
    const point = byDay.get(row._id.day);
    if (!point) continue;
    if (row._id.event === 'talent_search') {
      point.searches = row.count;
      point.uniqueRecruiters = row.recruiters?.length ?? 0;
    } else if (row._id.event === 'talent_profile_view') {
      point.profileViews = row.count;
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function topFilters(
  from: Date,
  to: Date,
  roles: string[],
  limit = 15
): Promise<TalentUsageTopFilter[]> {
  const rows = await TalentSearchAnalytics.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        role: { $in: roles },
        event: 'talent_search',
      },
    },
    { $unwind: '$activeFilterKeys' },
    { $group: { _id: '$activeFilterKeys', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({
    key: row._id,
    label: labelForFilterKey(row._id),
    count: row.count,
  }));
}

async function topKeywords(
  from: Date,
  to: Date,
  roles: string[],
  limit = 15
): Promise<TalentUsageTopKeyword[]> {
  const rows = await TalentSearchAnalytics.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        role: { $in: roles },
        event: 'talent_search',
        'filters.kw': { $type: 'string', $ne: '' },
      },
    },
    {
      $group: {
        _id: {
          $toLower: {
            $substrCP: ['$filters.kw', 0, 80],
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  return rows
    .filter((row) => row._id)
    .map((row) => ({
      keyword: row._id,
      count: row.count,
    }));
}

async function topRecruiters(
  from: Date,
  to: Date,
  roles: string[],
  limit = 20
): Promise<TalentUsageTopRecruiter[]> {
  const rows = await TalentSearchAnalytics.aggregate<{
    _id: mongoose.Types.ObjectId;
    searches: number;
    profileViews: number;
  }>([
    {
      $match: {
        createdAt: { $gte: from, $lt: to },
        role: { $in: roles },
        event: { $in: ['talent_search', 'talent_profile_view'] },
      },
    },
    {
      $group: {
        _id: '$recruiterId',
        searches: {
          $sum: { $cond: [{ $eq: ['$event', 'talent_search'] }, 1, 0] },
        },
        profileViews: {
          $sum: { $cond: [{ $eq: ['$event', 'talent_profile_view'] }, 1, 0] },
        },
      },
    },
    { $sort: { searches: -1, profileViews: -1 } },
    { $limit: limit },
  ]);

  if (rows.length === 0) return [];

  const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
    .select('name email')
    .lean();
  const userById = new Map(
    users.map((u) => [
      String(u._id),
      { name: (u as { name?: string }).name || 'Unknown', email: (u as { email?: string }).email || '' },
    ])
  );

  return rows.map((row) => {
    const id = String(row._id);
    const user = userById.get(id);
    return {
      recruiterId: id,
      name: user?.name || 'Unknown',
      email: user?.email || '',
      searches: row.searches,
      profileViews: row.profileViews,
    };
  });
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getTalentUsageStats(options: {
  days: TalentUsagePeriodDays;
  includeAdmin?: boolean;
}) {
  await connectDB();

  const days = options.days;
  const roles = options.includeAdmin ? ['recruiter', 'admin'] : ['recruiter'];

  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const priorEnd = periodStart;
  const priorStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

  const [summary, priorSummary, daily, filters, keywords, recruiters] =
    await Promise.all([
      summarizePeriod(periodStart, periodEnd, roles),
      summarizePeriod(priorStart, priorEnd, roles),
      dailySeries(periodStart, periodEnd, roles),
      topFilters(periodStart, periodEnd, roles),
      topKeywords(periodStart, periodEnd, roles),
      topRecruiters(periodStart, periodEnd, roles),
    ]);

  return {
    days,
    includeAdmin: Boolean(options.includeAdmin),
    period: {
      from: periodStart.toISOString(),
      to: periodEnd.toISOString(),
    },
    priorPeriod: {
      from: priorStart.toISOString(),
      to: priorEnd.toISOString(),
    },
    summary,
    priorSummary,
    deltas: {
      uniqueRecruitersSearching: percentDelta(
        summary.uniqueRecruitersSearching,
        priorSummary.uniqueRecruitersSearching
      ),
      totalSearches: percentDelta(summary.totalSearches, priorSummary.totalSearches),
      totalProfileViews: percentDelta(
        summary.totalProfileViews,
        priorSummary.totalProfileViews
      ),
      avgSearchesPerActiveRecruiter: percentDelta(
        summary.avgSearchesPerActiveRecruiter,
        priorSummary.avgSearchesPerActiveRecruiter
      ),
      searchToViewRate: percentDelta(
        summary.searchToViewRate,
        priorSummary.searchToViewRate
      ),
    },
    daily,
    topFilters: filters,
    topKeywords: keywords,
    topRecruiters: recruiters,
  };
}
