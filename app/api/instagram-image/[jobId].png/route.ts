import { NextRequest } from 'next/server';
import { GET as generateImage } from '../[jobId]/route';

/**
 * GET /api/instagram-image/[jobId].png
 * Dedicated route for .png URLs. Strips the .png suffix from the segment,
 * then delegates to the main route with params that trigger PNG output.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{}> }
) {
  const resolved = await context.params;
  const params = resolved as Record<string, string | undefined>;
  const rawId = (params['jobId'] ?? Object.values(params)[0]) ?? '';
  const jobId = String(rawId).replace('.png', '');
  return generateImage(request, {
    params: Promise.resolve({ jobId: jobId ? `${jobId}.png` : '' }),
  });
}
