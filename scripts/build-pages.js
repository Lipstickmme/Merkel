'use strict';

/**
 * Build static HTML pages from shared layout + per-page content.
 * Run with `npm run build`. Output goes to public/*.html.
 */

const fs = require('fs');
const path = require('path');
const { page } = require('../src/site/layout');
const pages = require('../src/site/pages');

const publicDir = path.join(__dirname, '..', 'public');

let count = 0;
for (const def of pages) {
  const html = page(def);
  fs.writeFileSync(path.join(publicDir, def.file), html, 'utf8');
  count += 1;
  console.log(`  built ${def.file} (${html.length} bytes)`);
}
console.log(`[build] wrote ${count} pages`);
