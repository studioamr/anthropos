// ANTHROPOS · seis conceptos de ciudad sobre la misma costa. Cada uno devuelve { ink, zones } para el motor.
import { Ink, landscape, rnd, reseed, lerp, smooth } from './cityengine.js';
import { buildPolis } from './polis.js';

const coast = (x) => -110 + 38 * Math.sin(x / 250) + 14 * Math.sin(x / 83 + 1.3);
const hills = (x, z, flat = () => 0) => {
  const inland = z - coast(x) - 55; if (inland < 0) return 0;
  let h = smooth(0, 520, inland) * (64 + 42 * Math.sin(x / 170 + 0.6) * Math.cos(z / 120) + 20 * Math.sin(x / 61) * Math.sin(z / 47));
  h += smooth(260, 720, inland) * 90;
  const f = flat(x, z); return h * (1 - f) + 1.2 * f;
};
// elementos ordenados del centro hacia afuera → la ciudad "crece"
function grow(ink, items, cx, cz) {
  items.sort((a, b) => a.d - b.d).forEach((it) => { it.f(); ink.mark(it.d); });
}
const D = (x, z, cx, cz) => Math.hypot(x - cx, z - cz);
// edificio con patio (4 cuerpos alrededor de un hueco)
function courtBlock(ink, x, y, z, w, d, h, ry = 0) {
  const t = Math.min(w, d) * 0.28, c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  for (const [lx, lz, ww, dd] of [[0, -d / 2 + t / 2, w, t], [0, d / 2 - t / 2, w, t], [-w / 2 + t / 2, 0, t, d - 2 * t], [w / 2 - t / 2, 0, t, d - 2 * t]]) { const [px, pz] = P(lx, lz); ink.box(px, y, pz, ww, h, dd, ry); }
}
function colonnade(ink, x0, z0, x1, z1, y = 0, h = 9, step = 4.5) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / step)), ry = -Math.atan2(z1 - z0, x1 - x0);
  for (let i = 0; i <= n; i++) ink.cyl(lerp(x0, x1, i / n), y, lerp(z0, z1, i / n), 0.7, h, 8);
  const g = Math.hypot(x1 - x0, z1 - z0); ink.box((x0 + x1) / 2, y + h, (z0 + z1) / 2, g + 2, 1.2, 3, ry);
}
const zonesFor = (c, beachX = 0) => ({
  all: [-760, 0, -150, 760, 60, 640],
  center: [c[0] - 210, 0, c[1] - 170, c[0] + 210, 40, c[1] + 170],
  beach: [beachX - 360, 0, coast(beachX) - 90, beachX + 360, 20, coast(beachX) + 190],
  hills: [-560, 0, 260, 560, 150, 720],
});


// ── ANTHROPOS: el programa del mapa de Praxis (bahía, centro denso, rotonda, eje, 4 bulevares,
//    5 parques, playa en hileras, 4 aldeas en 4 colinas, puerta en el eje) con trazo y proporciones propios.
const bay = (x) => -40 - 92 * (x / 560) ** 2 - 7 * Math.sin(x * 0.0105);
const HUB = [0, 220], RING = 95;
const PARKS = [
  { name: 'Botanical garden', x: -118, z: 150, rx: 50, rz: 62, kind: 'botanic' },
  { name: 'Great lawn', x: 130, z: 275, rx: 66, rz: 44, kind: 'lawn' },
  { name: 'Seafront garden', x: 0, z: bay(0) + 86, rx: 50, rz: 40, kind: 'parterre' },
  { name: 'West forest', x: -88, z: 525, rx: 44, rz: 68, kind: 'forest' },
  { name: 'East reserve', x: 352, z: 610, rx: 53, rz: 70, kind: 'forest' },
];
const BLVD = [[HUB, [-325, bay(-325) + 34]], [HUB, [325, bay(325) + 34]], [HUB, [-270, 400]], [HUB, [270, 400]]];
const VILLAGES = [[-190, 470], [195, 482], [-445, 590], [440, 612]];
const terrain = (x, z) => {
  const t = smooth(345, 425, z), g = (cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return t * (14 + g(-190, 478, 98, 64) + g(195, 492, 102, 58) + g(-445, 600, 92, 44) + g(440, 622, 100, 38)) + 0.6;
};
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
const inPark = (x, z, m = 0) => PARKS.some((p) => (x - p.x) ** 2 / (p.rx + m) ** 2 + (z - p.z) ** 2 / (p.rz + m) ** 2 < 1);
const reserved = (x, z, m = 0) => Math.abs(x) < 15 + m && z > bay(x) + 30 && z < 720 || D(x, z, ...HUB) < 30 + m || Math.abs(D(x, z, ...HUB) - RING) < 6 + m || inPark(x, z, m) || BLVD.some(([a, b]) => segD(x, z, a, b) < 8 + m);
function odeon(ink, x, y, z) {
  for (let i = 0; i < 3; i++) ink.cyl(x, y + i * 0.6, z, 16 - i * 0.9, 0.6, 64);
  ink.cyl(x, y + 1.8, z, 10, 11, 48);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ink.cyl(x + Math.cos(a) * 13, y + 1.8, z + Math.sin(a) * 13, 0.42, 10.6, 8); }
  ink.cyl(x, y + 12.4, z, 13.8, 0.8, 64); ink.cyl(x, y + 13.2, z, 10.6, 1.2, 64); ink.dome(x, y + 14.4, z, 10.4, 20);
  ink.cyl(x, y + 24.6, z, 1.6, 2.4, 16);
}
function propylon(ink, x, y, z) {
  ink.box(x, y, z, 46, 1.2, 22);
  for (const zz of [-8, 8]) for (let i = 0; i < 6; i++) ink.cyl(x - 17.5 + i * 7, y + 1.2, z + zz, 0.7, 11, 10);
  ink.box(x, y + 12.2, z, 44, 1.6, 20);
  ink.line([[x - 22, y + 13.8, z - 10], [x, y + 18.5, z - 10], [x + 22, y + 13.8, z - 10]]); ink.line([[x - 22, y + 13.8, z + 10], [x, y + 18.5, z + 10], [x + 22, y + 13.8, z + 10]]); ink.line([[x, y + 18.5, z - 10], [x, y + 18.5, z + 10]]);
}
function parkDraw(ink, p) {
  const out = []; for (let i = 0; i < 80; i++) { const t = (i / 80) * Math.PI * 2; out.push([p.x + p.rx * Math.cos(t), terrain(p.x + p.rx * Math.cos(t), p.z + p.rz * Math.sin(t)) + 0.3, p.z + p.rz * Math.sin(t)]); }
  ink.line(out, true);
  const nTrees = p.kind === 'forest' ? 70 : p.kind === 'lawn' ? 14 : 22;
  for (let i = 0; i < nTrees; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * (p.kind === 'lawn' ? 1 : 0.9), x = p.x + p.rx * r * Math.cos(a), z = p.z + p.rz * r * Math.sin(a);
    if (p.kind === 'lawn' && r < 0.7) continue; ink.tree(x, terrain(x, z), z, 0.85 + rnd() * 0.5, rnd() < 0.3 ? 1 : 0); }
  if (p.kind === 'botanic') { ink.dome(p.x, 0.6, p.z, 12, 14); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ink.line([[p.x + 13 * Math.cos(a), 0.4, p.z + 13 * Math.sin(a)], [p.x + p.rx * 0.95 * Math.cos(a), 0.4, p.z + p.rz * 0.95 * Math.sin(a)]], false, true); } }
  if (p.kind === 'parterre') { for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const cx = p.x + sx * 18, cz = p.z + sz * 14; ink.line([[cx - 12, 0.4, cz - 8], [cx + 12, 0.4, cz - 8], [cx + 12, 0.4, cz + 8], [cx - 12, 0.4, cz + 8]], true, true); } ink.cyl(p.x, 0.4, p.z, 3, 1, 20); }
  if (p.kind === 'lawn') { ink.ring(p.x, 0.5, p.z, 26, true); ink.ring(p.x, 0.5, p.z, 6, false); }
  if (p.kind === 'forest') { const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, z = p.z - p.rz * 0.9 + t * p.rz * 1.8, x = p.x + Math.sin(t * 6) * p.rx * 0.35; pts.push([x, terrain(x, z) + 0.5, z]); } ink.line(pts, false, true); }
}
const ANTHROPOS = {
  id: 'anthropos', name: 'Anthropos', kind: 'Bay city', tagline: 'A dense center around a rotunda, a beach of low houses, and four hills of homes.',
  desc: 'The full plan: a city on a bay. At the center, an odeon with a colonnade and a dome stands on a ring road, and from it run a main axis from the hills to the sea and four diagonal boulevards. Courtyard blocks of four to six floors fill the flat ground. Low houses run along the beach in rows. Behind it, houses climb four hills like domes, reached through a monumental gateway on the axis. Five parks: a botanical garden, a great lawn, a seafront garden, a forest, and a reserve.',
  pros: ['Three ways of living in one city: center, beach, and hills', 'Five large parks and an axis that orders everything'], cons: ['The most ambitious; it is built in three phases'],
  build() {
    reseed(97); const ink = new Ink();
    landscape(ink, { coast: bay, height: terrain, avoid: (x, z) => z < 370 && Math.abs(x) < 470 || inPark(x, z, 6) || VILLAGES.some((v, i) => D(x, z, ...v) < (i > 1 ? 95 : 125)), trees: 1700, X: 760, Z1: 760, parallel: true });
    const it = [];
    // vías: eje, anillo, bulevares
    it.push({ d: 0, f: () => {
      for (const o of [-13, 13]) { const p = []; for (let z = bay(o) + 40; z <= 720; z += 8) p.push([o, terrain(o, z) + 0.2, z]); ink.line(p); }
      ink.ring(HUB[0], 0.25, HUB[1], RING - 5, false, 140); ink.ring(HUB[0], 0.25, HUB[1], RING + 5, false, 140); ink.ring(HUB[0], 0.25, HUB[1], 30, false, 80);
      BLVD.forEach(([a, b]) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L; for (const o of [-7, 7]) { const p = []; for (let i = 0; i <= 20; i++) { const t = 0.2 + 0.8 * i / 20, x = a[0] + dx * t + nx * o, z = a[1] + dz * t + nz * o; p.push([x, terrain(x, z) + 0.2, z]); } ink.line(p); } });
    } });
    it.push({ d: 1, f: () => odeon(ink, HUB[0], 0.3, HUB[1]) });
    // Casas pequeñas en tres zonas, ordenadas por cercanía: así forman las manchas (trébol, franja, cúpulas).
    const center = [], beach = [], hill = [];
    for (let gx = -23; gx <= 23; gx++) for (let gz = -5; gz <= 8; gz++) {
      const bx = gx * 19, bz = HUB[1] + gz * 19; if (bz > HUB[1] + 155 || bz < bay(bx) + 132) continue;
      for (let side = 0; side < 4; side++) for (let k = -2; k <= 2; k++) {
        const a = side * Math.PI / 2, dx = k * 2.2, dz = 6.6, x = bx + dx * Math.cos(a) + dz * Math.sin(a), z = bz - dx * Math.sin(a) + dz * Math.cos(a);
        if (reserved(x, z, 2)) continue;
        center.push({ x, z, r: a, rank: (bx * 0.84) ** 2 + (bz - HUB[1]) ** 2 + k * 0.01, fl: 4 + ((rnd() * 3) | 0) });
      }
    }
    for (let gx = -92; gx <= 92; gx++) for (let row = 0; row < 11; row++) {
      const x = gx * 7.6, z = bay(x) + 44 + row * 8.2; if (reserved(x, z, 3.4)) continue;
      beach.push({ x, z, r: Math.atan((bay(x + 1) - bay(x - 1)) / 2), w: 3.1 + rnd() * 0.8, fl: rnd() > 0.82 ? 2 : 1, rank: (x * 0.7) ** 2 + (z - (bay(x) + 85)) ** 2 });
    }
    for (let gx = -58; gx <= 58; gx++) for (let row = 0; row < 23; row++) {
      const x = gx * 11 + Math.sin(row * 0.6) * 2, z = 431 + row * 12 + Math.sin(gx * 0.4) * 2;
      if (reserved(x, z, 4) || Math.abs(x) < 38) continue;
      const vi = VILLAGES.reduce((bi, c, i) => (D(x, z, ...c) < D(x, z, ...VILLAGES[bi]) ? i : bi), 0), v = VILLAGES[vi];
      hill.push({ x, z, r: Math.atan2(v[0] - x, v[1] - z), w: 3.6 + rnd() * 1.1, fl: rnd() > 0.8 ? 2 : 1, rank: D(x, z, ...v) ** 2 + (vi > 1 ? 25000 : 0) });
    }
    const pick = (arr, n) => arr.sort((p, q) => p.rank - q.rank).slice(0, n);
    pick(center, 3300).forEach((p, i) => it.push({ d: 2 + i * 0.1, f: () => ink.fbox(p.x, 0.3, p.z, 1.9 * 1.15, p.fl * 1.15 * 1.15, 2.6 * 1.15, p.r) }));
    pick(beach, 1250).forEach((p, i) => it.push({ d: 340 + i * 0.1, f: () => ink.fbox(p.x, 0.3, p.z, p.w * 1.15, p.fl * 1.7, 3.9 * 1.15, p.r) }));
    pick(hill, 1100).forEach((p, i) => it.push({ d: 470 + i * 0.1, f: () => {
      const hs = [-1, 1].flatMap((a) => [-1, 1].map((b) => terrain(p.x + a * 2.6, p.z + b * 2.6))), y = Math.max(...hs) + 0.8, lo = Math.min(...hs);
      ink.fbox(p.x, lo, p.z, p.w * 1.15, y - lo + 0.4, 4.6, p.r); ink.fbox(p.x, y, p.z, p.w * 1.15, p.fl * 1.7, 4.7, p.r);
    } }));
    it.push({ d: 460, f: () => propylon(ink, 0, terrain(0, 392), 392) });
    PARKS.forEach((p) => it.push({ d: D(p.x, p.z, ...HUB) + 60, f: () => parkDraw(ink, p) }));
    it.push({ d: 600, f: () => { const z0 = bay(0); ink.box(0, 0, z0 - 60, 10, 1.3, 120); ink.box(0, 0, z0 - 124, 40, 1.3, 10); } });
    grow(ink, it);
    return { ink, zones: { all: [-600, 0, -110, 600, 70, 720], center: [-210, 0, 90, 210, 25, 380], beach: [-470, 0, bay(0) - 50, 470, 12, bay(0) + 140], hills: [-560, 0, 400, 560, 80, 720] } };
  },
};

// ── ANTHROPOS II · THE HARBOR: mismo lenguaje (casas pequeñas en manchas, tinta, rotonda), otra idea:
//    la ciudad abraza un puerto redondo; un tridente de avenidas sube a un panteón en la colina.
const COVE = 150, coastH = (x) => { const b = -40 - 70 * (x / 600) ** 2 - 6 * Math.sin(x * 0.012); return Math.abs(x) < COVE ? b + 175 * Math.sqrt(1 - (x / COVE) ** 2) : b; };
const HC = [0, -40];                                   // centro del puerto (boca de la caleta)
const PIAZZA = [0, coastH(0) + 40], TRIDENT = [[-310, 560], [0, 640], [310, 560]];
const H_VILL = [[-330, 500], [330, 505], [-560, 610]];
const terrainH = (x, z) => {
  const t = smooth(330, 420, z), g = (cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return t * (12 + g(-330, 510, 110, 60) + g(330, 515, 110, 56) + g(0, 650, 120, 74) + g(-560, 620, 90, 40)) + 0.6;
};
const H_PARKS = [
  { name: 'Crescent park west', x: -205, z: 300, rx: 62, rz: 40, kind: 'lawn' },
  { name: 'Crescent park east', x: 205, z: 300, rx: 62, rz: 40, kind: 'lawn' },
  { name: 'Island garden', x: 0, z: 48, rx: 34, rz: 34, kind: 'parterre' },
  { name: 'Pine forest', x: 560, z: 610, rx: 70, rz: 80, kind: 'forest' },
];
const inHPark = (x, z, m = 0) => H_PARKS.some((p) => (x - p.x) ** 2 / (p.rx + m) ** 2 + (z - p.z) ** 2 / (p.rz + m) ** 2 < 1);
const resH = (x, z, m = 0) => z < coastH(x) + 18 + m || inHPark(x, z, m) || TRIDENT.some((b) => segD(x, z, PIAZZA, b) < 8 + m) || D(x, z, ...PIAZZA) < 34 + m || Math.abs(D(x, z, ...HC) - (COVE + 32)) < 6 + m;
function pantheon(ink, x, y, z) {
  ink.box(x, y, z, 70, 2.4, 70); ink.cyl(x, y + 2.4, z + 6, 22, 20, 48); ink.cyl(x, y + 22.4, z + 6, 23.4, 1.6, 48); ink.dome(x, y + 24, z + 6, 22, 22);
  ink.box(x, y + 2.4, z - 28, 40, 1.2, 20); for (const r of [0, 1]) for (let i = 0; i < 8; i++) ink.cyl(x - 17.5 + i * 5, y + 3.6, z - 34 + r * 9, 0.8, 15, 10);
  ink.box(x, y + 18.6, z - 28, 40, 2, 20); ink.line([[x - 20, y + 20.6, z - 38], [x, y + 27, z - 38], [x + 20, y + 20.6, z - 38]]); ink.line([[x, y + 27, z - 38], [x, y + 27, z - 18]]);
}
const HARBOR = {
  id: 'puerto', name: 'Anthropos II · The Harbor', kind: 'Harbor city', tagline: 'The city wraps around a round harbor; three avenues climb to a pantheon on the hill.',
  desc: 'The same language as Anthropos (small houses forming dense masses, monuments in stone, homes covering the hills), but organized around the water. A round natural harbor sits at the center, ringed by a promenade. An island with the rotunda stands in the middle, joined by a causeway, and two breakwaters guard the mouth. Three avenues set out like a trident from the harbor plaza and climb to a pantheon with a portico on the central hill. Two beaches of low houses flank the harbor, and three hills of homes and an amphitheater sit behind. Parks include a green crescent, an island garden, and a pine forest.',
  pros: ['Boats, the promenade, and the city share the same water', 'The strongest axis: from the island to the pantheon'], cons: ['Building a harbor means marine works and permits'],
  build() {
    reseed(131); const ink = new Ink();
    landscape(ink, { coast: coastH, height: terrainH, avoid: (x, z) => z < 360 && Math.abs(x) < 470 || inHPark(x, z, 6) || H_VILL.some((v) => D(x, z, ...v) < 120) || D(x, z, 0, 640) < 70, trees: 1600, X: 760, Z1: 780, parallel: true });
    const it = [];
    it.push({ d: 0, f: () => {
      for (const r of [COVE + 27, COVE + 37]) { let p = []; for (let i = 0; i <= 200; i++) { const t = (i / 200) * Math.PI * 2, x = HC[0] + r * Math.cos(t), z = HC[1] + r * Math.sin(t); if (z > coastH(x) + 4) p.push([x, 0.25, z]); else { if (p.length > 1) ink.line(p); p = []; } } if (p.length > 1) ink.line(p); }
      ink.ring(...[PIAZZA[0], 0.25, PIAZZA[1]], 34, false, 80);
      TRIDENT.forEach((b) => { const dx = b[0] - PIAZZA[0], dz = b[1] - PIAZZA[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L; for (const o of [-7, 7]) { const p = []; for (let i = 0; i <= 24; i++) { const t = 0.12 + 0.88 * i / 24, x = PIAZZA[0] + dx * t + nx * o, z = PIAZZA[1] + dz * t + nz * o; p.push([x, terrainH(x, z) + 0.2, z]); } ink.line(p); } });
      // isla, calzada y rompeolas
      ink.cyl(0, 0, 48, 34, 1.2, 64); ink.box(70, 0, 48, 80, 1.2, 8);
      ink.box(-118, 0, -66, 66, 1.6, 7, 0.55); ink.box(118, 0, -66, 66, 1.6, 7, -0.55);
      for (let i = 0; i < 10; i++) ink.box(-120 + i * 26.6, 0, coastH(-120 + i * 26.6) - 6, 2, 1, 14);   // muelles para barcos
    } });
    it.push({ d: 1, f: () => odeon(ink, 0, 1.2, 48) });
    it.push({ d: 2, f: () => { ink.box(PIAZZA[0], 0.3, PIAZZA[1], 6, 1.2, 6); ink.cyl(PIAZZA[0], 1.5, PIAZZA[1], 1.2, 22, 12); ink.cone(PIAZZA[0], 23.5, PIAZZA[1], 1.6, 4, 12); } });  // obelisco
    const center = [], beach = [], hill = [];
    for (let gx = -24; gx <= 24; gx++) for (let gz = -8; gz <= 16; gz++) {
      const bx = gx * 19, bz = gz * 19; const r = D(bx, bz, ...HC); if (bz > 345 || r > 380 || bz < coastH(bx) + 26) continue;
      for (let side = 0; side < 4; side++) for (let k = -2; k <= 2; k++) {
        const a = side * Math.PI / 2, dx = k * 2.2, dz = 6.6, x = bx + dx * Math.cos(a) + dz * Math.sin(a), z = bz - dx * Math.sin(a) + dz * Math.cos(a);
        if (resH(x, z, 2)) continue; center.push({ x, z, r: a, rank: (r - COVE) ** 2 * 0.9 + (bx * 0.35) ** 2, fl: 4 + ((rnd() * 3) | 0) });
      }
    }
    for (let gx = -92; gx <= 92; gx++) for (let row = 0; row < 10; row++) {
      const x = gx * 7.6; if (Math.abs(x) < COVE + 60) continue; const z = coastH(x) + 40 + row * 8.2; if (resH(x, z, 3.4)) continue;
      beach.push({ x, z, r: Math.atan((coastH(x + 1) - coastH(x - 1)) / 2), w: 3.1 + rnd() * 0.8, fl: rnd() > 0.82 ? 2 : 1, rank: (Math.abs(x) - COVE) ** 2 + row * 40 });
    }
    for (let gx = -60; gx <= 60; gx++) for (let row = 0; row < 24; row++) {
      const x = gx * 11 + Math.sin(row * 0.6) * 2, z = 400 + row * 12 + Math.sin(gx * 0.4) * 2; if (resH(x, z, 4) || D(x, z, 0, 640) < 75) continue;
      const vi = H_VILL.reduce((bi, c, i) => (D(x, z, ...c) < D(x, z, ...H_VILL[bi]) ? i : bi), 0), v = H_VILL[vi];
      hill.push({ x, z, r: Math.atan2(v[0] - x, v[1] - z), w: 3.6 + rnd() * 1.1, fl: rnd() > 0.8 ? 2 : 1, rank: D(x, z, ...v) ** 2 + (vi > 1 ? 30000 : 0) });
    }
    const pick = (arr, n) => arr.sort((p, q) => p.rank - q.rank).slice(0, n);
    pick(center, 3000).forEach((p, i) => it.push({ d: 3 + i * 0.1, f: () => ink.fbox(p.x, 0.3, p.z, 2.2, p.fl * 1.32, 3, p.r) }));
    pick(beach, 1150).forEach((p, i) => it.push({ d: 320 + i * 0.1, f: () => ink.fbox(p.x, 0.3, p.z, p.w * 1.15, p.fl * 1.7, 4.5, p.r) }));
    pick(hill, 1250).forEach((p, i) => it.push({ d: 440 + i * 0.1, f: () => {
      const hs = [-1, 1].flatMap((a) => [-1, 1].map((b) => terrainH(p.x + a * 2.6, p.z + b * 2.6))), y = Math.max(...hs) + 0.8, lo = Math.min(...hs);
      ink.fbox(p.x, lo, p.z, p.w * 1.15, y - lo + 0.4, 4.6, p.r); ink.fbox(p.x, y, p.z, p.w * 1.15, p.fl * 1.7, 4.7, p.r);
    } }));
    it.push({ d: 435, f: () => pantheon(ink, 0, terrainH(0, 640), 640) });
    it.push({ d: 600, f: () => { const ax = -470, az = 430, y = terrainH(ax, az); ink.box(ax, y, az - 6, 30, 6, 8); for (let k = 0; k < 13; k++) ink.arc(ax, y + 0.4 + k * 1.3, az, 18 + k * 3.2, Math.PI * 0.08, Math.PI * 0.92, false); } });
    H_PARKS.forEach((p) => it.push({ d: D(p.x, p.z, ...HC) + 40, f: () => { if (p.kind === 'parterre') { for (let i = 0; i < 10; i++) { const a = rnd() * 6.28, r = 12 + rnd() * 18; ink.tree(p.x + r * Math.cos(a), 1.2, p.z + r * Math.sin(a), 0.8, 1); } } else parkDrawH(ink, p); } }));
    grow(ink, it);
    return { ink, zones: { all: [-620, 0, -110, 620, 80, 740], center: [-260, 0, -60, 260, 30, 330], beach: [-640, 0, -150, -150, 12, 120], hills: [-560, 0, 400, 560, 90, 740] } };
  },
};
function parkDrawH(ink, p) {
  const out = []; for (let i = 0; i < 80; i++) { const t = (i / 80) * Math.PI * 2, x = p.x + p.rx * Math.cos(t), z = p.z + p.rz * Math.sin(t); out.push([x, terrainH(x, z) + 0.3, z]); } ink.line(out, true);
  const n = p.kind === 'forest' ? 80 : 16;
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.92, x = p.x + p.rx * r * Math.cos(a), z = p.z + p.rz * r * Math.sin(a); if (p.kind === 'lawn' && r < 0.6) continue; ink.tree(x, terrainH(x, z), z, 0.85 + rnd() * 0.5, p.kind === 'forest' ? 1 : (rnd() < 0.3 ? 1 : 0)); }
  if (p.kind === 'lawn') ink.ring(p.x, 0.5, p.z, Math.min(p.rx, p.rz) * 0.5, true);
}

// ── POLIS: la metrópoli. Mismo lenguaje de tinta, otra escala: ~15,000 edificios para más de 100,000 personas.
//    Río de los cerros al mar, gran parque con lago, siete barrios con plaza propia, centro alto alrededor de un capitolio,
//    bulevares radiales, estadio, universidad en la colina, puerto y faro.
const bayP = (x) => -60 - 120 * (x / 1100) ** 2 - 10 * Math.sin(x * 0.006);
const DOWN = [0, 230];
const DISTRICTS = [[0, 230], [-430, 170], [430, 175], [-760, 120], [760, 110], [-260, 520], [300, 540]];
const DRAD = [270, 215, 215, 190, 185, 175, 185];
const river = (z) => -170 + 70 * Math.sin(z / 160) + 30 * Math.sin(z / 61);       // x del río para cada z
const PARK = { x: 40, z: 470, rx: 210, rz: 105 };
const terrainP = (x, z) => {
  const t = smooth(600, 760, z), g = (cx, cz, r, h) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));
  return t * (12 + g(-520, 860, 170, 80) + g(120, 900, 190, 95) + g(700, 860, 160, 70) + g(-950, 800, 130, 50)) + 0.6;
};
const inParkP = (x, z, m = 0) => (x - PARK.x) ** 2 / (PARK.rx + m) ** 2 + (z - PARK.z) ** 2 / (PARK.rz + m) ** 2 < 1;
const nearRiver = (x, z, m = 0) => z > bayP(x) && Math.abs(x - river(z)) < 22 + m;
const RADIALS = DISTRICTS.slice(1).map((d) => [DOWN, d]);
const resP = (x, z, m = 0) => z < bayP(x) + 70 + m || inParkP(x, z, m) || nearRiver(x, z, m) || RADIALS.some(([a, b]) => segD(x, z, a, b) < 9 + m)
  || Math.abs(Math.hypot((x - DOWN[0]) / 1.35, z - DOWN[1]) - 170) < 7 + m || DISTRICTS.some((d) => D(x, z, ...d) < 26 + m) || Math.abs(x) < 12 + m && z > DOWN[1] && z < PARK.z - PARK.rz
  || D(x, z, 640, 420) < 70 + m || D(x, z, 120, 820) < 110 + m;
function capitol(ink, x, y, z) {
  ink.box(x, y, z, 120, 3, 70); ink.box(x, y + 3, z, 96, 18, 44);
  for (let i = 0; i < 12; i++) ink.cyl(x - 33 + i * 6, y + 3, z - 26, 0.9, 17, 10);
  ink.box(x, y + 20, z - 24, 74, 2, 6); ink.cyl(x, y + 21, z, 18, 12, 40); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; ink.cyl(x + Math.cos(a) * 20, y + 21, z + Math.sin(a) * 20, 0.6, 11, 8); }
  ink.cyl(x, y + 33, z, 20.5, 1.2, 40); ink.dome(x, y + 34, z, 17, 24); ink.cyl(x, y + 51, z, 2.4, 6, 14); ink.cone(x, y + 57, z, 2.6, 5, 14);
}
function plaza(ink, x, y, z, k) {
  ink.ring(x, y + 0.3, z, 22, false, 60); ink.ring(x, y + 0.3, z, 14, true, 40);
  if (k % 2) { ink.box(x, y, z, 4, 1.4, 4); ink.cyl(x, y + 1.4, z, 1, 20, 10); ink.cone(x, y + 21.4, z, 1.3, 4, 10); }
  else { ink.cyl(x, y, z, 8, 7, 24); ink.dome(x, y + 7, z, 8, 12); }
}
const POLIS = {
  id: 'metropolis', name: 'Anthropos Polis', kind: 'Metropolis', tagline: 'A full city for more than one hundred thousand people: seven districts, a river and a great park.',
  desc: 'The same ink language at the scale of a real city: every district has its own street grid, and every block is a ring of buildings around a garden courtyard. A river comes down from the hills to the sea. A great park with a lake sits at the heart, and seven districts each have their own plaza, around a high downtown with a domed capitol. Radial boulevards and a ring order everything. Low houses line the beach, and the hills hold a university and villages. A stadium, a port and a lighthouse complete it: some fifteen thousand buildings.',
  pros: ['Room for more than 100,000 people', 'Each district is a village with its own plaza'], cons: ['Built over decades, district by district'],
  build: buildPolis,
};

export const CONCEPTS = [
  POLIS,
  ANTHROPOS,
  HARBOR,
  {
    id: 'liceo', name: 'The Lyceum', kind: 'Radial', tagline: 'Eight avenues and a colonnade at the center.',
    desc: 'A round plan in the tradition of ideal Renaissance cities. Eight avenues run out from a central court ringed by a colonnade, with an odeon under a low dome. Rings of courtyard houses step out toward the sea and the hills. An amphitheater faces the water and the academy sits on the hill.',
    pros: ['Everything within an 8-minute walk of the center', 'A strong symbol from the air'], cons: ['Harder to grow beyond the last ring'],
    build() {
      reseed(11); const ink = new Ink(), C = [0, 190];
      const flat = (x, z) => 1 - smooth(230, 330, D(x, z, ...C)), height = (x, z) => hills(x, z, flat);
      landscape(ink, { coast, height, avoid: (x, z) => D(x, z, ...C) < 290 });
      const it = [];
      [62, 124, 196, 262].forEach((r) => it.push({ d: r * 0.9, f: () => ink.ring(C[0], 0.2, C[1], r, false, 120) }));
      for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + Math.PI / 8; it.push({ d: 30, f: () => { for (const o of [-5, 5]) ink.line([[C[0] + 34 * Math.cos(t) - o * Math.sin(t), 0.2, C[1] + 34 * Math.sin(t) + o * Math.cos(t)], [C[0] + 280 * Math.cos(t) - o * Math.sin(t), 0.2, C[1] + 280 * Math.sin(t) + o * Math.cos(t)]]); } }); }
      it.push({ d: 0, f: () => { ink.dome(C[0], 9, C[1], 15); ink.cyl(C[0], 0, C[1], 15, 9, 28); colonnade(ink, -42, C[1] - 28, 42, C[1] - 28); colonnade(ink, 42, C[1] - 28, 42, C[1] + 28); colonnade(ink, 42, C[1] + 28, -42, C[1] + 28); colonnade(ink, -42, C[1] + 28, -42, C[1] - 28); } });
      for (const [r0, r1, rows] of [[72, 116, 2], [134, 188, 3], [206, 256, 2]]) for (let k = 0; k < 8; k++) {
        const t0 = k * Math.PI / 4 + Math.PI / 8 + 0.08, t1 = t0 + Math.PI / 4 - 0.16;
        for (let i = 0; i < rows; i++) { const r = lerp(r0, r1, (i + 0.5) / rows), n = Math.max(2, ((t1 - t0) * r / 30) | 0);
          for (let j = 0; j < n; j++) { const t = lerp(t0, t1, (j + 0.5) / n), x = C[0] + r * Math.cos(t), z = C[1] + r * Math.sin(t); if (z < coast(x) + 80 || rnd() < 0.1) continue;
            const h = r < 120 ? 13 + rnd() * 6 : 7 + rnd() * 5; it.push({ d: D(x, z, ...C), f: () => courtBlock(ink, x, 0, z, 22, 16, h, -t + Math.PI / 2) }); } }
      }
      const ax = -280, az = coast(-280) + 120;
      it.push({ d: 300, f: () => { for (let k = 0; k < 12; k++) ink.arc(ax, k * 1.2, az, 18 + k * 3.4, Math.PI * 0.05, Math.PI * 0.95, false); ink.box(ax, 0, az - 12, 34, 7, 8); } });
      it.push({ d: 320, f: () => { const sx = 340, sz = 320; for (let k = 0; k < 8; k++) { const p = []; for (let i = 0; i < 64; i++) { const t = i / 64 * Math.PI * 2; p.push([sx + (54 + k * 3) * Math.cos(t), k * 1.5, sz + (32 + k * 3) * Math.sin(t)]); } ink.line(p, true); } } });
      it.push({ d: 420, f: () => { const y = height(-430, 440); ink.cyl(-430, y, 440, 26, 8, 30); ink.dome(-430, y + 8, 440, 26); ink.box(-380, height(-380, 470), 470, 40, 9, 20); } });
      for (let i = 0; i < 18; i++) { const x = 280 + i * 28, z = coast(x) + 92; it.push({ d: D(x, z, ...C), f: () => ink.box(x, 0, z, 16, 6, 12) }); }
      it.push({ d: 350, f: () => { const x = 110; ink.box(x, 0, coast(x) - 70, 8, 1.2, 140); ink.box(x, 0, coast(x) - 145, 30, 1.2, 10); } });
      grow(ink, it); return { ink, zones: zonesFor(C, 200) };
    },
  },
  {
    id: 'castrum', name: 'The Forum', kind: 'Grid', tagline: 'A Roman grid with the forum where the two main streets cross.',
    desc: 'Two main streets cross at right angles: the cardo runs down to a pier and the decumanus runs along the coast. Where they meet there is a forum with a long basilica and a temple. The rest of the city is courtyard blocks of three and four floors, easy to grow by adding one more row. Villas climb the hills behind.',
    pros: ['The easiest to build in phases', 'Clear, cheap infrastructure'], cons: ['Less iconic from the air'],
    build() {
      reseed(23); const ink = new Ink(), C = [0, 140];
      const flat = (x, z) => (Math.abs(x) < 420 && z < 360 ? 1 : 0) * (1 - smooth(330, 380, z)) * (1 - smooth(390, 440, Math.abs(x))), height = (x, z) => hills(x, z, flat);
      landscape(ink, { coast, height, avoid: (x, z) => Math.abs(x) < 430 && z < 370 });
      const it = [], B = 58, G = 14;
      for (let i = -6; i <= 6; i++) for (let j = 0; j <= 4; j++) {
        const x = i * (B + G), z = 20 + j * (B + G); if (z - B / 2 < coast(x) + 70) continue;
        if (i === 0 || j === 2) continue;
        if (Math.abs(i) <= 1 && Math.abs(j - 2) <= 1) continue;
        const h = 9 + rnd() * 7; it.push({ d: D(x, z, ...C), f: () => courtBlock(ink, x, 0, z, B, B, h) });
      }
      it.push({ d: 0, f: () => {
        const fx = 0, fz = C[1] + 4;
        colonnade(ink, fx - 70, fz - 50, fx + 70, fz - 50); colonnade(ink, fx - 70, fz + 50, fx + 70, fz + 50);
        ink.box(fx, 0, fz + 72, 130, 16, 26); ink.box(fx, 0, fz - 82, 26, 4, 40); ink.box(fx, 4, fz - 82, 22, 14, 34);
        const pz = fz - 82, p = [[fx - 11, 18, pz - 17], [fx, 25, pz - 17], [fx + 11, 18, pz - 17]]; ink.line(p);
      } });
      it.push({ d: 10, f: () => { for (const o of [-7, 7]) { ink.line([[o, 0.2, coast(0) + 50], [o, 0.2, 360]]); ink.line([[-470, 0.2, C[1] + o], [470, 0.2, C[1] + o]]); } ink.box(0, 0, coast(0) - 60, 12, 1.4, 120); ink.cyl(0, 1.4, coast(0) - 124, 4, 22, 14); } });
      for (let i = 0; i < 40; i++) { const x = lerp(-600, 600, rnd()), z = lerp(420, 640, rnd()), y = height(x, z); it.push({ d: D(x, z, ...C), f: () => { ink.box(x, y, z, 18, 6, 12, rnd()); } }); }
      grow(ink, it); return { ink, zones: zonesFor(C, 0) };
    },
  },
  {
    id: 'malecon', name: 'The Promenade', kind: 'Linear', tagline: 'Two kilometers of arcade facing the sea.',
    desc: 'A linear city running along the beach. A continuous colonnade on the promenade, with cafés, studios and homes behind it, leaves every door within two minutes of the sea. Short streets climb the hill to terraced houses. There are three piers and a lighthouse at the end.',
    pros: ['Everyone lives near the sea', 'Grows sideways without limit'], cons: ['Long trips from one end to the other'],
    build() {
      reseed(31); const ink = new Ink(), C = [0, 0];
      const band = (x, z) => z < coast(x) + 210 ? 1 - smooth(coast(x) + 150, coast(x) + 210, z) : 0, height = (x, z) => hills(x, z, band);
      landscape(ink, { coast, height, avoid: (x, z) => z < coast(x) + 220 && Math.abs(x) < 720 });
      const it = [];
      it.push({ d: 0, f: () => { const p = [], q = []; for (let x = -700; x <= 700; x += 6) { p.push([x, 0.2, coast(x) + 62]); q.push([x, 0.2, coast(x) + 74]); } ink.line(p); ink.line(q); } });
      for (let x = -690; x <= 690; x += 9) { const z = coast(x) + 70; it.push({ d: Math.abs(x), f: () => ink.cyl(x, 0, z, 0.6, 8, 6) }); }
      for (let x = -680; x <= 680; x += 34) {
        const z = coast(x) + 92; if (Math.abs(x % 170) < 10) continue;
        const h = 10 + rnd() * 8; it.push({ d: Math.abs(x) + 1, f: () => ink.box(x, 0, z, 30, h, 22, -Math.atan(Math.cos(x / 250) * 38 / 250)) });
        for (let r = 0; r < 3; r++) { const zz = coast(x) + 140 + r * 26, xx = x + rnd() * 8 - 4, y = height(xx, zz); it.push({ d: Math.abs(x) + 30 + r, f: () => ink.box(xx, y, zz, 16, 6, 12) }); }
      }
      for (const x of [-420, 0, 420]) it.push({ d: Math.abs(x) + 5, f: () => { ink.box(x, 0, coast(x) - 55, 9, 1.3, 110); ink.box(x, 0, coast(x) - 112, 34, 1.3, 9); } });
      it.push({ d: 720, f: () => { const x = 700, z = coast(700) + 30; ink.cyl(x, 0, z, 5, 30, 16); ink.cone(x, 30, z, 6, 8, 16); } });
      grow(ink, it); return { ink, zones: { ...zonesFor([0, coast(0) + 110], 0), center: [-260, 0, coast(0) - 40, 260, 30, coast(0) + 190] } };
    },
  },
  {
    id: 'archipielago', name: 'The Villages', kind: 'Garden', tagline: 'Six villages in a park, joined by paths.',
    desc: 'Instead of one city, there are six villages of about 40 homes each, set across hills and beach in a large park. Each has its own plaza and its own tower or dome. A lake sits at the center and footpaths join everything. This is the garden-city idea: more nature than street.',
    pros: ['The most nature and privacy', 'Each village can have its own identity'], cons: ['Lower density; more walking between villages'],
    build() {
      reseed(41); const ink = new Ink(), C = [0, 260];
      const V = [[-430, 120], [-170, 360], [120, 140], [360, 380], [520, 120], [-560, 470]];
      const height = (x, z) => hills(x, z);
      landscape(ink, { coast, height, trees: 900, avoid: (x, z) => V.some(([vx, vz]) => D(x, z, vx, vz) < 95) || D(x, z, 0, 270) < 60 });
      const it = [];
      it.push({ d: 0, f: () => { ink.ring(0, height(0, 270) + 0.3, 270, 52, false, 90); ink.ring(0, height(0, 270) + 0.3, 270, 46, true, 90); } });
      V.forEach(([vx, vz], vi) => {
        const y0 = height(vx, vz);
        it.push({ d: D(vx, vz, ...C), f: () => { ink.ring(vx, y0 + 0.3, vz, 18, false); if (vi % 2) { ink.cyl(vx, y0, vz, 6, 26, 12); ink.cone(vx, y0 + 26, vz, 7, 9, 12); } else { ink.cyl(vx, y0, vz, 10, 7, 20); ink.dome(vx, y0 + 7, vz, 10, 10); } } });
        for (let k = 0; k < 2; k++) for (let i = 0; i < (k ? 22 : 14); i++) {
          const r = k ? 72 : 44, t = (i / (k ? 22 : 14)) * Math.PI * 2 + k * 0.2, x = vx + r * Math.cos(t), z = vz + r * Math.sin(t);
          if (z < coast(x) + 70) continue; const y = height(x, z);
          it.push({ d: D(vx, vz, ...C) + r, f: () => ink.box(x, y, z, 12, 5 + rnd() * 3, 10, -t) });
        }
      });
      const path = (a, b) => { const p = []; for (let i = 0; i <= 30; i++) { const t = i / 30, x = lerp(a[0], b[0], t) + Math.sin(t * Math.PI) * 40, z = lerp(a[1], b[1], t) - Math.sin(t * Math.PI) * 30; p.push([x, height(x, z) + 0.4, z]); } ink.line(p, false, false); };
      it.push({ d: 1, f: () => V.forEach((v) => path(v, [0, 270])) });
      grow(ink, it); return { ink, zones: { all: [-760, 0, -150, 760, 80, 640], center: [-260, 0, 120, 260, 40, 420], beach: [-600, 0, -150, 640, 30, 220], hills: [-660, 0, 300, 520, 150, 640] } };
    },
  },
  {
    id: 'acropolis', name: 'The Acropolis', kind: 'Hill town', tagline: 'Terraces climbing to an academy at the summit.',
    desc: 'A hill town in the Mediterranean tradition. Houses follow the contour lines in terraces, a stepped street climbs in zigzags, and at the top stands the academy with its colonnade, visible from the whole coast. Below lie a sheltered harbor with two breakwaters and a theater carved into the slope.',
    pros: ['Views of the sea from every home', 'The most memorable silhouette'], cons: ['Steep slopes: more expensive to build'],
    build() {
      reseed(53); const ink = new Ink(), C = [0, 300];
      const height = (x, z) => { const base = hills(x, z); const inland = z - coast(x) - 55; if (inland < 0) return 0; return base * 0.55 + 135 * Math.exp(-((x - C[0]) ** 2 + (z - C[1]) ** 2) / (2 * 150 ** 2)) * smooth(0, 120, inland); };
      landscape(ink, { coast, height, contour: 7, avoid: (x, z) => D(x, z, ...C) < 230 });
      const it = [];
      for (let ring = 0; ring < 7; ring++) {
        const r = 210 - ring * 28, n = Math.max(6, (r * 2 * Math.PI / 30) | 0);
        for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2 + ring * 0.3, x = C[0] + r * Math.cos(t), z = C[1] + r * 0.85 * Math.sin(t); if (z < coast(x) + 80 || rnd() < 0.15) continue; const y = height(x, z);
          it.push({ d: 400 - y, f: () => ink.box(x, y - 2, z, 14, 7 + rnd() * 3, 11, -t) }); }
      }
      it.push({ d: 0, f: () => { const y = height(...C); ink.box(C[0], y - 3, C[1], 90, 3, 56); colonnade(ink, -40, C[1] - 22, 40, C[1] - 22, y); colonnade(ink, -40, C[1] + 22, 40, C[1] + 22, y); colonnade(ink, -40, C[1] - 22, -40, C[1] + 22, y); colonnade(ink, 40, C[1] - 22, 40, C[1] + 22, y); ink.box(C[0], y, C[1], 50, 14, 24); } });
      it.push({ d: 2, f: () => { const p = []; for (let i = 0; i <= 24; i++) { const z = lerp(coast(0) + 60, C[1] - 40, i / 24), x = (i % 2 ? 24 : -24); p.push([x, height(x, z) + 0.5, z]); } ink.line(p); } });
      it.push({ d: 380, f: () => { const tx = 150, tz = 180, y = height(tx, tz); for (let k = 0; k < 12; k++) ink.arc(tx, y - 10 + k * 1.6, tz, 16 + k * 3.2, Math.PI * 1.08, Math.PI * 1.92, false); } });
      it.push({ d: 420, f: () => { const z0 = coast(0); const a = []; for (let i = 0; i <= 30; i++) { const t = i / 30 * Math.PI * 0.55; a.push([-220 + 120 * Math.sin(t), 1.2, z0 - 10 - 120 * Math.sin(t) * 0.9]); } ink.line(a); const b = a.map(([x, y, z]) => [-x, y, z]); ink.line(b); for (let i = 0; i < 9; i++) ink.box(-120 + i * 30, 0, z0 + 70, 22, 8, 14); } });
      grow(ink, it); return { ink, zones: { all: [-760, 0, -200, 760, 140, 640], center: [-220, 0, 90, 220, 140, 470], beach: [-360, 0, coast(0) - 160, 360, 20, coast(0) + 160], hills: [-440, 0, 140, 440, 150, 560] } };
    },
  },
  {
    id: 'laguna', name: 'The Lagoon', kind: 'Canals', tagline: 'Islands of houses between canals that enter from the sea.',
    desc: 'The sea comes into the city. A grand curving canal and a grid of smaller canals divide the neighborhood into islands of homes joined by bridges, as in Venice or Amsterdam. On the main square by the water stand a basilica with a dome and a tower. You arrive by boat or on foot.',
    pros: ['The most unusual and photogenic', 'Water everywhere, even far from the beach'], cons: ['Engineering and permits are the most complex'],
    build() {
      reseed(67); const ink = new Ink(), C = [0, 140];
      const flat = (x, z) => (Math.abs(x) < 380 && z < 330 ? 1 : 0), height = (x, z) => hills(x, z, flat);
      landscape(ink, { coast, height, avoid: (x, z) => Math.abs(x) < 390 && z < 340 });
      const it = [], gc = (z) => 160 * Math.sin((z - coast(0)) / 120);
      it.push({ d: 0, f: () => { for (const o of [-14, 14]) { const p = []; for (let z = coast(0); z <= 320; z += 5) p.push([gc(z) + o, 0.2, z]); ink.line(p); } for (let z = coast(0) + 10; z < 320; z += 7) ink.line([[gc(z) - 12, 0.1, z], [gc(z) + 12, 0.1, z]], false, true); } });
      const cx = [-330, -220, -110, 110, 220, 330], cz = [40, 130, 220, 310];
      it.push({ d: 5, f: () => { cx.forEach((x) => { for (const o of [-5, 5]) ink.line([[x + o, 0.2, coast(x) + 20], [x + o, 0.2, 330]]); }); cz.forEach((z) => { for (const o of [-5, 5]) ink.line([[-380, 0.2, z + o], [380, 0.2, z + o]]); }); } });
      for (let i = 0; i < cx.length - 1; i++) for (let j = 0; j < cz.length - 1; j++) {
        const x0 = cx[i] + 7, x1 = cx[i + 1] - 7, z0 = cz[j] + 7, z1 = cz[j + 1] - 7;
        for (let x = x0 + 8; x < x1 - 4; x += 15) for (const z of [z0 + 8, z1 - 8]) { if (Math.abs(x - gc(z)) < 24 || z < coast(x) + 70) continue; const h = 10 + rnd() * 6; it.push({ d: D(x, z, ...C), f: () => ink.box(x, 0, z, 13, h, 13) }); }
      }
      it.push({ d: 1, f: () => { const bx = gc(70) + 60, bz = 70; ink.box(bx, 0, bz, 40, 16, 30); ink.cyl(bx, 16, bz, 11, 6, 20); ink.dome(bx, 22, bz, 11); ink.box(bx - 40, 0, bz - 4, 8, 44, 8); ink.cone(bx - 40, 44, bz - 4, 6, 10, 4); } });
      cz.forEach((z) => cx.forEach((x) => it.push({ d: D(x, z, ...C) + 3, f: () => ink.arc(x, 1, z, 6, 0, Math.PI, false, 10) })));
      grow(ink, it); return { ink, zones: zonesFor(C, 0) };
    },
  },
];
export const byId = (id) => CONCEPTS.find((c) => c.id === id) || CONCEPTS[0];
