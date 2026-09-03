'use strict';

/* =========================================================================
   Merkel Engineering — frontend behaviour
   Data (services / projects / team) is pulled from the Express API; if the
   API is unreachable the page falls back to embedded seed data so it never
   renders empty.
   ========================================================================= */

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Fallback seed data (mirrors src/data/*.json) --------------------- */
  const FALLBACK = {
    services: [
      { code: 'S-01', title: 'Structural Engineering', summary: 'Load-path analysis, seismic detailing and high-rise frame design that let architecture reach further with less material.', capabilities: ['Finite element analysis', 'Seismic & wind design', 'Steel, concrete & timber', 'Retrofit & assessment'] },
      { code: 'S-02', title: 'Civil & Infrastructure', summary: 'Roads, bridges, drainage and site works engineered for a hundred-year horizon and a changing climate.', capabilities: ['Highway & transit', 'Stormwater & flood', 'Bridges & culverts', 'Land development'] },
      { code: 'S-03', title: 'Mechanical Systems', summary: 'HVAC, process piping and thermal systems tuned for efficiency, redundancy and quiet, reliable operation.', capabilities: ['HVAC & ventilation', 'Process & plant', 'Energy modelling', 'Commissioning'] },
      { code: 'S-04', title: 'Digital Engineering', summary: 'BIM coordination, parametric design and digital twins that keep every discipline working from one source of truth.', capabilities: ['BIM / VDC', 'Parametric design', 'Digital twins', 'Clash & 4D scheduling'] }
    ],
    projects: [
      { id: 'helix-tower', name: 'Helix Tower', sector: 'Commercial', location: 'Rotterdam, NL', year: 2025, metric: '184 m', metricLabel: 'structural height', blurb: 'A diagrid super-structure that cut steel tonnage by 22% against a conventional frame.' },
      { id: 'north-crossing', name: 'North Crossing', sector: 'Infrastructure', location: 'Aarhus, DK', year: 2024, metric: '410 m', metricLabel: 'cable-stayed span', blurb: 'A twin-pylon bridge engineered for extreme fjord wind loading and marine durability.' },
      { id: 'atlas-plant', name: 'Atlas Process Plant', sector: 'Industrial', location: 'Duisburg, DE', year: 2024, metric: '38%', metricLabel: 'energy reduction', blurb: 'Heat-recovery redesign of a continuous process line, recommissioned with zero downtime.' },
      { id: 'meridian-transit', name: 'Meridian Transit Hub', sector: 'Transit', location: 'Lyon, FR', year: 2023, metric: '60k / day', metricLabel: 'passenger capacity', blurb: 'A long-span steel canopy and below-grade concourse delivered on a live rail corridor.' }
    ],
    team: [
      { name: 'Dr. Ada Merkel', role: 'Founding Principal', discipline: 'Structural', initials: 'AM' },
      { name: 'Tomás Reyes', role: 'Director of Civil', discipline: 'Infrastructure', initials: 'TR' },
      { name: 'Lena Okafor', role: 'Head of Digital Engineering', discipline: 'BIM / VDC', initials: 'LO' },
      { name: 'Jun-seo Park', role: 'Principal, Mechanical', discipline: 'Systems', initials: 'JP' }
    ]
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  async function fetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /* ---- Nav -------------------------------------------------------------- */
  const nav = $('#nav');
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    const doc = document.documentElement;
    const pct = doc.scrollTop / (doc.scrollHeight - doc.clientHeight || 1);
    $('#progress').style.width = (pct * 100) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const toggle = $('#navtoggle');
  const links = $('#navlinks');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('#navlinks a').forEach((a) => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  /* ---- Reveal on scroll ------------------------------------------------- */
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

  /* ---- Animated counters ------------------------------------------------ */
  function runCounters() {
    const nums = $$('[data-count]');
    const animate = (el) => {
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1400; const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
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

  /* ---- Render: services ------------------------------------------------- */
  function renderServices(services) {
    const grid = $('#services-grid');
    grid.innerHTML = services.map((s, i) => `
      <article class="service">
        <div class="num">${String(i + 1).padStart(2, '0')}</div>
        <div class="code">${esc(s.code || 'S-' + (i + 1))}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.summary)}</p>
        <ul>${(s.capabilities || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </article>`).join('');
  }

  /* ---- Render: projects (with filters) ---------------------------------- */
  let allProjects = [];
  function renderProjects(list) {
    const grid = $('#projects-grid');
    grid.innerHTML = list.map((p) => `
      <article class="project">
        <div class="meta"><span class="sector">${esc(p.sector)}</span><span>${esc(p.year)}</span></div>
        <h3>${esc(p.name)}</h3>
        <div class="loc">${esc(p.location)}</div>
        <p class="blurb">${esc(p.blurb)}</p>
        <div class="metric"><b>${esc(p.metric)}</b><span>${esc(p.metricLabel)}</span></div>
      </article>`).join('');
  }
  function buildFilters(projects) {
    const sectors = ['All', ...Array.from(new Set(projects.map((p) => p.sector)))];
    const bar = $('#proj-filters');
    bar.innerHTML = sectors.map((s, i) =>
      `<button class="chip${i === 0 ? ' active' : ''}" data-sector="${esc(s)}">${esc(s)}</button>`).join('');
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      $$('.chip', bar).forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const sector = btn.dataset.sector;
      renderProjects(sector === 'All' ? allProjects : allProjects.filter((p) => p.sector === sector));
    });
  }

  /* ---- Render: team ----------------------------------------------------- */
  function renderTeam(team) {
    const grid = $('#team-grid');
    grid.innerHTML = team.map((m) => {
      const initials = m.initials || (m.name || '').split(' ').map((w) => w[0]).slice(0, 2).join('');
      return `
      <article class="member">
        <div class="avatar">${esc(initials)}</div>
        <h4>${esc(m.name)}</h4>
        <div class="role">${esc(m.role)}</div>
        <div class="disc">${esc(m.discipline)}</div>
      </article>`;
    }).join('');
  }

  /* ---- Load data -------------------------------------------------------- */
  async function loadData() {
    // Services
    try {
      const d = await fetchJSON('/api/services');
      renderServices(d.services || FALLBACK.services);
    } catch { renderServices(FALLBACK.services); }

    // Projects
    try {
      const d = await fetchJSON('/api/projects');
      allProjects = d.projects || FALLBACK.projects;
    } catch { allProjects = FALLBACK.projects; }
    buildFilters(allProjects);
    renderProjects(allProjects);

    // Team
    try {
      const d = await fetchJSON('/api/team');
      renderTeam(d.team || FALLBACK.team);
    } catch { renderTeam(FALLBACK.team); }

    observeReveals(); // re-observe freshly injected [data-reveal] containers
  }

  /* ---- Contact form ----------------------------------------------------- */
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
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
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
      if (!validate()) {
        statusEl.className = 'form-status bad';
        statusEl.textContent = 'Please correct the highlighted fields.';
        return;
      }
      const payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        service: form.service.value,
        message: form.message.value.trim(),
        website: form.website ? form.website.value : ''
      };
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.innerHTML = 'Sending…';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          form.reset();
          statusEl.className = 'form-status ok';
          statusEl.textContent = data.message || 'Thank you — your enquiry has reached our engineers.';
        } else if (res.status === 422 && data.fields) {
          Object.entries(data.fields).forEach(([k, v]) => setErr(k, v));
          statusEl.className = 'form-status bad';
          statusEl.textContent = 'Please correct the highlighted fields.';
        } else if (res.status === 429) {
          statusEl.className = 'form-status bad';
          statusEl.textContent = 'Too many attempts — please wait a moment and try again.';
        } else {
          statusEl.className = 'form-status bad';
          statusEl.textContent = data.message || 'Something went wrong. Please email studio@merkel.engineering.';
        }
      } catch {
        statusEl.className = 'form-status bad';
        statusEl.textContent = 'Network error. Please email studio@merkel.engineering.';
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  }

  /* ---- Video: reduced-motion + autoplay guard --------------------------- */
  function setupVideo() {
    const v = $('#herovideo');
    if (!v) return;
    if (reduceMotion) { try { v.pause(); v.removeAttribute('autoplay'); } catch (e) {} return; }
    const p = v.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { /* autoplay blocked — poster remains, fine */ });
    }
  }

  /* ---- Init ------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('#year').textContent = new Date().getFullYear();
    setupVideo();
    observeReveals();
    runCounters();
    setupForm();
    loadData();
  });
})();
