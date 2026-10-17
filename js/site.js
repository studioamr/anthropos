// ANTHROPOS · encabezado, menú, pie, revelado y utilidades comunes
import { CONFIG } from './config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const fmtUSD = (n) => n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString('en-US')}`;

// El emblema: el peripatos (la columnata donde Aristóteles enseñaba caminando) bajo el sol naciente
export const EMBLEM = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true">
  <circle cx="20" cy="20" r="18.4"/><path d="M8.5 15.5h23M9.5 13.2h21"/><path d="M12 15.5v13M17.3 15.5v13M22.7 15.5v13M28 15.5v13"/>
  <path d="M8 28.8h24M7 31h26"/><path d="M14.5 13.2a5.5 5.5 0 0 1 11 0" /></svg>`;
export const WORDMARK = (h = 26) => `<svg viewBox="0 0 208 40" height="${h}" fill="currentColor" aria-label="${CONFIG.brand}">
  <g fill="none" stroke="currentColor" stroke-width="1.1">${EMBLEM.replace(/<\/?svg[^>]*>/g, '')}</g>
  <text x="50" y="22" font-family="Jost,Futura,Helvetica Neue,Arial,sans-serif" font-size="15.5" font-weight="400" letter-spacing="4.4">${CONFIG.name.toUpperCase()}</text>
  <text x="50.5" y="35.5" font-family="Jost,Futura,Helvetica Neue,Arial,sans-serif" font-size="7.4" font-weight="400" letter-spacing="5.2">CITIES</text></svg>`;

const NAV = [
  ['index.html#republic', 'The Republic', 'I'],
  ['city.html', 'The City', 'II'],
  ['concepts.html', 'City concepts', 'II·b'],
  ['panama.html', `${CONFIG.name} ${CONFIG.country}`, 'III'],
  ['embassy.html', 'Embassies', 'IV'],
  ['index.html#residences', 'Residences', 'V'],
  ['index.html#life', `Life in ${CONFIG.name}`, 'VI'],
  ['index.html#membership', 'Membership', 'VII'],
  ['index.html#development', 'Development', 'VIII'],
  ['index.html#governments', 'Governments', 'IX'],
  ['capital.html', 'Capital · The City Fund', '$'],
  ['news.html', 'Dispatches', 'X'],
  ['content.html', 'Ideas', 'XI'],
];

function header() {
  const dark = document.body.dataset.hdr === 'dark';
  const h = document.createElement('header');
  h.className = 'hdr' + (dark ? ' on-dark' : ' solid');
  h.id = 'top';
  h.innerHTML = `<button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="menu"><i></i><span>Menu</span></button>
    <a class="logo" href="index.html" aria-label="${CONFIG.name} home">${WORDMARK(24)}</a>
    <div class="acts"><a class="signin" href="join.html#signin">Sign in</a><a class="btn" href="join.html">Join ${CONFIG.name}</a></div>`;
  document.body.prepend(h);
  if (dark) {
    const on = () => h.classList.toggle('solid', scrollY > innerHeight * 0.72);
    on(); addEventListener('scroll', on, { passive: true });
  }
}

function menu() {
  const m = document.createElement('div');
  m.className = 'menu'; m.id = 'menu'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Site menu');
  m.innerHTML = `<div class="col">
      <button class="close" id="menuClose">✕ <span>Close</span></button>
      <nav>${NAV.map(([href, t, n]) => `<a href="${href}">${t}<small>${n}</small></a>`).join('')}</nav>
      <div class="ctas"><a class="btn" href="join.html">Join ${CONFIG.name}</a><a class="btn ghost" href="city.html">Commit to move</a></div>
      <p class="caption mt-24">${CONFIG.name} is a founding-stage project. Nothing on this site is an offer of securities or of real estate for sale.</p>
    </div>
    <div class="col art"><img src="img/res-aerial.jpg" alt="" loading="lazy"><div class="cap"><div class="eyebrow" style="color:rgba(255,255,255,.75)">${CONFIG.name} ${CONFIG.country} · Concept study</div><div class="h-md mt-8">Residences and resort<br>on the ${CONFIG.coast}.</div></div></div>`;
  document.body.append(m);
  const btn = $('#menuBtn');
  const set = (o) => { m.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); document.documentElement.style.overflow = o ? 'hidden' : ''; if (o) $('#menuClose').focus(); };
  btn.onclick = () => set(true);
  $('#menuClose').onclick = () => set(false);
  $$('nav a', m).forEach((a) => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
}

function footer() {
  if (document.body.dataset.footer === 'none') return;
  const f = document.createElement('footer');
  f.innerHTML = `${document.body.dataset.cta === 'none' ? '' : `<section class="cta-band"><div class="wrap"><h2 class="h-lg">Cities for human beings</h2><a class="btn" href="join.html">Join ${CONFIG.name}</a></div></section>`}
  <div class="ftr"><div class="wrap">
    <div class="row"><span style="width:30px;color:var(--ink)">${EMBLEM}</span>
      <nav>${NAV.map(([href, t]) => `<a href="${href}">${t}</a>`).join('')}</nav></div>
    <div class="legal"><span>© ${CONFIG.year} ${CONFIG.brand}. A founding-stage project. Renderings are concept studies, not offers.</span>
      <span><a href="privacy.html">Privacy</a> · <a href="privacy.html#terms">Terms</a> · <a href="mailto:${CONFIG.email}">${CONFIG.email}</a></span></div>
  </div></div>`;
  document.body.append(f);
}

function reveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach((el) => io.observe(el));
}

export function boot() {
  $$('[data-name]').forEach((el) => (el.textContent = CONFIG.name));
  $$('[data-country]').forEach((el) => (el.textContent = CONFIG.country));
  $$('[data-coast]').forEach((el) => (el.textContent = CONFIG.coast));
  header(); menu(); footer(); reveal();
}

// contador real (data/stats.json); nunca se inventa
export async function stats() {
  try {
    const r = await fetch(CONFIG.statsUrl, { cache: 'no-store' });
    if (!r.ok) throw 0;
    const s = await r.json();
    const local = JSON.parse(localStorage.getItem('lyc-commit') || 'null');
    return { committed: (s.committed || 0), demand: (s.demandUSD || 0), updated: s.updated, mine: !!local };
  } catch { return { committed: 0, demand: 0, updated: null, mine: false }; }
}

boot();
