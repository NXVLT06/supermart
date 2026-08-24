/**
 * api/esp/update.js
 * POST /api/esp/update
 * 
 * Receives live data from ESP32/ESP8266 smart trolley hardware.
 * ESP sends: trolleyID, items scanned (RFID), weight, theft flag, phone
 * Server updates KV store + broadcasts via SSE to dashboard.
 */

import { hset, lpush, ltrim, hgetall } from '../../lib/kv.js';

export const config = { runtime: 'nodejs18.x' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-ESP-Key',
  'Content-Type': 'application/json',
};

// Simple API key check (set this in your ESP code too)
const ESP_API_KEY = process.env.ESP_API_KEY || 'esp-supermart-2024';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  // ── GET: ESP health check / ping ─────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'ESP endpoint alive',
      serverTime: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional API key check
  const espKey = req.headers['x-esp-key'];
  if (espKey && espKey !== ESP_API_KEY) {
    return res.status(401).json({ error: 'Invalid ESP API key' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      trolleyID,        // e.g. "T-001"
      phone,            // customer phone (scanned from QR or entered)
      items = [],       // [{ sku, name, qty, unitPrice }]
      theftFlag = false,// true if weight mismatch detected
      status,           // "SHOPPING" | "AWAITING_PAYMENT" | "PAID"
      weightKg,         // total weight from load cell (optional)
      batteryPct,       // ESP battery % (optional)
      rssi,             // WiFi signal strength (optional)
    } = body;

    if (!trolleyID) {
      return res.status(400).json({ error: 'trolleyID is required' });
    }

    const now = new Date().toISOString();
    const total = items.reduce((sum, i) => sum + (i.qty || 1) * (i.unitPrice || 0), 0);

    // Get existing trolley or create new
    const existing = await hgetall(`trolley:${trolleyID}`) || {};

    // Update trolley hash
    await hset(`trolley:${trolleyID}`, {
      status:     status || existing.status || 'SHOPPING',
      theftFlag:  String(theftFlag),
      total:      String(total || existing.total || 0),
      phone:      phone || existing.phone || '',
      items:      JSON.stringify(items.length ? items : JSON.parse(existing.items || '[]')),
      sessionId:  existing.sessionId || '',
      updatedAt:  now,
      // ESP metadata
      weightKg:   String(weightKg || 0),
      batteryPct: String(batteryPct || 0),
      rssi:       String(rssi || 0),
      lastEspPing: now,
    });

    // Add to active trolleys list
    await lpush('trolleys:active', trolleyID);
    await ltrim('trolleys:active', 0, 499);

    // Compute gate status
    const currentStatus = status || existing.status || 'SHOPPING';
    const gateCleared = currentStatus === 'PAID' && !theftFlag;

    return res.status(200).json({
      success: true,
      trolleyID,
      status: currentStatus,
      total,
      gate: {
        cleared: gateCleared,
        action: gateCleared ? 'OPEN' : 'CLOSED',
      },
      serverTime: now,
    });

  } catch (err) {
    console.error('[esp/update] Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
