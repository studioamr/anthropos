// ANTHROPOS · motor del mapa: dibujo de tinta (caras blancas + líneas), cámara ortográfica y render solo cuando cambia algo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const PAPER = 0xfafaf8;
let seed = 7;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
export const reseed = (s) => (seed = s);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── El cuaderno de tinta: todo se acumula en 4 buffers y se marca por elemento para poder "crecer" la ciudad ──
export class Ink {
  faces = []; colors = []; edges = []; details = []; dots = []; marks = [];
  solid(geo, x, y, z, ry = 0, edgeAngle = 30, outline = true) {
    const m = new THREE.Matrix4().makeRotationY(ry); m.setPosition(x, y, z); geo.applyMatrix4(m);
    const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals();
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      this.faces.push(p.getX(i), p.getY(i), p.getZ(i));
      const s = 0.925 + 0.065 * Math.max(n.getY(i), 0) + 0.03 * n.getX(i) - 0.012 * n.getZ(i);
      this.colors.push(s, s, s * 0.996);
    }
    if (outline) { const e = new THREE.EdgesGeometry(geo, edgeAngle).getAttribute('position'); for (let i = 0; i < e.count; i++) this.edges.push(e.getX(i), e.getY(i), e.getZ(i)); }
    if (g !== geo) g.dispose(); geo.dispose();
  }
  box(x, y, z, w, h, d, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); this.solid(g, x, y, z, ry); }
  cyl(x, y, z, r, h, seg = 20) { const g = new THREE.CylinderGeometry(r, r, h, seg); g.translate(0, h / 2, 0); this.solid(g, x, y, z, 0, 40); }
  cone(x, y, z, r, h, seg = 8) { const g = new THREE.ConeGeometry(r, h, seg); g.translate(0, h / 2, 0); this.solid(g, x, y, z, 0, 40); }
  dome(x, y, z, r, ribs = 12) {
    this.solid(new THREE.SphereGeometry(r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, y, z, 0, 80, false);
    this.ring(x, y, z, r, false);
    for (let k = 0; k < ribs; k++) { const t = (k / ribs) * Math.PI * 2, pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push([x + Math.cos(t) * r * Math.cos(a), y + r * Math.sin(a), z + Math.sin(t) * r * Math.cos(a)]); } this.line(pts, false, true); }
  }
  tree(x, y, z, s = 1, kind = 0) {
    if (kind) this.cone(x, y, z, 2.2 * s, 11 * s, 7);
    else { this.line([[x, y, z], [x, y + 3 * s, z]]); this.solid(new THREE.IcosahedronGeometry(3.6 * s, 0), x, y + 5.5 * s, z, rnd() * 3, 20); }
  }
  line(pts, close = false, detail = false) {
    const t = detail ? this.details : this.edges;
    for (let i = 0; i < pts.length - (close ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; t.push(a[0], a[1], a[2], b[0], b[1], b[2]); }
  }
  ring(x, y, z, r, detail = true, n = 72) { const p = []; for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; p.push([x + Math.cos(t) * r, y, z + Math.sin(t) * r]); } this.line(p, true, detail); }
  arc(x, y, z, r, a0, a1, detail = true, n = 40) { const p = []; for (let i = 0; i <= n; i++) { const t = lerp(a0, a1, i / n); p.push([x + Math.cos(t) * r, y, z + Math.sin(t) * r]); } this.line(p, false, detail); }
  dot(x, y, z) { this.dots.push(x, y, z); }
  mark(d) { this.marks.push({ d, f: this.faces.length / 3, e: this.edges.length / 3, l: this.details.length / 3, p: this.dots.length / 3 }); }
}

// ── Paisaje común: mar, playa, curvas de nivel (marching squares) y árboles ──
export function landscape(ink, { coast, height, X = 900, Z0 = -380, Z1 = 820, step = 9, contour = 8, avoid = () => false, trees = 520, sea = 18 }) {
  for (let k = 1; k <= sea; k++) {
    const pts = []; let on = true;
    for (let x = -X; x <= X; x += 6) {
      const z = coast(x) - k * 15 - 3 * Math.sin(x / 40 + k), gap = Math.sin(x / 31 + k * 1.7) + Math.sin(x / 11 + k) > -0.4;
      if (gap && on) pts.push([x, 0, z]); else { if (pts.length > 1) ink.line(pts, false, true); pts.length = 0; }
      on = true;
    }
    if (pts.length > 1) ink.line(pts, false, true);
  }
  const shore = []; for (let x = -X; x <= X; x += 4) shore.push([x, 0, coast(x)]); ink.line(shore);
  const dune = []; for (let x = -X; x <= X; x += 5) dune.push([x, 0, coast(x) + 52]); ink.line(dune, false, true);
  for (let i = 0; i < 7000; i++) { const x = lerp(-X, X, rnd()), t = rnd() ** 1.7; ink.dot(x, 0, coast(x) + 2 + t * 48); }
  // curvas de nivel con marching squares
  const nx = Math.ceil((2 * X) / step), nz = Math.ceil((Z1 - Z0) / step), H = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -X + i * step, z = Z0 + j * step; H[j * (nx + 1) + i] = z < coast(x) + 52 ? -1 : height(x, z); }
  const seg = (a, b) => ink.details.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const h0 = H[j * (nx + 1) + i], h1 = H[j * (nx + 1) + i + 1], h2 = H[(j + 1) * (nx + 1) + i + 1], h3 = H[(j + 1) * (nx + 1) + i];
    if (h0 < 0 || h1 < 0 || h2 < 0 || h3 < 0) continue;
    const lo = Math.min(h0, h1, h2, h3), hi = Math.max(h0, h1, h2, h3);
    const x0 = -X + i * step, z0 = Z0 + j * step;
    for (let L = Math.ceil(lo / contour) * contour; L <= hi; L += contour) {
      if (L <= 2) continue;
      const P = [], C = [[x0, z0, h0], [x0 + step, z0, h1], [x0 + step, z0 + step, h2], [x0, z0 + step, h3]];
      for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; if ((a[2] < L) !== (b[2] < L)) { const t = (L - a[2]) / (b[2] - a[2]); P.push([lerp(a[0], b[0], t), L, lerp(a[1], b[1], t)]); } }
      if (P.length >= 2) seg(P[0], P[1]); if (P.length === 4) seg(P[2], P[3]);
    }
  }
  for (let i = 0; i < trees; i++) {
    const x = lerp(-X + 20, X - 20, rnd()), z = lerp(0, Z1 - 40, rnd());
    if (z < coast(x) + 64 || avoid(x, z)) continue;
    ink.tree(x, height(x, z), z, 0.8 + rnd() * 0.6, rnd() < 0.25 ? 1 : 0);
  }
  ink.mark(-1);
}

// ── Vista: monta el dibujo en un elemento con botones data-view / data-act ──
export function mountView(root, build, opts = {}) {
  const cv = root.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene(); scene.background = new THREE.Color(PAPER);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 12000);
  const ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.minZoom = 0.35; ctl.maxZoom = 24;
  ctl.minPolarAngle = 0.02; ctl.maxPolarAngle = 1.25; ctl.zoomSpeed = 1.1; ctl.enableZoom = !opts.noWheel;
  ctl.touches.ONE = THREE.TOUCH.ROTATE; ctl.touches.TWO = THREE.TOUCH.DOLLY_PAN; cv.style.touchAction = 'none';

  let model = null, zones = {}, view = opts.view || 'all', plan = false, dirty = 60, pending = false, visible = false;
  let grow = null; const GROW_MS = opts.growMs || 5200;
  const wake = () => { if (pending || !visible) return; pending = true; requestAnimationFrame(tick); };
  const redraw = () => { dirty = 60; wake(); };

  function load(make) {
    if (model) { scene.remove(model.group); model.dispose(); }
    model = compile(make()); zones = model.zones; scene.add(model.group);
    frame(view, true); replay(); still();
  }
  function still() { if (document.hidden) model.reveal(1); ctl.update(); renderer.render(scene, cam); const ld = root.querySelector('.c3-loading'); ld && ld.classList.add('done'); }
  function compile({ ink, zones }) {
    const group = new THREE.Group(), geos = [];
    const add = (arr, mk) => { if (!arr.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const o = mk(g); geos.push(g); group.add(o); return g; };
    const fg = add(ink.faces, (g) => { g.setAttribute('color', new THREE.Float32BufferAttribute(ink.colors, 3)); return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, side: THREE.DoubleSide })); });
    const eg = add(ink.edges, (g) => new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x161616 })));
    const lg = add(ink.details, (g) => new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xa2a29b })));
    const pg = add(ink.dots, (g) => new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8a8a84, size: 1.4, sizeAttenuation: false })));
    // marcas ordenadas: primero el paisaje (d = -1), luego del centro hacia afuera
    const marks = ink.marks;
    const reveal = (p) => {
      const k = Math.max(0, Math.min(marks.length - 1, Math.floor(p * (marks.length - 1))));
      const m = p >= 1 ? { f: Infinity, e: Infinity, l: Infinity, p: Infinity } : marks[k];
      fg && fg.setDrawRange(0, m.f); eg && eg.setDrawRange(0, m.e * 1); lg && lg.setDrawRange(0, m.l); pg && pg.setDrawRange(0, m.p);
    };
    return { group, zones, reveal, dispose: () => { geos.forEach((g) => g.dispose()); group.traverse((o) => o.material && o.material.dispose()); } };
  }
  let fw = 900, fh = 600;
  function size() {
    const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
    const a = w / h, ext = Math.max(fh, fw / a);
    cam.left = (-ext * a) / 2; cam.right = -cam.left; cam.top = ext / 2; cam.bottom = -cam.top; cam.updateProjectionMatrix();
    renderer.setSize(w, h, false); redraw();
  }
  let tz = null;
  function frame(name = view, instant = false) {
    view = name; const b = zones[name] || zones.all; const t = new THREE.Vector3((b[0] + b[3]) / 2, Math.min(30, (b[1] + b[4]) / 2), (b[2] + b[5]) / 2);
    const off = plan ? new THREE.Vector3(0.0001, 2600, -0.04) : new THREE.Vector3(...(opts.angle || [900, 1250, -1650]));
    const from = { p: cam.position.clone(), t: ctl.target.clone(), z: cam.zoom };
    ctl.target.copy(t); cam.position.copy(t).add(off); cam.lookAt(t); cam.updateMatrixWorld();
    const xs = [], ys = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) { const v = new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse); xs.push(v.x); ys.push(v.y); }
    fw = Math.max(200, Math.max(...xs) - Math.min(...xs)) * 1.06; fh = Math.max(150, Math.max(...ys) - Math.min(...ys)) * 1.06;
    const to = { p: cam.position.clone(), t: t.clone() };
    if (!instant) { cam.position.copy(from.p); ctl.target.copy(from.t); tz = { t0: performance.now(), from, to, z0: cam.zoom, z1: 1 }; }
    else { cam.zoom = 1; }
    size(); ctl.update();
    root.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-selected', x.dataset.view === (plan ? 'plan' : view)));
  }
  function replay() { grow = { t0: null }; model.reveal(0); redraw(); }
  const zoomBy = (f) => { tz = { t0: performance.now(), z0: cam.zoom, z1: THREE.MathUtils.clamp(cam.zoom * f, ctl.minZoom, ctl.maxZoom), dur: 260 }; redraw(); };
  root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => { const v = b.dataset.view; if (v === 'plan') { plan = !plan; frame(view === 'plan' ? 'all' : view); } else { plan = false; frame(v === 'center' ? 'center' : v); } }));
  root.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { const a = b.dataset.act; if (a === 'replay') replay(); if (a === 'in') zoomBy(1.45); if (a === 'out') zoomBy(1 / 1.45); }));
  ctl.addEventListener('change', redraw);
  ctl.addEventListener('start', () => { tz = null; });
  new ResizeObserver(size).observe(root);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) redraw(); }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', redraw);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  function tick(now) {
    pending = false; if (!visible || !model) return;
    let busy = false;
    if (grow) {
      if (grow.t0 === null) grow.t0 = now;
      const p = reduce ? 1 : Math.min(1, (now - grow.t0) / GROW_MS); model.reveal(ease(p)); busy = p < 1; if (!busy) grow = null;
    }
    if (tz) {
      const p = Math.min(1, (now - tz.t0) / (tz.dur || 900)), k = ease(p);
      if (tz.from) { cam.position.lerpVectors(tz.from.p, tz.to.p, k); ctl.target.lerpVectors(tz.from.t, tz.to.t, k); }
      cam.zoom = lerp(tz.z0, tz.z1, k); cam.updateProjectionMatrix(); busy = busy || p < 1; if (p >= 1) tz = null;
    }
    ctl.update();
    if (dirty > 0 || busy) { renderer.render(scene, cam); dirty--; }
    if (dirty > 0 || busy) wake();
    const ld = root.querySelector('.c3-loading'); if (ld && !ld.classList.contains('done')) ld.classList.add('done');
  }
  if (/[?&]debug/.test(location.search)) window.__city = { shot: async (n, v, z = 1, p = false) => { plan = p; frame(v || 'all', true); cam.zoom = z; cam.updateProjectionMatrix(); model.reveal(1); ctl.update(); renderer.render(scene, cam); const t0 = performance.now(); renderer.render(scene, cam); const ms = performance.now() - t0; await fetch('/shot?n=' + n, { method: 'POST', body: cv.toDataURL('image/jpeg', 0.85) }); return ms; }, load: (b) => load(b) };
  load(build);
  return { load: (b) => load(b), replay, frame };
}
