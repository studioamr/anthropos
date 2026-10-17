// ANTHROPOS · portada v2 (blanca): emblema en partículas, mapa en tinta, galerías, recorrido de acción colectiva
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
$$('.blk-h, .row-h, .news, .counters, .map, .campaign, .wide, .mason, .strip, .duo, .life, .from, .mem, .split > *, .ideas, .statement > *, .steps').forEach((el) => el.classList.add('rv'));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.rv').forEach((el) => io.observe(el));
const once = (el, fn, m = '250px') => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: m }); o.observe(el); };
const countUp = (el, to, f, dur = 1800) => { if (reduce) return (el.textContent = f(to)); const t0 = performance.now(); const tk = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = f(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tk); }; requestAnimationFrame(tk); };

// ── texto animado: letras, palabras y etiquetas que se escriben solas ──
function splitWords(el, base = 0, step = 0.06) {
  let i = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return; if (/^\s+$/.test(w)) { frag.append(' '); return; }
        const o = document.createElement('span'); o.className = 'wd'; const inn = document.createElement('span'); inn.textContent = w; inn.style.setProperty('--d', `${base + i++ * step}s`); o.append(inn); frag.append(o);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el); el.classList.add('wsplit');
}
function splitChars(el, base = 0.15, step = 0.028) {
  let i = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) { const frag = document.createDocumentFragment(); [...n.textContent].forEach((c) => { if (c === ' ') { frag.append(' '); return; } const sp = document.createElement('span'); sp.className = 'ch-l'; sp.textContent = c; sp.style.setProperty('--d', `${base + i++ * step}s`); frag.append(sp); }); n.replaceWith(frag); }
    else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el);
}
function typeIn(el, speed = 0.022) { const t = el.textContent; el.textContent = ''; el.classList.add('type'); [...t].forEach((c, i) => { const s = document.createElement('span'); s.className = 'c'; s.textContent = c; s.style.setProperty('--d', `${i * speed}s`); el.append(s); }); }
const watch = (el, m = '-12%') => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); o.disconnect(); } }, { rootMargin: `0px 0px ${m} 0px` }); o.observe(el); };
// portada: el título letra por letra
const heroEl = $('.hero'); $$('.hero h1 .ln').forEach((ln, k) => splitChars(ln, 0.2 + k * 0.45));
requestAnimationFrame(() => setTimeout(() => heroEl.classList.add('go'), 60));
// títulos de sección palabra por palabra; párrafos con desenfoque; etiquetas tipo máquina
$$('.blk-h h2, .h2, .h2b, .steps h3, .finale h2, .campaign h3').forEach((h) => { splitWords(h); watch(h); });
$$('.blk .body, .feats, .credit').forEach((p) => { p.classList.add('fade'); watch(p); });
$$('.blk-h .mono.acc, .mem-r .mono.acc, .split .mono.acc, .row-h .mono').forEach((m) => { typeIn(m); watch(m); });
$$('.nc, .feats li, .row-h, .steps article').forEach((l) => { l.classList.add('line-in'); watch(l); });
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

// ── tarjeta de acero: gira sola; al reverso, la credencial de miembro ──
['#idMark'].forEach((q) => $(q) && ($(q).innerHTML = EMBLEM));
{ let r = 7; const RQ = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646; const fin = (x, y) => (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
  $('#idQr').innerHTML = Array.from({ length: 121 }, (_, i) => { const x = i % 11, y = (i / 11) | 0; const on = fin(x, y) ? !(x % 10 === 1 || y % 10 === 1) || (x === 1 && y === 1) || (x === 9 && y === 1) || (x === 1 && y === 9) : RQ() > 0.5; return `<i class="${on ? '' : 'o'}"></i>`; }).join(''); }
function spinCard(el, stage) {
  let ang = 20, target = null, rx = 0, hover = false, auto = !reduce, last = performance.now();
  const sheen = (y) => { const k = Math.cos((y * Math.PI) / 180); el.style.setProperty('--sx', `${-Math.sin((y * Math.PI) / 180) * 40}%`); el.style.setProperty('--sy', `${k * 10}%`); };
  const tick = (t) => {
    const dt = Math.min(64, t - last); last = t;
    if (target !== null) { ang += (target - ang) * 0.12; if (Math.abs(target - ang) < 0.1) { ang = target; target = null; } }
    else if (auto && !hover) ang += dt * 0.022;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ang}deg)`; sheen(ang);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  if (stage) {
    stage.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5; hover = true; rx = -y * 14; if (target === null) { const face = Math.round(ang / 180) * 180; ang += (face + x * 26 - ang) * 0.18; } });
    stage.addEventListener('pointerleave', () => { hover = false; rx = 0; });
  }
  const api = { flip: () => { auto = false; target = (Math.round(ang / 180) + 1) * 180; }, reset: () => { auto = !reduce; target = Math.round(ang / 360) * 360; rx = 0; } };
  el.addEventListener('click', api.flip);
  el.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), api.flip()));
  return api;
}
const card = spinCard($('#steel'), $('#cardStage'));
const modal = $('#cardModal');
$$('[data-c]').forEach((b) => (b.onclick = () => { const c = b.dataset.c; if (c === 'flip') card.flip(); if (c === 'reset') card.reset(); if (c === 'enlarge') { const k = $('#steel').cloneNode(true); k.id = ''; $('.slot', modal).replaceChildren(k); spinCard(k, modal); modal.classList.add('open'); } }));
$('.x', modal).onclick = () => modal.classList.remove('open'); modal.onclick = (e) => e.target === modal && modal.classList.remove('open');
addEventListener('keydown', (e) => e.key === 'Escape' && modal.classList.remove('open'));

// ── gobiernos e ideas ──
$('#govMail').href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Government partnership · Anthropos Cities')}`;
$('#ideasGrid').innerHTML = ESSAYS.filter((e) => e.home).map((e) => `<a class="idea" href="article.html?a=${e.slug}"><figure><img src="${e.cover}" alt="" loading="lazy"></figure><h3>${esc(e.title)}</h3><p>${esc(e.dek)}</p></a>`).join('');
