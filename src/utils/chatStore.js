'use strict';

/**
 * Per-session chat persistence. Each conversation lives in
 * data/chat/<sessionId>.json. Writes are serialized per process.
 * Swap for Redis / a database when you move to multi-instance or
 * real agent hand-off.
 */

const fs = require('fs/promises');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'data', 'chat');
const SAFE = /^[A-Za-z0-9_-]{8,64}$/;

let chain = Promise.resolve();

function fileFor(sessionId) {
  return path.join(DIR, `${sessionId}.json`);
}

function isValidId(id) {
  return typeof id === 'string' && SAFE.test(id);
}

async function load(sessionId) {
  try {
    const raw = await fs.readFile(fileFor(sessionId), 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.messages)) data.messages = [];
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') return { sessionId, createdAt: new Date().toISOString(), messages: [] };
    throw err;
  }
}

async function append(sessionId, messages) {
  const task = chain.then(async () => {
    await fs.mkdir(DIR, { recursive: true });
    const convo = await load(sessionId);
    convo.messages.push(...messages);
    convo.updatedAt = new Date().toISOString();
    await fs.writeFile(fileFor(sessionId), JSON.stringify(convo, null, 2), 'utf8');
    return convo;
  });
  chain = task.catch(() => {});
  return task;
}

module.exports = { load, append, isValidId };
