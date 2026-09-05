'use strict';

/**
 * Contact enquiry persistence.
 *
 * Supabase in production; local JSON files when it is not configured, so
 * development works offline.
 */

const fs = require('fs/promises');
const path = require('path');
const { dataDir } = require('./paths');
const { getSupabase } = require('./supabase');

const TABLE = 'enquiries';
const FILE = () => path.join(dataDir(), 'submissions.json');

let writeChain = Promise.resolve();

const asIso = (v) => (v instanceof Date ? v.toISOString() : v);

/** App record -> database row. */
function toRow(r) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    company: r.company,
    service: r.service,
    message: r.message,
    ip: r.ip,
    created_at: r.receivedAt,
  };
}

/** Database row -> app record. */
function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    service: row.service,
    message: row.message,
    ip: row.ip,
    receivedAt: asIso(row.created_at),
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
  const supabase = getSupabase();
  if (supabase) {
    const rows = await supabase.select(TABLE, 'select=*&order=created_at.desc');
    return rows.map(fromRow);
  }
  return readFromFile();
}

async function append(record) {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.insert(TABLE, toRow(record));
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
