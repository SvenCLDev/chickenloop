import OpenAI from 'openai';
import {
  buildProfileHeadlineSystemPrompt,
  buildProfileHeadlineUserPrompt,
} from '@/lib/ai/buildProfileHeadlinePrompt';
import {
  buildDeterministicProfileHeadline,
  buildHeadlineInputFromProfile,
  sanitizeProfileHeadline,
  type ProfileHeadlineInput,
} from '@/lib/talentNetwork/profileHeadline';

export type GenerateProfileHeadlineResult = {
  headline: string;
  source: 'ai' | 'fallback';
};

export async function generateProfileHeadline(
  rawInput: ProfileHeadlineInput
): Promise<GenerateProfileHeadlineResult> {
  const input = buildHeadlineInputFromProfile(rawInput);
  const fallback = buildDeterministicProfileHeadline(input);

  if (!process.env.OPENAI_API_KEY) {
    return { headline: fallback, source: 'fallback' };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 60,
      messages: [
        { role: 'system', content: buildProfileHeadlineSystemPrompt() },
        { role: 'user', content: buildProfileHeadlineUserPrompt(input) },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const sanitized = sanitizeProfileHeadline(content);
    if (!sanitized) {
      return { headline: fallback, source: 'fallback' };
    }
    return { headline: sanitized, source: 'ai' };
  } catch (error) {
    console.error('[generateProfileHeadline] OpenAI failed:', error);
    return { headline: fallback, source: 'fallback' };
  }
}
