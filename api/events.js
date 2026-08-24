/**
 * api/events.js
 * GET /api/events — Server-Sent Events (SSE) for real-time dashboard updates
 *
 * Strategy: Vercel Serverless doesn't support long-lived SSE natively on free tier.
 * We use a polling-SSE pattern: stream events for up to 20s, then close.
 * The client automatically reconnects via EventSource (browser built-in retry).
 *
 * Events emitted:
 *   trolley.update  { trolleyID, status, theftFlag, total, updatedAt }
 *   review.new      { trolleyID, rating, feedback, submittedAt }
 *   ping            { ts } (heartbeat every 3s to keep connection alive)
 */

import { lrange, hgetall } from '../lib/kv.js';

export const config = {
  runtime: 'nodejs18.x',
  maxDuration: 25,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (eventName, data) => {
    try {
      res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch { /* connection closed */ }
  };

  // Initial ping
  send('ping', { ts: Date.now(), message: 'SSE connected' });

  let iteration = 0;
  const MAX_ITERATIONS = 8; // ~24s then close (client auto-reconnects)
  const POLL_INTERVAL = 3000;

  let lastReviewCount = 0;
  let lastTrolleySnapshot = {};

  // Get initial state
  try {
    const initialReviews = await lrange('reviews:list', 0, 4);
    lastReviewCount = (initialReviews || []).length;

    const activeTrolleys = await lrange('trolleys:active', 0, 19);
    for (const id of (activeTrolleys || [])) {
      const t = await hgetall(`trolley:${id}`);
      if (t) lastTrolleySnapshot[id] = t.status + t.updatedAt;
    }
  } catch { /* KV not configured or empty */ }

  const interval = setInterval(async () => {
    iteration++;

    try {
      // Check for new reviews
      const reviews = await lrange('reviews:list', 0, 4);
      const reviewCount = (reviews || []).length;

      if (reviewCount > lastReviewCount) {
        const newReview = reviews[0];
        if (newReview) {
          try {
            const parsed = typeof newReview === 'string' ? JSON.parse(newReview) : newReview;
            send('review.new', parsed);
          } catch { /* skip malformed */ }
        }
        lastReviewCount = reviewCount;
      }

      // Poll active trolleys for state changes
      const activeTrolleys = await lrange('trolleys:active', 0, 19);
      for (const id of (activeTrolleys || [])) {
        const t = await hgetall(`trolley:${id}`);
        if (!t) continue;
        const fingerprint = t.status + (t.updatedAt || '');
        if (lastTrolleySnapshot[id] !== fingerprint) {
          lastTrolleySnapshot[id] = fingerprint;
          send('trolley.update', {
            trolleyID: id,
            status: t.status,
            theftFlag: t.theftFlag === 'true',
            total: parseFloat(t.total || '0'),
            updatedAt: t.updatedAt,
          });
        }
      }

      // Heartbeat
      send('ping', { ts: Date.now() });

    } catch (err) {
      send('error', { message: err.message });
    }

    if (iteration >= MAX_ITERATIONS) {
      clearInterval(interval);
      send('close', { message: 'Reconnect' });
      res.end();
    }
  }, POLL_INTERVAL);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
