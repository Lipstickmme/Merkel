'use strict';

/**
 * Contact enquiry persistence.
 * Uses Redis when configured (production / Vercel), otherwise a JSON file.
 */

const fs = require('fs/promises');
const path = require('path');
const { getRedis, dataDir, parseItem } = require('./kv');

const REDIS_KEY = 'merkel:submissions';
const FILE = () => path.join(dataDir(), 'submissions.json');

let writeChain = Promise.resolve();

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
  const redis = getRedis();
  if (redis) {
    const items = await redis.lrange(REDIS_KEY, 0, -1);
    return (items || []).map(parseItem).filter(Boolean);
  }
  return readFromFile();
}

async function append(record) {
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
