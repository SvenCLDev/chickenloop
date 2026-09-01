#!/usr/bin/env node
/**
 * Debug helper: fetch homepage HTML and report Open Graph tags.
 * Usage: node scripts/verify-homepage-og.mjs [url]
 */
const targetUrl = process.argv[2] || 'http://127.0.0.1:3000/';
const logEndpoint =
  'http://127.0.0.1:7714/ingest/809469dc-4731-4443-a5ec-6d4761840282';
const sessionId = '85d025';

function extractMeta(html, attr, key) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${attr}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
    'i'
  );
  const m = html.match(re);
  return m ? (m[1] || m[2] || null) : null;
}

function extractOgImage(html) {
  const re =
    /<meta[^>]+property=["']og:image(?::[^"']*)?["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::[^"']*)?["']/gi;
  const images = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    images.push(m[1] || m[2]);
  }
  return images;
}

function extractPreloadJobImages(html) {
  return [...html.matchAll(/rel="preload" as="image" href="(https:\/\/[^"]*\/jobs\/[^"]+)"/g)].map(
    (m) => m[1]
  );
}

async function log(payload) {
  try {
    await fetch(logEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': sessionId,
      },
      body: JSON.stringify({ sessionId, timestamp: Date.now(), ...payload }),
    });
  } catch {
    // ingest optional when not in debug session
  }
}

const res = await fetch(targetUrl, { redirect: 'follow' });
const html = await res.text();
const ogImages = extractOgImage(html);
const preloadJobImages = extractPreloadJobImages(html);

const data = {
  targetUrl,
  status: res.status,
  ogTitle: extractMeta(html, 'og:title', 'og:title'),
  ogDescription: extractMeta(html, 'og:description', 'og:description'),
  ogImages,
  hasExplicitOgImage: ogImages.length > 0,
  preloadJobImages,
  inferredWouldUseJobImage: ogImages.length === 0 && preloadJobImages.length > 0,
};

console.log(JSON.stringify(data, null, 2));

await log({
  runId: process.env.RUN_ID || 'verify-og',
  hypothesisId: 'A',
  location: 'scripts/verify-homepage-og.mjs',
  message: 'Homepage OG metadata scan',
  data,
});
