// ANTHROPOS · The City Fund — partículas, mapa en tinta oscuro, presupuesto, rondas, estructura, suministro e hitos
import * as THREE from 'three';
import { mountView } from './cityengine.js';
import { byId } from './concepts.js';
import { submit, toast } from './forms.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
const fmtM = (m) => (m >= 1000 ? `$${(m / 1000).toFixed(m % 1000 ? 2 : 0)}B` : `$${m}M`);
const EMBLEM = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><circle cx="20" cy="20" r="18.4"/><path d="M8.5 15.5h23M9.5 13.2h21M12 15.5v13M17.3 15.5v13M22.7 15.5v13M28 15.5v13M8 28.8h24M7 31h26M14.5 13.2a5.5 5.5 0 0 1 11 0"/></svg>`;
['#navMark', '#footMark'].forEach((s) => $(s) && ($(s).innerHTML = EMBLEM));

// ── cursor, progreso y aparición ──
const cur = $('#cursor');
addEventListener('pointermove', (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a,button,.t,.node,#donut path,.alloc li,.strip')));
addEventListener('scroll', () => { const h = document.documentElement; $('#prog').style.width = (scrollY / (h.scrollHeight - innerHeight)) * 100 + '%'; }, { passive: true });
$$('.blk-h, .proj, .strip, .bill, .rounds, .total, .struct, .flows, .supply, .vest, .ms, .nots, .int').forEach((el) => el.classList.add('rv'));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.rv').forEach((el) => io.observe(el));
const once = (el, fn, margin = '200px') => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: margin }); o.observe(el); };
const countUp = (el, to, dur = 1800, f = (v) => Math.round(v).toLocaleString('en-US')) => { if (reduce) { el.textContent = f(to); return; } const t0 = performance.now(); const tick = (t) => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4); el.textContent = f(to * k); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };

// ── enjambre de partículas: una moneda que se vuelve ciudad ──
const N = 11000;
let rs = 9; const R = () => ((rs = (rs * 16807) % 2147483647) - 1) / 2147483646;
function shapes() {
  const S = {}, mk = (fn) => { const a = new Float32Array(N * 3); rs = 9; for (let i = 0; i < N; i++) { const p = fn(i); a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; } return a; };
  // 0 · moneda con el emblema
  S.coin = mk((i) => {
    const k = i / N;
    if (k < 0.22) { const t = R() * 6.283, r = 1 + (R() - 0.5) * 0.02, z = (R() - 0.5) * 0.12; return [Math.cos(t) * r, Math.sin(t) * r, z]; }
    if (k < 0.32) { const t = R() * 6.283, r = 0.86; return [Math.cos(t) * r, Math.sin(t) * r, 0.06]; }
    if (k < 0.62) { // columnas, dintel, base y arco
      const u = R(); if (u < 0.55) { const c = [-0.42, -0.14, 0.14, 0.42][(R() * 4) | 0]; return [c + (R() - 0.5) * 0.03, -0.42 + R() * 0.62, 0.07]; }
      if (u < 0.75) { const y = R() < 0.5 ? 0.24 : 0.32; return [(R() - 0.5) * 1.2, y, 0.07]; }
      if (u < 0.9) { const y = R() < 0.5 ? -0.45 : -0.55; return [(R() - 0.5) * 1.3, y, 0.07]; }
      const t = Math.PI * R(); return [Math.cos(t) * 0.28, 0.32 + Math.sin(t) * 0.28, 0.07]; }
    const t = R() * 6.283, r = Math.sqrt(R()) * 0.84; return [Math.cos(t) * r, Math.sin(t) * r, 0.05 + (R() - 0.5) * 0.02]; });
  // 1 · diez millones de piezas: una cuadrícula de monedas
  S.split = mk((i) => { const c = i % 100, gx = (c % 10) - 4.5, gy = ((c / 10) | 0) - 4.5, t = R() * 6.283, r = R() < 0.6 ? 0.075 : Math.sqrt(R()) * 0.07; return [gx * 0.2 + Math.cos(t) * r, gy * 0.2 + Math.sin(t) * r, (R() - 0.5) * 0.02 + Math.sin(gx + gy) * 0.05]; });
  // 2 · la empresa: un cubo
  S.cube = mk(() => { const e = R() < 0.7, s = 0.62; if (e) { const ax = (R() * 3) | 0, a = [(R() < 0.5 ? -1 : 1) * s, (R() < 0.5 ? -1 : 1) * s, (R() < 0.5 ? -1 : 1) * s]; a[ax] = (R() * 2 - 1) * s; return a; } const f = (R() * 3) | 0, a = [(R() * 2 - 1) * s, (R() * 2 - 1) * s, (R() * 2 - 1) * s]; a[f] = (R() < 0.5 ? -1 : 1) * s; return a; });
  // 3 · el fideicomiso: el cubo dentro de una esfera
  S.trust = mk((i) => { if (i % 3 === 0) { const s = 0.36, ax = (R() * 3) | 0, a = [(R() < 0.5 ? -1 : 1) * s, (R() < 0.5 ? -1 : 1) * s, (R() < 0.5 ? -1 : 1) * s]; a[ax] = (R() * 2 - 1) * s; return a; } const u = R() * 2 - 1, t = R() * 6.283, r = Math.sqrt(1 - u * u) * 1.02; return [Math.cos(t) * r, u * 1.02, Math.sin(t) * r]; });
  // 4 · la tierra: curvas de nivel
  S.land = mk(() => { const x = (R() * 2 - 1) * 1.5, z = (R() * 2 - 1) * 1.0; let h = 0.35 * Math.exp(-((x + 0.5) ** 2 + (z - 0.3) ** 2) * 3) + 0.28 * Math.exp(-((x - 0.6) ** 2 + (z - 0.4) ** 2) * 4) + 0.08 * Math.sin(x * 4) * Math.cos(z * 3); h = Math.round(h * 26) / 26; return [x, h - 0.3, z]; });
  // 5 · la ciudad: anillo, X, trébol, playa y cerros (vista de plano inclinada)
  S.city = mk((i) => {
    const k = i / N, bay = (x) => -0.62 - 0.35 * x * x;
    if (k < 0.06) { const t = R() * 6.283, r = R() < 0.5 ? 0.3 : 0.08; return [Math.cos(t) * r, 0, Math.sin(t) * r * 1]; }
    if (k < 0.12) { const a = [Math.PI * 0.2, Math.PI * 0.8, Math.PI * 1.25, Math.PI * 1.75][(R() * 4) | 0], r = R() * 1.1; return [Math.cos(a) * r, 0, Math.sin(a) * r]; }
    if (k < 0.48) { const t = R() * 6.283, lobe = 0.62 + 0.16 * Math.cos(4 * t + 0.6), r = Math.sqrt(R()) * lobe; if (r < 0.1) return [0, 0, 0]; return [Math.cos(t) * r * 1.15, (R() * 0.04), Math.sin(t) * r * 0.85]; }
    if (k < 0.66) { const x = (R() * 2 - 1) * 1.45; return [x, R() * 0.02, bay(x) + 0.05 + R() * 0.18]; }
    if (k < 0.72) { const x = (R() * 2 - 1) * 1.6, o = R() * 0.5; return [x, 0, bay(x) - 0.02 - o * o]; }
    const c = [[-0.75, 1.0], [0.75, 1.05], [-1.35, 1.35], [1.3, 1.4]][(R() * 4) | 0], t = R() * 6.283, r = Math.sqrt(R()) * 0.32; return [c[0] + Math.cos(t) * r, 0.18 * (1 - r / 0.32) + 0.02, c[1] + Math.sin(t) * r * 0.7]; });
  // 6 · el retorno: rayos del centro hacia 64 tenedores
  S.ret = mk((i) => { const h = i % 64, a = (h / 64) * 6.283, f = R(); if (f < 0.25) { const t = R() * 6.283, r = 0.04; return [Math.cos(a) * 1.05 + Math.cos(t) * r, Math.sin(a) * 1.05 + Math.sin(t) * r, 0]; } const r = 0.12 + f * 0.9; return [Math.cos(a) * r, Math.sin(a) * r, (R() - 0.5) * 0.02]; });
  // 7 · el mercado: seis nodos verificados con arcos entre ellos
  S.market = mk((i) => { const n = i % 6, m = (n + 1 + (i % 4)) % 6, A = (n / 6) * 6.283, B = (m / 6) * 6.283, f = R(); if (f < 0.3) { const t = R() * 6.283, r = Math.sqrt(R()) * 0.12; return [Math.cos(A) * 0.8 + Math.cos(t) * r, Math.sin(A) * 0.8 + Math.sin(t) * r, 0]; } const t = R(), x = Math.cos(A) * 0.8 * (1 - t) + Math.cos(B) * 0.8 * t, y = Math.sin(A) * 0.8 * (1 - t) + Math.sin(B) * 0.8 * t, bow = Math.sin(t * Math.PI) * 0.25; return [x * (1 - bow), y * (1 - bow), Math.sin(t * Math.PI) * 0.2]; });
  for (let i = 0; i < S.city.length; i++) S.city[i] *= 0.74;
  return [S.coin, S.split, S.cube, S.trust, S.land, S.city, S.ret, S.market];
}
const SHAPES = shapes();
const ROT = [[0.35, 0], [0.5, 0], [0.55, 0.6], [0.4, 0.5], [0.95, 0.45], [1.0, 0.2], [0, 0], [0.4, 0]];
function swarm(canvas, { hero = false } = {}) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 50); cam.position.set(0, 0, 4.2);
  const pos = new Float32Array(SHAPES[0]), col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const acc = i % 13 === 0; col.set(acc ? [0.79, 0.51, 0.29] : [0.92, 0.91, 0.88], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: hero ? 2.0 : 1.8, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
  const grp = new THREE.Group(); grp.add(pts); scene.add(grp);
  let state = 0, vis = false, mx = 0, my = 0, rx = ROT[0][0], ry = 0;
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); grp.position.x = hero ? (w > 800 ? 1.05 : 0) : (w > 900 ? 0.75 : 0); grp.position.y = hero ? (w > 800 ? 0.32 : 0.5) : 0; grp.scale.setScalar(hero ? (w > 800 ? 0.8 : 0.6) : 1); };
  new ResizeObserver(size).observe(canvas); size();
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) requestAnimationFrame(loop); }).observe(canvas);
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });
  let last = 0;
  function loop(t) {
    if (!vis) return; requestAnimationFrame(loop);
    const T = SHAPES[state], k = reduce ? 1 : 0.06, w = t * 0.001;
    for (let i = 0; i < N * 3; i += 3) {
      const j = i / 3, n = reduce ? 0 : 0.006 * Math.sin(w * 1.3 + j * 0.37);
      pos[i] += (T[i] + n - pos[i]) * k; pos[i + 1] += (T[i + 1] + n - pos[i + 1]) * k; pos[i + 2] += (T[i + 2] - pos[i + 2]) * k;
    }
    g.attributes.position.needsUpdate = true;
    const [tx, spin] = ROT[state]; rx += (tx + my * 0.25 - rx) * 0.05; ry = spin ? ry + 0.0035 * spin * 2 : ry + (mx * 0.6 - ry) * 0.05;
    if (state === 0) ry += reduce ? 0 : 0.004;
    grp.rotation.set(rx, ry, 0); r.render(scene, cam); last = t;
  }
  return { set: (s) => { state = s; } };
}
const hero = swarm($('#swarm'), { hero: true });
countUp($('#bigNum'), 1e9, 2600, fmt);
const story = swarm($('#swarm2'));
const NAMES = ['THE TOKEN', 'THE PIECE', 'THE VEHICLE', 'THE TRUST', 'THE LAND', 'THE CITY', 'THE RETURN', 'THE MARKET'];
const chs = $$('.ch');
const chIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const s = +e.target.dataset.state; story.set(s); $('#hudStep').textContent = String(Math.max(1, s)).padStart(2, '0'); $('#hudName2').textContent = NAMES[s]; } }), { threshold: 0.55 });
chs.forEach((c) => chIO.observe(c));

// ── manifiesto cinético ──
const kin = $('#kinetic');
kin.innerHTML = kin.innerHTML.replace(/(<em>[^<]*<\/em>|[^\s<]+)/g, (w) => `<span class="w">${w}</span>`);
const words = $$('.w', kin);
const kinScroll = () => { const r = kin.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35))); const n = Math.round(p * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); };
addEventListener('scroll', kinScroll, { passive: true }); kinScroll();

// ── el proyecto: el mapa en tinta, versión oscura ──
once($('#projMap'), () => mountView($('#projMap'), () => byId('anthropos').build(), { theme: 'dark', noWheel: true }));
$$('.proj-stats b').forEach((b) => once(b, () => countUp(b, +b.dataset.count, 1600), '0px'));
const strip = $('#strip'); let sd = null;
strip.addEventListener('pointerdown', (e) => { sd = [e.clientX, strip.scrollLeft]; strip.setPointerCapture(e.pointerId); });
strip.addEventListener('pointermove', (e) => { if (sd) strip.scrollLeft = sd[1] - (e.clientX - sd[0]); });
strip.addEventListener('pointerup', () => (sd = null));

// ── el billón ──
const BUDGET = [
  { k: 'Phase I · residences, resort & club', m: 280, c: '1/11', r: '1/8', d: 'The first neighborhood on the water: private residences, the resort, the beach club and the studios. This is what the first residents move into.', b: ['≈ 600 homes and 60 resort keys', 'Studios, galleries, restaurants', 'Beach club and promenade'] },
  { k: 'Infrastructure', m: 260, c: '11/21', r: '1/8', d: 'Everything under and between the buildings: roads, the boulevards and the ring, water and desalination, power and solar, fiber, drainage, the marina and the pier.', b: ['Roads, ring and four boulevards', 'Water, power, solar and fiber', 'Marina, pier and seawall'] },
  { k: 'Phases II–III · homes', m: 175, c: '1/9', r: '8/14', d: 'The rest of the city: the courtyard blocks of the center and the four hills of homes, built as demand is proven.', b: ['Courtyard blocks of the center', 'Hill neighborhoods', 'Delivered in tranches'] },
  { k: 'Civic & culture', m: 120, c: '9/14', r: '8/14', d: 'The buildings that make it a city rather than a development: the rotunda, the academy, schools, a clinic, the amphitheater and the parks.', b: ['Odeon rotunda and academy', 'School and clinic', 'Five parks and the amphitheater'] },
  { k: 'Land & legal', m: 80, c: '14/18', r: '8/12', d: 'Acquisition of the land through the trust, plus the legal, regulatory and environmental work needed before a single stone is laid.', b: ['Land held in a fideicomiso', 'Permits and environmental studies', 'Securities and corporate counsel'] },
  { k: 'Reserves', m: 60, c: '18/21', r: '8/12', d: 'Contingency for cost overruns and delays, and working capital for operations before income arrives.', b: ['Cost contingency', 'Operating runway'] },
  { k: 'Master plan & design', m: 25, c: '14/21', r: '12/14', d: 'Architects, engineers and planners turning the drawing into buildable documents.', b: ['Master plan and codes', 'Architecture and engineering'] },
];
const tree = $('#tree');
tree.innerHTML = BUDGET.map((x, i) => `<button class="t" role="listitem" data-i="${i}" style="grid-column:${x.c};grid-row:${x.r}"><span class="n">${x.k}</span><span class="v">${fmtM(x.m)}</span><i class="fill"></i></button>`).join('');
const showB = (i) => { const x = BUDGET[i]; $$('.t', tree).forEach((t, j) => t.classList.toggle('on', j === i)); $('#billInfo').innerHTML = `<span class="mono" style="color:var(--acc)">${Math.round(x.m / 10)}% of the plan</span><div class="big">${fmtM(x.m)}</div><b style="font-weight:400;font-size:20px">${x.k}</b><p>${x.d}</p><ul>${x.b.map((y) => `<li>${y}</li>`).join('')}</ul>`; };
$$('.t', tree).forEach((t) => { t.onmouseenter = t.onfocus = t.onclick = () => showB(+t.dataset.i); });
showB(0);
once(tree, () => $$('.t', tree).forEach((t, i) => setTimeout(() => t.classList.add('in'), i * 120)), '0px');

// ── las rondas ──
const ROUNDS = [
  { n: 'Seed', m: 10, now: true, when: 'Preparing · 2026–27', p: 'Counsel, structure, the master plan, studies and an option on the land. The smallest round, at the earliest price.' },
  { n: 'Land', m: 90, when: '2027', p: 'Buys the land through the trust and secures the permits. Opens only once the site is chosen and the option is signed.' },
  { n: 'Phase I', m: 300, when: '2028', p: 'Infrastructure and the first neighborhood: residences, resort, club and studios. Combined with construction debt.' },
  { n: 'Phase II', m: 600, when: '2029–2032', p: 'The rest of the city, the civic buildings and the hills, financed by tokens, project debt and the sale of homes.' },
];
$('#rounds').innerHTML = ROUNDS.map((x, i) => `<article class="round${x.now ? ' now' : ''}"><span class="st mono"><i></i>${x.now ? 'Next' : 'Round ' + (i + 1)}</span><div class="amt">${fmtM(x.m)}</div><h3>${x.n}</h3><span class="when mono">${x.when}</span><p>${x.p}</p></article>`).join('');
$('#totBar').innerHTML = ROUNDS.map((x) => `<i class="${x.now ? 'now' : ''}" style="flex-grow:${x.m}"></i>`).join('');

// ── estructura ──
const NODES = {
  inv: { x: 95, y: 300, t: 'Investors', s: 'Verified', d: 'Individuals, family offices and institutions who pass identity and eligibility checks. They hold tokens, receive distributions and vote as shareholders.' },
  plat: { x: 290, y: 300, t: 'Platform', s: 'Authorized', d: 'A regulated platform that onboards investors, runs KYC, issues the tokens and keeps the official register of who owns what.' },
  co: { x: 500, y: 300, t: 'Anthropos I', s: 'Project company', d: 'The company that owns the project: a Delaware parent for international capital over a Mexican operating company. One owner, audited books.' },
  esc: { x: 500, y: 470, t: 'Escrow', s: 'Milestones', d: 'Capital waits here and is released only when each milestone is certified: permits, land, infrastructure, homes.' },
  trust: { x: 715, y: 150, t: 'Fideicomiso', s: 'Mexican bank', d: 'A bank trust that legally holds the land on behalf of the company, as required near the coast. It protects the land from any single party.' },
  land: { x: 895, y: 300, t: 'Land & city', s: 'The asset', d: 'The real thing: land, infrastructure, homes, the resort and the civic buildings. Its value and its income are what the tokens represent.' },
  cit: { x: 500, y: 110, t: 'Citizens', s: 'The republic', d: 'Members of Anthropos vote one person, one vote, on the charter and the plan. Separate from ownership: tokens never buy votes here.' },
};
const FLOWS = {
  money: [['inv', 'plat'], ['plat', 'co'], ['co', 'esc'], ['esc', 'land'], ['co', 'trust'], ['land', 'co', 1], ['co', 'inv', 1]],
  tokens: [['co', 'plat'], ['plat', 'inv'], ['inv', 'inv2']],
  votes: [['cit', 'co'], ['inv', 'co', 2], ['co', 'trust']],
};
const EDGES = [['inv', 'plat'], ['plat', 'co'], ['co', 'esc'], ['esc', 'land'], ['co', 'trust'], ['trust', 'land'], ['co', 'land'], ['cit', 'co'], ['inv', 'co']];
const dg = $('#diagram'); let flow = 'money', sel = 'co';
const path = (a, b, bend = 0) => { const A = NODES[a], B = NODES[b] || { x: A.x - 60, y: A.y + 150 }; const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 + (bend === 1 ? 110 : bend === 2 ? -150 : 0); return `M${A.x},${A.y} Q${mx},${my} ${B.x},${B.y}`; };
function drawD() {
  dg.innerHTML = `${EDGES.map(([a, b]) => `<path class="ed" d="${path(a, b, a === 'inv' && b === 'co' ? 2 : 0)}"/>`).join('')}
    ${FLOWS[flow].filter(([, b]) => b !== 'inv2').map(([a, b, bend]) => `<path class="fl" d="${path(a, b, bend)}"/>`).join('')}
    ${flow === 'tokens' ? `<path class="fl" d="M95,330 C40,470 200,470 150,330"/><text x="70" y="500" class="sub">Transfers between verified holders</text>` : ''}
    ${Object.entries(NODES).map(([k, n]) => `<g class="node${k === sel ? ' on' : ''}" data-k="${k}" tabindex="0"><rect x="${n.x - 78}" y="${n.y - 34}" width="156" height="68" rx="34"/><text x="${n.x}" y="${n.y - 2}" text-anchor="middle">${n.t}</text><text x="${n.x}" y="${n.y + 17}" text-anchor="middle" class="sub">${n.s}</text></g>`).join('')}`;
  $$('.node', dg).forEach((g) => { g.onclick = g.onfocus = () => { sel = g.dataset.k; drawD(); }; });
  const n = NODES[sel]; $('#nodeInfo').innerHTML = `<span class="mono" style="color:var(--acc)">${n.s}</span><h4>${n.t}</h4><p>${n.d}</p><p class="mono" style="margin-top:18px;color:var(--dim)">Showing: ${flow}</p>`;
}
$$('.flows button').forEach((b) => (b.onclick = () => { flow = b.dataset.flow; $$('.flows button').forEach((x) => x.classList.toggle('on', x === b)); drawD(); }));
drawD();

// ── suministro ──
const ALLOC = [
  { k: 'Seed & land investors', v: 30, c: '#c9824a', d: 'Sold in the first two rounds to verified investors.' },
  { k: 'Phase rounds', v: 25, c: '#9c6a42', d: 'Reserved for the Phase I and Phase II rounds, at later prices.' },
  { k: 'Founders & team', v: 15, c: '#ecebe5', d: '12-month cliff, then 48 months of monthly unlocks.' },
  { k: 'Community fund', v: 15, c: '#8d8c86', d: 'Fellowships, culture and the people who build the city.' },
  { k: 'Treasury', v: 10, c: '#55544f', d: 'Held by the company for future needs, under board control.' },
  { k: 'Advisors & partners', v: 5, c: '#33332f', d: 'Architects, engineers and strategic partners, with vesting.' },
];
const dn = $('#donut'), C = 210, Rr = 170, rr = 118; let a0 = -Math.PI / 2;
const arc = (s, e) => { const p = (r, a) => `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`, L = e - s > Math.PI ? 1 : 0; return `M${p(Rr, s)} A${Rr},${Rr} 0 ${L} 1 ${p(Rr, e)} L${p(rr, e)} A${rr},${rr} 0 ${L} 0 ${p(rr, s)}Z`; };
dn.innerHTML = ALLOC.map((x, i) => { const s = a0 + 0.012, e = a0 + (x.v / 100) * 6.283 - 0.012; a0 += (x.v / 100) * 6.283; return `<path d="${arc(s, e)}" fill="${x.c}" data-i="${i}"/>`; }).join('');
$('#alloc').innerHTML = ALLOC.map((x, i) => `<li data-i="${i}"><i style="background:${x.c}"></i><div><span>${x.k}</span><small>${x.d}</small></div><b>${x.v}%</b></li>`).join('');
const hiA = (i) => { $$('#donut path').forEach((p) => (p.style.opacity = i === null || +p.dataset.i === i ? 1 : 0.25)); $$('#alloc li').forEach((l) => l.classList.toggle('on', +l.dataset.i === i)); $('#dVal').textContent = i === null ? '10,000,000' : (ALLOC[i].v * 100000).toLocaleString('en-US'); $('#dLab').textContent = i === null ? 'tokens' : ALLOC[i].k; };
[...$$('#donut path'), ...$$('#alloc li')].forEach((el) => { el.onmouseenter = () => hiA(+el.dataset.i); el.onmouseleave = () => hiA(null); });
const vs = $('#vest'); const X = (m) => (m / 60) * 1000;
vs.innerHTML = `<path d="M0,110 L${X(12)},110 L${X(12)},${110 - 100 * (1 / 37)} L${X(48)},10 L1000,10" fill="none" stroke="#c9824a" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  ${[0, 12, 24, 36, 48, 60].map((m) => `<line x1="${X(m)}" x2="${X(m)}" y1="0" y2="120" stroke="#2a2a27" vector-effect="non-scaling-stroke"/><text x="${X(m) + 6}" y="116" fill="#7b7a74" font-family="IBM Plex Mono" font-size="10">M${m}</text>`).join('')}`;

// ── hitos: el capital se mueve cuando la ciudad se mueve ──
const MS = [[0, 'Structure & counsel', 4], [8, 'Seed closes · land option', 10], [16, 'Permits approved', 18], [26, 'Land bought through the trust', 100], [42, 'Infrastructure, first ring', 250], [60, 'First homes & resort open', 400], [76, 'Rotunda & academy', 600], [90, 'Phase II neighborhoods', 850], [100, 'The full city', 1000]];
$('#msList').innerHTML = MS.map(([p, t, m]) => `<li data-p="${p}"><span class="k">${String(p).padStart(2, '0')}%</span><span>${t}</span><span class="mono">${fmtM(m)}</span></li>`).join('');
const mini = $('#mini'), mg = mini.getContext('2d');
let mrs = 5; const MR = () => ((mrs = (mrs * 16807) % 2147483647) - 1) / 2147483646;
const HOUSES = []; for (let i = 0; i < 2600; i++) { const z = MR(); let x, y, d; if (z < 0.55) { const t = MR() * 6.283, l = 0.3 + 0.07 * Math.cos(4 * t + 0.6), r = Math.sqrt(MR()) * l; x = Math.cos(t) * r * 1.2; y = 0.05 + Math.sin(t) * r * 0.9; d = r / l * 0.6; } else if (z < 0.8) { x = (MR() * 2 - 1) * 0.85; y = -0.42 + 0.22 * x * x * -1 + MR() * 0.1; d = 0.45 + Math.abs(x) * 0.3; } else { const c = [[-0.45, 0.62], [0.45, 0.64], [-0.8, 0.8], [0.8, 0.82]][(MR() * 4) | 0], t = MR() * 6.283, r = Math.sqrt(MR()) * 0.17; x = c[0] + Math.cos(t) * r; y = c[1] + Math.sin(t) * r * 0.7; d = 0.7 + r; } HOUSES.push([x, y, Math.min(1, d)]); }
HOUSES.sort((a, b) => a[2] - b[2]);
function drawMini(p) {
  const w = (mini.width = mini.clientWidth * 2), h = (mini.height = mini.clientHeight * 2), s = Math.min(w, h * 1.5) * 0.4, cx = w / 2, cy = h * 0.46;
  const P = (x, y) => [cx + x * s, cy - y * s];
  mg.clearRect(0, 0, w, h); mg.lineWidth = 1.2; mg.strokeStyle = '#3a3a36';
  for (let k = 0; k < 9; k++) { mg.beginPath(); for (let x = -1.2; x <= 1.2; x += 0.02) { const [a, b] = P(x, -0.5 - 0.22 * x * x - k * 0.035 - k * k * 0.004); x === -1.2 ? mg.moveTo(a, b) : mg.lineTo(a, b); } mg.stroke(); }
  if (p >= 16) { mg.strokeStyle = '#c9824a'; mg.setLineDash([6, 8]); mg.beginPath(); mg.ellipse(...P(0, 0.2), s * 1.05, s * 0.62, 0, 0, 6.283); mg.stroke(); mg.setLineDash([]); }
  if (p >= 42) { mg.strokeStyle = '#e6e3da'; mg.lineWidth = 1.4; mg.beginPath(); mg.ellipse(...P(0, 0.05), s * 0.12, s * 0.12, 0, 0, 6.283); mg.stroke(); for (const a of [0.7, 2.45, 3.85, 5.55]) { mg.beginPath(); mg.moveTo(...P(Math.cos(a) * 0.12, 0.05 + Math.sin(a) * 0.12)); mg.lineTo(...P(Math.cos(a) * 0.9, 0.05 + Math.sin(a) * 0.75)); mg.stroke(); } }
  const n = Math.floor(HOUSES.length * Math.max(0, (p - 50) / 50));
  mg.fillStyle = '#e6e3da'; for (let i = 0; i < n; i++) { const [x, y] = HOUSES[i], [a, b] = P(x, y); mg.fillRect(a - 2, b - 2, 4, 4); }
  if (p >= 76) { mg.fillStyle = '#c9824a'; mg.beginPath(); mg.arc(...P(0, 0.05), s * 0.035, 0, 6.283); mg.fill(); }
  let cap = 0; MS.forEach(([q, , m]) => { if (p >= q) cap = m; });
  $$('#msList li').forEach((li) => li.classList.toggle('on', p >= +li.dataset.p));
  $('#escBar').style.width = cap / 10 + '%'; $('#escPct').textContent = fmtM(cap);
}
$('#ms').oninput = (e) => drawMini(+e.target.value);
new ResizeObserver(() => drawMini(+$('#ms').value)).observe(mini);
once(mini, () => { if (reduce) return; let v = 0; const iv = setInterval(() => { v += 1; $('#ms').value = v; drawMini(v); if (v >= 34) clearInterval(iv); }, 28); }, '0px');

// ── registro de interés ──
$('#intForm').onsubmit = async (e) => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); let err = '';
  if (!f.name?.trim()) err = 'Please add your name.'; else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '')) err = 'Please use a valid email.'; else if (!f.country?.trim()) err = 'Please add your country.'; else if (!f.status) err = 'Please choose an investor type.'; else if (!f.ok) err = 'Please confirm you understand this is not an offer.';
  $('#intErr').textContent = err; if (err) return;
  const how = await submit('investor-interest', { ...f, at: new Date().toISOString() }, `Investor interest · ${f.round} · ${f.name}`);
  e.target.classList.add('done');
  e.target.innerHTML = `<p class="mono" style="color:var(--acc)">Registered</p><h3 style="font-weight:300;font-size:clamp(34px,4vw,60px);letter-spacing:-.03em;margin-top:12px">Thank you, ${f.name.split(' ')[0]}.</h3><p style="color:var(--ink2);margin-top:14px;max-width:560px;line-height:1.6">${how === 'mail' ? 'Your email app opened with your registration. Send it, and the founding office will reply.' : 'The founding office will be in touch.'} Documents are shared only where the law allows.</p>`;
  toast('Interest registered');
};
