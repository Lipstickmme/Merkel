'use strict';

const leadership = require('../data/leadership.json');
const images = require('../data/images.json');

/* Reusable interior page header with an image band. */
function pageHeader({ eyebrow, title, sub, image }) {
  return `
  <header class="page-header" style="--ph-image:url('${image}')">
    <div class="page-header-media" aria-hidden="true"></div>
    <div class="wrap page-header-inner">
      <span class="eyebrow">${eyebrow}</span>
      <h1>${title}</h1>
      ${sub ? `<p>${sub}</p>` : ''}
    </div>
  </header>`;
}

/* ---------- Landing ---------- */
const ceo = leadership[0];
const indexContent = `
  <section class="hero" id="top">
    <div class="hero-slides" id="hero-slides" aria-hidden="true">
      ${images.heroSlides.map((src, i) => `<div class="slide${i === 0 ? ' is-active' : ''}" style="background-image:url('${src}')"></div>`).join('\n      ')}
    </div>
    <div class="hero-scrim" aria-hidden="true"></div>
    <div class="hero-inner wrap">
      <span class="eyebrow hero-tag">Structural &middot; Civil &middot; Mechanical &middot; Digital</span>
      <h1 data-reveal>Built to stand.</h1>
      <p class="hero-sub" data-reveal>Engineering for the buildings and infrastructure that have to last.</p>
      <div class="hero-actions" data-reveal>
        <a href="/projects" class="btn">View projects <span class="arw">&rsaquo;</span></a>
        <a href="/contact" class="btn ghost">Contact us</a>
      </div>
    </div>
    <div class="hero-dots" id="hero-dots" role="tablist" aria-label="Background slides">
      ${images.heroSlides.map((src, i) => `<button class="dot${i === 0 ? ' is-active' : ''}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`).join('\n      ')}
    </div>
  </section>

  <div class="hero-readout" aria-label="Practice at a glance">
    <div class="cell"><span class="k">Founded</span><span class="v">1998</span></div>
    <div class="cell"><span class="k">Disciplines</span><span class="v">Four core</span></div>
    <div class="cell"><span class="k">Projects delivered</span><span class="v">640+</span></div>
    <div class="cell"><span class="k">Based in</span><span class="v">Rotterdam, NL</span></div>
  </div>

  <section class="section-pad" id="services">
    <div class="wrap">
      <div class="services-head">
        <div class="section-head" data-reveal>
          <span class="eyebrow">01 / Capabilities</span>
          <h2>Four disciplines, one coordinated model.</h2>
          <p>Every project runs across structure, ground, systems and data, coordinated so nothing falls into the gap between drawings.</p>
        </div>
        <div class="services-media" data-reveal aria-hidden="true">
          <img src="${images.servicesMedia}" alt="" loading="lazy" />
        </div>
      </div>
      <div class="services-grid" id="services-grid" data-reveal></div>
    </div>
  </section>

  <section class="stats" aria-label="Practice metrics">
    <div class="wrap stats-grid">
      <div class="stat"><div class="num" data-count="640" data-suffix="+">0</div><div class="lbl">Projects delivered</div></div>
      <div class="stat"><div class="num" data-count="27" data-suffix="">0</div><div class="lbl">Years in practice</div></div>
      <div class="stat"><div class="num"><em data-count="22" data-suffix="%">0</em></div><div class="lbl">Average material saved</div></div>
      <div class="stat"><div class="num" data-count="14" data-suffix="">0</div><div class="lbl">Countries built in</div></div>
    </div>
  </section>

  <section class="section-pad" id="leadership">
    <div class="wrap leadership">
      <div class="leadership-media" data-reveal>
        <img src="${ceo.image}" alt="Portrait of ${ceo.name}" loading="lazy" />
        <span class="leadership-badge">${ceo.role}</span>
      </div>
      <div class="leadership-body" data-reveal>
        <span class="eyebrow">02 / Leadership</span>
        <blockquote>&ldquo;${ceo.quote}&rdquo;</blockquote>
        <h3>${ceo.name}</h3>
        <p>${ceo.bio}</p>
        <a href="/careers" class="link-arrow">Join the studio <span class="arw">&rsaquo;</span></a>
      </div>
    </div>
  </section>

  <section class="section-pad alt" id="work">
    <div class="wrap">
      <div class="section-head with-action" data-reveal>
        <div>
          <span class="eyebrow">03 / Selected work</span>
          <h2>Recent projects.</h2>
          <p>A cross-section of recent commissions across sectors.</p>
        </div>
        <a href="/projects" class="btn ghost">All projects <span class="arw">&rsaquo;</span></a>
      </div>
      <div class="cards-grid" id="featured-projects" data-reveal></div>
    </div>
  </section>

  <section class="cta-band" id="cta">
    <div class="cta-media" aria-hidden="true"><img src="${images.ctaBand}" alt="" loading="lazy" /></div>
    <div class="wrap cta-inner" data-reveal>
      <h2>Bring us the hard part.</h2>
      <p>Tell us what you are building and where it gets difficult. A principal engineer will reply within two working days.</p>
      <a href="/contact" class="btn">Contact us <span class="arw">&rsaquo;</span></a>
    </div>
  </section>`;

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
          <p>Prefer to talk now? Use the live chat in the corner and a member of the studio will pick it up.</p>
        </div>
      </div>

      <form id="contact-form" novalidate data-reveal>
        <div class="field two">
          <div class="field"><label for="name">Name</label><input type="text" id="name" name="name" autocomplete="name" required /><div class="err" data-err="name"></div></div>
          <div class="field"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" required /><div class="err" data-err="email"></div></div>
        </div>
        <div class="field two">
          <div class="field"><label for="company">Company <span class="opt">(optional)</span></label><input type="text" id="company" name="company" autocomplete="organization" /><div class="err" data-err="company"></div></div>
          <div class="field"><label for="service">Discipline</label>
            <select id="service" name="service">
              <option value="">Select</option>
              <option>Structural</option>
              <option>Civil &amp; Infrastructure</option>
              <option>Mechanical</option>
              <option>Digital Engineering</option>
              <option>Not sure yet</option>
            </select><div class="err" data-err="service"></div>
          </div>
        </div>
        <div class="field"><label for="message">Project brief</label><textarea id="message" name="message" placeholder="What are you building, and where does it get hard?" required></textarea><div class="err" data-err="message"></div></div>
        <div class="honeypot" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off" /></label></div>
        <div class="form-status" id="form-status" role="status" aria-live="polite"></div>
        <button type="submit" class="btn" id="submit-btn">Send enquiry <span class="arw">&rsaquo;</span></button>
      </form>
    </div>
  </section>`;

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
  { file: '404.html', active: '', bodyClass: 'page-404', title: 'Page not found | Merkel Engineering', description: 'Page not found.', content: notFoundContent },
];
