'use strict';

/**
 * Inbound email webhook.
 *
 * Resend (or any Svix-signed provider) POSTs here when mail arrives at
 * MAILBOX_ADDRESS. Verified messages are filed onto a thread so the dashboard
 * reads them as one conversation, and optionally copied to FORWARD_TO.
 */

const { verify } = require('../utils/webhookSignature');
const notify = require('../utils/notify');
const config = require('../utils/config');
const { getSupabase } = require('../utils/supabase');

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
    inReplyTo: firstString(d.in_reply_to, d.inReplyTo, d.references),
    from: firstString(d.from, d.sender, d.From),
    to: firstString(d.to, d.recipient, d.To),
    subject: firstString(d.subject, d.Subject) || '(no subject)',
    text: firstString(d.text, d.body_plain, d.plain, d.body),
    html: firstString(d.html, d.body_html),
  };
}

/** Threads match on correspondent plus subject, so strip reply prefixes. */
function baseSubject(subject) {
  return String(subject || '')
    .replace(/^((re|fwd|fw)\s*:\s*)+/i, '')
    .trim() || '(no subject)';
}

/** File the message onto a thread, creating one if needed. Best effort. */
async function fileOnThread(supabase, email) {
  const from = config.parseAddress(email.from);
  const subject = baseSubject(email.subject);

  let threadId = null;
  const existing = await supabase.select(
    'email_threads',
    `select=id&participant_email=eq.${encodeURIComponent(from.email)}` +
      `&subject=eq.${encodeURIComponent(subject)}&limit=1`
  );
  if (Array.isArray(existing) && existing.length) {
    threadId = existing[0].id;
  } else {
    const created = await supabase.insertReturning('email_threads', {
      subject,
      participant_email: from.email,
      participant_name: from.name || null,
    });
    threadId = Array.isArray(created) && created.length ? created[0].id : null;
  }

  if (!threadId) return null;

  await supabase.insert('email_messages', {
    thread_id: threadId,
    direction: 'inbound',
    from_email: from.email,
    from_name: from.name || null,
    to_email: config.parseAddress(email.to).email || config.mailboxAddress(),
    subject: email.subject,
    body_text: email.text || null,
    body_html: email.html || null,
    message_id: email.messageId || null,
    in_reply_to: email.inReplyTo || null,
  });
  return threadId;
}

exports.resend = async (req, res, next) => {
  try {
    const secret = config.resendWebhookSecret();

    // Only accept signed requests. Without a secret the endpoint stays closed.
    const result = verify(secret, req.headers, req.rawBody);
    if (!result.ok) {
      console.warn('[merkel] inbound webhook rejected:', result.reason);
      return res.status(401).json({ error: 'invalid_signature', message: 'Webhook signature could not be verified.' });
    }

    const payload = req.body || {};
    const type = String(payload.type || payload.event || '');

    // Delivery/status events are acknowledged but need no action.
    if (type && !/received|inbound/i.test(type)) {
      return res.status(200).json({ ok: true, ignored: type });
    }

    const email = parseEmail(payload);
    const mailbox = config.mailboxAddress();
    if (mailbox && email.to && !email.to.toLowerCase().includes(config.parseAddress(mailbox).email)) {
      return res.status(200).json({ ok: true, ignored: 'not_for_mailbox' });
    }

    // Archive onto a thread (best effort; never fails the webhook).
    let threadId = null;
    const supabase = getSupabase();
    if (supabase) {
      try {
        threadId = await fileOnThread(supabase, email);
      } catch (err) {
        console.error('[merkel] failed to file inbound email:', err.message);
      }
    }

    // Optional copy to a real inbox. Never forward to one of our own
    // addresses, and never forward mail we sent: either loops the message
    // straight back into this webhook until the sending quota is gone.
    const forwardTo = config.forwardTo();
    const ours = config.ownAddresses();
    const fromAddress = config.parseAddress(email.from).email;
    let forwarded = false;

    if (forwardTo && (config.forwardWouldLoop() || ours.has(fromAddress))) {
      console.warn(
        '[merkel] not forwarding: FORWARD_TO or the sender is one of this site\'s own addresses, which would loop mail back into this webhook.'
      );
    } else if (forwardTo) {
      const body = [
        `From:    ${email.from || 'unknown'}`,
        `To:      ${email.to || mailbox || 'unknown'}`,
        `Subject: ${email.subject}`,
        '',
        email.text || '(no body)',
      ].join('\n');

      forwarded = await notify.sendEmail({
        to: forwardTo,
        subject: `Fwd: ${email.subject}`,
        text: body,
        replyTo: email.from || undefined,
      });
    }

    return res.status(200).json({ ok: true, threadId, forwarded });
  } catch (err) {
    return next(err);
  }
};
