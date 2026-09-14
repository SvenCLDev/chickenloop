/**
 * Structured Instagram carousel slide configuration.
 * Used by the admin editor, preview API, and Graph API publish path.
 */

import { getCountryNameFromCode } from '@/lib/countryUtils';

/** Mirrored from instagram-image to avoid a circular import. */
export const POS_VALUES = ['bl', 'br', 'tl', 'tr'] as const;
export type Pos = (typeof POS_VALUES)[number];

export const BG_VALUES = [
  'grey',
  'navy',
  'blue',
  'teal',
  'yellow',
  'amber',
  'emerald',
  'green',
  'orange',
  'sunset',
  'red',
] as const;
export type Bg = (typeof BG_VALUES)[number];

export const SLIDE_LAYOUTS = ['overlay', 'split'] as const;
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

export const SPLIT_BANDS = ['top', 'bottom'] as const;
export type SplitBand = (typeof SPLIT_BANDS)[number];

export const IMAGE_MODES = [
  'picture0',
  'picture1',
  'picture0_blur',
  'gradient',
] as const;
export type ImageMode = (typeof IMAGE_MODES)[number];

export const HOOK_PRESETS = ['Hiring', 'Wanted', 'Recruiting'] as const;

export const CTA_OPTIONS = [
  'link_in_bio',
  'create_profile',
  'job_alert',
  'share_friend',
] as const;
export type CtaOption = (typeof CTA_OPTIONS)[number];

export const CTA_LABELS: Record<CtaOption, string> = {
  link_in_bio: 'Link in bio to apply',
  create_profile: 'Create your profile on Chickenloop',
  job_alert: 'Set a job alert for future roles',
  share_friend: 'Know someone? Share this with a friend',
};

export interface CarouselSlideConfig {
  layout: SlideLayout;
  pos?: Pos;
  bg?: Bg;
  splitBand?: SplitBand;
  imageMode: ImageMode;
  /** Slide 1 hook verb / headline */
  headline?: string;
  titleOverride?: string;
  locationOverride?: string;
  /** Slide 2 body (plain text) */
  bodyText?: string;
  showExperience?: boolean;
  showType?: boolean;
  showQualifications?: boolean;
  /** Slide 3 CTAs */
  ctas?: CtaOption[];
  customCta?: string;
}

export interface InstagramCarouselJob {
  title?: string | null;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  type?: string | null;
  experience?: string | null;
  experienceLevel?: string | string[] | null;
  qualifications?: string[] | null;
  pictures?: (string | null)[] | null;
  sports?: unknown[];
  occupationalAreas?: unknown[];
  company?: { name?: string | null; logo?: string | null } | null;
  /** Populated company doc or ObjectId — only name/logo are read when populated. */
  companyId?: unknown;
}

const BODY_MAX_CHARS = 420;

function stripHtml(html: string | undefined | null, maxChars: number): string {
  if (!html || typeof html !== 'string') return '';
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped.length) return '';
  if (stripped.length <= maxChars) return stripped;
  const truncated = stripped.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim() + '…';
}

export function resolveJobLocationLabel(job: InstagramCarouselJob): string {
  const city = typeof job.city === 'string' ? job.city.trim() : '';
  const countryRaw = typeof job.country === 'string' ? job.country.trim() : '';
  const country =
    countryRaw.length === 2
      ? getCountryNameFromCode(countryRaw)
      : countryRaw;
  return [city, country].filter(Boolean).join(', ');
}

export function resolveExperienceLabel(job: InstagramCarouselJob): string {
  const raw = job.experienceLevel ?? job.experience;
  if (Array.isArray(raw)) {
    return raw.filter((v) => typeof v === 'string' && v.trim()).join(', ');
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

export function defaultImageModeForSlide(
  slideIndex: number,
  job: InstagramCarouselJob
): ImageMode {
  const pics = Array.isArray(job.pictures)
    ? job.pictures.filter((p): p is string => typeof p === 'string' && !!p)
    : [];
  if (slideIndex === 0) {
    return pics[0] ? 'picture0' : 'gradient';
  }
  if (slideIndex === 1) {
    if (pics[1]) return 'picture1';
    if (pics[0]) return 'picture0_blur';
    return 'gradient';
  }
  // CTA slide: prefer gradient/brand feel; still allow photo if present
  return pics[0] ? 'picture0' : 'gradient';
}

export function buildDefaultCarouselConfig(
  job: InstagramCarouselJob
): CarouselSlideConfig[] {
  const location = resolveJobLocationLabel(job);
  const experience = resolveExperienceLabel(job);
  const quals = Array.isArray(job.qualifications)
    ? job.qualifications.filter((q) => typeof q === 'string' && q.trim())
    : [];

  return [
    {
      layout: 'overlay',
      pos: 'bl',
      bg: 'navy',
      imageMode: defaultImageModeForSlide(0, job),
      headline: 'Wanted',
      titleOverride: job.title ?? '',
      locationOverride: location,
    },
    {
      layout: 'split',
      splitBand: 'bottom',
      bg: 'navy',
      imageMode: defaultImageModeForSlide(1, job),
      bodyText: stripHtml(job.description, BODY_MAX_CHARS),
      showExperience: !!experience,
      showType: !!job.type,
      showQualifications: quals.length > 0,
    },
    {
      layout: 'overlay',
      pos: 'bl',
      bg: 'teal',
      imageMode: defaultImageModeForSlide(2, job),
      ctas: [...CTA_OPTIONS],
      customCta: '',
    },
  ];
}

export function normalizeSlideConfig(
  raw: unknown,
  fallback: CarouselSlideConfig
): CarouselSlideConfig {
  if (!raw || typeof raw !== 'object') return { ...fallback };
  const s = raw as Record<string, unknown>;

  const layout =
    s.layout === 'split' || s.layout === 'overlay' ? s.layout : fallback.layout;
  const imageMode = IMAGE_MODES.includes(s.imageMode as ImageMode)
    ? (s.imageMode as ImageMode)
    : fallback.imageMode;
  const splitBand =
    s.splitBand === 'top' || s.splitBand === 'bottom'
      ? s.splitBand
      : fallback.splitBand;
  const pos =
    typeof s.pos === 'string' && ['bl', 'br', 'tl', 'tr'].includes(s.pos)
      ? (s.pos as Pos)
      : fallback.pos;
  const bg = typeof s.bg === 'string' ? (s.bg as Bg) : fallback.bg;

  const ctas = Array.isArray(s.ctas)
    ? s.ctas.filter((c): c is CtaOption =>
        CTA_OPTIONS.includes(c as CtaOption)
      )
    : fallback.ctas;

  return {
    layout,
    pos,
    bg,
    splitBand,
    imageMode,
    headline:
      typeof s.headline === 'string' ? s.headline.slice(0, 40) : fallback.headline,
    titleOverride:
      typeof s.titleOverride === 'string'
        ? s.titleOverride.slice(0, 80)
        : fallback.titleOverride,
    locationOverride:
      typeof s.locationOverride === 'string'
        ? s.locationOverride.slice(0, 80)
        : fallback.locationOverride,
    bodyText:
      typeof s.bodyText === 'string'
        ? s.bodyText.slice(0, 600)
        : fallback.bodyText,
    showExperience:
      typeof s.showExperience === 'boolean'
        ? s.showExperience
        : fallback.showExperience,
    showType: typeof s.showType === 'boolean' ? s.showType : fallback.showType,
    showQualifications:
      typeof s.showQualifications === 'boolean'
        ? s.showQualifications
        : fallback.showQualifications,
    ctas,
    customCta:
      typeof s.customCta === 'string'
        ? s.customCta.slice(0, 120)
        : fallback.customCta,
  };
}

export function normalizeCarouselSlides(
  raw: unknown,
  job: InstagramCarouselJob
): CarouselSlideConfig[] {
  const defaults = buildDefaultCarouselConfig(job);
  if (!Array.isArray(raw) || raw.length < 2) return defaults;
  const slides = raw
    .slice(0, 10)
    .map((item, i) => normalizeSlideConfig(item, defaults[Math.min(i, 2)] ?? defaults[0]));
  return slides.length >= 2 ? slides : defaults;
}

export function parseSlideConfigFromSearchParams(
  searchParams: URLSearchParams
): Partial<CarouselSlideConfig> {
  const partial: Partial<CarouselSlideConfig> = {};
  const layout = searchParams.get('layout');
  if (layout === 'overlay' || layout === 'split') partial.layout = layout;
  const pos = searchParams.get('pos');
  if (pos && ['bl', 'br', 'tl', 'tr'].includes(pos)) partial.pos = pos as Pos;
  const bg = searchParams.get('bg');
  if (bg) partial.bg = bg as Bg;
  const splitBand = searchParams.get('splitBand');
  if (splitBand === 'top' || splitBand === 'bottom') partial.splitBand = splitBand;
  const imageMode = searchParams.get('imageMode');
  if (IMAGE_MODES.includes(imageMode as ImageMode)) {
    partial.imageMode = imageMode as ImageMode;
  }
  const headline = searchParams.get('headline');
  if (headline) partial.headline = headline.slice(0, 40);
  const titleOverride = searchParams.get('title');
  if (titleOverride) partial.titleOverride = titleOverride.slice(0, 80);
  const locationOverride = searchParams.get('location');
  if (locationOverride) partial.locationOverride = locationOverride.slice(0, 80);
  const bodyText = searchParams.get('body');
  if (bodyText) partial.bodyText = bodyText.slice(0, 400);
  if (searchParams.get('showExperience') === '1') partial.showExperience = true;
  if (searchParams.get('showExperience') === '0') partial.showExperience = false;
  if (searchParams.get('showType') === '1') partial.showType = true;
  if (searchParams.get('showType') === '0') partial.showType = false;
  if (searchParams.get('showQualifications') === '1') {
    partial.showQualifications = true;
  }
  if (searchParams.get('showQualifications') === '0') {
    partial.showQualifications = false;
  }
  const ctas = searchParams.get('ctas');
  if (ctas) {
    partial.ctas = ctas
      .split(',')
      .map((c) => c.trim())
      .filter((c): c is CtaOption => CTA_OPTIONS.includes(c as CtaOption));
  }
  const customCta = searchParams.get('customCta');
  if (customCta) partial.customCta = customCta.slice(0, 120);
  return partial;
}
