import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { requireRole } from '@/lib/auth';

// GET - Get audit logs (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const userId = searchParams.get('userId');

    // Build query
    const query: any = {};
    if (action) {
      query.action = action;
    }
    if (entityType) {
      query.entityType = entityType;
    }
    if (userId) {
      query.userId = userId;
    }

    // Get audit logs
    const auditLogsDocs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('userId', 'name email');

    // Convert to plain objects
    const auditLogs = auditLogsDocs.map((log) => log.toObject());

    // Get total count for pagination
    const total = await AuditLog.countDocuments(query);

    return NextResponse.json(
      {
        auditLogs,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audit logs API error:', error);

    // Ensure we always return JSON, even for unexpected errors
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json({ error: 'PASSWORD_RESET_REQUIRED' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'COMPANY_PROFILE_INCOMPLETE') {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return JSON error response
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

