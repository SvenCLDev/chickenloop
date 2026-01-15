import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Application from '@/models/Application';
import User from '@/models/User';
import { requireRole } from '@/lib/auth';

// POST - Admin-only actions (archive/unarchive)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireRole(request, ['admin']);
    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { action } = body; // 'archive' or 'unarchive'

    if (!action || !['archive', 'unarchive'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "archive" or "unarchive"' },
        { status: 400 }
      );
    }

    const application = await Application.findById(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const adminUser = await User.findById(user.userId).select('name').lean();
    const adminName = adminUser?.name || 'Unknown Admin';

    // Initialize adminActions array if it doesn't exist
    if (!application.adminActions) {
      application.adminActions = [];
    }

    const isArchiving = action === 'archive';
    const wasArchived = application.archivedByAdmin || false;

    // Only update if state is changing
    if (isArchiving !== wasArchived) {
      application.archivedByAdmin = isArchiving;
      application.lastActivityAt = new Date();

      // Log admin action
      application.adminActions.push({
        adminId: user.userId as any,
        adminName,
        action: isArchiving ? 'archived' : 'unarchived',
        details: isArchiving 
          ? 'Application archived by admin (soft delete)' 
          : 'Application unarchived by admin',
        timestamp: new Date(),
      });

      await application.save();
    }

    // Populate related data for response
    await application.populate('jobId', 'title company city');
    await application.populate('candidateId', 'name email');
    await application.populate('recruiterId', 'name email');

    return NextResponse.json({
      message: `Application ${isArchiving ? 'archived' : 'unarchived'} successfully`,
      application: {
        _id: application._id,
        status: application.status,
        archivedByAdmin: application.archivedByAdmin,
        adminActions: application.adminActions,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /applications/[id]/admin POST] Error:', error);
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
