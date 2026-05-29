import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { blockEmail, unblockEmail, normalizeBlockedEmail } from '@/lib/blockedEmail';
import User from '@/models/User';
import connectDB from '@/lib/db';

/** POST - Add an email to the login blacklist (admin only) */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(request, ['admin']);
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = normalizeBlockedEmail(email);
    await connectDB();

    const targetUser = await User.findOne({ email: normalized }).select('role email').lean();
    if (targetUser?.role === 'admin') {
      return NextResponse.json({ error: 'Admin accounts cannot be blocked' }, { status: 400 });
    }

    await blockEmail(normalized, admin.userId);

    return NextResponse.json({ success: true, email: normalized }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[API /admin/blocked-emails POST] Error:', error);
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
  }
}

/** DELETE - Remove an email from the blacklist (admin only) */
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    if (!emailParam) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalized = normalizeBlockedEmail(emailParam);
    await unblockEmail(normalized);

    return NextResponse.json({ success: true, email: normalized }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[API /admin/blocked-emails DELETE] Error:', error);
    return NextResponse.json({ error: errorMessage || 'Internal server error' }, { status: 500 });
  }
}
