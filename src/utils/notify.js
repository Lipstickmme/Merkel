'use strict';

/**
 * Routes enquiries and chat messages to a human inbox.
 *
 * Two independent, optional channels (both are no-ops until configured):
 *   1. Email via Resend  ->  RESEND_API_KEY + CONTACT_NOTIFY_EMAIL
 *   2. Webhook           ->  NOTIFY_WEBHOOK_URL (Slack, Discord, Zapier,
 *                            or any help-desk that accepts a JSON POST)
 *
 * Delivery is best effort: a failure is logged and never breaks the request.
 * Calls are awaited so the serverless function does not exit before the
 * outbound request completes.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function sendEmail(subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFY_EMAIL;
  if (!apiKey || !to) return false;

  const from = process.env.NOTIFY_FROM || 'Merkel Website <onboarding@resend.dev>';
  const html = `<pre style="font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), subject, text, html }),
    });
    if (!res.ok) {
      console.warn('[merkel] notify email failed:', res.status, await res.text().catch(() => ''));
    }
    return res.ok;
  } catch (err) {
    console.warn('[merkel] notify email error:', err.message);
    return false;
  }
}

async function sendWebhook(subject, text, data) {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return false;
  try {
    // `text` keeps Slack/Discord-style receivers happy; `data` carries the record.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${subject}\n\n${text}`, content: `${subject}\n\n${text}`, subject, data }),
    });
    if (!res.ok) console.warn('[merkel] notify webhook failed:', res.status);
    return res.ok;
  } catch (err) {
    console.warn('[merkel] notify webhook error:', err.message);
    return false;
  }
}

async function notify(subject, text, data) {
  const results = await Promise.all([sendEmail(subject, text), sendWebhook(subject, text, data)]);
  return results.some(Boolean);
}

/** A new contact-form enquiry. */
function enquiry(record) {
  const lines = [
    `Name:       ${record.name}`,
    `Email:      ${record.email}`,
    `Company:    ${record.company || '-'}`,
    `Discipline: ${record.service || '-'}`,
    '',
    record.message,
    '',
    `Received:   ${record.receivedAt}`,
    `Reference:  ${record.id}`,
  ].join('\n');
  return notify(`New enquiry from ${record.name}`, lines, record);
}

/** A visitor message from the live chat. Set CHAT_NOTIFY=off to silence. */
function chatMessage(sessionId, text) {
  if (String(process.env.CHAT_NOTIFY || 'on').toLowerCase() === 'off') return Promise.resolve(false);
  const lines = [`Session: ${sessionId}`, '', text, '', `Received: ${new Date().toISOString()}`].join('\n');
  return notify('New live chat message', lines, { sessionId, text });
}

module.exports = { notify, enquiry, chatMessage };
