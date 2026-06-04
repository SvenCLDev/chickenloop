import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireRole } from '@/lib/auth';
import EquipmentWaitlist from '@/models/EquipmentWaitlist';
import { adminErrorResponse } from '@/lib/marketing/adminErrors';

/** GET - Equipment tracking waitlist leads (admin) */
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy')?.trim() || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search')?.trim() || '';

    const filter: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { schoolName: regex },
        { country: regex },
        { source: regex },
      ];
    }

    const sortField = ['createdAt', 'name', 'email', 'source'].includes(sortBy) ? sortBy : 'createdAt';

    const leads = await EquipmentWaitlist.find(filter)
      .sort({ [sortField]: sortOrder })
      .limit(500)
      .lean();

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: String(l._id),
        name: l.name,
        email: l.email,
        schoolName: l.schoolName ?? '',
        country: l.country ?? '',
        equipmentCount: l.equipmentCount ?? null,
        instructorCount: l.instructorCount ?? null,
        interestedPrice: l.interestedPrice ?? null,
        source: l.source ?? '',
        createdAt: l.createdAt,
      })),
      total: leads.length,
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
