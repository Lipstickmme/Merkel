'use strict';

/**
 * Resolves the page-level image slots at build time.
 *
 * Every slot names the file it would rather have and the placeholder it uses
 * until that file exists. So adding real photography is a file drop, not a
 * code change: put merkel1 .. merkel5 into public/assets/img/ in any common
 * format and the next build picks them up.
 */

const fs = require('fs');
const path = require('path');

const data = require('../data/images.json');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
// Preference order, best format first.
const EXTENSIONS = ['.webp', '.avif', '.jpg', '.jpeg', '.png', '.svg'];
const DIRS = ['/assets/img/', '/assets/slides/'];

const found = [];

/** The first file that actually exists for any of these base names. */
function lookUp(names) {
  for (const name of names || []) {
    for (const dir of DIRS) {
      for (const ext of EXTENSIONS) {
        const url = `${dir}${name}${ext}`;
        if (fs.existsSync(path.join(PUBLIC_DIR, url))) return url;
      }
    }
  }
  return null;
}

function resolve(spec) {
  if (typeof spec === 'string') return spec;
  const hit = lookUp(spec.prefer);
  if (hit) found.push(hit);
  return hit || spec.fallback;
}

const images = {};
Object.entries(data.slots).forEach(([slot, spec]) => {
  images[slot] = resolve(spec);
});
images.heroSlides = data.heroSlides.map(resolve);

/** What the build should report: which real images were picked up, if any. */
images._resolved = found;

module.exports = images;
