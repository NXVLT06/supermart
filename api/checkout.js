/**
 * api/checkout.js
 * POST /api/checkout
 * Initiates a trolley checkout: stores data in KV, sends WhatsApp receipt.
 */

import { hset, lpush, ltrim } from '../lib/kv.js';
import { sendCheckoutReceipt } from '../lib/whatsapp.js';
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
  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { trolleyID, phone, total, items, theftFlag = false } = body;

    // Validate required fields
    if (!trolleyID || !phone || total === undefined || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Missing required fields: trolleyID, phone, total, items',
      });
    }

    const sessionId = getUUID();
    const now = new Date().toISOString();

    // Store trolley in KV
    await hset(`trolley:${trolleyID}`, {
      status: 'AWAITING_PAYMENT',
      theftFlag: String(theftFlag),
      total: String(total),
      phone,
      items: JSON.stringify(items),
      sessionId,
      updatedAt: now,
    });

    // Store session
    await hset(`session:${sessionId}`, {
      trolleyId: trolleyID,
      status: 'AWAITING_PAYMENT',
      total: String(total),
      phone,
      createdAt: now,
    });

    // Add to active trolleys list (for dashboard)
    await lpush('trolleys:active', trolleyID);
    await ltrim('trolleys:active', 0, 499); // Keep last 500

    // Build payment URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/#/pay/${trolleyID}`;

    // Send WhatsApp notification (non-blocking - don't fail checkout if WA fails)
    const waResult = await sendCheckoutReceipt({ phone, trolleyID, total, paymentUrl });

    return res.status(200).json({
      sessionId,
      status: 'AWAITING_PAYMENT',
      paymentUrl,
      message: waResult.success
        ? 'Checkout initiated. WhatsApp receipt sent.'
        : `Checkout initiated. WhatsApp notice: ${waResult.error}`,
    });
  } catch (err) {
    console.error('[checkout] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
