// LYCEON · la ciudad en nube de puntos (Three.js). Todo el trazo sale de este archivo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── PRNG determinista: la ciudad sale igual siempre ──
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ── geografía: x a lo largo de la costa, z tierra adentro (negativo = mar) ──
const C = { x: 0, z: 170 };                                    // centro del Liceo
const coast = (x) => -110 + 38 * Math.sin(x / 250) + 14 * Math.sin(x / 83 + 1.3);
const height = (x, z) => {
  const inland = z - coast(x) - 55;
  if (inland < 0) return 0;
  let h = smooth(0, 520, inland) * (70 + 46 * Math.sin(x / 170 + 0.6) * Math.cos(z / 120) + 22 * Math.sin(x / 61) * Math.sin(z / 47));
  h += smooth(250, 700, inland) * 80;
  const d = Math.hypot(x - C.x, z - C.z);
  return h * smooth(150, 300, d) + 1.5 * (1 - smooth(150, 300, d));     // el valle plano de la ciudad
};

export function buildCity() {
  seed = 7;
  const P = [], D = [], A = [], S = [];
  const add = (x, y, z, delay, a = 1, s = 1) => { P.push(x, y, z); D.push(delay); A.push(a); S.push(s); };
  const dl = (x, z, extra = 0) => Math.hypot(x - C.x, z - C.z) / 420 * 3.2 + extra + rnd() * 0.35;

  // 1 · mar: líneas de oleaje discontinuas
  for (let k = 1; k <= 16; k++) {
    for (let x = -900; x <= 900; x += 2.6) {
      const n = Math.sin(x / 37 + k * 1.7) + Math.sin(x / 13 + k);
      if (n < -0.2) continue;
      const z = coast(x) - k * 17 - 3 * Math.sin(x / 40 + k);
      add(x, 0, z, 3.4 + k * 0.08 + Math.abs(x) / 900 * 0.6, 0.42 - k * 0.018, 0.9);
    }
  }
  // 2 · playa: arena punteada y orilla
  for (let i = 0; i < 26000; i++) {
    const x = lerp(-900, 900, rnd()), t = rnd() ** 1.6;
    const z = coast(x) + t * 52;
    add(x, 0, z, dl(x, z, 0.4), 0.5 - t * 0.25, 0.8);
  }
  for (let x = -900; x <= 900; x += 1.4) add(x, 0, coast(x), dl(x, coast(x), 0.2), 0.95, 1.1);
  // malecón
  for (let x = -520; x <= 520; x += 2) { const z = coast(x) + 58; add(x, 0.4, z, dl(x, z), 0.8); }

  // 3 · cerros: curvas de nivel + punteado ligero
  for (let x = -900; x <= 900; x += 2.2) {
    for (let z = -60; z <= 760; z += 2.2) {
      if (z < coast(x) + 52) continue;
      const h = height(x, z);
      const f = (h / 9) % 1;
      if (h > 4 && (f < 0.08 || f > 0.96)) add(x + rnd(), h, z + rnd(), dl(x, z, 0.6), 0.55, 0.85);
      else if (rnd() < 0.012) add(x, h, z, dl(x, z, 0.8), 0.28, 0.8);
    }
  }
  // árboles: racimos
  for (let i = 0; i < 520; i++) {
    const x = lerp(-880, 880, rnd()), z = lerp(0, 740, rnd());
    if (z < coast(x) + 70 || Math.hypot(x - C.x, z - C.z) < 250 && rnd() < 0.85) continue;
    const h = height(x, z), r = 4 + rnd() * 5, n = 26 + (rnd() * 30 | 0);
    for (let j = 0; j < n; j++) {
      const u = rnd() * 6.283, v = Math.acos(2 * rnd() - 1);
      add(x + r * Math.sin(v) * Math.cos(u), h + r * 0.9 + r * Math.cos(v) * 0.8, z + r * Math.sin(v) * Math.sin(u), dl(x, z, 1), 0.75, 0.9);
    }
  }

  // 4 · la ciudad: anillos, radiales, manzanas
  const ring = (r, step = 1.6, a = 0.85) => { for (let t = 0; t < 6.283; t += step / r) add(C.x + r * Math.cos(t), 0.3, C.z + r * Math.sin(t), dl(C.x + r * Math.cos(t), C.z + r * Math.sin(t)), a); };
  [58, 62, 118, 124, 196].forEach((r) => ring(r));
  for (let k = 0; k < 8; k++) {
    const t = k * Math.PI / 4 + Math.PI / 8;
    for (let r = 30; r <= 260; r += 1.6) for (const o of [-3, 3]) {
      const x = C.x + r * Math.cos(t) - o * Math.sin(t), z = C.z + r * Math.sin(t) + o * Math.cos(t);
      if (z < coast(x) + 58) continue;
      add(x, 0.3, z, dl(x, z), 0.8);
    }
  }
  const box = (cx, cz, w, d, h, rot, delayBase, dens = 1.4) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const pt = (lx, y, lz, a = 1) => add(cx + lx * c - lz * s, y, cz + lx * s + lz * c, delayBase + y / 60, a);
    const edge = (x0, y0, z0, x1, y1, z1) => { const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = Math.max(2, L / dens | 0); for (let i = 0; i <= n; i++) pt(lerp(x0, x1, i / n), lerp(y0, y1, i / n), lerp(z0, z1, i / n)); };
    const W = w / 2, Dd = d / 2;
    for (const y of [0, h]) { edge(-W, y, -Dd, W, y, -Dd); edge(W, y, -Dd, W, y, Dd); edge(W, y, Dd, -W, y, Dd); edge(-W, y, Dd, -W, y, -Dd); }
    for (const [x, z] of [[-W, -Dd], [W, -Dd], [W, Dd], [-W, Dd]]) edge(x, 0, z, x, h, z);
    // ventanas: punteado en fachadas
    for (let y = 3; y < h - 1; y += 3.2) for (let x = -W + 2; x < W - 1; x += 2.4) { if (rnd() < 0.35) { pt(x, y, -Dd, 0.32); pt(x, y, Dd, 0.32); } }
  };
  // manzanas entre anillos, partidas por las radiales
  const bands = [[70, 112, 3], [132, 188, 4], [204, 250, 3]];
  for (const [r0, r1, rows] of bands) {
    for (let k = 0; k < 8; k++) {
      const t0 = k * Math.PI / 4 + Math.PI / 8 + 0.07, t1 = t0 + Math.PI / 4 - 0.14;
      for (let i = 0; i < rows; i++) {
        const r = lerp(r0, r1, (i + 0.5) / rows);
        const nArc = Math.max(2, ((t1 - t0) * r / 22) | 0);
        for (let j = 0; j < nArc; j++) {
          const t = lerp(t0, t1, (j + 0.5) / nArc);
          const x = C.x + r * Math.cos(t), z = C.z + r * Math.sin(t);
          if (z < coast(x) + 70) continue;
          if (rnd() < 0.12) continue;                                   // patios y plazas
          const h = r0 < 100 ? 14 + rnd() * 14 : 7 + rnd() * 12 * (1 - r / 300);
          box(x, z, 13 + rnd() * 5, 9 + rnd() * 4, h, t + Math.PI / 2, dl(x, z, 0.3));
        }
      }
    }
  }
  // el Liceo: peripatos (columnata) alrededor de un patio, con la cúpula del Odeón
  const colon = (cx, cz, w, d, delayBase) => {
    for (const [x0, z0, x1, z1] of [[-w, -d, w, -d], [w, -d, w, d], [w, d, -w, d], [-w, d, -w, -d]]) {
      const L = Math.hypot(x1 - x0, z1 - z0);
      for (let s = 0; s <= L; s += 5) {
        const x = cx + lerp(x0, x1, s / L), z = cz + lerp(z0, z1, s / L);
        for (let y = 0; y <= 11; y += 0.9) add(x, y, z, delayBase + y / 30, 0.75);
      }
      for (let s = 0; s <= L; s += 0.9) { const x = cx + lerp(x0, x1, s / L), z = cz + lerp(z0, z1, s / L); add(x, 11.5, z, delayBase + 0.5); add(x, 12.3, z, delayBase + 0.55); }
    }
  };
  colon(C.x, C.z, 40, 26, 0.25); colon(C.x, C.z, 34, 20, 0.3);
  const dome = (cx, cz, R, n, y0, delayBase) => {
    const g = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) { const y = i / n, r = Math.sqrt(1 - y * y), t = g * i; add(cx + R * r * Math.cos(t), y0 + R * y, cz + R * r * Math.sin(t), delayBase + y * 0.6, 0.6); }
    for (let t = 0; t < 6.283; t += 0.04) for (let y = 0; y < y0; y += 1.2) add(cx + R * Math.cos(t), y, cz + R * Math.sin(t), delayBase, 0.7);
  };
  dome(C.x, C.z, 15, 1100, 6, 0.4);
  // anfiteatro frente al mar
  { const ax = -250, az = coast(-250) + 110;
    for (let k = 0; k < 14; k++) { const r = 18 + k * 3.2; for (let t = Math.PI * 0.05; t < Math.PI * 0.95; t += 1.1 / r) add(ax + r * Math.cos(t), k * 1.1, az + r * Math.sin(t), dl(ax, az, 0.2 + k * 0.02), 0.85); }
    box(ax, az - 10, 30, 8, 7, 0, dl(ax, az, 0.3)); }
  // estadio
  { const sx = 330, sz = 300;
    for (let k = 0; k < 10; k++) { const a = 52 + k * 2.6, b = 32 + k * 2.6; for (let t = 0; t < 6.283; t += 1 / a) add(sx + a * Math.cos(t), k * 1.4, sz + b * Math.sin(t), dl(sx, sz, 0.2 + k * 0.03), 0.8); }
    for (let i = 0; i < 900; i++) { const t = rnd() * 6.283, r = Math.sqrt(rnd()); add(sx + 44 * r * Math.cos(t), 0.2, sz + 25 * r * Math.sin(t), dl(sx, sz, 0.4), 0.35); } }
  // academia en la colina (dos cúpulas menores) y residencias de la playa
  dome(-420, 420, 26, 2200, 4, 2.1); dome(-372, 452, 14, 900, 2, 2.2);
  for (let i = 0; i < 22; i++) { const x = 300 + i * 26 + rnd() * 8, z = coast(x) + 84 + rnd() * 26; box(x, z, 16, 12, 6 + rnd() * 3, 0.1 * rnd(), dl(x, z, 0.5)); }
  for (let i = 0; i < 16; i++) { const x = -720 + i * 24 + rnd() * 6, z = coast(x) + 86 + rnd() * 30; box(x, z, 14, 11, 6, 0.08, dl(x, z, 0.5)); }
  // muelle
  for (const o of [-4, 4]) for (let s = 0; s < 150; s += 1.2) { const x = 120 + o, z = coast(120) - s; add(x, 1, z, dl(x, z, 0.6), 0.9); }
  for (let t = 0; t < 6.283; t += 0.03) add(120 + 18 * Math.cos(t), 1, coast(120) - 150 + 12 * Math.sin(t), 3.3, 0.9);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('aDelay', new THREE.Float32BufferAttribute(D, 1));
  geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(A, 1));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(S, 1));
  return geo;
}

const VIEWS = {
  center: { pos: [430, 560, -420], tgt: [0, 0, 190] },
  beach: { pos: [-520, 38, -170], tgt: [60, 8, 40] },
  hills: { pos: [40, 420, -560], tgt: [0, 40, 320] },
  plan: { pos: [0, 1180, 168], tgt: [0, 0, 170] },
};

export function mountCity(root, opts = {}) {
  const cv = root.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.setClearColor(0xffffff, 1);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 1, 6000);
  const geo = buildCity();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uInk: { value: new THREE.Color(0x111111) } },
    vertexShader: `attribute float aDelay; attribute float aAlpha; attribute float aSize; uniform float uTime; uniform float uPx; varying float vA;
      void main(){ float t = clamp((uTime - aDelay) / .7, 0., 1.); vA = t * aAlpha; vec3 p = position; p.y += (1. - t) * 14.;
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPx * clamp(900. / -mv.z, 1.05, 2.6); }`,
    fragmentShader: `uniform vec3 uInk; varying float vA; void main(){ if (vA <= .01) discard; vec2 c = gl_PointCoord - .5; if (dot(c, c) > .25) discard; gl_FragColor = vec4(uInk, vA * .92); }`,
  });
  scene.add(new THREE.Points(geo, mat));

  const ctl = new OrbitControls(cam, cv);
  ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.minDistance = 90; ctl.maxDistance = 2200; ctl.maxPolarAngle = Math.PI * 0.49;
  ctl.enableZoom = !opts.noWheel; ctl.zoomSpeed = 0.7; ctl.rotateSpeed = 0.55;
  const v0 = VIEWS.center; cam.position.set(...v0.pos); ctl.target.set(...v0.tgt); ctl.update();

  let tween = null;
  const go = (name) => {
    const v = VIEWS[name]; if (!v) return;
    tween = { t0: performance.now(), p0: cam.position.clone(), q0: ctl.target.clone(), p1: new THREE.Vector3(...v.pos), q1: new THREE.Vector3(...v.tgt) };
    root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === name));
  };
  root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => go(b.dataset.view)));
  const dolly = (f) => { const d = cam.position.clone().sub(ctl.target).multiplyScalar(f); const L = d.length(); if (L < ctl.minDistance || L > ctl.maxDistance) return; tween = { t0: performance.now(), dur: 600, p0: cam.position.clone(), q0: ctl.target.clone(), p1: ctl.target.clone().add(d), q1: ctl.target.clone() }; };
  let start = performance.now();
  root.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => {
    const a = b.dataset.act;
    if (a === 'replay') { start = performance.now(); mat.uniforms.uTime.value = 0; }
    if (a === 'in') dolly(0.72);
    if (a === 'out') dolly(1.38);
  }));
  ctl.addEventListener('start', () => (tween = null));

  const size = () => { const w = root.clientWidth, h = root.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(root); size();

  let vis = false, began = false;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !began) { began = true; start = performance.now(); } }, { threshold: 0.15 }).observe(root);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const load = root.querySelector('.c3-loading');
  let first = true;
  const loop = (ms) => {
    requestAnimationFrame(loop);
    if (!vis && !first) return;
    mat.uniforms.uTime.value = reduce ? 99 : (began ? (ms - start) / 1000 : 0);
    if (tween) {
      tween.t = Math.min(1, (ms - tween.t0) / (tween.dur || 1600)); const k = 1 - Math.pow(1 - tween.t, 3);
      cam.position.lerpVectors(tween.p0, tween.p1, k); ctl.target.lerpVectors(tween.q0, tween.q1, k);
      if (tween.t >= 1) tween = null;
    }
    ctl.update(); renderer.render(scene, cam);
    if (first) { first = false; load && load.classList.add('done'); }
  };
  requestAnimationFrame(loop);
  return { go };
}
