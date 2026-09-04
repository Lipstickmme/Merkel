'use strict';

/**
 * Neon (serverless Postgres) access.
 *
 * Uses Neon's HTTP driver, which issues one request per query and so avoids
 * the connection-pool exhaustion that TCP drivers hit on serverless.
 *
 * The driver only speaks to Neon hosts, so a connection string pointing
 * anywhere else is ignored and the next backend takes over. That matters
 * because other integrations (Supabase, for one) also inject POSTGRES_URL.
 *
 * Returns null when Neon is not configured or not selected.
 */

const { neon } = require('@neondatabase/serverless');
const { allows } = require('./backend');

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

/** Neon's HTTP endpoint is derived from the hostname, so it must be a Neon host. */
function isNeonHost(cs) {
  try {
    return /(^|\.)neon\.(tech|build)$/i.test(new URL(cs).hostname);
  } catch (err) {
    return false;
  }
}

function getSql() {
  if (resolved) return sql;
  resolved = true;
  sql = null;

  if (!allows('neon')) return sql;

  const cs = connectionString();
  if (!cs) return sql;

  if (!isNeonHost(cs)) {
    // A Postgres URL from some other provider. Say so once, clearly, rather
    // than handing it to a driver that cannot talk to it.
    console.warn(
      '[merkel] a Postgres connection string is set but its host is not Neon, ' +
        'so the Neon driver is skipped. Configure Supabase (SUPABASE_URL + ' +
        'SUPABASE_SERVICE_ROLE_KEY) or Redis, or set STORAGE_BACKEND explicitly.'
    );
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
