'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import { hexColorForPicker, isValidHexColor } from '@/lib/marketing/hexColor';

interface Experiment {
  id: string;
  key: string;
  name: string;
  description: string;
  type: string;
  status: string;
  landingPath: string;
  dataProfile: string;
}

interface Banner {
  id: string;
  experimentId: string;
  variantKey: string;
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  analyticsSource: string;
  styleKey: string;
  backgroundColor: string;
  enabled: boolean;
  sortOrder: number;
}

interface Placement {
  id: string;
  key: string;
  label: string;
  experimentId: string;
  activeBannerId: string | null;
  enabled: boolean;
  activeBannerVariantKey?: string | null;
}

interface AnalyticsSummary {
  totalViews: number;
  totalClicks: number;
  ctr: number;
  totalWaitlistSignups: number;
  waitlistLeads: number;
  bannerPerformance: {
    bannerId: string;
    variantKey: string;
    analyticsSource: string;
    views: number;
    clicks: number;
    ctr: number;
    waitlistSignups: number;
  }[];
}

interface WaitlistLead {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  country: string;
  equipmentCount: number | null;
  instructorCount: number | null;
  interestedPrice: number | null;
  source: string;
  createdAt: string;
}

const EMPTY_BANNER_FORM = {
  variantKey: '',
  headline: '',
  subheadline: '',
  cta: '',
  image: '',
  analyticsSource: '',
  styleKey: 'A',
  backgroundColor: '',
  enabled: true,
  sortOrder: 0,
};

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

export default function AdminExperimentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [waitlistLeads, setWaitlistLeads] = useState<WaitlistLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<string | null>(null);

  const [placementForm, setPlacementForm] = useState({ key: '', label: '' });
  const [showPlacementForm, setShowPlacementForm] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);

  const [waitlistSearch, setWaitlistSearch] = useState('');

  const selectedExperiment = experiments.find((e) => e.id === selectedExperimentId);
  const showWaitlist = selectedExperiment?.dataProfile === 'equipment_tracking';

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (user && user.role !== 'admin') {
      router.push(`/${user.role === 'recruiter' ? 'recruiter' : 'job-seeker'}`);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(''), 2500);
    return () => clearTimeout(t);
  }, [successToast]);

  const loadExperiments = useCallback(async () => {
    const data = await adminApi.getExperiments();
    const list: Experiment[] = data.experiments ?? [];
    setExperiments(list);
    setSelectedExperimentId((prev) => (prev || (list.length > 0 ? list[0].id : '')));
    return list;
  }, []);

  const loadExperimentDetails = useCallback(async (experimentId: string) => {
    const [bannersRes, placementsRes, analyticsRes] = await Promise.all([
      adminApi.getExperimentBanners(experimentId),
      adminApi.getMarketingPlacements(experimentId),
      adminApi.getExperimentAnalytics(experimentId),
    ]);
    setBanners(bannersRes.banners ?? []);
    setPlacements(placementsRes.placements ?? []);
    setAnalytics(analyticsRes.analytics ?? null);
  }, []);

  const loadWaitlist = useCallback(async (search: string) => {
    const data = await adminApi.getEquipmentWaitlist({
      search: search || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setWaitlistLeads(data.leads ?? []);
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    (async () => {
      try {
        setLoading(true);
        setError('');
        await loadExperiments();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load experiments');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, loadExperiments]);

  useEffect(() => {
    if (!selectedExperimentId || user?.role !== 'admin') return;
    (async () => {
      try {
        setError('');
        await loadExperimentDetails(selectedExperimentId);
        const exp = experiments.find((e) => e.id === selectedExperimentId);
        if (exp?.dataProfile === 'equipment_tracking') {
          await loadWaitlist(waitlistSearch);
        } else {
          setWaitlistLeads([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load experiment data');
      }
    })();
  }, [selectedExperimentId, user, loadExperimentDetails, experiments]);

  useEffect(() => {
    if (!showWaitlist || !selectedExperimentId) return;
    const timer = setTimeout(() => loadWaitlist(waitlistSearch), 300);
    return () => clearTimeout(timer);
  }, [waitlistSearch, showWaitlist, selectedExperimentId, loadWaitlist]);

  const resetBannerForm = () => {
    setBannerForm(EMPTY_BANNER_FORM);
    setEditingBannerId(null);
    setShowBannerForm(false);
  };

  const openEditBanner = (banner: Banner) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      variantKey: banner.variantKey,
      headline: banner.headline,
      subheadline: banner.subheadline,
      cta: banner.cta,
      image: banner.image,
      analyticsSource: banner.analyticsSource,
      styleKey: banner.styleKey,
      backgroundColor: banner.backgroundColor ?? '',
      enabled: banner.enabled,
      sortOrder: banner.sortOrder,
    });
    setShowBannerForm(true);
  };

  const saveBanner = async () => {
    if (!selectedExperimentId) return;
    if (bannerForm.backgroundColor.trim() && !isValidHexColor(bannerForm.backgroundColor)) {
      setError('Background colour must be a valid HEX code (e.g. #1e40af) or left empty');
      return;
    }
    setSavingBanner(true);
    setError('');
    try {
      if (editingBannerId) {
        await adminApi.updateMarketingBanner(editingBannerId, bannerForm);
        setSuccessToast('Banner updated');
      } else {
        await adminApi.createExperimentBanner(selectedExperimentId, bannerForm);
        setSuccessToast('Banner created');
      }
      resetBannerForm();
      await loadExperimentDetails(selectedExperimentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Delete this banner? Placements using it will be cleared.')) return;
    setDeletingBannerId(id);
    try {
      await adminApi.deleteMarketingBanner(id);
      setSuccessToast('Banner deleted');
      if (selectedExperimentId) await loadExperimentDetails(selectedExperimentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete banner');
    } finally {
      setDeletingBannerId(null);
    }
  };

  const setPlacementActiveBanner = async (placementId: string, activeBannerId: string | null) => {
    try {
      await adminApi.updateMarketingPlacement(placementId, { activeBannerId });
      setSuccessToast('Active banner updated');
      if (selectedExperimentId) await loadExperimentDetails(selectedExperimentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update placement');
    }
  };

  const createPlacement = async () => {
    if (!selectedExperimentId) return;
    setSavingPlacement(true);
    try {
      await adminApi.createMarketingPlacement({
        key: placementForm.key,
        label: placementForm.label,
        experimentId: selectedExperimentId,
      });
      setPlacementForm({ key: '', label: '' });
      setShowPlacementForm(false);
      setSuccessToast('Placement created');
      await loadExperimentDetails(selectedExperimentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create placement');
    } finally {
      setSavingPlacement(false);
    }
  };

  const togglePlacementEnabled = async (placement: Placement) => {
    try {
      await adminApi.updateMarketingPlacement(placement.id, { enabled: !placement.enabled });
      if (selectedExperimentId) await loadExperimentDetails(selectedExperimentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update placement');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
              ← Admin dashboard
            </Link>
            <h1 className="text-4xl font-bold text-gray-900">Experiments</h1>
            <p className="text-gray-600 mt-1">
              Manage marketing experiments, banners, placements, and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="experiment-select" className="text-sm font-medium text-gray-700">
              Experiment
            </label>
            <select
              id="experiment-select"
              value={selectedExperimentId}
              onChange={(e) => setSelectedExperimentId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white min-w-[220px]"
            >
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {successToast && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded">
            {successToast}
          </div>
        )}

        {selectedExperiment && (
          <p className="text-sm text-gray-500 mb-6">
            Key: <code className="bg-gray-100 px-1 rounded">{selectedExperiment.key}</code>
            {' · '}
            Status: {selectedExperiment.status}
            {selectedExperiment.landingPath && (
              <>
                {' · '}
                Landing: {selectedExperiment.landingPath}
              </>
            )}
          </p>
        )}

        {/* Analytics summary cards */}
        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Banner views', value: analytics.totalViews },
              { label: 'Banner clicks', value: analytics.totalClicks },
              { label: 'Click-through rate', value: `${analytics.ctr}%` },
              { label: 'Waitlist signups', value: analytics.totalWaitlistSignups },
              { label: 'Waitlist leads', value: analytics.waitlistLeads },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg shadow-md p-5 border-l-4 border-amber-500">
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Banner performance */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Banner performance</h2>
            <p className="text-sm text-gray-600 mt-1">Views, clicks, and signups by analytics source</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Variant', 'Source', 'Views', 'Clicks', 'CTR', 'Signups'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(analytics?.bannerPerformance ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No performance data yet
                    </td>
                  </tr>
                ) : (
                  analytics?.bannerPerformance.map((row) => (
                    <tr key={row.bannerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.variantKey}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {row.analyticsSource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.views}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.clicks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ctr}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.waitlistSignups}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Banners CRUD */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Marketing banners</h2>
              <p className="text-sm text-gray-600 mt-1">Create and edit banner variants for this experiment</p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetBannerForm();
                setShowBannerForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Add banner
            </button>
          </div>

          {showBannerForm && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  ['variantKey', 'Variant key'],
                  ['analyticsSource', 'Analytics source'],
                  ['headline', 'Headline'],
                  ['subheadline', 'Subheadline'],
                  ['cta', 'CTA'],
                  ['image', 'Image URL'],
                  ['styleKey', 'Style (A/B/C)'],
                  ['sortOrder', 'Sort order'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={field === 'sortOrder' ? 'number' : 'text'}
                    value={String(bannerForm[field as keyof typeof bannerForm] ?? '')}
                    onChange={(e) =>
                      setBannerForm((f) => ({
                        ...f,
                        [field]: field === 'sortOrder' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Background colour (HEX)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hexColorForPicker(bannerForm.backgroundColor)}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, backgroundColor: e.target.value }))
                    }
                    className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
                    aria-label="Pick background colour"
                  />
                  <input
                    type="text"
                    value={bannerForm.backgroundColor}
                    onChange={(e) =>
                      setBannerForm((f) => ({ ...f, backgroundColor: e.target.value }))
                    }
                    placeholder="#1e40af (optional)"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-500 font-mono"
                  />
                  {bannerForm.backgroundColor.trim() && (
                    <span
                      className="h-10 w-10 shrink-0 rounded-md border border-gray-300"
                      style={{ backgroundColor: bannerForm.backgroundColor }}
                      title="Preview"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to use the style preset background. Use 3- or 6-digit HEX codes.
                </p>
                {bannerForm.backgroundColor.trim() &&
                  !isValidHexColor(bannerForm.backgroundColor) && (
                    <p className="mt-1 text-xs text-red-600">Enter a valid HEX code (e.g. #2563eb)</p>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="banner-enabled"
                  type="checkbox"
                  checked={bannerForm.enabled}
                  onChange={(e) => setBannerForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
                <label htmlFor="banner-enabled" className="text-sm text-gray-700">
                  Enabled
                </label>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="button"
                  disabled={savingBanner}
                  onClick={saveBanner}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingBanner ? 'Saving…' : editingBannerId ? 'Update banner' : 'Create banner'}
                </button>
                <button
                  type="button"
                  onClick={resetBannerForm}
                  className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Variant', 'Headline', 'Source', 'Style', 'Background', 'Enabled', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No banners yet
                    </td>
                  </tr>
                ) : (
                  banners.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{b.variantKey}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{b.headline}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {b.analyticsSource}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{b.styleKey}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {b.backgroundColor ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block h-5 w-5 rounded border border-gray-300"
                              style={{ backgroundColor: b.backgroundColor }}
                            />
                            <span className="font-mono text-xs text-gray-600">{b.backgroundColor}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">Preset</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {b.enabled ? (
                          <span className="text-green-700">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditBanner(b)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingBannerId === b.id}
                          onClick={() => deleteBanner(b.id)}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Placements */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Placements</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose which banner is live on each site placement
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPlacementForm(!showPlacementForm)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Add placement
            </button>
          </div>

          {showPlacementForm && (
            <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Key</label>
                <input
                  value={placementForm.key}
                  onChange={(e) => setPlacementForm((f) => ({ ...f, key: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm"
                  placeholder="job-seeker-dashboard"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Label</label>
                <input
                  value={placementForm.label}
                  onChange={(e) => setPlacementForm((f) => ({ ...f, label: e.target.value }))}
                  className="border rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={savingPlacement}
                onClick={createPlacement}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Placement', 'Key', 'Active banner', 'Enabled', ''].map((h) => (
                    <th
                      key={h || 'actions'}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {placements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No placements for this experiment
                    </td>
                  </tr>
                ) : (
                  placements.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.label}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{p.key}</td>
                      <td className="px-6 py-4">
                        <select
                          value={p.activeBannerId ?? ''}
                          onChange={(e) =>
                            setPlacementActiveBanner(p.id, e.target.value || null)
                          }
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm max-w-full"
                        >
                          <option value="">— None —</option>
                          {banners
                            .filter((b) => b.enabled)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.variantKey} ({b.analyticsSource})
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          type="button"
                          onClick={() => togglePlacementEnabled(p)}
                          className={p.enabled ? 'text-green-700' : 'text-gray-400'}
                        >
                          {p.enabled ? 'On' : 'Off'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {p.activeBannerVariantKey ? `Live: ${p.activeBannerVariantKey}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Waitlist leads */}
        {showWaitlist && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Equipment tracking waitlist</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Early-access signups for this experiment ({waitlistLeads.length} shown)
                </p>
              </div>
              <input
                type="search"
                placeholder="Search name, email, school…"
                value={waitlistSearch}
                onChange={(e) => setWaitlistSearch(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm max-w-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      'Name',
                      'Email',
                      'School',
                      'Country',
                      'Equipment',
                      'Instructors',
                      'Price',
                      'Source',
                      'Signed up',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {waitlistLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                        No waitlist signups yet
                      </td>
                    </tr>
                  ) : (
                    waitlistLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{lead.name}</td>
                        <td className="px-4 py-3 text-sm">{lead.email}</td>
                        <td className="px-4 py-3 text-sm">{lead.schoolName || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lead.country || '—'}</td>
                        <td className="px-4 py-3 text-sm">{lead.equipmentCount ?? '—'}</td>
                        <td className="px-4 py-3 text-sm">{lead.instructorCount ?? '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          {lead.interestedPrice != null ? `€${lead.interestedPrice}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{lead.source || '—'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
