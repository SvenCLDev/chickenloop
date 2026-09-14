'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BG_VALUES,
  CTA_LABELS,
  CTA_OPTIONS,
  HOOK_PRESETS,
  IMAGE_MODES,
  POS_VALUES,
  type Bg,
  type CarouselSlideConfig,
  type CtaOption,
  type ImageMode,
  type Pos,
} from '@/lib/instagramSlideConfig';

type EditorTab = 0 | 1 | 2 | 'caption';
type PostMode = 'carousel' | 'single';

export interface InstagramPostModalProps {
  jobId: string;
  isRepost: boolean;
  lastPostedAt?: string | null;
  postCount?: number;
  posting: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    mode: PostMode;
    slides: CarouselSlideConfig[];
    pos: string;
    bg: string;
    customTags: string;
    collaborator: string;
  }) => void;
}

function buildSlidePreviewUrl(
  jobId: string,
  slideIndex: number,
  config: CarouselSlideConfig
): string {
  const params = new URLSearchParams();
  params.set('slide', String(slideIndex));
  params.set('layout', config.layout);
  if (config.pos) params.set('pos', config.pos);
  if (config.bg) params.set('bg', config.bg);
  if (config.splitBand) params.set('splitBand', config.splitBand);
  params.set('imageMode', config.imageMode);
  if (config.headline) params.set('headline', config.headline);
  if (config.titleOverride) params.set('title', config.titleOverride);
  if (config.locationOverride) params.set('location', config.locationOverride);
  if (config.bodyText) params.set('body', config.bodyText.slice(0, 400));
  if (typeof config.showExperience === 'boolean') {
    params.set('showExperience', config.showExperience ? '1' : '0');
  }
  if (typeof config.showType === 'boolean') {
    params.set('showType', config.showType ? '1' : '0');
  }
  if (typeof config.showQualifications === 'boolean') {
    params.set('showQualifications', config.showQualifications ? '1' : '0');
  }
  if (config.ctas?.length) params.set('ctas', config.ctas.join(','));
  if (config.customCta) params.set('customCta', config.customCta);
  return `/api/instagram-image/${jobId}?${params.toString()}`;
}

const emptySlide = (partial?: Partial<CarouselSlideConfig>): CarouselSlideConfig => ({
  layout: 'overlay',
  pos: 'bl',
  bg: 'navy',
  imageMode: 'picture0',
  ...partial,
});

export default function InstagramPostModal({
  jobId,
  isRepost,
  lastPostedAt,
  postCount,
  posting,
  onClose,
  onConfirm,
}: InstagramPostModalProps) {
  const [mode, setMode] = useState<PostMode>('carousel');
  const [tab, setTab] = useState<EditorTab>(0);
  const [slides, setSlides] = useState<CarouselSlideConfig[]>([
    emptySlide({ headline: 'Wanted', bg: 'navy' }),
    emptySlide({ layout: 'split', splitBand: 'bottom', imageMode: 'picture0_blur' }),
    emptySlide({ bg: 'teal', ctas: [...CTA_OPTIONS] }),
  ]);
  const [singlePos, setSinglePos] = useState<string>('bl');
  const [singleBg, setSingleBg] = useState<string>('grey');
  const [customTags, setCustomTags] = useState('');
  const [collaborator, setCollaborator] = useState('');
  const [previewCaption, setPreviewCaption] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    fetch(`/api/instagram-preview/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.fullCaption) setPreviewCaption(data.fullCaption);
        if (typeof data?.collaborator === 'string') setCollaborator(data.collaborator);
        if (Array.isArray(data?.slides) && data.slides.length >= 2) {
          setSlides(data.slides);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const activeSlideIndex = typeof tab === 'number' ? tab : 0;
  const activeSlide = slides[activeSlideIndex] ?? slides[0];

  const previewUrl = useMemo(() => {
    if (mode === 'single') {
      return `/api/instagram-image/${jobId}?pos=${singlePos}&bg=${singleBg}&_=${previewKey}`;
    }
    return `${buildSlidePreviewUrl(jobId, activeSlideIndex, activeSlide)}&_=${previewKey}`;
  }, [mode, jobId, singlePos, singleBg, activeSlideIndex, activeSlide, previewKey]);

  const updateSlide = (index: number, patch: Partial<CarouselSlideConfig>) => {
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
    );
    setPreviewKey((k) => k + 1);
  };

  const toggleCta = (cta: CtaOption) => {
    const current = activeSlide.ctas ?? [];
    const next = current.includes(cta)
      ? current.filter((c) => c !== cta)
      : [...current, cta];
    updateSlide(activeSlideIndex, { ctas: next });
  };

  const handleConfirm = () => {
    onConfirm({
      mode,
      slides,
      pos: mode === 'single' ? singlePos : slides[0]?.pos ?? 'bl',
      bg: mode === 'single' ? singleBg : slides[0]?.bg ?? 'grey',
      customTags,
      collaborator,
    });
  };

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 0, label: 'Slide 1 · Hook' },
    { id: 1, label: 'Slide 2 · Details' },
    { id: 2, label: 'Slide 3 · CTA' },
    { id: 'caption', label: 'Caption & Collab' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full mx-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isRepost ? 'Post to Instagram again' : 'Post to Instagram'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Default is a 3-slide carousel. Switch to single image for a quick post.
              </p>
            </div>
            <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setMode('carousel')}
                className={`px-3 py-1.5 ${
                  mode === 'carousel'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Carousel
              </button>
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-3 py-1.5 ${
                  mode === 'single'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Single image
              </button>
            </div>
          </div>

          {lastPostedAt && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Last posted to Instagram on {new Date(lastPostedAt).toLocaleString()}
              {postCount && postCount > 1 ? ` (${postCount} posts so far)` : ''}. Confirming
              creates a new post; the previous post stays live on Instagram.
            </div>
          )}

          {mode === 'carousel' && (
            <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
              {tabs.map((t) => (
                <button
                  key={String(t.id)}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    tab === t.id
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {mode === 'single' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Position
                    </label>
                    <select
                      value={singlePos}
                      onChange={(e) => {
                        setSinglePos(e.target.value);
                        setPreviewKey((k) => k + 1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    >
                      {POS_VALUES.map((p) => (
                        <option key={p} value={p}>
                          {p === 'bl'
                            ? 'Bottom Left'
                            : p === 'br'
                              ? 'Bottom Right'
                              : p === 'tl'
                                ? 'Top Left'
                                : 'Top Right'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Shade
                    </label>
                    <select
                      value={singleBg}
                      onChange={(e) => {
                        setSingleBg(e.target.value);
                        setPreviewKey((k) => k + 1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    >
                      {BG_VALUES.map((b) => (
                        <option key={b} value={b}>
                          {b.charAt(0).toUpperCase() + b.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collab With
                    </label>
                    <input
                      type="text"
                      value={collaborator}
                      onChange={(e) => setCollaborator(e.target.value)}
                      placeholder="kitehousetarifa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Hashtags / Mentions
                    </label>
                    <textarea
                      value={customTags}
                      onChange={(e) => setCustomTags(e.target.value)}
                      placeholder="#beachlife #summerjobs @kitebeachsardinia"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              ) : tab === 'caption' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Collab With (Instagram handle)
                    </label>
                    <input
                      type="text"
                      value={collaborator}
                      onChange={(e) => setCollaborator(e.target.value)}
                      placeholder="kitehousetarifa"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Prefilled from the company profile. Applied on the carousel parent only.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Hashtags / Mentions
                    </label>
                    <textarea
                      value={customTags}
                      onChange={(e) => setCustomTags(e.target.value)}
                      placeholder="#beachlife #summerjobs @kitebeachsardinia"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  {previewCaption && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Caption preview</p>
                      <div className="text-sm text-gray-600 whitespace-pre-wrap break-words max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-md border border-gray-200">
                        {previewCaption}
                        {customTags.trim() ? `\n\n${customTags.trim()}` : ''}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Layout
                      </label>
                      <select
                        value={activeSlide.layout}
                        onChange={(e) =>
                          updateSlide(activeSlideIndex, {
                            layout: e.target.value as 'overlay' | 'split',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      >
                        <option value="overlay">Overlay</option>
                        <option value="split">Split</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image
                      </label>
                      <select
                        value={activeSlide.imageMode}
                        onChange={(e) =>
                          updateSlide(activeSlideIndex, {
                            imageMode: e.target.value as ImageMode,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      >
                        {IMAGE_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m === 'picture0'
                              ? 'Photo 1'
                              : m === 'picture1'
                                ? 'Photo 2'
                                : m === 'picture2'
                                  ? 'Photo 3'
                                  : m === 'picture0_blur'
                                    ? 'Photo 1 (blurred)'
                                    : 'Gradient'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {activeSlide.layout === 'overlay' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Panel position
                        </label>
                        <select
                          value={activeSlide.pos ?? 'bl'}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, {
                              pos: e.target.value as Pos,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        >
                          <option value="bl">Bottom Left</option>
                          <option value="br">Bottom Right</option>
                          <option value="tl">Top Left</option>
                          <option value="tr">Top Right</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Panel shade
                        </label>
                        <select
                          value={activeSlide.bg ?? 'navy'}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, {
                              bg: e.target.value as Bg,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        >
                          {BG_VALUES.map((b) => (
                            <option key={b} value={b}>
                              {b.charAt(0).toUpperCase() + b.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Text band
                        </label>
                        <select
                          value={activeSlide.splitBand ?? 'bottom'}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, {
                              splitBand: e.target.value as 'top' | 'bottom',
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        >
                          <option value="bottom">Bottom</option>
                          <option value="top">Top</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Band shade
                        </label>
                        <select
                          value={activeSlide.bg ?? 'navy'}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, {
                              bg: e.target.value as Bg,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        >
                          {BG_VALUES.map((b) => (
                            <option key={b} value={b}>
                              {b.charAt(0).toUpperCase() + b.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {activeSlideIndex === 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Headline preset
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {HOOK_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() =>
                                updateSlide(activeSlideIndex, { headline: preset })
                              }
                              className={`px-2.5 py-1 rounded text-sm border ${
                                activeSlide.headline === preset
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                  : 'border-gray-300 text-gray-700'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={activeSlide.headline ?? ''}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, { headline: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job title
                        </label>
                        <input
                          type="text"
                          value={activeSlide.titleOverride ?? ''}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, {
                              titleOverride: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={activeSlide.locationOverride ?? ''}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, {
                              locationOverride: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        />
                      </div>
                    </>
                  )}

                  {activeSlideIndex === 1 && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Details text
                        </label>
                        <textarea
                          value={activeSlide.bodyText ?? ''}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, { bodyText: e.target.value })
                          }
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={!!activeSlide.showExperience}
                            onChange={(e) =>
                              updateSlide(activeSlideIndex, {
                                showExperience: e.target.checked,
                              })
                            }
                          />
                          Show experience
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={!!activeSlide.showType}
                            onChange={(e) =>
                              updateSlide(activeSlideIndex, {
                                showType: e.target.checked,
                              })
                            }
                          />
                          Show employment type
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-800">
                          <input
                            type="checkbox"
                            checked={!!activeSlide.showQualifications}
                            onChange={(e) =>
                              updateSlide(activeSlideIndex, {
                                showQualifications: e.target.checked,
                              })
                            }
                          />
                          Show qualifications
                        </label>
                      </div>
                    </>
                  )}

                  {activeSlideIndex === 2 && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">CTAs</p>
                        <div className="space-y-2">
                          {CTA_OPTIONS.map((cta) => (
                            <label
                              key={cta}
                              className="flex items-center gap-2 text-sm text-gray-800"
                            >
                              <input
                                type="checkbox"
                                checked={(activeSlide.ctas ?? []).includes(cta)}
                                onChange={() => toggleCta(cta)}
                              />
                              {CTA_LABELS[cta]}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom CTA line
                        </label>
                        <input
                          type="text"
                          value={activeSlide.customCta ?? ''}
                          onChange={(e) =>
                            updateSlide(activeSlideIndex, { customCta: e.target.value })
                          }
                          placeholder="Optional extra line"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {mode === 'single'
                  ? 'Preview'
                  : tab === 'caption'
                    ? 'Slide 1 preview'
                    : `Slide ${activeSlideIndex + 1} preview`}
              </p>
              {loadingPreview ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  Loading defaults…
                </div>
              ) : (
                <img
                  key={previewUrl}
                  src={previewUrl}
                  alt="Instagram preview"
                  className="w-full max-w-[360px] rounded-lg border border-gray-200 bg-gray-100"
                />
              )}
              {mode === 'single' && previewCaption && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Caption preview</p>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap break-words max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-md border border-gray-200">
                    {previewCaption}
                    {customTags.trim() ? `\n\n${customTags.trim()}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={posting}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                posting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {posting ? 'Posting...' : 'Confirm Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
