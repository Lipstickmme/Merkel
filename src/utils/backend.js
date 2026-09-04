'use strict';

/**
 * Which storage backend a module is allowed to claim.
 *
 * By default the first configured backend wins, in this order:
 *   neon -> supabase -> redis -> filesystem
 *
 * Set STORAGE_BACKEND to force one (neon | supabase | redis | file). That
 * matters when more than one database is connected to the same project, for
 * example a Neon DATABASE_URL alongside a Supabase integration.
 */

function selected() {
  return String(process.env.STORAGE_BACKEND || '').trim().toLowerCase();
}

/** True when `name` is allowed to run given any explicit override. */
function allows(name) {
  const choice = selected();
  if (!choice || choice === 'auto') return true;
  return choice === name;
}

module.exports = { allows, selected };
