'use strict';

/**
 * Contact enquiry persistence.
 * Backend priority: Neon (Postgres) -> Supabase -> Redis -> filesystem.
 */

const fs = require('fs/promises');
const path = require('path');
const { getRedis, dataDir, parseItem } = require('./kv');
const { getSupabase } = require('./supabase');
const { getSql } = require('./neon');

const TABLE = 'enquiries';
const REDIS_KEY = 'merkel:submissions';
const FILE = () => path.join(dataDir(), 'submissions.json');

let writeChain = Promise.resolve();

function toRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    company: r.company,
    service: r.service,
    message: r.message,
    ip: r.ip,
    received_at: r.receivedAt,
  };
}

function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    service: row.service,
    message: row.message,
    ip: row.ip,
    receivedAt: row.received_at instanceof Date ? row.received_at.toISOString() : row.received_at,
  };
}

async function readFromFile() {
  try {
    const raw = await fs.readFile(FILE(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readAll() {
  const sql = getSql();
  if (sql) {
    const rows = await sql`
      select id, name, email, company, service, message, ip, received_at
      from enquiries
      order by received_at desc
    `;
    return rows.map(fromRow);
  }

  const supabase = getSupabase();
  if (supabase) {
    const rows = await supabase.select(TABLE, 'select=*&order=received_at.desc');
    return rows.map(fromRow);
  }

  const redis = getRedis();
  if (redis) {
    const items = await redis.lrange(REDIS_KEY, 0, -1);
    return (items || []).map(parseItem).filter(Boolean);
  }

  return readFromFile();
}

async function append(record) {
  const sql = getSql();
  if (sql) {
    const r = toRow(record);
    await sql`
      insert into enquiries (id, name, email, company, service, message, ip, received_at)
      values (${r.id}, ${r.name}, ${r.email}, ${r.company}, ${r.service}, ${r.message}, ${r.ip}, ${r.received_at})
    `;
    return record;
  }

  const supabase = getSupabase();
  if (supabase) {
    await supabase.insert(TABLE, toRow(record));
    return record;
  }

  const redis = getRedis();
  if (redis) {
    await redis.lpush(REDIS_KEY, JSON.stringify(record));
    return record;
  }

  const task = writeChain.then(async () => {
    await fs.mkdir(dataDir(), { recursive: true });
    const all = await readFromFile();
    all.push(record);
    await fs.writeFile(FILE(), JSON.stringify(all, null, 2), 'utf8');
    return record;
  });
  writeChain = task.catch(() => {});
  return task;
}

module.exports = { readAll, append };
