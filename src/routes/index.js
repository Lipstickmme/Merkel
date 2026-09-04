'use strict';

/**
 * API router. Mounts feature routers under /api.
 */

const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'merkel-engineering', time: new Date().toISOString() });
});

router.use('/services', require('./services'));
router.use('/projects', require('./projects'));
router.use('/team', require('./team'));
router.use('/careers', require('./careers'));
router.use('/leadership', require('./leadership'));
router.use('/contact', require('./contact'));
router.use('/chat', require('./chat'));

module.exports = router;
