// ANTHROPOS · página principal
import { CONFIG } from './config.js';
import { $, $$, esc, fmtUSD, EMBLEM, stats } from './site.js';
import { DISPATCHES, ESSAYS } from './content.js';
import { mountDemo } from './demo.js';
import { mountCity } from './city3d.js';
import { flag } from './flag.js';

// ── despachos (los nuestros; nada de prensa inventada) ──
const ng = $('#newsGrid');
if (ng) ng.innerHTML = DISPATCHES.slice(0, 4).map((d) => `<a class="news-card" href="article.html?a=${d.slug}">
  <div class="src">${esc(d.kind)}</div><div class="dt">${esc(d.date)}</div><h3>${esc(d.title)}</h3></a>`).join('');

// ── contador real ──
export async function paintStats() {
  const s = await stats();
  const c = $('#statCommitted'), d = $('#statDemand');
  if (!c) return;
  const pct = Math.min(100, (s.committed / CONFIG.goalCommitments) * 100);
  if (s.committed > 0) {
    c.textContent = s.committed.toLocaleString('en-US');
    $('#statCommittedNote').textContent = `of ${CONFIG.goalCommitments.toLocaleString('en-US')} · first goal`;
    d.textContent = fmtUSD(s.demand);
  } else {
    c.textContent = 'Open';
    $('#statCommittedNote').textContent = `The founding list is open. First goal: ${CONFIG.goalCommitments.toLocaleString('en-US')} commitments.`;
    d.textContent = fmtUSD(CONFIG.goalDemandUSD);
    $('#statDemandNote').textContent = 'First goal. Demand is the sum of stated budgets.';
  }
  [c, d].forEach((el) => { const b = document.createElement('div'); b.className = 'bar'; b.innerHTML = '<i></i>'; el.parentElement.append(b); });
  requestAnimationFrame(() => setTimeout(() => {
    $$('.stat .bar i')[0].style.width = Math.max(pct, 0.6) + '%';
    $$('.stat .bar i')[1].style.width = Math.max(Math.min(100, (s.demand / CONFIG.goalDemandUSD) * 100), 0.6) + '%';
  }, 400));
  if (s.mine) $('#statCommittedNote').textContent += ' You have committed.';
}
paintStats();

// ── ciudad 3D ──
if ($('#city3d')) mountCity($('#city3d'));

// ── residencias ──
const RES = [
  ['res-pool', 'Main pool'], ['res-sculpture', 'Sculpture court'], ['res-salon', 'Grand salon'], ['res-spa', 'Spa'],
  ['res-courtyard', 'Residence courtyard'], ['res-boardwalk', 'Beach boardwalk'], ['res-canal', 'The water walk'],
];
const rm = $('#resMosaic');
if (rm) rm.innerHTML = RES.map(([k, t]) => `<figure><div class="img zoom"><img src="img/${k}.jpg" alt="${t}, concept study" loading="lazy"></div><figcaption>${t}</figcaption></figure>`).join('');

// ── demo de gobierno ──
if ($('#demo')) mountDemo($('#demo'));

// ── vida ──
const LIFE = [['life-music', 'Music studios'], ['life-gallery', 'Galleries'], ['life-dinner', 'Dinners'], ['life-darkroom', 'Darkrooms'], ['life-library', 'The reading room'], ['life-rooftop', 'Nightlife']];
const lg = $('#lifeGrid');
if (lg) lg.innerHTML = LIFE.map(([k, t]) => `<figure><div class="img zoom"><img src="img/${k}.jpg" alt="${t}, concept image" loading="lazy"></div><figcaption>${t}</figcaption></figure>`).join('');
const fs = $('#forStrip');
if (fs) fs.innerHTML = ['Founders', 'Engineers', 'Researchers', 'Artists', 'Musicians', 'Architects', 'Writers', 'Athletes', 'Filmmakers', 'Designers'].map((t) => `<span>${t}</span>`).join('');

// ── tarjeta de acero ──
const steel = $('#steel');
if (steel) {
  $$('.em', steel).forEach((e) => (e.innerHTML = EMBLEM));
  let flipped = false, rx = 0, ry = 0;
  const apply = () => (steel.style.transform = `rotateX(${rx}deg) rotateY(${ry + (flipped ? 180 : 0)}deg)`);
  const stage = $('#cardStage');
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = steel.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    rx = -y * 16; ry = x * 22; steel.classList.add('fast'); apply();
    steel.style.setProperty('--sx', `${x * 60}%`); steel.style.setProperty('--sy', `${y * 60}%`);
  });
  stage.addEventListener('pointerleave', () => { rx = ry = 0; steel.classList.remove('fast'); apply(); });
  const flip = () => { flipped = !flipped; steel.classList.remove('fast'); apply(); };
  steel.addEventListener('click', flip);
  steel.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), flip()));
  const modal = $('#cardModal');
  $$('[data-c]').forEach((b) => (b.onclick = () => {
    const c = b.dataset.c;
    if (c === 'flip') flip();
    if (c === 'reset') { flipped = false; rx = ry = 0; steel.classList.remove('fast'); apply(); }
    if (c === 'enlarge') {
      const clone = steel.cloneNode(true); clone.id = ''; clone.style.transform = '';
      let f2 = false; clone.onclick = () => { f2 = !f2; clone.style.transform = `rotateY(${f2 ? 180 : 0}deg)`; };
      $('.slot', modal).replaceChildren(clone); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    }
  }));
  const close = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); };
  $('.x', modal).onclick = close; modal.addEventListener('click', (e) => e.target === modal && close());
  addEventListener('keydown', (e) => e.key === 'Escape' && close());
}

// ── gobiernos ──
const gm = $('#govMail');
if (gm) gm.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Government partnership · ' + CONFIG.name)}`;

// ── ideas ──
const ig = $('#ideasGrid');
if (ig) ig.innerHTML = ESSAYS.filter((e) => e.home).map((e) => `<a class="idea" href="article.html?a=${e.slug}"><div class="img zoom"><img src="${e.cover}" alt="" loading="lazy"></div><h3>${esc(e.title)}</h3><p>${esc(e.dek)}</p></a>`).join('');

// ── bandera y bruma ──
if ($('#flag')) flag($('#flag'));
const hz = $('#haze');
if (hz && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const g = hz.getContext('2d'); let W, H; const P = [];
  const size = () => { W = hz.width = hz.offsetWidth; H = hz.height = hz.offsetHeight; };
  size(); addEventListener('resize', size);
  for (let i = 0; i < 7; i++) P.push({ x: Math.random(), y: 0.35 + Math.random() * 0.4, r: 0.25 + Math.random() * 0.35, v: 0.00004 + Math.random() * 0.00008 });
  const loop = () => {
    g.clearRect(0, 0, W, H);
    for (const p of P) {
      p.x += p.v; if (p.x > 1.4) p.x = -0.4;
      const R = p.r * W, gr = g.createRadialGradient(p.x * W, p.y * H, 0, p.x * W, p.y * H, R);
      gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(p.x * W, p.y * H, R, R * 0.28, 0, 0, 6.283); g.fill();
    }
    requestAnimationFrame(loop);
  };
  loop();
}
