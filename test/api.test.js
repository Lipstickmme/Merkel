'use strict';

const assert = require('assert');
const http = require('http');
const mock = require('./mock-supabase');

const ROOT = require('path').join(__dirname, '..');

async function req(base, method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, body: json, text };
}

async function withApp(env, fn) {
  Object.assign(process.env, env);
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(ROOT + '/src')) delete require.cache[key];
  }
  const app = require(ROOT + '/src/api-app');
  const server = await new Promise((r) => {
    const s = http.createServer(app).listen(0, '127.0.0.1', () => r(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

(async () => {
  /* ---- 1. the schema mismatch that broke chat is caught by the mock ---- */
  {
    const sb = await mock.start({});
    const base = `http://127.0.0.1:${sb.address().port}`;
    const res = await fetch(`${base}/rest/v1/chat_messages`, {
      method: 'POST',
      headers: { apikey: mock.SERVICE_KEY, Authorization: `Bearer ${mock.SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ session_id: 'sometoken', role: 'user', text: 'hi' }]),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400, 'old column names must be rejected');
    assert.match(body.message, /'role' column/);
    console.log('  ok  mock rejects the pre-fix columns:', body.message);
    sb.close();
  }

  /* ---- 2. server-side chat path writes what the schema expects ---- */
  {
    const sb = await mock.start({});
    const sbUrl = `http://127.0.0.1:${sb.address().port}`;
    await withApp(
      { SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: mock.SERVICE_KEY, SUPABASE_ANON_KEY: mock.ANON_KEY, CHAT_NOTIFY: 'off' },
      async (base) => {
        const token = 'visitortoken1234';
        const sent = await req(base, 'POST', '/api/chat/message', { sessionId: token, text: 'We need a bridge assessed.' });
        assert.strictEqual(sent.status, 201, JSON.stringify(sent.body));
        assert.strictEqual(sent.body.stored, true, 'message must persist: ' + JSON.stringify(sent.body));
        assert.strictEqual(sent.body.messages.length, 2);
        assert.strictEqual(sent.body.messages[0].text, 'We need a bridge assessed.');
        assert.strictEqual(sent.body.messages[1].role, 'agent');

        assert.strictEqual(sb.db.chat_sessions.rows.length, 1, 'one session row');
        assert.strictEqual(sb.db.chat_messages.rows.length, 2, 'visitor + agent rows');
        assert.deepStrictEqual(
          sb.db.chat_messages.rows.map((r) => r.sender),
          ['visitor', 'agent']
        );
        console.log('  ok  server path wrote sender/body rows and a parent session');

        // A second message must reuse the same session row.
        await req(base, 'POST', '/api/chat/message', { sessionId: token, text: 'Second message' });
        assert.strictEqual(sb.db.chat_sessions.rows.length, 1, 'session row is not duplicated');
        console.log('  ok  a follow-up reuses the same session');

        const history = await req(base, 'GET', `/api/chat/${token}`);
        assert.strictEqual(history.status, 200);
        assert.strictEqual(history.body.messages.length, 4);
        assert.deepStrictEqual(history.body.messages.map((m) => m.role), ['user', 'agent', 'user', 'agent']);
        assert.strictEqual(history.body.messages[0].text, 'We need a bridge assessed.');
        console.log('  ok  history reads back in order with app roles');

        // Once a human answers, the canned responder stays quiet.
        sb.db.chat_sessions.rows[0].handled_by_agent = true;
        const quiet = await req(base, 'POST', '/api/chat/message', { sessionId: token, text: 'Anyone there?' });
        assert.strictEqual(quiet.body.messages.length, 1, 'no auto-reply after handover');
        assert.strictEqual(sb.db.chat_messages.rows.length, 5, 'only the visitor row was added');
        console.log('  ok  handover silences the automatic responder');
      }
    );
    sb.close();
  }

  /* ---- 3. browser path: /api/chat/notify posts the holding reply ---- */
  {
    const sb = await mock.start({});
    const sbUrl = `http://127.0.0.1:${sb.address().port}`;
    const visitor = { id: '11111111-2222-4333-8444-555555555555' };
    const session = { id: '99999999-8888-4777-8666-555555555555', visitor_id: visitor.id, created_at: new Date().toISOString(), last_message_at: new Date().toISOString(), status: 'new', handled_by_agent: false };
    sb.db.chat_sessions.rows.push(session);
    sb.db.chat_messages.rows.push({ id: 'm1', created_at: new Date().toISOString(), session_id: session.id, sender: 'visitor', body: 'Hello' });

    await withApp(
      { SUPABASE_URL: sbUrl, SUPABASE_SERVICE_ROLE_KEY: mock.SERVICE_KEY, SUPABASE_ANON_KEY: mock.ANON_KEY, CHAT_NOTIFY: 'off' },
      async (base) => {
        const notified = await req(base, 'POST', '/api/chat/notify', { sessionId: session.id, text: 'Hello' });
        assert.strictEqual(notified.status, 202, JSON.stringify(notified.body));
        assert.strictEqual(notified.body.replied, true);
        assert.strictEqual(sb.db.chat_messages.rows.length, 2);
        assert.strictEqual(sb.db.chat_messages.rows[1].sender, 'agent');
        console.log('  ok  notify posts the holding reply into the visitor thread');

        session.handled_by_agent = true;
        const after = await req(base, 'POST', '/api/chat/notify', { sessionId: session.id, text: 'Still there?' });
        assert.strictEqual(after.body.replied, false);
        assert.strictEqual(sb.db.chat_messages.rows.length, 2, 'no bot reply once a human is on it');
        console.log('  ok  notify stays quiet after handover');

        const bad = await req(base, 'POST', '/api/chat/notify', { sessionId: 'not-a-uuid', text: 'x' });
        assert.strictEqual(bad.status, 422);
        console.log('  ok  notify rejects a malformed session id');
      }
    );
    sb.close();
  }

  /* ---- 4. the health probe sees a schema built from an older migration ---- */
  {
    const good = await mock.start({});
    // A site that is not receiving mail never runs 0002_email.sql.
    delete good.db.email_threads;
    delete good.db.email_messages;
    await withApp(
      { SUPABASE_URL: `http://127.0.0.1:${good.address().port}`, SUPABASE_SERVICE_ROLE_KEY: mock.SERVICE_KEY, SUPABASE_ANON_KEY: mock.ANON_KEY },
      async (base) => {
        const res = await req(base, 'GET', '/api/health?probe=1');
        assert.strictEqual(res.body.schema.chat_messages, 'ok');
        assert.strictEqual(res.body.schema.chat_sessions, 'ok');
        assert.match(res.body.schema.email_threads, /^optional:/);
        assert.ok(!res.body.warnings.some((w) => /did not answer/.test(w)), JSON.stringify(res.body.warnings));
        console.log('  ok  probe passes against the current migration');
      }
    );
    good.close();

    const stale = await mock.start({ drop: ['chat_sessions.handled_by_agent'] });
    await withApp(
      { SUPABASE_URL: `http://127.0.0.1:${stale.address().port}`, SUPABASE_SERVICE_ROLE_KEY: mock.SERVICE_KEY, SUPABASE_ANON_KEY: mock.ANON_KEY },
      async (base) => {
        const res = await req(base, 'GET', '/api/health?probe=1');
        assert.strictEqual(res.body.status, 'degraded');
        assert.match(res.body.schema.chat_sessions, /handled_by_agent does not exist/);
        assert.ok(res.body.warnings.some((w) => /0001_init\.sql/.test(w)));
        console.log('  ok  probe names the missing column and the file that adds it');
      }
    );
    stale.close();
  }

  /* ---- 5. contact enquiries still land ---- */
  {
    const sb = await mock.start({});
    await withApp(
      { SUPABASE_URL: `http://127.0.0.1:${sb.address().port}`, SUPABASE_SERVICE_ROLE_KEY: mock.SERVICE_KEY, SUPABASE_ANON_KEY: mock.ANON_KEY },
      async (base) => {
        const res = await req(base, 'POST', '/api/contact', {
          name: 'Ada Kolen', email: 'ada@example.com', company: 'Kolen BV', service: 'Structural',
          message: 'A 40m span over a canal, tight headroom.',
        });
        assert.strictEqual(res.status, 201, JSON.stringify(res.body));
        assert.strictEqual(sb.db.enquiries.rows.length, 1);
        assert.strictEqual(sb.db.enquiries.rows[0].email, 'ada@example.com');
        console.log('  ok  contact enquiry persisted');
      }
    );
    sb.close();
  }

  console.log('\nserver suite passed');
  process.exit(0);
})().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
