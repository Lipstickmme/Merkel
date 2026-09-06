'use strict';

const crypto = require('crypto');
const storage = require('../utils/storage');
const notify = require('../utils/notify');
const roles = require('../data/careers.json');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(str, max) {
  return String(str == null ? '' : str).trim().slice(0, max);
}

/**
 * POST /api/applications
 *
 * The apply link on /careers lands here. Same contract as the contact form:
 * validated, rate limited, persisted, and raised with the studio by email or
 * webhook, with persistence and notification both best effort so neither can
 * lose the other.
 */
exports.create = async (req, res, next) => {
  try {
    const name = clean(req.body.name, 120);
    const email = clean(req.body.email, 200);
    const phone = clean(req.body.phone, 60);
    const roleId = clean(req.body.roleId, 80);
    const portfolio = clean(req.body.portfolio, 400);
    const experience = clean(req.body.experience, 40);
    const message = clean(req.body.message, 4000);

    const errors = {};
    if (name.length < 2) errors.name = 'Please enter your name.';
    if (!EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';
    if (message.length < 20) errors.message = 'Tell us a little about the work you have done (20+ characters).';

    // The role is optional: a speculative application is still an application.
    const role = roles.find((r) => r.id === roleId);
    if (roleId && !role) errors.roleId = 'That role is no longer open.';

    if (Object.keys(errors).length) {
      return res.status(422).json({ error: 'validation_error', fields: errors });
    }

    const trap = clean(req.body.website, 200);

    const record = {
      id: crypto.randomUUID(),
      name,
      email,
      phone: phone || null,
      roleId: role ? role.id : null,
      roleTitle: role ? role.title : 'Speculative application',
      portfolio: portfolio || null,
      experience: experience || null,
      message,
      receivedAt: new Date().toISOString(),
      ip: req.ip || null,
    };

    if (!trap) {
      try {
        await storage.applications.append(record);
      } catch (err) {
        console.error('[merkel] failed to persist application:', err.message);
      }
      await notify.application(record);
    }

    return res.status(201).json({
      ok: true,
      id: record.id,
      message: 'Thank you. Your application is with the studio and we will come back to you.',
    });
  } catch (err) {
    return next(err);
  }
};
