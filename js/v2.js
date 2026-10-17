// ANTHROPOS · portada v2 (blanca): emblema en partículas, mapa en tinta, galerías, recorrido de acción colectiva
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { mountView } from './cityengine.js';
import { byId } from './concepts.js';
import { DISPATCHES, ESSAYS } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const EMBLEM = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><circle cx="20" cy="20" r="18.4"/><path d="M8.5 15.5h23M9.5 13.2h21M12 15.5v13M17.3 15.5v13M22.7 15.5v13M28 15.5v13M8 28.8h24M7 31h26M14.5 13.2a5.5 5.5 0 0 1 11 0"/></svg>`;
['#navMark', '#footMark', '#cardMark'].forEach((s) => $(s) && ($(s).innerHTML = EMBLEM));

// ── nav, menú, cursor, progreso ──
const nav = $('#nav');
const onScroll = () => { nav.classList.toggle('solid', scrollY > innerHeight * 0.8); const h = document.documentElement; $('#prog').style.width = (scrollY / (h.scrollHeight - innerHeight)) * 100 + '%'; };
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const menu = $('#menu'), setM = (o) => { menu.classList.toggle('open', o); $('#menuBtn').setAttribute('aria-expanded', o); document.documentElement.style.overflow = o ? 'hidden' : ''; };
$('#menuBtn').onclick = () => setM(true); $('#menuClose').onclick = () => setM(false); $$('#menu a').forEach((a) => a.addEventListener('click', () => setM(false)));
addEventListener('keydown', (e) => e.key === 'Escape' && setM(false));
const cur = $('#cursor');
addEventListener('pointermove', (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a,button,figure,.steel,.strip')));

// ── aparición y paralaje ──
$$('.blk-h, .row-h, .news, .counters, .map, .campaign, .wide, .mason, .strip, .duo, .life, .from, .mem, .split > *, .ideas, .statement > *').forEach((el) => el.classList.add('rv'));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.rv').forEach((el) => io.observe(el));
const par = $$('.parallax img');
const parS = () => par.forEach((im) => { const r = im.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; im.style.transform = `translateY(${p * -7}%)`; });
if (!reduce) addEventListener('scroll', parS, { passive: true });
const once = (el, fn, m = '250px') => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: m }); o.observe(el); };
const countUp = (el, to, f, dur = 1800) => { if (reduce) return (el.textContent = f(to)); const t0 = performance.now(); const tk = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = f(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tk); }; requestAnimationFrame(tk); };

// ── partículas ──
const N = 9000;
let rs = 3; const R = () => ((rs = (rs * 16807) % 2147483647) - 1) / 2147483646;
const mk = (fn) => { const a = new Float32Array(N * 3); rs = 3; for (let i = 0; i < N; i++) a.set(fn(i), i * 3); return a; };
const COIN = mk((i) => { const k = i / N;
  if (k < 0.25) { const t = R() * 6.283, r = 1 + (R() - 0.5) * 0.02; return [Math.cos(t) * r, Math.sin(t) * r, (R() - 0.5) * 0.1]; }
  if (k < 0.33) { const t = R() * 6.283; return [Math.cos(t) * 0.86, Math.sin(t) * 0.86, 0.06]; }
  if (k < 0.7) { const u = R(); if (u < 0.55) { const c = [-0.42, -0.14, 0.14, 0.42][(R() * 4) | 0]; return [c + (R() - 0.5) * 0.03, -0.42 + R() * 0.62, 0.07]; } if (u < 0.75) return [(R() - 0.5) * 1.2, R() < 0.5 ? 0.24 : 0.32, 0.07]; if (u < 0.9) return [(R() - 0.5) * 1.3, R() < 0.5 ? -0.45 : -0.55, 0.07]; const t = Math.PI * R(); return [Math.cos(t) * 0.28, 0.32 + Math.sin(t) * 0.28, 0.07]; }
  const t = R() * 6.283, r = Math.sqrt(R()) * 0.84; return [Math.cos(t) * r, Math.sin(t) * r, 0.05]; });
// recorrido: miembros dispersos → agrupados en barras (preferencias) → una propuesta (cuadrícula) → la ciudad
const PEOPLE = mk(() => { const t = R() * 6.283, r = Math.pow(R(), 0.6) * 1.35; return [Math.cos(t) * r * 1.3, Math.sin(t) * r * 0.85, (R() - 0.5) * 0.6]; });
const BARS = mk((i) => { const b = i % 7, h = [0.72, 0.58, 0.47, 0.41, 0.34, 0.24, 0.16][b] * 2; return [-1.2 + b * 0.4 + (R() - 0.5) * 0.22, -0.8 + R() * h, (R() - 0.5) * 0.2]; });
const PLAN = mk((i) => { const c = i % 48, gx = (c % 8) - 3.5, gy = ((c / 8) | 0) - 2.5, e = R() < 0.6; const x = gx * 0.3 + (e ? (R() < 0.5 ? -0.12 : 0.12) * (R() < 0.5 ? 1 : (R() - 0.5) * 2) : (R() - 0.5) * 0.24), y = gy * 0.3 + (e ? (R() - 0.5) * 0.24 : (R() < 0.5 ? -0.12 : 0.12)); return [x, y, 0]; });
const CITY = mk((i) => { const k = i / N, bay = (x) => -0.62 - 0.35 * x * x;
  if (k < 0.08) { const t = R() * 6.283, r = R() < 0.5 ? 0.3 : 0.08; return [Math.cos(t) * r, 0, Math.sin(t) * r]; }
  if (k < 0.14) { const a = [0.63, 2.51, 3.93, 5.5][(R() * 4) | 0], r = R() * 1.1; return [Math.cos(a) * r, 0, Math.sin(a) * r]; }
  if (k < 0.5) { const t = R() * 6.283, l = 0.62 + 0.16 * Math.cos(4 * t + 0.6), r = Math.sqrt(R()) * l; return [Math.cos(t) * r * 1.15, R() * 0.05, Math.sin(t) * r * 0.85]; }
  if (k < 0.68) { const x = (R() * 2 - 1) * 1.45; return [x, R() * 0.02, bay(x) + 0.05 + R() * 0.18]; }
  if (k < 0.74) { const x = (R() * 2 - 1) * 1.6, o = R() * 0.5; return [x, 0, bay(x) - 0.02 - o * o]; }
  const c = [[-0.75, 1], [0.75, 1.05], [-1.35, 1.35], [1.3, 1.4]][(R() * 4) | 0], t = R() * 6.283, r = Math.sqrt(R()) * 0.32; return [c[0] + Math.cos(t) * r, 0.18 * (1 - r / 0.32), c[1] + Math.sin(t) * r * 0.7]; }).map((v) => v * 0.78);
function swarm(canvas, shapes, { ink, acc, size = 1.7, x = 0, y = 0, scale = 1, tilt = [] }) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 50); cam.position.z = 4.2;
  const pos = new Float32Array(shapes[0]), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) col.set(i % 11 === 0 ? acc : ink, i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const grp = new THREE.Group(); grp.add(new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }))); scene.add(grp);
  let st = 0, vis = false, mx = 0, my = 0, rx = tilt[0] ?? 0, ry = 0;
  const sz = () => { const w = canvas.clientWidth, h = canvas.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); const big = w > 900; grp.position.set(big ? x : 0, big ? y : y * 0.6 + 0.6, 0); grp.scale.setScalar(big ? scale : scale * 0.7); };
  new ResizeObserver(sz).observe(canvas); sz();
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) requestAnimationFrame(loop); }).observe(canvas);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  function loop(t) {
    if (!vis) return; requestAnimationFrame(loop);
    const T = shapes[st], k = reduce ? 1 : 0.055, w = t * 0.001;
    for (let i = 0; i < N * 3; i += 3) { const n = reduce ? 0 : 0.006 * Math.sin(w * 1.2 + i * 0.13); pos[i] += (T[i] + n - pos[i]) * k; pos[i + 1] += (T[i + 1] + n - pos[i + 1]) * k; pos[i + 2] += (T[i + 2] - pos[i + 2]) * k; }
    g.attributes.position.needsUpdate = true;
    rx += ((tilt[st] ?? 0) + my * 0.25 - rx) * 0.05; ry = st === 0 && shapes === HERO ? ry + (reduce ? 0 : 0.004) : ry + (mx * 0.5 - ry) * 0.05;
    grp.rotation.set(rx, ry, 0); r.render(scene, cam);
  }
  return { set: (s) => (st = s) };
}
const HERO = [COIN];
swarm($('#swarm'), HERO, { ink: [1, 1, 1], acc: [0.95, 0.82, 0.68], size: 1.6, x: 1.25, y: 0.55, scale: 0.6, tilt: [0.3] });
const story = swarm($('#swarm2'), [PEOPLE, BARS, PLAN, CITY], { ink: [0.12, 0.12, 0.11], acc: [0.61, 0.35, 0.17], size: 1.8, x: 0.75, scale: 1, tilt: [0, 0, 0.2, 1.0] });
const NAMES = ['Superintelligence for collective action', 'Aggregate preferences', 'Create proposal', 'Execute'];
const chIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const s = +e.target.dataset.state; story.set(s); $('#hudName').textContent = NAMES[s]; } }), { threshold: 0.55 });
$$('.ch').forEach((c) => chIO.observe(c));

// ── declaración cinética ──
const kin = $('#kinetic');
kin.innerHTML = kin.innerHTML.replace(/(<em>[^<]*<\/em>|[^\s<]+)/g, (w) => `<span class="w">${w}</span>`);
const words = $$('.w', kin);
const kS = () => { const r = kin.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * 0.9 - r.top) / (r.height + innerHeight * 0.3))); const n = Math.round(p * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); };
addEventListener('scroll', kS, { passive: true }); kS();

// ── noticias ──
$('#newsGrid').innerHTML = DISPATCHES.slice(0, 4).map((d) => `<a class="nc" href="article.html?a=${d.slug}"><div class="src mono"><span>${esc(d.kind)}</span><span>${esc(d.date)}</span></div><h3>${esc(d.title)}</h3><figure><img src="${d.cover}" alt="" loading="lazy"></figure></a>`).join('');

// ── la ciudad: contadores reales y mapa ──
(async () => {
  let s = { committed: 0, demandUSD: 0 };
  try { const r = await fetch(CONFIG.statsUrl, { cache: 'no-store' }); if (r.ok) s = await r.json(); } catch {}
  const usd = (n) => (n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : `$${(n / 1e6).toFixed(1)}M`);
  once($('.counters'), () => {
    if (s.committed > 0) { countUp($('#cCommit'), s.committed, (v) => Math.round(v).toLocaleString('en-US')); $('#cCommitNote').textContent = `Goal ${CONFIG.goalCommitments.toLocaleString('en-US')}`; countUp($('#cDemand'), s.demandUSD, usd); }
    else { $('#cCommit').textContent = 'Open'; $('#cCommitNote').textContent = `The founding list is open · goal ${CONFIG.goalCommitments.toLocaleString('en-US')}`; countUp($('#cDemand'), CONFIG.goalDemandUSD, usd); $('#cDemandNote').textContent = 'First goal · sum of stated budgets'; }
    setTimeout(() => { $('#cBar1').style.width = Math.max(1, (s.committed / CONFIG.goalCommitments) * 100) + '%'; $('#cBar2').style.width = Math.max(1, ((s.demandUSD || 0) / CONFIG.goalDemandUSD) * 100) + '%'; }, 300);
  }, '0px');
})();
once($('#cityMap'), () => mountView($('#cityMap'), () => byId(CONFIG.cityConcept).build(), { noWheel: true }));

// ── residencias: mosaico + tira arrastrable ──
const RES = [['res-pool', 'Main pool'], ['res-salon', 'Grand salon'], ['res-sculpture', 'Sculpture court'], ['res-spa', 'Spa'], ['res-courtyard', 'Residence courtyard'], ['res-arrival', 'Arrival court']];
$('#resMason').innerHTML = RES.map(([k, t]) => `<figure><img src="img/${k}.jpg" alt="${t}, concept" loading="lazy"><figcaption class="mono">${t}</figcaption></figure>`).join('');
const STRIP = [['res-boardwalk', 'Beach boardwalk'], ['res-canal', 'The water walk'], ['res-aerial-2', 'The academy'], ['life-rooftop', 'Rooftop'], ['life-gallery', 'Gallery'], ['life-library', 'Reading room'], ['res-spa', 'Spa'], ['hero', 'The coast']];
const strip = $('#strip');
strip.innerHTML = STRIP.map(([k, t]) => `<figure><img src="img/${k}.jpg" alt="${t}, concept" loading="lazy"><figcaption class="mono">${t}</figcaption></figure>`).join('');
let sd = null; strip.addEventListener('pointerdown', (e) => { sd = [e.clientX, strip.scrollLeft]; strip.setPointerCapture(e.pointerId); });
strip.addEventListener('pointermove', (e) => { if (sd) strip.scrollLeft = sd[1] - (e.clientX - sd[0]); }); strip.addEventListener('pointerup', () => (sd = null));

// ── vida ──
const LIFE = [['life-dinner', 'Dinners'], ['life-music', 'Music studios'], ['life-amphi', 'Concerts by the sea'], ['life-darkroom', 'Darkrooms'], ['life-dinner-2', 'Long tables'], ['life-gallery', 'Openings'], ['life-rooftop', 'Nightlife'], ['res-boardwalk', 'The beach']];
$('#lifeGrid').innerHTML = LIFE.map(([k, t]) => `<figure><img src="img/${k}.jpg" alt="${t}, concept" loading="lazy"><figcaption class="mono">${t}</figcaption></figure>`).join('');
const FROM = ['Founders', 'Engineers', 'Researchers', 'Artists', 'Musicians', 'Architects', 'Writers', 'Athletes', 'Filmmakers', 'Designers'];
$('#fromTrack').innerHTML = [...FROM, ...FROM].map((t) => `<span>${t}</span>`).join('');

// ── tarjeta de acero ──
const steel = $('#steel'); let fl = false, rx = 0, ry = 0;
const ap = () => (steel.style.transform = `rotateX(${rx}deg) rotateY(${ry + (fl ? 180 : 0)}deg)`);
$('#cardStage').addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const r = steel.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; rx = -y * 16; ry = x * 22; steel.classList.add('fast'); ap(); steel.style.setProperty('--sx', `${x * 60}%`); steel.style.setProperty('--sy', `${y * 60}%`); });
$('#cardStage').addEventListener('pointerleave', () => { rx = ry = 0; steel.classList.remove('fast'); ap(); });
const flip = () => { fl = !fl; steel.classList.remove('fast'); ap(); };
steel.onclick = flip; steel.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), flip());
const modal = $('#cardModal');
$$('[data-c]').forEach((b) => (b.onclick = () => { const c = b.dataset.c; if (c === 'flip') flip(); if (c === 'reset') { fl = false; rx = ry = 0; steel.classList.remove('fast'); ap(); } if (c === 'enlarge') { const k = steel.cloneNode(true); k.id = ''; k.style.transform = ''; let f2 = false; k.onclick = () => { f2 = !f2; k.style.transform = `rotateY(${f2 ? 180 : 0}deg)`; }; $('.slot', modal).replaceChildren(k); modal.classList.add('open'); } }));
$('.x', modal).onclick = () => modal.classList.remove('open'); modal.onclick = (e) => e.target === modal && modal.classList.remove('open');

// ── gobiernos e ideas ──
$('#govMail').href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Government partnership · Anthropos Cities')}`;
$('#ideasGrid').innerHTML = ESSAYS.filter((e) => e.home).map((e) => `<a class="idea" href="article.html?a=${e.slug}"><figure><img src="${e.cover}" alt="" loading="lazy"></figure><h3>${esc(e.title)}</h3><p>${esc(e.dek)}</p></a>`).join('');
