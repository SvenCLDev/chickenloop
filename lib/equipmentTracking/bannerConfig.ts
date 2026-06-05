export const EQUIPMENT_BANNER_VARIANTS = ['A', 'B', 'C'] as const;

export type EquipmentBannerVariant = (typeof EQUIPMENT_BANNER_VARIANTS)[number];

export interface EquipmentBannerConfigEntry {
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  /** Analytics and landing-page query param (?source=) */
  source: string;
}

export type EquipmentBannerConfig = Record<EquipmentBannerVariant, EquipmentBannerConfigEntry>;

export const equipmentBannerConfig: EquipmentBannerConfig = {
  A: {
    headline: 'Tired of the Excel & WhatsApp mess?',
    subheadline: 'Track every kite, board and bar in one place.',
    cta: 'See Early Access',
    image: '/problems.png',
    source: 'chaos',
  },
  B: {
    headline: 'Kitesurf maintenance costing you too much?',
    subheadline: 'Scan. Track. Maintain.',
    cta: 'See How It Works',
    image: '/QR-safety.png',
    source: 'qr',
  },
  C: {
    headline: 'Is your gear ready for an insurance audit?',
    subheadline: 'Digital maintenance records for every piece of equipment.',
    cta: 'Get Early Access',
    image: '/images/equipment-tracking/banner-audit.jpg',
    source: 'audit',
  },
};

export function getEquipmentBannerConfig(variant: EquipmentBannerVariant): EquipmentBannerConfigEntry {
  return equipmentBannerConfig[variant];
}

export function isEquipmentBannerVariant(value: string): value is EquipmentBannerVariant {
  return (EQUIPMENT_BANNER_VARIANTS as readonly string[]).includes(value);
}
