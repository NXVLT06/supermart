/**
 * server.js — Local dev server (no Vercel CLI needed!)
 * Serves both the Vite frontend (via proxy) and all /api/* routes.
 * 
 * Run: node server.js
 */

import http from 'http';
import { createServer as createViteServer } from 'vite';
import url from 'url';
import { Buffer } from 'buffer';
import os from 'os';

// ── Import all API handlers ─────────────────────────────────────
import checkoutHandler       from './api/checkout.js';
import reviewsHandler        from './api/reviews.js';
import eventsHandler         from './api/events.js';
import paymentVerifyHandler  from './api/payment/verify.js';
import reviewSubmitHandler   from './api/review/submit.js';
import gateOverrideHandler   from './api/gate/supervisor-override.js';
import espUpdateHandler      from './api/esp/update.js';

// ── Get local IP for ESP connection info ───────────────────────
function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

const PORT = 3000;

// ── Route map: [method, path-pattern] → handler ────────────────
const routes = [
  ['POST', /^\/api\/checkout$/,                    checkoutHandler],
  ['GET',  /^\/api\/reviews$/,                     reviewsHandler],
  ['GET',  /^\/api\/events$/,                      eventsHandler],
  ['POST', /^\/api\/payment\/verify$/,             paymentVerifyHandler],
  ['POST', /^\/api\/review\/submit$/,              reviewSubmitHandler],
  ['POST', /^\/api\/gate\/supervisor-override$/,   gateOverrideHandler],
  ['POST', /^\/api\/esp\/update$/,                 espUpdateHandler],
  ['GET',  /^\/api\/esp\/update$/,                 espUpdateHandler],  // ping
];

// ── Dynamic trolley route ───────────────────────────────────────
async function handleTrolleyRoute(req, res, trolleyId) {
  const { default: handler } = await import('./api/trolley/[trolleyId].js');
  req.query = { trolleyId };
  return handler(req, res);
}

// ── Build a req/res shim compatible with our handlers ──────────
function buildReqRes(req, body, parsedUrl) {
  // Attach query params
  req.query = Object.fromEntries(parsedUrl.searchParams.entries());

  // Parse body
  try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }

  // Build response shim
  const resHeaders = {};
  let statusCode = 200;

  const res = {
    statusCode,
    _sent: false,
    _raw: null,

    status(code)         { statusCode = code; return res; },
    set(k, v)            { resHeaders[k] = v; return res; },
    setHeader(k, v)      { resHeaders[k] = v; },
    getHeader(k)         { return resHeaders[k]; },
    // SSE write (raw)
    write: null,         // filled in per-request
    // Regular JSON send
    json(data) {
      if (res._sent) return;
      res._sent = true;
      res._statusCode = statusCode;
      res._headers = { 'Content-Type': 'application/json', ...resHeaders };
      res._body = JSON.stringify(data);
    },
    end(data) {
      if (res._sent) return;
      res._sent = true;
      res._statusCode = statusCode;
      res._headers = resHeaders;
      res._body = data || '';
    },
  };

  return res;
}

async function startServer() {
  // ── Start Vite dev server ────────────────────────────────────
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  console.log('\n🛒  SmartTrolley Local Dev Server');
  console.log('──────────────────────────────────');

  const server = http.createServer(async (req, rawRes) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname  = parsedUrl.pathname;
    const method    = req.method?.toUpperCase();

    // ── CORS preflight ──────────────────────────────────────
    if (method === 'OPTIONS') {
      rawRes.writeHead(200, {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      return rawRes.end();
    }

    // ── API routes ───────────────────────────────────────────
    if (pathname.startsWith('/api/')) {
      // Read body
      let body = '';
      for await (const chunk of req) body += chunk.toString();

      // SSE — special raw streaming path
      if (pathname === '/api/events' && method === 'GET') {
        req.query = Object.fromEntries(parsedUrl.searchParams.entries());
        req.body  = {};

        const shimRes = {
          write: (chunk) => {
            if (!rawRes.headersSent) {
              rawRes.writeHead(200, {
                'Content-Type':  'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection':    'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'X-Accel-Buffering': 'no',
              });
            }
            rawRes.write(chunk);
          },
          end: () => {
            if (!rawRes.writableEnded) rawRes.end();
          },
          setHeader: (k, v) => {
            if (!rawRes.headersSent) {
              try { rawRes.setHeader(k, v); } catch {}
            }
          },
          status: (c) => {
            if (!rawRes.headersSent) rawRes.statusCode = c;
            return shimRes;
          },
          set: (k, v) => {
            if (!rawRes.headersSent) {
              if (typeof k === 'object' && k !== null) {
                Object.entries(k).forEach(([key, val]) => {
                  try { rawRes.setHeader(key, val); } catch {}
                });
              } else {
                try { rawRes.setHeader(k, v); } catch {}
              }
            }
            return shimRes;
          },
        };
        return eventsHandler(req, shimRes);
      }

      // Trolley dynamic route: /api/trolley/:trolleyId
      const trolleyMatch = pathname.match(/^\/api\/trolley\/([^/]+)$/);
      if (trolleyMatch && method === 'GET') {
        req.query = { trolleyId: decodeURIComponent(trolleyMatch[1]) };
        req.body  = {};
        const { default: handler } = await import('./api/trolley/[trolleyId].js');
        const shimRes = buildShimRes(rawRes);
        await handler(req, shimRes);
        return;
      }

      // Match static routes
      let matched = false;
      for (const [rMethod, pattern, handler] of routes) {
        if (method === rMethod && pattern.test(pathname)) {
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());
          try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
          const shimRes = buildShimRes(rawRes);
          try {
            await handler(req, shimRes);
          } catch (err) {
            console.error(`[API Error ${pathname}]:`, err);
            shimRes.status(500).json({ error: err.message || 'Internal server error' });
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        rawRes.writeHead(404, { 'Content-Type': 'application/json' });
        rawRes.end(JSON.stringify({ error: `No API handler for ${method} ${pathname}` }));
      }
      return;
    }

    // ── Frontend — delegate to Vite ──────────────────────────
    vite.middlewares(req, rawRes, () => {
      rawRes.writeHead(404);
      rawRes.end('Not found');
    });
  });

  server.listen(PORT, () => {
  const localIP = getLocalIP();
    console.log(`✅  App running at:  http://localhost:${PORT}/`);
    console.log(`🌐  Network:        http://${localIP}:${PORT}/`);
    console.log(`\n📄  Pages:`);
    console.log(`   Dashboard  → http://localhost:${PORT}/#/supervisor`);
    console.log(`   Payment    → http://localhost:${PORT}/#/pay/demo-1`);
    console.log(`   Review     → http://localhost:${PORT}/#/review/demo-1`);
    console.log(`\n📡  ESP32 Endpoint:`);
    console.log(`   POST http://${localIP}:${PORT}/api/esp/update`);
    console.log(`   GET  http://${localIP}:${PORT}/api/esp/update  (ping)`);
    console.log(`\n🔑  Password: admin123`);
    console.log(`💾  Storage:  in-memory (no database needed)`);
    console.log('\nPress Ctrl+C to stop\n');
  });
}

// ── Response shim builder ───────────────────────────────────────
function buildShimRes(rawRes) {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  let code = 200;

  const shim = {
    status(c) { code = c; return shim; },
    set(k, v) {
      if (typeof k === 'object' && k !== null) {
        Object.assign(headers, k);
      } else {
        headers[k] = v;
      }
      return shim;
    },
    setHeader(k, v) { headers[k] = v; },
    getHeader(k) { return headers[k]; },
    json(data) {
      rawRes.writeHead(code, { 'Content-Type': 'application/json', ...headers });
      rawRes.end(JSON.stringify(data));
    },
    end(data) {
      rawRes.writeHead(code, headers);
      rawRes.end(data || '');
    },
  };
  return shim;
}

startServer().catch((err) => {
  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});
