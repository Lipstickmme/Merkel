'use strict';

/**
 * Routes enquiries, chat messages and inbound mail to a human inbox.
 *
 * Channels (independent, each a no-op until configured):
 *   1. Email via Resend  ->  RESEND_API_KEY + FORM_TO (or CONTACT_NOTIFY_EMAIL)
 *   2. Webhook           ->  NOTIFY_WEBHOOK_URL (Slack, Discord, Zapier, desk)
 *
 * Delivery is best effort: failures are logged and never break the request.
 * Calls are awaited so a serverless function does not exit early.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Default recipient for site notifications. */
function defaultTo() {
  return process.env.FORM_TO || process.env.CONTACT_NOTIFY_EMAIL || '';
}

/** Verified sender identity. */
function defaultFrom() {
  return process.env.FORM_FROM || process.env.NOTIFY_FROM || 'Merkel Website <onboarding@resend.dev>';
}

/**
 * Send an email through Resend.
 * @param {{to?:string, from?:string, subject:string, text:string, replyTo?:string}} opts
 */
async function sendEmail(opts) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = opts.to || defaultTo();
  if (!apiKey || !to) return false;

  const payload = {
    from: opts.from || defaultFrom(),
    to: to.split(',').map((s) => s.trim()).filter(Boolean),
    subject: opts.subject,
    text: opts.text,
    html: `<pre style="font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(opts.text)}</pre>`,
  };
  if (opts.replyTo) payload.reply_to = opts.replyTo;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

async function notify(subject, text, data, emailOpts = {}) {
  const results = await Promise.all([
    sendEmail({ subject, text, ...emailOpts }),
    sendWebhook(subject, text, data),
  ]);
  return results.some(Boolean);
}

/** A new contact-form enquiry. Replies go straight back to the sender. */
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
  return notify(`New enquiry from ${record.name}`, lines, record, { replyTo: record.email });
}

/** A visitor message from the live chat. Set CHAT_NOTIFY=off to silence. */
function chatMessage(sessionId, text) {
  if (String(process.env.CHAT_NOTIFY || 'on').toLowerCase() === 'off') return Promise.resolve(false);
  const lines = [`Session: ${sessionId}`, '', text, '', `Received: ${new Date().toISOString()}`].join('\n');
  return notify('New live chat message', lines, { sessionId, text });
}

module.exports = { notify, sendEmail, enquiry, chatMessage, defaultTo, defaultFrom };
