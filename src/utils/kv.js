'use strict';

/**
 * Returns an Upstash Redis client when one is configured, otherwise null so
 * callers fall back to filesystem storage.
 *
 * Reads whichever env pair the integration provides:
 *   - Vercel KV / Upstash via Vercel:  KV_REST_API_URL / KV_REST_API_TOKEN
 *   - Upstash direct:                  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 */

const { allows } = require('./backend');

let client;
let resolved = false;

function getRedis() {
  if (resolved) return client;
  resolved = true;

  if (!allows('redis')) {
    client = null;
    return client;
  }

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    client = null;
    return client;
  }
  try {
    const { Redis } = require('@upstash/redis');
    client = new Redis({ url, token });
    console.log('[merkel] storage: Redis (Vercel KV / Upstash)');
  } catch (err) {
    console.warn('[merkel] @upstash/redis unavailable, using filesystem storage:', err.message);
    client = null;
  }
  return client;
}

/** Where filesystem storage writes. Vercel only allows writes under /tmp. */
function dataDir() {
  const path = require('path');
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return '/tmp/merkel-data';
  return path.join(__dirname, '..', '..', 'data');
}

/** Redis values may come back as objects or JSON strings depending on version. */
function parseItem(x) {
  if (typeof x === 'string') {
    try { return JSON.parse(x); } catch (e) { return null; }
  }
  return x;
}

module.exports = { getRedis, dataDir, parseItem };
