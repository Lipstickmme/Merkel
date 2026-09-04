'use strict';

/**
 * Per-session chat persistence.
 * Backend priority: Supabase -> Redis -> filesystem (local development).
 */

const fs = require('fs/promises');
const path = require('path');
const { getRedis, dataDir, parseItem } = require('./kv');
const { getSupabase } = require('./supabase');

const TABLE = 'chat_messages';
const SAFE = /^[A-Za-z0-9_-]{8,64}$/;
const CHAT_DIR = () => path.join(dataDir(), 'chat');
const keyFor = (id) => `merkel:chat:${id}`;

let chain = Promise.resolve();

function isValidId(id) {
  return typeof id === 'string' && SAFE.test(id);
}

async function loadFromFile(sessionId) {
  try {
    const raw = await fs.readFile(path.join(CHAT_DIR(), `${sessionId}.json`), 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.messages)) data.messages = [];
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return { sessionId, createdAt: new Date().toISOString(), messages: [] };
    throw err;
  }
}

async function load(sessionId) {
  const supabase = getSupabase();
  if (supabase) {
    const rows = await supabase.select(
      TABLE,
      `select=role,text,created_at&session_id=eq.${encodeURIComponent(sessionId)}&order=created_at.asc&limit=200`
    );
    return { sessionId, messages: rows.map((r) => ({ role: r.role, text: r.text, at: r.created_at })) };
  }
  const redis = getRedis();
  if (redis) {
    const items = await redis.lrange(keyFor(sessionId), 0, -1);
    return { sessionId, messages: (items || []).map(parseItem).filter(Boolean) };
  }
  return loadFromFile(sessionId);
}

async function append(sessionId, messages) {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.insert(
      TABLE,
      messages.map((m) => ({ session_id: sessionId, role: m.role, text: m.text, created_at: m.at }))
    );
    return { sessionId, messages };
  }
  const redis = getRedis();
  if (redis) {
    await redis.rpush(keyFor(sessionId), ...messages.map((m) => JSON.stringify(m)));
    await redis.ltrim(keyFor(sessionId), -200, -1);
    await redis.expire(keyFor(sessionId), 60 * 60 * 24 * 90);
    await redis.sadd('merkel:chat:sessions', sessionId);
    return { sessionId, messages };
  }
  const task = chain.then(async () => {
    await fs.mkdir(CHAT_DIR(), { recursive: true });
    const convo = await loadFromFile(sessionId);
    convo.messages.push(...messages);
    convo.updatedAt = new Date().toISOString();
    await fs.writeFile(path.join(CHAT_DIR(), `${sessionId}.json`), JSON.stringify(convo, null, 2), 'utf8');
    return convo;
  });
  chain = task.catch(() => {});
  return task;
}

module.exports = { load, append, isValidId };
