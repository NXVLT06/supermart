/**
 * api/trolley/[trolleyId].js
 * GET /api/trolley/:trolleyId
 * Returns trolley state, items, and computed gate status.
 */

import { hgetall } from '../../lib/kv.js';

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

  const { trolleyId } = req.query;

  if (!trolleyId) {
    return res.status(400).json({ error: 'trolleyId is required' });
  }

  try {
    const data = await hgetall(`trolley:${trolleyId}`);

    if (!data) {
      return res.status(404).json({ error: `Trolley '${trolleyId}' not found` });
    }

    // Parse JSON fields
    let items = [];
    try {
      items = JSON.parse(data.items || '[]');
    } catch {
      items = [];
    }

    const theftFlag = data.theftFlag === 'true';
    const status = data.status || 'UNKNOWN';

    // Gate is cleared only when paid AND no theft flag
    const gateCleared = status === 'PAID' && !theftFlag;

    return res.status(200).json({
      trolleyID: trolleyId,
      status,
      theftFlag,
      total: parseFloat(data.total || '0'),
      phone: data.phone || '',
      items,
      sessionId: data.sessionId || null,
      updatedAt: data.updatedAt || null,
      gate: {
        cleared: gateCleared,
        reason: gateCleared
          ? 'Payment verified'
          : theftFlag
          ? 'Theft flag raised'
          : `Status is ${status}`,
      },
    });
  } catch (err) {
    console.error('[trolley] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
