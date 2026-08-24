/**
 * api/reviews.js
 * GET /api/reviews
 * Returns the most recent reviews from the KV list.
 */

import { lrange } from '../lib/kv.js';

export const config = { runtime: 'nodejs18.x' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const rawList = await lrange('reviews:list', 0, limit - 1);

    const reviews = (rawList || []).map((item) => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);

    return res.status(200).json(reviews);
  } catch (err) {
    console.error('[reviews] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
