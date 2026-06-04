import { NextRequest, NextResponse } from 'next/server';
import {
  parseEquipmentAnalyticsPayload,
  recordEquipmentAnalyticsEvent,
} from '@/lib/equipmentAnalytics';

/** POST - Record an equipment validation analytics event (public, fire-and-forget). */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { data, error: parseError } = parseEquipmentAnalyticsPayload(body);
    if (parseError || !data) {
      return NextResponse.json({ error: parseError || 'Invalid request body' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    await recordEquipmentAnalyticsEvent({
      event: data.event,
      source: data.source,
      metadata: data.metadata,
      userAgent,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API /equipment-analytics POST] Error:', err);
    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 });
  }
}
