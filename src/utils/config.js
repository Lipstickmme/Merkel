'use strict';

/**
 * One place that resolves configuration from the environment.
 *
 * Several names are accepted for the same value because different Supabase
 * integrations inject different ones: Vercel's uses SUPABASE_URL /
 * SUPABASE_ANON_KEY / SUPABASE_SECRET_KEY, while projects set up for a Vite or
 * Next front end carry VITE_ and NEXT_PUBLIC_ prefixes.
 *
 * The anon key is public by design: row level security is what protects the
 * data, not the secrecy of that key. The service-role key is the opposite and
 * must never leave the server.
 */

const pick = (...names) => {
  for (const n of names) {
    const v = process.env[n];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
};

const supabaseUrl = () =>
  pick('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');

const supabaseAnonKey = () =>
  pick('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

const supabaseServiceKey = () =>
  pick('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

const resendApiKey = () => pick('RESEND_API_KEY');
const resendWebhookSecret = () => pick('RESEND_WEBHOOK_SECRET');

const formTo = () => pick('FORM_TO', 'CONTACT_NOTIFY_EMAIL');
const formFrom = () => pick('FORM_FROM', 'NOTIFY_FROM') || 'Merkel Website <onboarding@resend.dev>';
const mailboxAddress = () => pick('MAILBOX_ADDRESS');
const forwardTo = () => pick('FORWARD_TO');

/** Bare address out of "Name <a@b.c>". */
function parseAddress(value) {
  const raw = String(value || '').trim();
  const angled = /<([^>]+)>/.exec(raw);
  const email = (angled ? angled[1] : raw).trim().toLowerCase();
  const name = angled ? raw.slice(0, angled.index).trim().replace(/^"|"$/g, '') : '';
  return { name, email };
}

/**
 * Every address this site sends or receives as. Forwarding to one of these
 * would loop mail back into the inbound webhook.
 */
function ownAddresses() {
  return new Set(
    [mailboxAddress(), formFrom(), formTo()]
      .map((v) => parseAddress(v).email)
      .filter(Boolean)
  );
}

/** True when FORWARD_TO points at one of our own addresses. */
function forwardWouldLoop() {
  const target = parseAddress(forwardTo()).email;
  return Boolean(target) && ownAddresses().has(target);
}

module.exports = {
  pick,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceKey,
  resendApiKey,
  resendWebhookSecret,
  formTo,
  formFrom,
  mailboxAddress,
  forwardTo,
  parseAddress,
  ownAddresses,
  forwardWouldLoop,
};
