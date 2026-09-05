'use strict';

/**
 * Runtime configuration and diagnostics.
 *
 * The browser is handed its Supabase URL and anon key per request rather than
 * having them baked in at build time. Nothing needs rebuilding when they
 * change, and no secret needs a public prefix to reach the client.
 */

const config = require('../utils/config');
const { getSupabase } = require('../utils/supabase');

/**
 * `GET /api/health?probe=1` asks Postgres for one row of every column the
 * server actually reads or writes. It costs one cheap query per table and
 * catches the failure that is otherwise invisible until a visitor tries to use
 * the site: tables created from an older copy of the migration, so a column the
 * code needs is missing and every insert is rejected.
 */
const PROBES = [
  { table: 'enquiries', columns: 'id,created_at,name,email,company,service,message,ip,status' },
  { table: 'chat_sessions', columns: 'id,created_at,visitor_id,last_message_at,status,handled_by_agent' },
  { table: 'chat_messages', columns: 'id,created_at,session_id,sender,body' },
  { table: 'admins', columns: 'user_id,email' },
  // 0002_email.sql is optional: a site not receiving mail never creates these.
  { table: 'email_threads', columns: 'id,participant_email,subject,last_message_at,status', optional: true },
  { table: 'email_messages', columns: 'id,thread_id,direction,from_email,to_email,message_id', optional: true },
];

async function probeSchema() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const results = {};
  for (const { table, columns, optional } of PROBES) {
    try {
      await supabase.select(table, `select=${columns}&limit=1`);
      results[table] = 'ok';
    } catch (err) {
      results[table] = optional ? `optional: ${err.message}` : err.message;
    }
  }
  return results;
}

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
exports.health = async (req, res) => {
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

  // Opt-in: the plain health check stays a pure environment read.
  let schema;
  if (req.query.probe) {
    schema = await probeSchema();
    Object.entries(schema || {}).forEach(([table, result]) => {
      if (result !== 'ok' && !String(result).startsWith('optional:')) {
        warnings.push(`Table ${table} did not answer as expected: ${result}. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor.`);
      }
    });
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
    schema: req.query.probe ? schema || 'supabase not configured' : undefined,
    warnings,
  });
};
