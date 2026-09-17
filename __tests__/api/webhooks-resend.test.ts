/**
 * @jest-environment node
 */
import { POST } from '@/app/api/webhooks/resend/route';
import { NextRequest } from 'next/server';

jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn(),
  })),
}));

jest.mock('@/lib/talentNetwork/handleReferenceEmailBounce', () => ({
  handleReferenceEmailBounce: jest.fn(),
}));

import { Webhook } from 'svix';
import { handleReferenceEmailBounce } from '@/lib/talentNetwork/handleReferenceEmailBounce';

describe('POST /api/webhooks/resend', () => {
  const originalSecret = process.env.RESEND_WEBHOOK_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test';
  });

  afterAll(() => {
    process.env.RESEND_WEBHOOK_SECRET = originalSecret;
  });

  function buildRequest(body: string): NextRequest {
    return new NextRequest('http://localhost/api/webhooks/resend', {
      method: 'POST',
      body,
      headers: {
        'svix-id': 'msg_1',
        'svix-timestamp': '123',
        'svix-signature': 'v1,sig',
        'content-type': 'application/json',
      },
    });
  }

  it('rejects invalid signatures', async () => {
    (Webhook as unknown as jest.Mock).mockImplementation(() => ({
      verify: () => {
        throw new Error('bad sig');
      },
    }));

    const res = await POST(buildRequest('{}'));
    expect(res.status).toBe(400);
    expect(handleReferenceEmailBounce).not.toHaveBeenCalled();
  });

  it('handles email.bounced events (svix v2 verify returns undefined)', async () => {
    // Svix v2: verify validates signature only and returns undefined
    (Webhook as unknown as jest.Mock).mockImplementation(() => ({
      verify: () => undefined,
    }));
    (handleReferenceEmailBounce as jest.Mock).mockResolvedValue({
      ok: true,
      outcome: 'updated',
    });

    const body = JSON.stringify({
      type: 'email.bounced',
      data: { email_id: 're_123', bounce: { type: 'hard' } },
    });
    const res = await POST(buildRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(handleReferenceEmailBounce).toHaveBeenCalledWith({
      resendMessageId: 're_123',
      bounceType: 'hard',
    });
    expect(json.outcome).toBe('updated');
  });

  it('ignores unrelated event types', async () => {
    (Webhook as unknown as jest.Mock).mockImplementation(() => ({
      verify: () => undefined,
    }));

    const body = JSON.stringify({
      type: 'email.delivered',
      data: { email_id: 're_123' },
    });
    const res = await POST(buildRequest(body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ignored).toBe(true);
    expect(handleReferenceEmailBounce).not.toHaveBeenCalled();
  });
});
