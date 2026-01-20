import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import EmailPreferences from '@/models/EmailPreferences';
import mongoose from 'mongoose';

// Default email preferences (returned when user has no preferences yet)
const DEFAULT_PREFERENCES = {
  jobAlerts: 'weekly' as const,
  applicationUpdates: true,
  marketing: false,
};

/**
 * GET /api/email-preferences
 * Get email preferences for the authenticated user
 * 
 * Returns existing preferences or defaults if none exist (does not create)
 */
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const userId = new mongoose.Types.ObjectId(user.userId);

    // Find existing preferences
    const preferences = await EmailPreferences.findOne({ userId }).lean();

    // If preferences exist, return them
    if (preferences) {
      return NextResponse.json(
        {
          success: true,
          preferences: {
            jobAlerts: preferences.jobAlerts,
            applicationUpdates: preferences.applicationUpdates,
            marketing: preferences.marketing,
            updatedAt: preferences.updatedAt,
            createdAt: preferences.createdAt,
          },
        },
        { status: 200 }
      );
    }

    // If no preferences exist, return defaults (do NOT create)
    return NextResponse.json(
      {
        success: true,
        preferences: {
          jobAlerts: DEFAULT_PREFERENCES.jobAlerts,
          applicationUpdates: DEFAULT_PREFERENCES.applicationUpdates,
          marketing: DEFAULT_PREFERENCES.marketing,
          updatedAt: null,
          createdAt: null,
        },
        isDefault: true,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Email Preferences GET] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/email-preferences
 * Update email preferences for the authenticated user
 * 
 * Allows updating:
 * - jobAlerts: 'daily' | 'weekly' | 'never'
 * - applicationUpdates: boolean
 * - marketing: boolean
 * 
 * Upserts preferences (creates if doesn't exist, updates if exists)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await connectDB();

    const userId = new mongoose.Types.ObjectId(user.userId);
    const body = await request.json();

    // Validate and extract allowed fields only
    const updateData: {
      jobAlerts?: 'daily' | 'weekly' | 'never';
      applicationUpdates?: boolean;
      marketing?: boolean;
    } = {};

    // Validate jobAlerts
    if (body.jobAlerts !== undefined) {
      if (!['daily', 'weekly', 'never'].includes(body.jobAlerts)) {
        return NextResponse.json(
          {
            error: 'Invalid jobAlerts value',
            message: 'jobAlerts must be one of: daily, weekly, never',
          },
          { status: 400 }
        );
      }
      updateData.jobAlerts = body.jobAlerts;
    }

    // Validate applicationUpdates
    if (body.applicationUpdates !== undefined) {
      if (typeof body.applicationUpdates !== 'boolean') {
        return NextResponse.json(
          {
            error: 'Invalid applicationUpdates value',
            message: 'applicationUpdates must be a boolean',
          },
          { status: 400 }
        );
      }
      updateData.applicationUpdates = body.applicationUpdates;
    }

    // Validate marketing
    if (body.marketing !== undefined) {
      if (typeof body.marketing !== 'boolean') {
        return NextResponse.json(
          {
            error: 'Invalid marketing value',
            message: 'marketing must be a boolean',
          },
          { status: 400 }
        );
      }
      updateData.marketing = body.marketing;
    }

    // Reject if no valid fields to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error: 'No valid fields to update',
          message: 'At least one of jobAlerts, applicationUpdates, or marketing must be provided',
        },
        { status: 400 }
      );
    }

    // Reject any unexpected fields (for security)
    const allowedFields = ['jobAlerts', 'applicationUpdates', 'marketing'];
    const providedFields = Object.keys(body);
    const unexpectedFields = providedFields.filter(field => !allowedFields.includes(field));
    
    if (unexpectedFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Unexpected fields',
          message: `The following fields are not allowed: ${unexpectedFields.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Find existing preferences or use defaults
    let preferences = await EmailPreferences.findOne({ userId });

    if (!preferences) {
      // Create new preferences with defaults, then update
      preferences = await EmailPreferences.create({
        userId,
        ...DEFAULT_PREFERENCES,
        ...updateData,
      });
    } else {
      // Update existing preferences
      Object.assign(preferences, updateData);
      await preferences.save();
    }

    // Log preference update
    console.log(
      `[Email Preferences Updated] userId=${user.userId}, ` +
      `updates=${JSON.stringify(updateData)}`
    );

    // Return updated preferences
    const updatedPreferences = await EmailPreferences.findOne({ userId }).lean();

    return NextResponse.json(
      {
        success: true,
        message: 'Email preferences updated successfully',
        preferences: {
          jobAlerts: updatedPreferences!.jobAlerts,
          applicationUpdates: updatedPreferences!.applicationUpdates,
          marketing: updatedPreferences!.marketing,
          updatedAt: updatedPreferences!.updatedAt,
          createdAt: updatedPreferences!.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[Email Preferences PATCH] Error:', error);
    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}
