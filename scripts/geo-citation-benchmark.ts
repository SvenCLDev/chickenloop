/**
 * GEO citation benchmark — tests whether Chickenloop is cited for target LLM prompts.
 *
 * Usage:
 *   PERPLEXITY_API_KEY=... npx tsx scripts/geo-citation-benchmark.ts
 *   npx tsx scripts/geo-citation-benchmark.ts --dry-run
 *
 * Optional env:
 *   GEO_BENCHMARK_OUTPUT=scripts/geo-citation-results.csv
 */

import * as fs from 'fs';
import * as path from 'path';

const SITE_DOMAIN = 'chickenloop.com';

const PROMPTS = [
  'Which countries have the most kitesurfing instructor jobs?',
  'Where are the most watersports centre jobs worldwide?',
  'How many watersports jobs are in Spain?',
  'How many watersports jobs are in Greece?',
  'How many watersports jobs are in Italy?',
  'What types of watersports jobs are hiring right now?',
  'How many seasonal vs full-time watersports jobs are available?',
  'Which countries hire the most watersports instructors?',
  'Best job board for kitesurfing instructor jobs in Europe',
  'How many wing foiling jobs are available worldwide?',
];

interface BenchmarkResult {
  timestamp: string;
  prompt: string;
  cited: boolean;
  citationUrls: string[];
  provider: string;
  error?: string;
}

function parseArgs(): { dryRun: boolean; outputPath: string } {
  const dryRun = process.argv.includes('--dry-run');
  const outputPath =
    process.env.GEO_BENCHMARK_OUTPUT ||
    path.join(__dirname, 'geo-citation-results.csv');
  return { dryRun, outputPath };
}

function extractChickenloopUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s)\]"']+/gi;
  const matches = text.match(urlPattern) || [];
  return matches.filter((url) => url.toLowerCase().includes(SITE_DOMAIN));
}

function responseCitesChickenloop(text: string): boolean {
  if (text.toLowerCase().includes(SITE_DOMAIN)) {
    return true;
  }
  return extractChickenloopUrls(text).length > 0;
}

async function queryPerplexity(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Perplexity API ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || '';
}

function appendCsv(outputPath: string, results: BenchmarkResult[]): void {
  const header = 'timestamp,prompt,cited,citation_urls,provider,error\n';
  const rows = results
    .map((r) => {
      const escapedPrompt = `"${r.prompt.replace(/"/g, '""')}"`;
      const urls = `"${r.citationUrls.join(' ').replace(/"/g, '""')}"`;
      const error = r.error ? `"${r.error.replace(/"/g, '""')}"` : '';
      return `${r.timestamp},${escapedPrompt},${r.cited},${urls},${r.provider},${error}`;
    })
    .join('\n');

  const exists = fs.existsSync(outputPath);
  fs.appendFileSync(outputPath, (exists ? '' : header) + rows + '\n', 'utf8');
}

async function main(): Promise<void> {
  const { dryRun, outputPath } = parseArgs();
  const timestamp = new Date().toISOString();
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim();

  console.log(`GEO citation benchmark — ${timestamp}`);
  console.log(`Prompts: ${PROMPTS.length}`);
  console.log(`Output: ${outputPath}`);

  if (dryRun) {
    console.log('\nDry run — prompts to test manually in ChatGPT / Perplexity:\n');
    PROMPTS.forEach((prompt, i) => console.log(`${i + 1}. ${prompt}`));
    console.log(`\nCheck responses for citations of ${SITE_DOMAIN}`);
    return;
  }

  if (!apiKey) {
    console.error(
      'PERPLEXITY_API_KEY is not set. Use --dry-run for manual testing, or set the API key.',
    );
    process.exit(1);
  }

  const results: BenchmarkResult[] = [];
  let citedCount = 0;

  for (const prompt of PROMPTS) {
    process.stdout.write(`Testing: ${prompt.slice(0, 60)}... `);
    try {
      const content = await queryPerplexity(prompt, apiKey);
      const citationUrls = extractChickenloopUrls(content);
      const cited = responseCitesChickenloop(content);
      if (cited) citedCount += 1;

      results.push({
        timestamp,
        prompt,
        cited,
        citationUrls,
        provider: 'perplexity',
      });
      console.log(cited ? 'CITED' : 'not cited');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        timestamp,
        prompt,
        cited: false,
        citationUrls: [],
        provider: 'perplexity',
        error: message,
      });
      console.log(`ERROR: ${message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  appendCsv(outputPath, results);

  const rate = PROMPTS.length > 0 ? ((citedCount / PROMPTS.length) * 100).toFixed(1) : '0';
  console.log(`\nDone. Citation rate: ${citedCount}/${PROMPTS.length} (${rate}%)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
