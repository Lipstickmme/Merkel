'use strict';

/**
 * Runtime configuration and diagnostics.
 *
 * The browser is handed its Supabase URL and anon key per request rather than
 * having them baked in at build time. Nothing needs rebuilding when they
 * change, and no secret needs a public prefix to reach the client.
 */

const config = require('../utils/config');

/** GET /api/public-config: what the browser needs to talk to Supabase. */
exports.publicConfig = (req, res) => {
  const url = config.supabaseUrl();
  const anonKey = config.supabaseAnonKey();

  // Short cache: this changes rarely, but a stale key should not outlive a
  // rotation for long.
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    supabaseUrl: url,
    supabaseAnonKey: anonKey,
    // The widget degrades to the server-side chat when this is false.
    chatEnabled: Boolean(url && anonKey),
  });
};

/**
 * GET /api/health: which variables the running server can actually see.
 * Values are never returned, only whether they are set, plus warnings for
 * combinations that are configured but wrong.
 */
exports.health = (req, res) => {
  const url = config.supabaseUrl();
  const anon = config.supabaseAnonKey();
  const service = config.supabaseServiceKey();
  const resend = config.resendApiKey();
  const webhook = config.resendWebhookSecret();
  const to = config.formTo();
  const mailbox = config.mailboxAddress();
  const forward = config.forwardTo();

  const warnings = [];

  if (url && !service) {
    warnings.push(
      'SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is not. Enquiries cannot be written; the server falls back to local files, which do not persist on Vercel.'
    );
  }
  if (url && service && !anon) {
    warnings.push(
      'SUPABASE_ANON_KEY is not set, so the browser cannot open a chat session. The chat widget falls back to the server-side responder.'
    );
  }
  if (resend && !to) {
    warnings.push('RESEND_API_KEY is set but FORM_TO is not, so notifications have nowhere to go.');
  }
  if (to && !resend) {
    warnings.push('FORM_TO is set but RESEND_API_KEY is not, so no email is sent.');
  }
  if (mailbox && !webhook) {
    warnings.push(
      'MAILBOX_ADDRESS is set but RESEND_WEBHOOK_SECRET is not. The inbound endpoint refuses every request rather than trusting unsigned posts.'
    );
  }
  if (config.forwardWouldLoop()) {
    warnings.push(
      "FORWARD_TO is one of this site's own addresses. Forwarding would loop mail back into the inbound webhook until the sending quota is gone. Set it to a mailbox on another domain, or leave it unset."
    );
  }

  res.json({
    status: warnings.length ? 'degraded' : 'ok',
    service: 'merkel-engineering',
    time: new Date().toISOString(),
    config: {
      supabaseUrl: Boolean(url),
      supabaseAnonKey: Boolean(anon),
      supabaseServiceRoleKey: Boolean(service),
      resendApiKey: Boolean(resend),
      resendWebhookSecret: Boolean(webhook),
      formTo: Boolean(to),
      formFrom: Boolean(config.formFrom()),
      mailboxAddress: Boolean(mailbox),
      forwardTo: Boolean(forward),
    },
    storage: url && service ? 'supabase' : 'filesystem',
    warnings,
  });
};
