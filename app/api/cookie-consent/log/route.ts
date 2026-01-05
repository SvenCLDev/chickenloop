import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CookieConsent from '@/models/CookieConsent';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const consentData = await request.json();
    
    // Extract IP address from request
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Extract user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create consent record
    const consentRecord = await CookieConsent.create({
      necessary: consentData.necessary,
      analytics: consentData.analytics,
      marketing: consentData.marketing,
      functional: consentData.functional,
      timestamp: new Date(consentData.timestamp),
      version: consentData.version,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return NextResponse.json(
      { success: true, id: consentRecord._id },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error logging cookie consent:', error);
    // Don't fail the request if logging fails
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}






