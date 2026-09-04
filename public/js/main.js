'use strict';

/* =========================================================================
   Merkel Engineering shared frontend.
   Exposes helpers on window.MERKEL for per-page scripts, drives shared UI
   (nav, hero slideshow, reveals, counters, contact form) and hydrates the
   home page. Data comes from the Express API with seed-data fallbacks.
   ========================================================================= */

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  const FALLBACK_SERVICES = [
    { code: 'S-01', title: 'Structural Engineering', summary: 'Load-path analysis, seismic detailing and high-rise frame design that let architecture reach further with less material.', capabilities: ['Finite element analysis', 'Seismic & wind design', 'Steel, concrete & timber', 'Retrofit & assessment'] },
    { code: 'S-02', title: 'Civil & Infrastructure', summary: 'Roads, bridges, drainage and site works engineered for a hundred-year horizon and a changing climate.', capabilities: ['Highway & transit', 'Stormwater & flood', 'Bridges & culverts', 'Land development'] },
    { code: 'S-03', title: 'Mechanical Systems', summary: 'HVAC, process piping and thermal systems tuned for efficiency, redundancy and quiet, reliable operation.', capabilities: ['HVAC & ventilation', 'Process & plant', 'Energy modelling', 'Commissioning'] },
    { code: 'S-04', title: 'Digital Engineering', summary: 'BIM coordination, parametric design and digital twins that keep every discipline working from one source of truth.', capabilities: ['BIM / VDC', 'Parametric design', 'Digital twins', 'Clash & 4D scheduling'] }
  ];
  const FALLBACK_PROJECTS = [
    { id: 'helix-tower', name: 'Helix Tower', sector: 'Commercial', location: 'Rotterdam, NL', year: 2025, metric: '184 m', metricLabel: 'structural height', image: '/assets/img/proj-helix-tower.svg', blurb: 'A diagrid super-structure that cut steel tonnage by 22 percent against a conventional frame.' },
    { id: 'north-crossing', name: 'North Crossing', sector: 'Infrastructure', location: 'Aarhus, DK', year: 2024, metric: '410 m', metricLabel: 'cable-stayed span', image: '/assets/img/proj-north-crossing.svg', blurb: 'A twin-pylon bridge engineered for extreme fjord wind loading and marine durability.' },
    { id: 'atlas-plant', name: 'Atlas Process Plant', sector: 'Industrial', location: 'Duisburg, DE', year: 2024, metric: '38%', metricLabel: 'energy reduction', image: '/assets/img/proj-atlas-plant.svg', blurb: 'A heat-recovery redesign of a continuous process line, recommissioned with zero downtime.' },
    { id: 'meridian-transit', name: 'Meridian Transit Hub', sector: 'Transit', location: 'Lyon, FR', year: 2023, metric: '60k / day', metricLabel: 'passenger capacity', image: '/assets/img/proj-meridian-transit.svg', blurb: 'A long-span steel canopy and below-grade concourse delivered on a live rail corridor.' }
  ];

  function projectCard(p) {
    return `
      <a class="card" href="/projects/${esc(p.id)}">
        <div class="thumb"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" /></div>
        <div class="card-body">
          <div class="meta"><span class="sector">${esc(p.sector)}</span><span>${esc(p.year)}</span></div>
          <h3>${esc(p.name)}</h3>
          <div class="loc">${esc(p.location)}</div>
          <p>${esc(p.blurb)}</p>
          <div class="metric"><b>${esc(p.metric)}</b><span>${esc(p.metricLabel)}</span></div>
        </div>
      </a>`;
  }

  /* Reveal on scroll (idempotent; safe to re-run after injecting content) */
  function observeReveals() {
    const els = $$('[data-reveal]:not(.in)');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach((el) => io.observe(el));
  }

  window.MERKEL = { $, $$, esc, fetchJSON, reduceMotion, projectCard, observeReveals, FALLBACK_PROJECTS };

  /* Nav ------------------------------------------------------------------ */
  const nav = $('#nav');
  const progress = $('#progress');
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
    if (progress) {
      const doc = document.documentElement;
      const pct = doc.scrollTop / (doc.scrollHeight - doc.clientHeight || 1);
      progress.style.width = (pct * 100) + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('#navtoggle');
  const links = $('#navlinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('#navlinks a').forEach((a) => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* Hero slideshow ------------------------------------------------------- */
  function setupSlides() {
    const wrap = $('#hero-slides');
    if (!wrap) return;
    const slides = $$('.slide', wrap);
    const dots = $$('#hero-dots .dot');
    if (slides.length <= 1) return;
    const DURATION = 5500;
    let idx = 0, timer = null;
    const go = (n) => {
      idx = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { stop(); if (!reduceMotion) timer = setInterval(() => go(idx + 1), DURATION); };
    dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.slide)); start(); }));
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  /* Counters ------------------------------------------------------------- */
  function runCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;
    const animate = (el) => {
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1400, start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nums.forEach(animate); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  }

  /* Home hydration: services + featured projects ------------------------- */
  async function hydrateHome() {
    const svcGrid = $('#services-grid');
    if (svcGrid) {
      let services = FALLBACK_SERVICES;
      try { const d = await fetchJSON('/api/services'); services = d.services || services; } catch (e) {}
      svcGrid.innerHTML = services.map((s, i) => `
        <article class="service">
          <div class="num">${String(i + 1).padStart(2, '0')}</div>
          <div class="code">${esc(s.code || 'S-' + (i + 1))}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.summary)}</p>
          <ul>${(s.capabilities || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        </article>`).join('');
    }
    const featured = $('#featured-projects');
    if (featured) {
      let projects = FALLBACK_PROJECTS;
      try { const d = await fetchJSON('/api/projects'); projects = d.projects || projects; } catch (e) {}
      featured.innerHTML = projects.slice(0, 3).map(projectCard).join('');
    }
    observeReveals();
  }

  /* Contact form --------------------------------------------------------- */
  function setupForm() {
    const form = $('#contact-form');
    if (!form) return;
    const statusEl = $('#form-status');
    const btn = $('#submit-btn');
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const setErr = (name, msg) => {
      const errEl = form.querySelector(`[data-err="${name}"]`);
      const field = errEl ? errEl.closest('.field') : null;
      if (errEl) errEl.textContent = msg || '';
      if (field) field.classList.toggle('invalid', !!msg);
    };
    const validate = () => {
      let ok = true;
      const name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim();
      if (name.length < 2) { setErr('name', 'Please enter your name.'); ok = false; } else setErr('name', '');
      if (!EMAIL_RE.test(email)) { setErr('email', 'Enter a valid email.'); ok = false; } else setErr('email', '');
      if (message.length < 10) { setErr('message', 'A little more detail, please.'); ok = false; } else setErr('message', '');
      return ok;
    };
    ['name', 'email', 'message'].forEach((n) => {
      form[n].addEventListener('blur', validate);
      form[n].addEventListener('input', () => {
        const errEl = form.querySelector(`[data-err="${n}"]`);
        if (errEl && errEl.textContent) validate();
      });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.className = 'form-status';
      if (!validate()) { statusEl.className = 'form-status bad'; statusEl.textContent = 'Please correct the highlighted fields.'; return; }
      const payload = {
        name: form.name.value.trim(), email: form.email.value.trim(),
        company: form.company.value.trim(), service: form.service.value,
        message: form.message.value.trim(), website: form.website ? form.website.value : ''
      };
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.innerHTML = 'Sending';
      try {
        const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (res.ok) { form.reset(); statusEl.className = 'form-status ok'; statusEl.textContent = data.message || 'Thank you. Your enquiry has reached our engineers.'; }
        else if (res.status === 422 && data.fields) { Object.entries(data.fields).forEach(([k, v]) => setErr(k, v)); statusEl.className = 'form-status bad'; statusEl.textContent = 'Please correct the highlighted fields.'; }
        else if (res.status === 429) { statusEl.className = 'form-status bad'; statusEl.textContent = 'Too many attempts. Please wait a moment and try again.'; }
        else { statusEl.className = 'form-status bad'; statusEl.textContent = data.message || 'Something went wrong. Please email studio@merkel.engineering.'; }
      } catch (err) { statusEl.className = 'form-status bad'; statusEl.textContent = 'Network error. Please email studio@merkel.engineering.'; }
      finally { btn.disabled = false; btn.innerHTML = original; }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();
    setupSlides();
    runCounters();
    setupForm();
    hydrateHome();
    observeReveals();
  });
})();
