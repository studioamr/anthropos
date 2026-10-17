// ANTHROPOS POLIS · el plano detallado de la metrópoli.
// Cada barrio tiene su propia cuadrícula de calles; cada manzana es un perímetro de edificios alrededor de un patio.
// Nada se encima: las manzanas están separadas por calles y respetan río, bulevares, anillo, plazas, parque y explanada.
import { Ink, landscape, rnd, reseed, lerp, smooth } from './cityengine.js';

const D = (x, z, a, b) => Math.hypot(x - a, z - b);
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };

// ── geografía ──
export const bayP = (x) => -60 - 120 * (x / 1100) ** 2 - 10 * Math.sin(x * 0.006);
export const DOWN = [0, 230];
export const DISTRICTS = [[0, 230], [-430, 170], [430, 175], [-760, 120], [760, 110], [-260, 520], [300, 540]];
export const DRAD = [300, 240, 240, 215, 210, 195, 205];
export const river = (z) => -170 + 70 * Math.sin(z / 160) + 30 * Math.sin(z / 61);
export const PARK = { x: 40, z: 470, rx: 210, rz: 105 };
export const terrainP = (x, z) => {
  const t = smooth(600, 760, z), g = (cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return t * (12 + g(-520, 860, 170, 80) + g(120, 900, 190, 95) + g(700, 860, 160, 70) + g(-950, 800, 130, 50)) + 0.6;
};
const RING = 170, RING_K = 1.35;                                   // anillo elíptico alrededor del centro
const ringD = (x, z) => Math.abs(Math.hypot((x - DOWN[0]) / RING_K, z - DOWN[1]) - RING);
const RADIALS = DISTRICTS.slice(1).map((d) => [DOWN, d]);
const STADIUM = [640, 420], UNI = [120, 820];
const MALL = { x: 40, z0: DOWN[1] + 40, z1: PARK.z - PARK.rz };     // paseo del capitolio al parque
const inPark = (x, z, m = 0) => (x - PARK.x) ** 2 / (PARK.rx + m) ** 2 + (z - PARK.z) ** 2 / (PARK.rz + m) ** 2 < 1;
const riverD = (x, z) => (z > bayP(x) - 10 ? Math.abs(x - river(z)) : 1e9);
const inForecourt = (x, z, m = 0) => Math.abs(x - DOWN[0]) < 88 + m && z > DOWN[1] - 118 - m && z < DOWN[1] + 56 + m;
const inMall = (x, z, m = 0) => Math.abs(x - DOWN[0]) < MALL.x + m && z > MALL.z0 - m && z < MALL.z1 + 10 + m;
// ¿puede ir un edificio aquí? (m = holgura)
const blocked = (x, z, m = 0) =>
  z < bayP(x) + 72 + m || inPark(x, z, m) || riverD(x, z) < 42 + m || RADIALS.some(([a, b]) => segD(x, z, a, b) < 12 + m) ||
  ringD(x, z) < 10 + m || DISTRICTS.some((d, i) => i && D(x, z, ...d) < 40 + m) || inForecourt(x, z, m) || inMall(x, z, m) ||
  D(x, z, ...STADIUM) < 95 + m || D(x, z, ...UNI) < 120 + m;

// ── piezas ──
function capitol(ink, x, y, z) {
  ink.box(x, y, z, 120, 3, 70); ink.box(x, y + 3, z, 96, 18, 44);
  for (let i = 0; i < 12; i++) ink.cyl(x - 33 + i * 6, y + 3, z - 26, 0.9, 17, 10);
  ink.box(x, y + 20, z - 24, 74, 2, 6); ink.cyl(x, y + 21, z, 18, 12, 40);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283; ink.cyl(x + Math.cos(a) * 20, y + 21, z + Math.sin(a) * 20, 0.6, 11, 8); }
  ink.cyl(x, y + 33, z, 20.5, 1.2, 40); ink.dome(x, y + 34, z, 17, 24); ink.cyl(x, y + 51, z, 2.4, 6, 14); ink.cone(x, y + 57, z, 2.6, 5, 14);
  for (const sx of [-1, 1]) { ink.box(x + sx * 34, y + 3, z - 31, 14, 1, 6); }               // escalinatas
}
function districtPlaza(ink, x, y, z, k) {
  ink.ring(x, y + 0.3, z, 34, false, 72); ink.ring(x, y + 0.3, z, 24, true, 60);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; ink.tree(x + Math.cos(a) * 29, y, z + Math.sin(a) * 29, 0.75); }
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283 + 0.4; ink.line([[x + Math.cos(a) * 24, y + 0.3, z + Math.sin(a) * 24], [x + Math.cos(a) * 8, y + 0.3, z + Math.sin(a) * 8]], false, true); }
  if (k % 2) { ink.box(x, y, z, 5, 1.6, 5); ink.cyl(x, y + 1.6, z, 1.1, 22, 10); ink.cone(x, y + 23.6, z, 1.4, 4.5, 10); }
  else { ink.cyl(x, y, z, 9, 1, 28); ink.cyl(x, y + 1, z, 7.5, 6, 24); for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; ink.cyl(x + Math.cos(a) * 8.6, y + 1, z + Math.sin(a) * 8.6, 0.35, 6, 6); } ink.dome(x, y + 7, z, 7.6, 12); }
}
function bridge(ink, x, z, dx, dz, len = 74, w = 16) {
  const ry = -Math.atan2(dz, dx); ink.fbox(x, 0.2, z, len, 1.8, w, ry);
  const c = Math.cos(-ry), s = Math.sin(-ry);
  for (const t of [-len / 4, 0, len / 4]) ink.cyl(x + c * t, -2, z + s * t, 1.6, 2.2, 10);
  for (const o of [-w / 2, w / 2]) ink.line([[x - c * len / 2 - s * o, 3, z - s * len / 2 + c * o], [x + c * len / 2 - s * o, 3, z + s * len / 2 + c * o]]);
}
const H = 3.1;                                                       // altura de piso
function floorsAt(x, z, di) {
  const d = Math.hypot((x - DOWN[0]) / 1.25, z - DOWN[1]);
  if (di === 0) return Math.round(Math.max(4, 13 - d / 26) + rnd() * 2.5);
  return Math.round(3 + rnd() * 2.2 + (D(x, z, ...DISTRICTS[di]) < 110 ? 1.5 : 0));
}

// ── la ciudad ──
export function buildPolis() {
  reseed(211); const ink = new Ink(), it = [];
  landscape(ink, { coast: bayP, height: terrainP, X: 1250, Z0: -420, Z1: 1050, step: 12, contour: 9, trees: 1900, parallel: true,
    avoid: (x, z) => DISTRICTS.some((d, i) => D(x, z, ...d) < DRAD[i] * 1.02) || z < bayP(x) + 80 || inPark(x, z, 4) || riverD(x, z) < 48 || D(x, z, ...STADIUM) < 100 || D(x, z, ...UNI) < 125 });

  // 1 · río, malecones, árboles de ribera y puentes alineados con las calles que lo cruzan
  it.push({ d: 0, f: () => {
    const zA = bayP(river(0)) - 8;
    for (const o of [-20, 20]) { const p = []; for (let z = zA; z <= 1040; z += 6) p.push([river(z) + o, terrainP(river(z) + o, z) + 0.3, z]); ink.line(p); }
    for (const o of [-34, 34]) { const p = []; for (let z = zA + 70; z <= 700; z += 8) p.push([river(z) + o, 0.3, z]); ink.line(p, false, true); }
    for (let z = zA + 4; z <= 1040; z += 7) { const x = river(z); ink.line([[x - 17, terrainP(x, z) + 0.15, z], [x + 17, terrainP(x, z) + 0.15, z]], false, true); }
    for (let z = zA + 80; z <= 690; z += 15) for (const o of [-39, 39]) if (!inPark(river(z) + o, z, 2)) ink.tree(river(z) + o, 0.3, z, 0.7);
    // cruces: anillo y radiales
    const cross = (fx, n = 400) => { const out = []; let prev = null; for (let i = 0; i <= n; i++) { const p = fx(i / n), sd = p[0] - river(p[1]); if (prev && Math.sign(sd) !== Math.sign(prev.sd) && p[1] > bayP(p[0]) + 40) out.push({ p, q: prev.p }); prev = { p, sd }; } return out; };
    const built = [], once = (p, q, len, w) => { if (built.some((b) => D(p[0], p[1], ...b) < 70)) return; built.push(p); bridge(ink, p[0], p[1], p[0] - q[0], p[1] - q[1], len, w); };
    RADIALS.forEach(([a, b]) => cross((t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]).forEach(({ p, q }) => once(p, q, 84, 22)));
    cross((t) => [DOWN[0] + Math.cos(t * 6.283) * RING * RING_K, DOWN[1] + Math.sin(t * 6.283) * RING]).forEach(({ p, q }) => once(p, q, 74, 16));
    const mz = bayP(river(0)) + 58; bridge(ink, river(mz), mz, 1, 0, 70, 14);
  } });

  // 2 · bulevares arbolados, anillo, malecón costero
  it.push({ d: 1, f: () => {
    RADIALS.forEach(([a, b]) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux, t0 = 95, t1 = L - 46;
      for (const o of [-10, 10]) ink.line([[a[0] + ux * t0 + nx * o, 0.25, a[1] + uz * t0 + nz * o], [a[0] + ux * t1 + nx * o, 0.25, a[1] + uz * t1 + nz * o]]);
      ink.line([[a[0] + ux * t0, 0.25, a[1] + uz * t0], [a[0] + ux * t1, 0.25, a[1] + uz * t1]], false, true);
      for (let t = t0 + 8; t < t1; t += 16) for (const o of [-6, 6]) { const x = a[0] + ux * t + nx * o, z = a[1] + uz * t + nz * o; if (riverD(x, z) > 24 && ringD(x, z) > 9) ink.tree(x, terrainP(x, z), z, 0.6); }
    });
    for (const r of [RING - 8, RING + 8]) { const p = []; for (let i = 0; i <= 200; i++) { const t = (i / 200) * 6.283, x = DOWN[0] + Math.cos(t) * r * RING_K, z = DOWN[1] + Math.sin(t) * r; p.push([x, 0.25, z]); } ink.line(p); }
    for (let i = 0; i < 110; i++) { const t = (i / 110) * 6.283, x = DOWN[0] + Math.cos(t) * RING * RING_K, z = DOWN[1] + Math.sin(t) * RING; if (riverD(x, z) > 26 && !inMall(x, z, 2) && !inForecourt(x, z, 2)) ink.tree(x, 0.3, z, 0.6); }
    const pr = [], pr2 = []; for (let x = -1080; x <= 1080; x += 8) { pr.push([x, 0.3, bayP(x) + 56]); pr2.push([x, 0.3, bayP(x) + 66]); } ink.line(pr); ink.line(pr2, false, true);
    for (let x = -1060; x <= 1060; x += 22) if (riverD(x, bayP(x) + 61) > 30) ink.tree(x, 0.3, bayP(x) + 61, 0.8, 1);
  } });

  // 3 · capitolio, explanada con fuentes, paseo con espejo de agua hasta el parque
  it.push({ d: 2, f: () => {
    const [cx, cz] = DOWN;
    capitol(ink, cx, 0.3, cz);
    ink.line([[cx - 80, 0.3, cz - 110], [cx + 80, 0.3, cz - 110], [cx + 80, 0.3, cz + 50], [cx - 80, 0.3, cz + 50]], true);
    for (let x = -70; x <= 70; x += 14) ink.line([[cx + x, 0.25, cz - 104], [cx + x, 0.25, cz - 46]], false, true);
    for (const sx of [-1, 1]) { const fx = cx + sx * 46, fz = cz - 76; ink.cyl(fx, 0.3, fz, 9, 0.8, 32); ink.ring(fx, 1.2, fz, 6.5, true, 32); ink.cyl(fx, 1.1, fz, 1.2, 3, 10); }
    for (let x = -72; x <= 72; x += 12) for (const z of [cz - 112, cz + 54]) ink.tree(cx + x, 0.3, z, 0.65, 1);
    const z0 = MALL.z0 + 10, z1 = MALL.z1 - 6;
    ink.line([[cx - MALL.x, 0.3, z0], [cx + MALL.x, 0.3, z0], [cx + MALL.x, 0.3, z1], [cx - MALL.x, 0.3, z1]], true);
    ink.line([[cx - 9, 0.2, z0 + 14], [cx + 9, 0.2, z0 + 14], [cx + 9, 0.2, z1 - 14], [cx - 9, 0.2, z1 - 14]], true);
    for (let z = z0 + 18; z < z1 - 14; z += 5) ink.line([[cx - 7, 0.15, z], [cx + 7, 0.15, z]], false, true);
    for (let z = z0 + 6; z < z1; z += 13) for (const o of [-30, -20, 20, 30]) ink.tree(cx + o, 0.3, z, 0.7);
  } });

  // 4 · plazas de barrio
  DISTRICTS.slice(1).forEach((d, k) => it.push({ d: D(...d, ...DOWN) - 1, f: () => districtPlaza(ink, d[0], terrainP(...d), d[1], k) }));

  // 5 · el tejido: cuadrícula de calles por barrio, manzanas perimetrales con patio
  const PU = 58, PV = 46, ST = 11;
  DISTRICTS.forEach((c, di) => {
    const th = di === 0 ? 0 : Math.atan2(c[1] - DOWN[1], c[0] - DOWN[0]);
    const ux = Math.cos(th), uz = Math.sin(th), vx = -uz, vz = ux, ry = -th;
    const lim = (x, z) => { const a = Math.atan2(z - c[1], x - c[0]); return DRAD[di] * (1 + 0.12 * Math.sin(a * 5 + di) + 0.06 * Math.sin(a * 11 + di * 2)); };
    const W = (u, v) => [c[0] + u * ux + v * vx, c[1] + u * uz + v * vz];
    const nearest = (x, z) => DISTRICTS.reduce((b, q, i) => (D(x, z, ...q) / DRAD[i] < D(x, z, ...DISTRICTS[b]) / DRAD[b] ? i : b), 0);
    const n = Math.ceil(DRAD[di] * 1.2 / PV);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const bu = i * PU + (di ? PU / 2 : 0), bv = j * PV + (di ? PV / 2 : 0), [bx, bz] = W(bu, bv);
      const A = PU / 2 - ST / 2, B = PV / 2 - ST / 2;
      const corners = [W(bu - A, bv - B), W(bu + A, bv - B), W(bu + A, bv + B), W(bu - A, bv + B)];
      if (nearest(bx, bz) !== di || corners.some(([x, z]) => D(x, z, ...c) > lim(x, z) || nearest(x, z) !== di)) continue;
      const parcels = [];
      const dep = 11;
      const side = (axis, sgn) => {                                        // perímetro de la manzana
        const L = axis === 'u' ? 2 * A : 2 * (B - dep); let t = -L / 2;
        while (t < L / 2 - 4) {
          const w = Math.min(L / 2 - t, 8 + rnd() * 9); if (L / 2 - t - w < 6) { /* último lote absorbe el resto */ }
          const ww = L / 2 - t - w < 6 ? L / 2 - t : w, mid = t + ww / 2;
          const lu = axis === 'u' ? mid : sgn * (A - dep / 2), lv = axis === 'u' ? sgn * (B - dep / 2) : mid;
          parcels.push({ lu, lv, w: axis === 'u' ? ww - 0.6 : dep, d: axis === 'u' ? dep : ww - 0.6 }); t += ww;
        }
      };
      side('u', -1); side('u', 1); side('v', -1); side('v', 1);
      const blockOk = parcels.filter((p) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([a, b]) => { const [x, z] = W(bu + p.lu + a * p.w / 2, bv + p.lv + b * p.d / 2); return !blocked(x, z, 1.5); }));
      if (blockOk.length < parcels.length * 0.3) continue;                    // manzana casi vacía: se deja como plaza/jardín
      const dd = D(bx, bz, ...DOWN), y0 = terrainP(bx, bz);
      const pocket = blockOk.length === parcels.length && rnd() < 0.07;
      if (pocket) {
        it.push({ d: 3 + D(bx, bz, ...DOWN), f: () => {
          ink.line(corners.map(([x, z]) => [x, y0 + 0.2, z]), true, true);
          const inn = [W(bu - A + 3, bv - B + 3), W(bu + A - 3, bv - B + 3), W(bu + A - 3, bv + B - 3), W(bu - A + 3, bv + B - 3)];
          ink.line(inn.map(([x, z]) => [x, y0 + 0.3, z]), true);
          const pa = W(bu - A + 3, bv), pb = W(bu + A - 3, bv); ink.line([[pa[0], y0 + 0.3, pa[1]], [pb[0], y0 + 0.3, pb[1]]], false, true);
          ink.line([[W(bu, bv - B + 3)[0], y0 + 0.3, W(bu, bv - B + 3)[1]], [W(bu, bv + B - 3)[0], y0 + 0.3, W(bu, bv + B - 3)[1]]], false, true);
          const [fx, fz] = W(bu, bv); ink.cyl(fx, y0 + 0.3, fz, 3.2, 0.8, 18);
          for (let q = 0; q < 16; q++) { const a = (rnd() - 0.5) * (2 * A - 10), b = (rnd() - 0.5) * (2 * B - 10); if (Math.abs(a) < 4 || Math.abs(b) < 4) continue; const [x, z] = W(bu + a, bv + b); ink.tree(x, y0, z, 0.7 + rnd() * 0.4, rnd() < 0.3 ? 1 : 0); }
        } });
        continue;
      }
      const tower = di === 0 && Math.hypot(bx / 1.25, bz - DOWN[1]) < 230 && blockOk.length === parcels.length && rnd() < 0.42;
      it.push({ d: 3 + dd, f: () => {
        ink.line(corners.map(([x, z]) => [x, y0 + 0.2, z]), true, true);   // banqueta: la calle se lee
        if (tower) {
          ink.fbox(bx, y0, bz, 2 * A - 2, 2 * H + 1, 2 * B - 2, ry, 6);
          const nT = rnd() < 0.5 ? 1 : 2, fl = Math.round(16 + rnd() * 14 - dd / 20);
          for (let k = 0; k < nT; k++) { const o = nT === 1 ? 0 : (k ? 1 : -1) * A * 0.45, [tx, tz] = W(bu + o, bv), h = Math.max(10, fl - k * 5) * H;
            ink.fbox(tx, y0 + 2 * H + 1, tz, 15, h, 15, ry, 3); ink.fbox(tx, y0 + 2 * H + 1 + h, tz, 10, H * 1.4, 10, ry); }
          return;
        }
        for (const p of blockOk) { const [x, z] = W(bu + p.lu, bv + p.lv), fl = floorsAt(x, z, di); ink.fbox(x, y0, z, p.w, fl * H, p.d, ry, p.w > 11 || p.d > 11 ? 3 : 0); }
        if (rnd() < 0.8) { const k = 1 + (rnd() * 2.5 | 0); for (let q = 0; q < k; q++) { const [x, z] = W(bu + (rnd() - 0.5) * (A - dep) * 1.4, bv + (rnd() - 0.5) * (B - dep) * 1.2); ink.tree(x, y0, z, 0.55); } }
      } });
    }
  });

  // 5b · franjas verdes entre barrios
  it.push({ d: 400, f: () => {
    for (let i = 0; i < 2600; i++) {
      const x = (rnd() * 2 - 1) * 1060, z = bayP(x) + 80 + rnd() * (720 - bayP(x) - 80);
      const k = DISTRICTS.reduce((b, q, j) => (D(x, z, ...q) / DRAD[j] < D(x, z, ...DISTRICTS[b]) / DRAD[b] ? j : b), 0), r = D(x, z, ...DISTRICTS[k]) / DRAD[k];
      if (r < 1.06 || r > 1.45 || blocked(x, z, 4)) continue;
      ink.tree(x, terrainP(x, z), z, 0.75 + rnd() * 0.5, rnd() < 0.3 ? 1 : 0);
    }
  } });

  // 6 · playa: casas bajas entre el malecón y la arena
  for (let gx = -150; gx <= 150; gx++) for (let row = 0; row < 3; row++) {
    const x = gx * 7.2 + (row % 2) * 3.6, z = bayP(x) + 20 + row * 10; if (riverD(x, z) < 34) continue;
    it.push({ d: 640 + Math.abs(x) * 0.2, f: () => ink.fbox(x, 0.3, z, 4.6, 3.4, 5.6, Math.atan((bayP(x + 1) - bayP(x - 1)) / 2)) });
  }

  // 7 · estadio con explanada, universidad con patio central, aldeas de los cerros, puerto y faro
  it.push({ d: 520, f: () => {
    const [sx, sz] = STADIUM;
    for (let k = 0; k < 11; k++) { const p = []; for (let i = 0; i < 80; i++) { const t = (i / 80) * 6.283; p.push([sx + (50 + k * 3.2) * Math.cos(t), k * 1.7, sz + (31 + k * 3.2) * Math.sin(t)]); } ink.line(p, true); }
    ink.ring(sx, 0.4, sz, 26, true); ink.line([[sx - 30, 0.4, sz - 16], [sx + 30, 0.4, sz - 16], [sx + 30, 0.4, sz + 16], [sx - 30, 0.4, sz + 16]], true, true);
    for (let i = 0; i < 40; i++) { const t = (i / 40) * 6.283; ink.tree(sx + 92 * Math.cos(t), 0.3, sz + 70 * Math.sin(t), 0.7); }
  } });
  it.push({ d: 760, f: () => {
    const [ux, uz] = UNI, y = terrainP(ux, uz);
    ink.box(ux, y, uz, 150, 2, 90); ink.cyl(ux, y + 2, uz + 30, 20, 10, 40); ink.dome(ux, y + 12, uz + 30, 20, 20);
    for (const sx of [-1, 1]) { ink.fbox(ux + sx * 62, y + 2, uz, 22, 14, 80, 0, 8); ink.fbox(ux + sx * 30, y + 2, uz - 36, 38, 11, 14, 0, 6); }
    for (let i = -3; i <= 3; i++) for (const z of [uz - 14, uz + 6]) ink.tree(ux + i * 8, y + 2, z, 0.6);
  } });
  for (let i = 0; i < 900; i++) { const vx = [-520, 700, -950][i % 3], vz = [860, 860, 800][i % 3], t = rnd() * 6.283, r = 14 + Math.sqrt(rnd()) * 115, x = vx + Math.cos(t) * r, z = vz + Math.sin(t) * r * 0.7;
    if (riverD(x, z) < 30) continue; const y = terrainP(x, z); it.push({ d: 820 + r, f: () => ink.fbox(x, y - 1, z, 5, 4.6, 6, Math.atan2(vx - x, vz - z)) }); }
  it.push({ d: 660, f: () => { const z0 = bayP(380); for (let i = 0; i < 4; i++) ink.box(300 + i * 50, 0, z0 - 55, 8, 1.4, 110); ink.box(380, 0, z0 - 118, 220, 1.6, 10); for (let i = 0; i < 12; i++) ink.fbox(296 + i * 16, 0.4, z0 + 30, 12, 9, 22, 0, 2); const lx = -980, lz = bayP(-980) - 10; ink.cyl(lx, 0, lz, 6, 34, 16); ink.cone(lx, 34, lz, 7, 9, 16); } });

  // 8 · el gran parque: contorno, lago con islas, sendas sinuosas, bosquetes
  it.push({ d: 250, f: () => {
    const o = []; for (let i = 0; i < 140; i++) { const t = (i / 140) * 6.283; o.push([PARK.x + PARK.rx * Math.cos(t), 0.3, PARK.z + PARK.rz * Math.sin(t)]); } ink.line(o, true);
    const lk = (k) => { const l = []; for (let i = 0; i < 90; i++) { const t = (i / 90) * 6.283, r = 1 - k * 0.14; l.push([PARK.x + 40 + 72 * Math.cos(t) * (1 + 0.15 * Math.sin(3 * t)) * r, 0.2, PARK.z + 34 * Math.sin(t) * r]); } return l; };
    ink.line(lk(0), true); for (let k = 1; k < 6; k++) ink.line(lk(k), true, true);
    ink.ring(PARK.x + 70, 0.4, PARK.z + 4, 7, false, 24); ink.tree(PARK.x + 70, 0.4, PARK.z + 4, 0.8);
    for (let i = 0; i < 300; i++) { const t = rnd() * 6.283, r = Math.sqrt(rnd()), x = PARK.x + PARK.rx * 0.95 * r * Math.cos(t), z = PARK.z + PARK.rz * 0.95 * r * Math.sin(t);
      if ((x - PARK.x - 40) ** 2 / 84 ** 2 + (z - PARK.z) ** 2 / 44 ** 2 < 1 || Math.abs(x - PARK.x + 20 * Math.sin(z / 30)) < 6) continue; ink.tree(x, 0.3, z, 0.9 + rnd() * 0.5, rnd() < 0.25 ? 1 : 0); }
    for (const ph of [0, 2.1]) { const pth = []; for (let i = 0; i <= 50; i++) { const t = i / 50, x = PARK.x - PARK.rx * 0.98 + t * PARK.rx * 1.96, z = PARK.z + Math.sin(t * 6 + ph) * 46 * Math.sin(t * Math.PI); pth.push([x, 0.35, z]); } ink.line(pth, false, true); }
  } });

  // ordenar del centro hacia afuera y marcar cada paso para el crecimiento
  it.sort((a, b) => a.d - b.d).forEach((x) => { x.f(); ink.mark(x.d); });
  return { ink, zones: { all: [-1080, 0, -170, 1080, 60, 860], center: [-280, 0, 40, 280, 70, 420], beach: [-800, 0, -260, 800, 15, 60], hills: [-1000, 0, 700, 1000, 120, 1050] } };
}
