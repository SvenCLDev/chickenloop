import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EquipmentWaitlist from '@/models/EquipmentWaitlist';

function parseOptionalInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const schoolName = typeof body.schoolName === 'string' ? body.schoolName.trim() : undefined;
    const country = typeof body.country === 'string' ? body.country.trim() : undefined;
    const equipmentCount = parseOptionalInt(body.equipmentCount);
    const instructorCount = parseOptionalInt(body.instructorCount);
    const interestedPrice = parseOptionalInt(body.interestedPrice);

    await connectDB();

    await EquipmentWaitlist.create({
      name,
      email,
      schoolName: schoolName || undefined,
      country: country || undefined,
      equipmentCount,
      instructorCount,
      interestedPrice,
      source: 'equipment-tracking-page',
    });

    return NextResponse.json(
      { success: true, message: 'Thanks! You are on the early access list.' },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /equipment-waitlist POST] Error:', error);
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
  }
}
