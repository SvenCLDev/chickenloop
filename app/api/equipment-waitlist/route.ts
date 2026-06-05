import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EquipmentWaitlist from '@/models/EquipmentWaitlist';
import { parseEquipmentWaitlistBody } from '@/lib/equipmentWaitlist';
import { recordEquipmentAnalyticsEvent } from '@/lib/equipmentAnalytics';

const DEFAULT_SOURCE = 'equipment-tracking-page';

/** POST - Save an equipment tracking early access waitlist signup (public). */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { data, error: parseError } = parseEquipmentWaitlistBody(body);
    if (parseError || !data) {
      return NextResponse.json({ error: parseError || 'Invalid request body' }, { status: 400 });
    }

    const signupSource = data.source || DEFAULT_SOURCE;

    const entry = await EquipmentWaitlist.create({
      name: data.name,
      email: data.email,
      schoolName: data.schoolName,
      country: data.country,
      equipmentCount: data.equipmentCount,
      instructorCount: data.instructorCount,
      interestedPrice: data.interestedPrice,
      source: signupSource,
    });

    try {
      await recordEquipmentAnalyticsEvent({
        event: 'equipment_waitlist_signup',
        source: signupSource,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: { waitlistId: String(entry._id) },
      });
    } catch (analyticsError) {
      console.error('[API /equipment-waitlist POST] Analytics log failed:', analyticsError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Thanks! You are on the early access list.',
        id: String(entry._id),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API /equipment-waitlist POST] Error:', err);

    // Duplicate key on email if a unique index is added later
    if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 });
  }
}
