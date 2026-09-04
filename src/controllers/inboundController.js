'use strict';

/**
 * Inbound email webhook.
 *
 * Resend (and any Svix-signed provider) POSTs here when mail arrives at
 * MAILBOX_ADDRESS. Verified messages are archived and forwarded to FORWARD_TO,
 * so a mailbox on your own domain lands in a personal inbox.
 */

const { verify } = require('../utils/webhookSignature');
const notify = require('../utils/notify');
const { getSupabase } = require('../utils/supabase');
const { getSql } = require('../utils/neon');

const TABLE = 'inbound_emails';

function firstString(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length) {
      const found = v.map((x) => (typeof x === 'string' ? x : x && (x.address || x.email))).filter(Boolean);
      if (found.length) return found.join(', ');
    }
  }
  return '';
}

/** Providers differ in payload shape, so pull fields defensively. */
function parseEmail(payload) {
  const d = (payload && (payload.data || payload.email || payload)) || {};
  return {
    messageId: firstString(d.message_id, d.messageId, d.id, payload && payload.id),
    from: firstString(d.from, d.sender, d.From),
    to: firstString(d.to, d.recipient, d.To),
    subject: firstString(d.subject, d.Subject) || '(no subject)',
    text: firstString(d.text, d.body_plain, d.plain, d.body, d.html, d.body_html),
  };
}

exports.resend = async (req, res, next) => {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;

    // Only accept signed requests. Without a secret the endpoint stays closed.
    const result = verify(secret, req.headers, req.rawBody);
    if (!result.ok) {
      console.warn('[merkel] inbound webhook rejected:', result.reason);
      return res.status(401).json({ error: 'invalid_signature', message: 'Webhook signature could not be verified.' });
    }

    const payload = req.body || {};
    const type = String(payload.type || payload.event || '');

    // Delivery/status events are acknowledged but need no action.
    if (type && !/received|inbound|delivered\.inbound/i.test(type)) {
      return res.status(200).json({ ok: true, ignored: type });
    }

    const email = parseEmail(payload);
    const mailbox = process.env.MAILBOX_ADDRESS;
    if (mailbox && email.to && !email.to.toLowerCase().includes(mailbox.toLowerCase())) {
      return res.status(200).json({ ok: true, ignored: 'not_for_mailbox' });
    }

    // Archive (best effort). Neon first, then Supabase.
    const receivedAt = new Date().toISOString();
    try {
      const sql = getSql();
      if (sql) {
        await sql`
          insert into inbound_emails (message_id, from_address, to_address, subject, body, received_at)
          values (${email.messageId || null}, ${email.from || null}, ${email.to || null},
                  ${email.subject}, ${email.text}, ${receivedAt})
        `;
      } else {
        const supabase = getSupabase();
        if (supabase) {
          await supabase.insert(TABLE, {
            message_id: email.messageId || null,
            from_address: email.from || null,
            to_address: email.to || null,
            subject: email.subject,
            body: email.text,
            received_at: receivedAt,
          });
        }
      }
    } catch (err) {
      console.error('[merkel] failed to archive inbound email:', err.message);
    }

    // Forward to a real inbox.
    const forwardTo = process.env.FORWARD_TO || notify.defaultTo();
    if (forwardTo) {
      const body = [
        `From:    ${email.from || 'unknown'}`,
        `To:      ${email.to || mailbox || 'unknown'}`,
        `Subject: ${email.subject}`,
        '',
        email.text || '(no body)',
      ].join('\n');

      await notify.sendEmail({
        to: forwardTo,
        subject: `Fwd: ${email.subject}`,
        text: body,
        replyTo: email.from || undefined,
      });
    }

    return res.status(200).json({ ok: true, forwarded: Boolean(forwardTo) });
  } catch (err) {
    return next(err);
  }
};
