'use strict';

/**
 * Express application factory / configuration.
 * Assembles middleware, API routes, static hosting and error handling.
 */

const path = require('path');
const express = require('express');

const rateLimiter = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const apiRoutes = require('./routes');

const app = express();

// Trust proxy so client IPs are accurate behind a reverse proxy / load balancer.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Body parsing (built-in, no extra deps).
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

// Lightweight security headers (dependency-free).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Simple request logging.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[merkel] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// API namespace (rate limited).
app.use('/api', rateLimiter, apiRoutes);

// Static frontend.
const publicDir = path.join(__dirname, '..', 'public');
app.use(
  express.static(publicDir, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      // Long cache for the hero video; it never changes per-deploy.
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
    },
  })
);

// SPA-ish fallback: serve the landing page for unknown non-API GET routes.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 404 + centralized error handling.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
