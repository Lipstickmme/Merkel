'use strict';

const leadership = require('../data/leadership.json');
const images = require('./images');
const { contactForm } = require('./layout');

/* Reusable interior page header with an image band. */
function pageHeader({ eyebrow, title, sub, image }) {
  return `
  <header class="page-header" style="--ph-image:url('${image}')">
    <div class="page-header-media" aria-hidden="true"></div>
    <div class="wrap page-header-inner">
      <span class="eyebrow">${eyebrow}</span>
      <h1 data-reveal>${title}</h1>
      ${sub ? `<p data-reveal>${sub}</p>` : ''}
    </div>
  </header>`;
}

/**
 * A full-height chapter of the landing page. Each one carries its own
 * photograph over the site-wide underlay, so scrolling the page reads as
 * moving through a building rather than down a document.
 */
function chapter({ id, label, image, tone = '', inner }) {
  return `
  <section class="chapter ${tone}" id="${id}" data-chapter="${label}">
    ${image ? `<div class="chapter-media" aria-hidden="true"><img src="${image}" alt="" loading="lazy" decoding="async" /></div>
    <div class="chapter-scrim" aria-hidden="true"></div>` : ''}
    <div class="wrap chapter-inner">${inner}</div>
  </section>`;
}

/* ---------- Landing ---------- */
const ceo = leadership[0];

const heroSection = `
  <section class="hero chapter" id="top" data-chapter="Merkel">
    <div class="hero-slides" id="hero-slides" aria-hidden="true">
      ${images.heroSlides.map((src, i) => `<div class="slide${i === 0 ? ' is-active' : ''}" style="background-image:url('${src}')"></div>`).join('\n      ')}
    </div>
    <div class="hero-scrim" aria-hidden="true"></div>
    <div class="hero-inner wrap">
      <span class="eyebrow hero-tag" data-reveal>Structural &middot; Civil &middot; Mechanical &middot; Digital</span>
      <h1 data-reveal>Built to stand.</h1>
      <p class="hero-sub" data-reveal>Engineering for the buildings and infrastructure that have to last.</p>
      <div class="hero-actions" data-reveal>
        <a href="/projects" class="btn">View projects <span class="arw">&rsaquo;</span></a>
        <a href="#contact" class="btn ghost">Contact us</a>
      </div>
      <div class="hero-dots" id="hero-dots" role="tablist" aria-label="Background slides">
        ${images.heroSlides.map((src, i) => `<button class="dot${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('\n        ')}
      </div>
    </div>
    <div class="hero-readout" aria-label="Practice at a glance">
      <div class="cell"><span class="k">Founded</span><span class="v">1998</span></div>
      <div class="cell"><span class="k">Disciplines</span><span class="v">Four core</span></div>
      <div class="cell"><span class="k">Projects delivered</span><span class="v">640+</span></div>
      <div class="cell"><span class="k">Based in</span><span class="v">Rotterdam, NL</span></div>
    </div>
  </section>`;

const capabilitiesSection = chapter({
  id: 'services',
  label: 'Capabilities',
  image: images.capabilities,
  inner: `
      <div class="section-head" data-reveal>
        <span class="eyebrow">01 / Capabilities</span>
        <h2>Four disciplines, one coordinated model.</h2>
        <p>Every project runs across structure, ground, systems and data, coordinated so nothing falls into the gap between drawings.</p>
      </div>
      <div class="services-grid" id="services-grid" data-reveal></div>`,
});

const metricsSection = chapter({
  id: 'metrics',
  label: 'Practice',
  image: images.metrics,
  tone: 'is-centred',
  inner: `
      <div class="section-head centred" data-reveal>
        <span class="eyebrow">02 / The practice</span>
        <h2>Twenty seven years of load paths.</h2>
        <p>Numbers we are held to, not marketing ones.</p>
      </div>
      <div class="stats-grid" data-reveal>
        <div class="stat"><div class="num" data-count="640" data-suffix="+">0</div><div class="lbl">Projects delivered</div></div>
        <div class="stat"><div class="num" data-count="27" data-suffix="">0</div><div class="lbl">Years in practice</div></div>
        <div class="stat"><div class="num"><em data-count="22" data-suffix="%">0</em></div><div class="lbl">Average material saved</div></div>
        <div class="stat"><div class="num" data-count="14" data-suffix="">0</div><div class="lbl">Countries built in</div></div>
      </div>`,
});

const leadershipSection = chapter({
  id: 'leadership',
  label: 'Leadership',
  inner: `
      <div class="leadership">
        <div class="leadership-media" data-reveal>
          <img src="${ceo.image}" alt="Portrait of ${ceo.name}" loading="lazy" />
          <span class="leadership-badge">${ceo.role}</span>
        </div>
        <div class="leadership-body" data-reveal>
          <span class="eyebrow">03 / Leadership</span>
          <blockquote>&ldquo;${ceo.quote}&rdquo;</blockquote>
          <h3>${ceo.name}</h3>
          <p>${ceo.bio}</p>
          <a href="/careers" class="link-arrow">Join the studio <span class="arw">&rsaquo;</span></a>
        </div>
      </div>`,
});

const workSection = chapter({
  id: 'work',
  label: 'Work',
  image: images.work,
  inner: `
      <div class="section-head with-action" data-reveal>
        <div>
          <span class="eyebrow">04 / Selected work</span>
          <h2>Recent projects.</h2>
          <p>A cross-section of recent commissions across sectors.</p>
        </div>
        <a href="/projects" class="btn ghost">All projects <span class="arw">&rsaquo;</span></a>
      </div>
      <div class="cards-grid" id="featured-projects" data-reveal></div>`,
});

const contactSection = chapter({
  id: 'contact',
  label: 'Contact',
  image: images.contact,
  inner: `
      <div class="contact-grid">
        <div class="contact-info" data-reveal>
          <span class="eyebrow">05 / Start a project</span>
          <h2>Bring us the hard part.</h2>
          <p class="contact-lede">Tell us what you are building and where it gets difficult. A principal engineer will reply within two working days, and every message reaches the studio desk directly.</p>
          <div class="contact-detail">
            <div class="row"><div class="k">Studio</div><div class="val">Wijnhaven 3, 3011 WG Rotterdam, NL</div></div>
            <div class="row"><div class="k">Email</div><div class="val"><a href="mailto:studio@merkel.engineering">studio@merkel.engineering</a></div></div>
            <div class="row"><div class="k">Telephone</div><div class="val"><a href="tel:+31102400198">+31 (0)10 240 0198</a></div></div>
          </div>
        </div>
        ${contactForm('home-contact-form')}
      </div>`,
});

const indexContent = [
  '<nav class="chapter-rail" id="chapter-rail" aria-label="Page sections"></nav>',
  heroSection,
  capabilitiesSection,
  metricsSection,
  leadershipSection,
  workSection,
  contactSection,
].join('\n');

/* ---------- Projects listing ---------- */
const projectsContent = `
  ${pageHeader({ eyebrow: 'Selected work', title: 'Projects.', sub: 'Towers, bridges, industrial plant and transit, engineered to perform and built to last.', image: images.projectsHeader })}
  <section class="section-pad">
    <div class="wrap">
      <div class="proj-filters" id="proj-filters" data-reveal></div>
      <div class="cards-grid" id="projects-grid" data-reveal></div>
    </div>
  </section>`;

/* ---------- Project detail (hydrated by id) ---------- */
const projectContent = `
  <article id="project-detail" class="project-detail" data-loading="true">
    <div class="wrap project-loading">Loading project&hellip;</div>
  </article>`;

/* ---------- Careers ---------- */
const careersContent = `
  ${pageHeader({ eyebrow: 'Careers', title: 'Build things that stand.', sub: 'We are a studio of senior engineers who stay on the work. If you want your name on projects that matter, we should talk.', image: images.careersHeader })}
  <section class="section-pad">
    <div class="wrap careers-intro" data-reveal>
      <div>
        <span class="eyebrow">Life at Merkel</span>
        <h2>Engineering as a design discipline.</h2>
      </div>
      <p>We put engineers in the room from the first sketch, not the final check. That means real ownership, senior mentorship, and a seat at the table with architects and clients from day one. We work across borders on landmark structures, and we invest in the tools, from parametric design to digital twins, that let our people do their best work.</p>
    </div>
  </section>
  <section class="section-pad alt">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Open roles</span>
        <h2>Where we are hiring.</h2>
        <p>Don't see your role? Tell us where you fit and we will make the introduction.</p>
      </div>
      <div class="roles" id="roles" data-reveal></div>
    </div>
  </section>`;

/* ---------- Contact ---------- */
const contactContent = `
  ${pageHeader({ eyebrow: 'Start a project', title: 'Contact us.', sub: 'Tell us what you are building and where it gets difficult. A principal engineer will reply within two working days.', image: images.contactHeader })}
  <section class="section-pad">
    <div class="wrap contact-grid">
      <div class="contact-info" data-reveal>
        <div class="contact-detail">
          <div class="row"><div class="k">Studio</div><div class="val">Wijnhaven 3, 3011 WG Rotterdam, NL</div></div>
          <div class="row"><div class="k">Email</div><div class="val"><a href="mailto:studio@merkel.engineering">studio@merkel.engineering</a></div></div>
          <div class="row"><div class="k">Telephone</div><div class="val"><a href="tel:+31102400198">+31 (0)10 240 0198</a></div></div>
          <div class="row"><div class="k">Hours</div><div class="val">Mon&ndash;Fri, 09:00&ndash;18:00 CET</div></div>
        </div>
        <div class="contact-note">
          <p>Every enquiry lands on the studio desk, and a principal engineer picks it up. Prefer to talk now? Use the live chat in the corner.</p>
        </div>
      </div>

      ${contactForm('contact-form')}
    </div>
  </section>`;

/* ---------- Admin dashboard (staff only, no site furniture) ---------- */
const adminContent = `
  <main class="admin" id="admin">
    <section class="admin-gate" id="admin-boot">
      <div class="admin-card"><p class="admin-note">Checking access&hellip;</p></div>
    </section>

    <section class="admin-gate" id="admin-unconfigured" hidden>
      <div class="admin-card">
        <span class="eyebrow">Merkel / Studio desk</span>
        <h1>Backend not connected.</h1>
        <p class="admin-note">Set <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> on the deployment, then reload. Nothing needs rebuilding.</p>
        <p class="admin-note"><a href="/api/health">/api/health</a> lists what the server can see.</p>
        <a class="admin-back" href="/">Back to site</a>
      </div>
    </section>

    <section class="admin-gate" id="admin-login" hidden>
      <form class="admin-card" id="login-form" novalidate>
        <span class="eyebrow">Merkel / Studio desk</span>
        <h1>Staff sign in.</h1>
        <p class="admin-note" id="login-note">Enquiries, live chat and studio mail in one place.</p>
        <div class="field"><label for="login-email">Email</label><input type="email" id="login-email" name="email" autocomplete="username" required /></div>
        <div class="field"><label for="login-password">Password</label><input type="password" id="login-password" name="password" autocomplete="current-password" required /></div>
        <div class="err" id="login-error" role="alert"></div>
        <button type="submit" class="btn" id="login-btn">Sign in <span class="arw">&rsaquo;</span></button>
        <a class="admin-back" href="/">Back to site</a>
      </form>
    </section>

    <div class="admin-shell" id="admin-shell" hidden>
      <header class="admin-bar">
        <a class="admin-brand" href="/">
          <img src="/assets/brand/merkel-wordmark.png" alt="Merkel Engineering" width="1062" height="215" />
          <span>Studio desk</span>
        </a>
        <div class="admin-bar-end">
          <span class="admin-who" id="admin-who"></span>
          <button type="button" class="admin-signout" id="admin-signout">Sign out</button>
        </div>
      </header>

      <nav class="admin-tabs" id="admin-tabs" role="tablist" aria-label="Sections">
        <button type="button" class="admin-tab is-active" role="tab" data-tab="enquiries" aria-selected="true">Enquiries<span class="tally" data-tally="enquiries">0</span></button>
        <button type="button" class="admin-tab" role="tab" data-tab="chat" aria-selected="false">Live chat<span class="tally" data-tally="chat">0</span></button>
        <button type="button" class="admin-tab" role="tab" data-tab="email" aria-selected="false">Email<span class="tally" data-tally="email">0</span></button>
      </nav>

      <p class="admin-alert" id="admin-alert" role="alert" hidden></p>

      <div class="admin-body">
        <section class="admin-panel" data-panel="enquiries">
          <div class="admin-split">
            <ul class="admin-list" id="enquiry-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="enquiry-detail"><p class="admin-empty">Pick an enquiry to read it.</p></div>
          </div>
        </section>

        <section class="admin-panel" data-panel="chat" hidden>
          <div class="admin-split">
            <ul class="admin-list" id="chat-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="chat-detail"><p class="admin-empty">Pick a conversation to read and reply.</p></div>
          </div>
        </section>

        <section class="admin-panel" data-panel="email" hidden>
          <div class="admin-split">
            <ul class="admin-list" id="email-list"><li class="admin-empty">Loading&hellip;</li></ul>
            <div class="admin-detail" id="email-detail"><p class="admin-empty">Pick a thread to read it.</p></div>
          </div>
        </section>
      </div>
    </div>
  </main>`;

/* ---------- 404 ---------- */
const notFoundContent = `
  <section class="notfound">
    <div class="wrap">
      <span class="eyebrow">Error 404</span>
      <h1>Off the drawings.</h1>
      <p>The page you are looking for is not here. Let's get you back on plan.</p>
      <div class="hero-actions"><a href="/" class="btn">Back to home <span class="arw">&rsaquo;</span></a><a href="/projects" class="btn ghost">View projects</a></div>
    </div>
  </section>`;

module.exports = [
  { file: 'index.html', active: '', bodyClass: 'page-home', title: 'Merkel Engineering', description: 'Merkel Engineering is a multidisciplinary consultancy delivering structural, civil, mechanical and digital engineering for buildings and infrastructure.', content: indexContent },
  { file: 'projects.html', active: 'projects', bodyClass: 'page-projects', title: 'Projects | Merkel Engineering', description: 'Selected engineering projects: towers, bridges, industrial plant and transit.', content: projectsContent, extraScripts: ['/js/projects.js'] },
  { file: 'project.html', active: 'projects', bodyClass: 'page-project', title: 'Project | Merkel Engineering', description: 'Project detail.', content: projectContent, extraScripts: ['/js/project.js'] },
  { file: 'careers.html', active: 'careers', bodyClass: 'page-careers', title: 'Careers | Merkel Engineering', description: 'Open engineering roles at Merkel Engineering across structural, civil, mechanical and digital teams.', content: careersContent, extraScripts: ['/js/careers.js'] },
  { file: 'contact.html', active: 'contact', bodyClass: 'page-contact', title: 'Contact us | Merkel Engineering', description: 'Contact Merkel Engineering to start a project. A principal engineer replies within two working days.', content: contactContent },
  { file: 'admin.html', active: '', bodyClass: 'page-admin', bare: true, noindex: true,
    styles: ['/css/admin.css'],
    title: 'Studio desk | Merkel Engineering', description: 'Staff dashboard.',
    content: adminContent, extraScripts: ['/js/supabase-lite.js', '/js/admin.js'] },
  { file: '404.html', active: '', bodyClass: 'page-404', title: 'Page not found | Merkel Engineering', description: 'Page not found.', content: notFoundContent },
];
