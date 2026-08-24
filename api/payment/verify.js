/**
 * api/payment/verify.js
 * POST /api/payment/verify
 * Marks a trolley as PAID and updates session.
 */

import { hset, hgetall } from '../../lib/kv.js';
import { randomUUID } from 'crypto';

export const config = { runtime: 'nodejs18.x' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const getUUID = () => Math.random().toString(36).substring(2, 10).toUpperCase();

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
    const { trolleyId } = body;

    if (!trolleyId) {
      return res.status(400).json({ error: 'trolleyId is required' });
    }

    // Verify trolley exists
    const trolley = await hgetall(`trolley:${trolleyId}`);
    if (!trolley) {
      return res.status(404).json({ error: `Trolley '${trolleyId}' not found` });
    }

    // Prevent double-payment
    if (trolley.status === 'PAID') {
      return res.status(200).json({
        status: 'PAID',
        trolleyId,
        transactionId: trolley.transactionId || 'already-paid',
        message: 'Already marked as paid',
      });
    }

    const transactionId = `TXN-${Date.now()}-${getUUID()}`;
    const now = new Date().toISOString();

    // Update trolley status
    await hset(`trolley:${trolleyId}`, {
      status: 'PAID',
      transactionId,
      updatedAt: now,
    });

    // Update session if present
    if (trolley.sessionId) {
      await hset(`session:${trolley.sessionId}`, {
        status: 'PAID',
        verifiedAt: now,
        transactionId,
      });
    }

    return res.status(200).json({
      status: 'PAID',
      trolleyId,
      transactionId,
      verifiedAt: now,
    });
  } catch (err) {
    console.error('[payment/verify] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
