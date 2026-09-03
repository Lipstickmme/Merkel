'use strict';

/**
 * Tiny JSON-file persistence for contact submissions.
 * Writes are serialized to avoid interleaving; the file is created lazily.
 * Swap this module for a real database (Postgres/Mongo) without touching
 * the controller layer.
 */

const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'submissions.json');

let writeChain = Promise.resolve();

async function readAll() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function append(record) {
  // Serialize writes through a promise chain (single-instance safe).
  const task = writeChain.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const all = await readAll();
    all.push(record);
    await fs.writeFile(FILE, JSON.stringify(all, null, 2), 'utf8');
    return record;
  });
  // Keep the chain alive even if this write fails.
  writeChain = task.catch(() => {});
  return task;
}

module.exports = { readAll, append, FILE };
