import { NextRequest } from 'next/server';
import { GET as generateImage } from '../[jobId]/route';

/**
 * GET /api/instagram-image/[jobId].png
 * Dedicated route for .png URLs. Strips the .png suffix from the segment,
 * then delegates to the main route with params that trigger PNG output.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  const rawId = params.jobId ?? '';
  const jobId = rawId.replace('.png', '');
  return generateImage(request, {
    params: Promise.resolve({ jobId: jobId ? `${jobId}.png` : '' }),
  });
}
