'use strict';

/**
 * Neon (serverless Postgres) access.
 *
 * Uses Neon's HTTP driver, which issues one request per query and so avoids
 * the connection-pool exhaustion that TCP drivers hit on serverless platforms.
 *
 * Returns null when no connection string is configured, so callers fall back
 * to another storage backend. Vercel's Neon integration injects DATABASE_URL;
 * the other names are accepted for convenience.
 */

const { neon } = require('@neondatabase/serverless');

let sql;
let resolved = false;

function connectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''
  );
}

function getSql() {
  if (resolved) return sql;
  resolved = true;

  const cs = connectionString();
  if (!cs) {
    sql = null;
    return sql;
  }

  try {
    sql = neon(cs);
    console.log('[merkel] storage: Neon (Postgres)');
  } catch (err) {
    console.error('[merkel] could not initialise Neon:', err.message);
    sql = null;
  }
  return sql;
}

module.exports = { getSql };
