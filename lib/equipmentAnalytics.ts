import connectDB from '@/lib/db';
import EquipmentAnalytics, {
  EQUIPMENT_ANALYTICS_EVENTS,
  type EquipmentAnalyticsEvent,
} from '@/models/EquipmentAnalytics';

export { EQUIPMENT_ANALYTICS_EVENTS, type EquipmentAnalyticsEvent };

export const EQUIPMENT_ANALYTICS_SOURCES = ['A', 'B', 'C'] as const;
export type EquipmentAnalyticsSource = (typeof EQUIPMENT_ANALYTICS_SOURCES)[number];

export function normalizeEquipmentSource(source: string): string {
  return source.trim();
}

export function isKnownEquipmentSource(source: string): source is EquipmentAnalyticsSource {
  return (EQUIPMENT_ANALYTICS_SOURCES as readonly string[]).includes(source);
}

export function parseEquipmentAnalyticsPayload(body: unknown): {
  data?: { event: EquipmentAnalyticsEvent; source: string; metadata?: Record<string, unknown> };
  error?: string;
} {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid request body' };
  }

  const raw = body as Record<string, unknown>;

  if (typeof raw.event !== 'string' || !EQUIPMENT_ANALYTICS_EVENTS.includes(raw.event as EquipmentAnalyticsEvent)) {
    return { error: 'event must be a valid equipment analytics event' };
  }

  if (typeof raw.source !== 'string' || !raw.source.trim()) {
    return { error: 'source is required and must be a string' };
  }

  const source = normalizeEquipmentSource(raw.source);

  let metadata: Record<string, unknown> | undefined;
  if (raw.metadata !== undefined && raw.metadata !== null) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
      return { error: 'metadata must be an object' };
    }
    metadata = raw.metadata as Record<string, unknown>;
  }

  return {
    data: {
      event: raw.event as EquipmentAnalyticsEvent,
      source,
      metadata,
    },
  };
}

export async function recordEquipmentAnalyticsEvent(options: {
  event: EquipmentAnalyticsEvent;
  source: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
}): Promise<void> {
  await connectDB();
  await EquipmentAnalytics.create({
    event: options.event,
    source: normalizeEquipmentSource(options.source),
    metadata: options.metadata,
    userAgent: options.userAgent,
  });
}
