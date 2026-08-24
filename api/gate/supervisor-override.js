/**
 * api/gate/supervisor-override.js
 * POST /api/gate/supervisor-override
 * Records a supervisor gate override in KV with a 5-minute TTL.
 */

import { set, hset } from '../../lib/kv.js';
import { randomUUID } from 'crypto';

export const config = { runtime: 'nodejs18.x' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const VALID_ACTIONS = ['unlock', 'lock', 'hold'];

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
    const { gateId, action } = body;

    if (!gateId || !action) {
      return res.status(400).json({ error: 'gateId and action are required' });
    }

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`,
      });
    }

    const auditLogId = `AUDIT-${Date.now()}-${getUUID()}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // +5 min
    const TTL = 300; // 5 minutes

    const overridePayload = {
      gateId,
      action,
      auditLogId,
      triggeredAt: now.toISOString(),
      validUntil,
    };

    // Store gate override (expires automatically via TTL)
    await set(`gate:override:${gateId}`, JSON.stringify(overridePayload), TTL);

    // Write to audit log hash (persistent)
    await hset(`audit:${auditLogId}`, {
      gateId,
      action,
      triggeredAt: now.toISOString(),
      validUntil,
      source: 'supervisor-dashboard',
    });

    return res.status(200).json({
      gateId,
      status: action === 'unlock' ? 'UNLOCKED' : action === 'lock' ? 'LOCKED' : 'HOLD',
      action,
      validUntil,
      auditLogId,
      message: `Gate ${gateId} ${action}ed until ${validUntil}`,
    });
  } catch (err) {
    console.error('[gate/supervisor-override] Error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
