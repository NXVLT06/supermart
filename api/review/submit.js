/**
 * api/review/submit.js
 * POST /api/review/submit
 * Stores a customer review in KV.
 */

import { hset, lpush, ltrim } from '../../lib/kv.js';

export const config = { runtime: 'nodejs18.x' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { trolleyID, sessionId, rating, feedback } = body;

    if (!trolleyID || rating === undefined) {
      return res.status(400).json({ error: 'trolleyID and rating are required' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
    }

    const now = new Date().toISOString();
    const reviewData = {
      trolleyID,
      sessionId: sessionId || null,
      rating,
      feedback: feedback || '',
      submittedAt: now,
    };

    // Store individual review (keyed by trolleyID — latest wins)
    await hset(`review:${trolleyID}`, {
      rating: String(rating),
      feedback: feedback || '',
      sessionId: sessionId || '',
      submittedAt: now,
    });

    // Append to global reviews list (newest first)
    await lpush('reviews:list', JSON.stringify(reviewData));
    // Cap at 100 reviews
    await ltrim('reviews:list', 0, 99);

    return res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
      submittedAt: now,
    });
  } catch (err) {
    console.error('[review/submit] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
