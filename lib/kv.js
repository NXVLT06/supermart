/**
 * lib/kv.js — Smart KV helper
 * 
 * Uses Vercel KV (Redis) when env vars are set.
 * Falls back to in-memory storage for local development — NO database needed!
 */

const KV_URL   = process.env.VERCEL_KV_REST_API_URL;
const KV_TOKEN = process.env.VERCEL_KV_REST_API_TOKEN;

const USE_MEMORY = !KV_URL || !KV_TOKEN;

// ── In-Memory Store (local dev fallback) ───────────────────────
const memStore = {
  hashes: new Map(),   // key → { field: value }
  lists:  new Map(),   // key → [value, ...]
  strings: new Map(),  // key → value
};

// ── Vercel KV REST helper ──────────────────────────────────────
async function kvExec(...args) {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([args]),
  });
  if (!res.ok) throw new Error(`KV error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data[0]?.result ?? data[0];
}

// ── HSET ───────────────────────────────────────────────────────
export async function hset(key, fields) {
  if (USE_MEMORY) {
    const existing = memStore.hashes.get(key) || {};
    memStore.hashes.set(key, { ...existing, ...fields });
    return Object.keys(fields).length;
  }
  const args = ['HSET', key];
  for (const [f, v] of Object.entries(fields)) args.push(f, String(v));
  return kvExec(...args);
}

// ── HGETALL ────────────────────────────────────────────────────
export async function hgetall(key) {
  if (USE_MEMORY) {
    const data = memStore.hashes.get(key);
    return data ? { ...data } : null;
  }
  const result = await kvExec('HGETALL', key);
  if (!result || result.length === 0) return null;
  const obj = {};
  for (let i = 0; i < result.length; i += 2) obj[result[i]] = result[i + 1];
  return obj;
}

// ── HGET ───────────────────────────────────────────────────────
export async function hget(key, field) {
  if (USE_MEMORY) return memStore.hashes.get(key)?.[field] ?? null;
  return kvExec('HGET', key, field);
}

// ── LPUSH ──────────────────────────────────────────────────────
export async function lpush(key, value) {
  if (USE_MEMORY) {
    const list = memStore.lists.get(key) || [];
    list.unshift(typeof value === 'string' ? value : JSON.stringify(value));
    memStore.lists.set(key, list);
    return list.length;
  }
  return kvExec('LPUSH', key, typeof value === 'string' ? value : JSON.stringify(value));
}

// ── LRANGE ─────────────────────────────────────────────────────
export async function lrange(key, start, stop) {
  if (USE_MEMORY) {
    const list = memStore.lists.get(key) || [];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  }
  return kvExec('LRANGE', key, String(start), String(stop));
}

// ── LTRIM ──────────────────────────────────────────────────────
export async function ltrim(key, start, stop) {
  if (USE_MEMORY) {
    const list = memStore.lists.get(key) || [];
    memStore.lists.set(key, list.slice(start, stop + 1));
    return 'OK';
  }
  return kvExec('LTRIM', key, String(start), String(stop));
}

// ── SET ────────────────────────────────────────────────────────
export async function set(key, value, ttlSeconds = null) {
  if (USE_MEMORY) {
    memStore.strings.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (ttlSeconds) setTimeout(() => memStore.strings.delete(key), ttlSeconds * 1000);
    return 'OK';
  }
  if (ttlSeconds) return kvExec('SET', key, String(value), 'EX', String(ttlSeconds));
  return kvExec('SET', key, String(value));
}

// ── GET ────────────────────────────────────────────────────────
export async function get(key) {
  if (USE_MEMORY) return memStore.strings.get(key) ?? null;
  return kvExec('GET', key);
}

// ── DEL ────────────────────────────────────────────────────────
export async function del(...keys) {
  if (USE_MEMORY) {
    keys.forEach(k => {
      memStore.hashes.delete(k);
      memStore.lists.delete(k);
      memStore.strings.delete(k);
    });
    return keys.length;
  }
  return kvExec('DEL', ...keys);
}

// ── EXISTS ─────────────────────────────────────────────────────
export async function exists(key) {
  if (USE_MEMORY) return memStore.hashes.has(key) || memStore.strings.has(key) ? 1 : 0;
  const result = await kvExec('EXISTS', key);
  return result === 1;
}
