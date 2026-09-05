'use strict';

const assert = require('assert');
const http = require('http');
const { chromium } = require('playwright-core');
const mock = require('./mock-supabase');

const ROOT = require('path').join(__dirname, '..');

/** Poll a condition; the browser and the server settle at their own pace. */
async function until(check, what, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`timed out waiting for ${what}`);
}

(async () => {
  const sb = await mock.start({});
  const thread = {
    id: '44444444-3333-4222-8111-000000000000',
    created_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    subject: 'Tender documents for the Kade viaduct',
    participant_email: 'procurement@example.com',
    participant_name: 'Procurement',
    status: 'new',
  };
  sb.db.email_threads.rows.push(thread);
  sb.db.email_messages.rows.push({
    id: 'e1', created_at: new Date().toISOString(), thread_id: thread.id, direction: 'inbound',
    from_email: 'procurement@example.com', to_email: 'studio@merkel.engineering',
    subject: thread.subject, body_text: 'Please confirm the deadline for the tender return.',
    has_attachments: false,
  });
  const sbUrl = `http://127.0.0.1:${sb.address().port}`;
  sb.createUser('desk@merkel.engineering', 'studio-password', { admin: true });
  sb.createUser('nobody@merkel.engineering', 'outsider-password');

  process.env.SUPABASE_URL = sbUrl;
  process.env.SUPABASE_ANON_KEY = mock.ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = mock.SERVICE_KEY;
  process.env.CHAT_NOTIFY = 'off';

  const app = require(ROOT + '/src/app');
  const site = await new Promise((r) => {
    const s = http.createServer(app).listen(0, '127.0.0.1', () => r(s));
  });
  const base = `http://127.0.0.1:${site.address().port}`;

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  const log = [];
  const newPage = async (context) => {
    const page = await context.newPage();
    page.on('console', (m) => log.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) => log.push(`[netfail] ${r.url()} ${r.failure() && r.failure().errorText}`));
    page.on('response', (r) => { if (r.status() >= 400) log.push(`[http${r.status()}] ${r.url()}`); });
    return page;
  };

  try {
    /* ---------------- visitor: chat writes its own rows ---------------- */
    const visitorCtx = await browser.newContext();
    const visitor = await newPage(visitorCtx);
    await visitor.goto(`${base}/contact`, { waitUntil: 'networkidle' });

    await visitor.click('#chat-toggle');
    await visitor.fill('#chat-input', 'We need a 40m span assessed.');
    await visitor.press('#chat-input', 'Enter');

    await visitor.waitForFunction(
      () => document.querySelectorAll('#chat-log .chat-msg.agent:not(.typing)').length >= 1,
      null,
      { timeout: 10000 }
    );

    await until(() => sb.db.chat_sessions.rows.length === 1, 'the browser to open a session');
    const session = sb.db.chat_sessions.rows[0];
    assert.ok(session.visitor_id, 'session carries the anonymous auth uid');
    const visitorRows = sb.db.chat_messages.rows.filter((r) => r.sender === 'visitor');
    const agentRows = sb.db.chat_messages.rows.filter((r) => r.sender === 'agent');
    assert.strictEqual(visitorRows.length, 1, 'visitor row written by the browser');
    assert.strictEqual(visitorRows[0].body, 'We need a 40m span assessed.');
    assert.strictEqual(agentRows.length, 1, 'holding reply written by the server');
    console.log('  ok  visitor wrote their own row under an anonymous login');

    const drawn = await visitor.$$eval('#chat-log .chat-msg', (nodes) => nodes.map((n) => n.textContent));
    assert.ok(drawn.some((t) => t.includes('40m span')), 'own message shown');
    assert.ok(drawn.length >= 2, 'reply shown: ' + JSON.stringify(drawn));
    console.log('  ok  the widget shows both sides');

    /* ---------------- staff: sign in and answer ---------------- */
    const staffCtx = await browser.newContext();
    const staff = await newPage(staffCtx);
    await staff.goto(`${base}/admin`, { waitUntil: 'networkidle' });
    await staff.waitForSelector('#admin-login:not([hidden])');

    // A wrong password is reported, not swallowed.
    await staff.fill('#login-email', 'desk@merkel.engineering');
    await staff.fill('#login-password', 'wrong');
    await staff.click('#login-btn');
    await staff.waitForFunction(() => document.getElementById('login-error').textContent.length > 0);
    console.log('  ok  bad credentials are reported:', await staff.textContent('#login-error'));

    // An account that is not on the admins list gets told why.
    await staff.fill('#login-email', 'nobody@merkel.engineering');
    await staff.fill('#login-password', 'outsider-password');
    await staff.click('#login-btn');
    await staff.waitForFunction(() =>
      /not on the admin list/.test(document.getElementById('login-note').textContent)
    );
    assert.ok(await staff.isVisible('#admin-login'), 'non-admin stays on the gate');
    console.log('  ok  a non-admin account is refused with an explanation');

    // The real account gets in.
    await staff.fill('#login-email', 'desk@merkel.engineering');
    await staff.fill('#login-password', 'studio-password');
    await staff.click('#login-btn');
    await staff.waitForSelector('#admin-shell:not([hidden])', { timeout: 10000 });
    assert.strictEqual(await staff.textContent('#admin-who'), 'desk@merkel.engineering');
    console.log('  ok  admin signed in');

    await staff.click('.admin-tab[data-tab="chat"]');
    await staff.waitForSelector('#chat-list .admin-row');
    await staff.click('#chat-list .admin-row');
    await staff.waitForSelector('#chat-detail .admin-thread .admin-bubble');
    const thread = await staff.$$eval('#chat-detail .admin-bubble p', (n) => n.map((x) => x.textContent));
    assert.ok(thread.some((t) => t.includes('40m span')), 'staff sees the visitor message: ' + JSON.stringify(thread));
    console.log('  ok  staff can read the conversation');

    await staff.fill('#chat-detail .admin-reply textarea', 'Nout here. Send the site plan and we will look today.');
    await staff.click('#chat-detail .admin-reply button');
    await staff.waitForFunction(
      () => document.querySelectorAll('#chat-detail .admin-bubble.agent').length >= 2
    );
    const stored = sb.db.chat_messages.rows.filter((r) => r.sender === 'agent');
    assert.ok(stored.some((r) => r.body.includes('site plan')), 'reply written as an agent row');
    assert.strictEqual(sb.db.chat_sessions.rows[0].handled_by_agent, true, 'handover flag set');
    assert.strictEqual(sb.db.chat_sessions.rows[0].status, 'in_progress');
    console.log('  ok  staff reply is stored and marks the thread handed over');

    /* ---------------- the reply reaches the visitor ---------------- */
    await visitor.waitForFunction(
      () => Array.from(document.querySelectorAll('#chat-log .chat-msg')).some((n) => n.textContent.includes('site plan')),
      null,
      { timeout: 15000 }
    );
    console.log('  ok  the visitor sees the reply without reloading');

    // And the canned responder now stays out of it.
    const before = sb.db.chat_messages.rows.length;
    const drawnBefore = await visitor.$$eval('#chat-log .chat-msg', (n) => n.length);
    await visitor.fill('#chat-input', 'Sending it now.');
    await visitor.press('#chat-input', 'Enter');
    await visitor.waitForFunction(
      (n) => document.querySelectorAll('#chat-log .chat-msg').length > n,
      drawnBefore,
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 2000));
    assert.strictEqual(sb.db.chat_messages.rows.length, before + 1, 'no bot reply after handover');
    console.log('  ok  no automatic reply once a human is on the thread');

    /* ---------------- enquiries tab ---------------- */
    await visitor.goto(`${base}/contact`, { waitUntil: 'networkidle' });
    await visitor.fill('#contact-form-name', 'Ada Kolen');
    await visitor.fill('#contact-form-email', 'ada@example.com');
    await visitor.fill('#contact-form-message', 'A 40m span over a canal, tight headroom.');
    await visitor.click('#contact-form [data-submit]');
    await until(() => sb.db.enquiries.rows.length === 1, 'the enquiry to reach the database');

    // The same form on the landing page has to reach the same inbox.
    await visitor.goto(`${base}/`, { waitUntil: 'networkidle' });
    await visitor.fill('#home-contact-form-name', 'Joris de Roo');
    await visitor.fill('#home-contact-form-email', 'j.deroo@havenbouw.nl');
    await visitor.fill('#home-contact-form-message', 'Quay wall replacement, 320m, live berth.');
    await visitor.click('#home-contact-form [data-submit]');
    await until(() => sb.db.enquiries.rows.length === 2, 'the landing-page enquiry to reach the database');
    assert.ok(
      sb.db.enquiries.rows.some((r) => r.email === 'j.deroo@havenbouw.nl'),
      'landing page enquiry stored'
    );
    console.log('  ok  both enquiry forms write to the same inbox');

    await staff.click('.admin-tab[data-tab="enquiries"]');
    await staff.waitForFunction(
      () => document.querySelectorAll('#enquiry-list .admin-row').length === 2,
      null,
      { timeout: 15000 }
    );
    const desk = await staff.$$eval('#enquiry-list .admin-row-title', (n) => n.map((x) => x.textContent));
    assert.ok(desk.includes('Ada Kolen') && desk.includes('Joris de Roo'), JSON.stringify(desk));
    console.log('  ok  both enquiries show up on the desk:', desk.join(', '));

    await staff.click('#enquiry-list .admin-row');
    await staff.waitForSelector('#enquiry-detail .admin-message');
    await staff.selectOption('#enquiry-detail .admin-status select', 'closed');
    await staff.waitForFunction(() => document.querySelector('[data-tally="enquiries"]').textContent === '1');
    assert.strictEqual(sb.db.enquiries.rows.filter((r) => r.status === 'closed').length, 1);
    console.log('  ok  triage writes back');

    /* ---------------- email tab ---------------- */
    await staff.click('.admin-tab[data-tab="email"]');
    await staff.waitForSelector('#email-list .admin-row', { timeout: 10000 });
    await staff.click('#email-list .admin-row');
    await staff.waitForSelector('#email-detail .admin-thread .admin-bubble');
    assert.match(await staff.textContent('#email-detail .admin-bubble p'), /deadline for the tender return/);
    console.log('  ok  studio mail reads as a thread');

    /* ---------------- no unexpected console errors ---------------- */
    const expected = [/fonts\.googleapis\.com/, /grant_type=password/, /favicon/];
    const bad = log
      .filter((line) => /^\[(error|pageerror|netfail|http)/.test(line))
      .filter((line) => !expected.some((re) => re.test(line)))
      // Chromium reports a bare "Failed to load resource" alongside the
      // detailed [http*]/[netfail] entry for the same request.
      .filter((line) => !/^\[error\] Failed to load resource/.test(line));
    assert.strictEqual(bad.length, 0, 'console clean, got:\n' + bad.join('\n'));
    const detailed = log.filter((l) => /^\[(netfail|http)/.test(l));
    console.log('  ok  no unexpected page errors (allowed:', detailed.length, 'known)');

    console.log('\nbrowser suite passed');
  } catch (err) {
    console.error('\nFAILED:', err.message);
    console.error('console log:\n' + log.join('\n'));
    process.exitCode = 1;
  } finally {
    await browser.close();
    site.close();
    sb.close();
  }
  process.exit(process.exitCode || 0);
})();
