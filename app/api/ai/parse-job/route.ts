import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireRole } from '@/lib/auth';
import { stripHtmlToText } from '@/lib/sanitizeText';
import {
  sanitizeParsedJobOutput,
} from '@/lib/ai/sanitizeParsedJob';
import { buildParseJobSystemPrompt } from '@/lib/ai/parseJobPrompt';

function parseJsonFromOpenAiContent(content: string): unknown {
  const trimmed = content.trim();
  const fence =
    /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/m.exec(trimmed) ??
    /^```(?:json)?\s*([\s\S]*?)```$/.exec(trimmed);
  const body = fence ? fence[1].trim() : trimmed;
  return JSON.parse(body);
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['recruiter', 'admin'], {
      skipCompanyProfileCheck: true,
    });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI is not configured (missing OPENAI_API_KEY)' },
        { status: 503 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const descriptionRaw =
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      'description' in body
        ? (body as { description?: unknown }).description
        : undefined;

    if (typeof descriptionRaw !== 'string' || !descriptionRaw.trim()) {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      );
    }

    const description = stripHtmlToText(descriptionRaw).trim();
    if (!description) {
      return NextResponse.json(
        {
          error:
            'description must contain visible text after stripping markup',
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildParseJobSystemPrompt() },
        { role: 'user', content: description },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Empty response from model' },
        { status: 502 }
      );
    }

    let raw: unknown;
    try {
      raw = parseJsonFromOpenAiContent(content);
    } catch (e) {
      console.error('[parse-job] JSON parse failed:', e);
      return NextResponse.json({ error: 'Parsing failed' }, { status: 500 });
    }

    const sanitized = sanitizeParsedJobOutput(raw);
    return NextResponse.json(sanitized);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (errorMessage === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (
      error instanceof Error &&
      error.message === 'COMPANY_PROFILE_INCOMPLETE'
    ) {
      return NextResponse.json(
        { error: 'COMPANY_PROFILE_INCOMPLETE' },
        { status: 403 }
      );
    }
    if (errorMessage === 'PASSWORD_RESET_REQUIRED') {
      return NextResponse.json(
        { error: 'PASSWORD_RESET_REQUIRED' },
        { status: 403 }
      );
    }
    if (errorMessage === 'COMPANY_MISSING') {
      return NextResponse.json({ error: 'COMPANY_MISSING' }, { status: 403 });
    }

    console.error('[parse-job] Error:', error);
    return NextResponse.json(
      { error: 'AI parsing failed' },
      { status: 500 }
    );
  }
}
