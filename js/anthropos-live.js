// ANTHROPOS · render en vivo de Anthropos Polis (la ciudad de concepts.js) con look de maqueta profesional.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Ink } from './cityengine.js';
import { buildPolis, bayP, terrainP, river, PARK, DISTRICTS, DRAD, DOWN } from './polis.js';

const $ = (s) => document.querySelector(s);
const MOBILE = matchMedia('(max-width:760px)').matches || matchMedia('(hover:none)').matches;
const prog = (p, t) => { $('#lb').style.width = p + '%'; if (t) $('#lt').textContent = t; };

// grain
(() => { const c = $('#grain'), x = c.getContext('2d'); c.width = 256; c.height = 256; const id = x.createImageData(256, 256);
  (function g() { const d = id.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = Math.random() * 255; d[i + 3] = 255 } x.putImageData(id, 0, 0); setTimeout(() => requestAnimationFrame(g), 80) })() })();

// ── trees go to their own buffer so they can be green ──
const _tree = Ink.prototype.tree;
Ink.prototype.tree = function (...a) {
  const f = this.faces, c = this.colors, e = this.edges;
  this.faces = this._tf || (this._tf = []); this.colors = this._tc || (this._tc = []); this.edges = this._te || (this._te = []);
  _tree.apply(this, a); this.faces = f; this.colors = c; this.edges = e;
};

// ── renderer ──
const canvas = $('#gl');
const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = .92;
R.shadowMap.enabled = !MOBILE; R.shadowMap.type = THREE.PCFSoftShadowMap;
const S = new THREE.Scene();
{ const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#2a5d93'); g.addColorStop(.5, '#86afd3'); g.addColorStop(.8, '#e3ecf2'); g.addColorStop(1, '#c9d9e4'); x.fillStyle = g; x.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; S.background = t; }
S.fog = new THREE.Fog(0xcfdde8, 2600, 6000);
{ const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromScene(new RoomEnvironment(), .04).texture; }
const cam = new THREE.PerspectiveCamera(36, 1, 2, 9000);
S.add(new THREE.HemisphereLight(0xdfeaff, 0x55604a, .35));
const SUN = new THREE.DirectionalLight(0xffe4c0, 3.4); SUN.position.set(-900, 820, -520); SUN.castShadow = true;
SUN.shadow.mapSize.set(4096, 4096); Object.assign(SUN.shadow.camera, { left: -1300, right: 1300, top: 1000, bottom: -1000, near: 50, far: 3500 });
SUN.shadow.bias = -.0004; SUN.shadow.normalBias = 1.2; SUN.target.position.set(0, 0, 350); S.add(SUN, SUN.target);

// ── the city ──
prog(15, 'Drawing Anthropos…');
const { ink } = buildPolis();
prog(55, 'Raising the buildings…');

// windows on vertical faces (no textures, pure shader)
function windows(mat) {
  mat.customProgramCacheKey = () => 'win';
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.)).xyz;vWN=normalize(mat3(modelMatrix)*normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side=1.-smoothstep(.3,.6,abs(vWN.y));
        vec2 q=vec2(abs(vWN.x)>abs(vWN.z)?vWP.z:vWP.x,vWP.y);
        vec2 f=fract(q/vec2(2.6,3.1));
        float win=smoothstep(.18,.22,f.x)*smoothstep(.82,.78,f.x)*smoothstep(.3,.34,f.y)*smoothstep(.86,.82,f.y)*side*step(2.4,vWP.y);
        diffuseColor.rgb*=mix(.8,1.,smoothstep(0.,9.,vWP.y));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.34,.44,.52),win*.85);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.08,win);');
  };
  return mat;
}
const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return g; };
const city = new THREE.Group(); S.add(city);
{ const g = geo(ink.faces); g.computeVertexNormals();
  const m = new THREE.Mesh(g, windows(new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: .55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })));
  m.castShadow = m.receiveShadow = true; city.add(m); }
if (ink._tf) { const g = geo(ink._tf); g.computeVertexNormals();
  const cols = new Float32Array(ink._tf.length), c = new THREE.Color();
  for (let i = 0; i < ink._tf.length; i += 9) { c.setHSL(.24 + Math.random() * .07, .32 + Math.random() * .12, .26 + Math.random() * .1); for (let k = 0; k < 9; k += 3) { cols[i + k] = c.r; cols[i + k + 1] = c.g; cols[i + k + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true, side: THREE.DoubleSide }));
  m.castShadow = m.receiveShadow = true; city.add(m); }
city.add(new THREE.LineSegments(geo(ink.edges), new THREE.LineBasicMaterial({ color: 0x2c3038, transparent: true, opacity: .28 })));
city.add(new THREE.LineSegments(geo(ink.details), new THREE.LineBasicMaterial({ color: 0x51585f, transparent: true, opacity: .16 })));

// ── terrain surface under the drawing ──
prog(75, 'Shaping the bay…');
const RIV = (x, z) => (z > bayP(x) - 10 ? Math.abs(x - river(z)) : 1e9);
const LAKE = (x, z) => (x - PARK.x - 40) ** 2 / 76 ** 2 + (z - PARK.z) ** 2 / 36 ** 2;
{ const N = MOBILE ? 220 : 380, g = new THREE.PlaneGeometry(3400, 2300, N, Math.round(N * .68)); g.rotateX(-Math.PI / 2); g.translate(0, 0, 330);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const sand = new THREE.Color(0xe6d6b0), sage = new THREE.Color(0xa3b78c), deep = new THREE.Color(0x6f9260), dry = new THREE.Color(0xc2b48a), pave = new THREE.Color(0xdcd6cb), park = new THREE.Color(0x86ad62), bed = new THREE.Color(0x2c5a6d);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), coast = bayP(x); let y;
    if (z < coast) { y = -2 - Math.min(14, (coast - z) * .05); c.copy(bed); }
    else {
      y = terrainP(x, z) - .05;
      const n = Math.sin(x * .013) * Math.cos(z * .011) * .5 + .5;
      c.copy(sage).lerp(deep, n * .5).lerp(dry, Math.min(1, Math.max(0, (y - 20) / 70)));
      if (z < coast + 52) c.copy(sand);
      const di = DISTRICTS.findIndex((d, k) => Math.hypot(x - d[0], z - d[1]) < DRAD[k] * 1.08); if (di >= 0) c.lerp(pave, .75);
      if ((x - PARK.x) ** 2 / PARK.rx ** 2 + (z - PARK.z) ** 2 / PARK.rz ** 2 < 1) c.copy(park);
      if (RIV(x, z) < 17 || LAKE(x, z) < 1) { y = -1.6; c.copy(bed); }
    }
    p.setY(i, y); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.receiveShadow = true; S.add(m); }
const wn = new THREE.TextureLoader().load('img/tex/waternormals.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
const water = new Water(new THREE.PlaneGeometry(12000, 12000), { textureWidth: MOBILE ? 256 : 1024, textureHeight: MOBILE ? 256 : 1024, waterNormals: wn,
  sunDirection: SUN.position.clone().normalize(), sunColor: 0xfff0d8, waterColor: 0x0f3f5c, distortionScale: 3, fog: true });
water.rotation.x = -Math.PI / 2; water.position.y = -.3; S.add(water);

// ── places you can tap ──
const P = (x, z, y = 12) => [x, Math.max(terrainP(x, z), 0) + y, z];
const ITEMS = {
  capitol: { cat: 'Civic heart', name: 'The Capitol', pin: P(0, 230, 62), desc: 'The heart of Anthropos. Citizens meet under the dome to debate and vote on the city charter. Its forecourt opens to the sea, with two fountains, and its mall runs straight to the great park.', stats: [['Dome', '34 m'], ['Forecourt', '160 × 160 m'], ['Governance', 'Charter']] },
  downtown: { cat: 'District', name: 'Downtown', pin: P(-140, 300, 70), desc: 'The densest district: towers and perimeter blocks wrapped around quiet inner courtyards. Everything you need is a short walk from the Capitol.', stats: [['Height', 'Up to 30 floors'], ['Blocks', 'Courtyard type'], ['Walk to Capitol', '≤ 10 min']] },
  mall: { cat: 'Public space', name: 'The Mall', pin: P(40, 380, 10), desc: 'A long promenade with a mirror of water and rows of trees, from the steps of the Capitol to the edge of the great park.', stats: [['Length', '~200 m'], ['Water mirror', 'Yes']] },
  park: { cat: 'Nature', name: 'The Great Park', pin: P(40, 470, 16), desc: 'The lungs of the city: a lake with islands, winding paths and groves of trees, in the middle of the districts.', stats: [['Size', '420 × 210 m'], ['Lake', 'With islands']] },
  river: { cat: 'Nature', name: 'The River', pin: P(river(420), 420, 10), desc: 'The river crosses the city to the bay, lined with promenades and trees. Bridges carry every avenue and the ring across it.', stats: [['Bridges', 'On every avenue'], ['Banks', 'Tree-lined walks']] },
  ring: { cat: 'Movement', name: 'Ring Boulevard', pin: P(229, 230, 10), desc: 'An elliptical, tree-lined boulevard around the center, with radial avenues out to each district. Streets are made for walking, bikes and trams.', stats: [['Shape', 'Ellipse'], ['Avenues', '6 radials']] },
  west: { cat: 'District', name: 'West Districts', pin: P(-430, 170, 40), desc: 'Neighbourhoods of four- and five-storey blocks, each around its own plaza with a fountain or a chapel.', stats: [['Districts', '3'], ['Height', '3–6 floors']] },
  east: { cat: 'District', name: 'East Districts', pin: P(430, 175, 40), desc: 'Mirror of the west: a grid of courtyard blocks turned toward the center, with a plaza at the heart of each district.', stats: [['Districts', '3'], ['Height', '3–6 floors']] },
  stadium: { cat: 'Leisure', name: 'Stadium', pin: P(640, 420, 34), desc: 'An oval stadium with its own forecourt and ring of trees, for games, concerts and festivals.', stats: [['Shape', 'Oval bowl'], ['Uses', 'Sport · Music · Festivals']] },
  university: { cat: 'Knowledge', name: 'University', pin: P(120, 820, 40), desc: 'On the first slopes of the hills: a domed library at the center of a quadrangle of colleges.', stats: [['Library', 'Domed'], ['Layout', 'Quadrangle']] },
  hills: { cat: 'Nature', name: 'Hill Villages', pin: P(-520, 860, 30), desc: 'Villages of small houses on the green hills behind the city, oriented to the view of the bay.', stats: [['Villages', '3'], ['Homes', 'Low, scattered']] },
  beach: { cat: 'Coast', name: 'Beach & Promenade', pin: P(-250, bayP(-250) + 28, 10), desc: 'Three rows of low beach houses between the seafront promenade and the sand, along the whole bay.', stats: [['Beach', 'Whole bay'], ['Houses', 'Low, 1–2 floors']] },
  port: { cat: 'Coast', name: 'Port', pin: P(380, bayP(380) - 60, 10), desc: 'Piers, a breakwater and harbour warehouses on the east side of the bay.', stats: [['Piers', '4'], ['Warehouses', '12']] },
  lighthouse: { cat: 'Coast', name: 'Lighthouse', pin: [-980, 50, bayP(-980) - 10], desc: 'The lighthouse at the west point of the bay, the first thing you see arriving by sea.', stats: [['Height', '43 m']] },
};
const ORDER = Object.keys(ITEMS);
const CATS = [['All', null], ['Civic', ['capitol', 'mall', 'ring', 'university']], ['Districts', ['downtown', 'west', 'east']], ['Nature', ['park', 'river', 'hills']], ['Coast', ['beach', 'port', 'lighthouse']], ['Leisure', ['stadium']]];

// ── post ──
const composer = new EffectComposer(R); composer.addPass(new RenderPass(S, cam)); composer.addPass(new OutputPass());

// ── controls ──
const HOME = { p: new THREE.Vector3(780, 620, -760), t: new THREE.Vector3(0, 0, 330) };
cam.position.copy(HOME.p);
const ctl = new OrbitControls(cam, canvas);
ctl.target.copy(HOME.t); ctl.enableDamping = true; ctl.dampingFactor = .06; ctl.maxPolarAngle = Math.PI * .45; ctl.minDistance = 60; ctl.maxDistance = 2600;
ctl.enableZoom = false; ctl.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: THREE.MOUSE.PAN };
ctl.autoRotate = true; ctl.autoRotateSpeed = .25;
function dolly(f) { const v = cam.position.clone().sub(ctl.target); const l = THREE.MathUtils.clamp(v.length() * f, ctl.minDistance, ctl.maxDistance); cam.position.copy(ctl.target).add(v.setLength(l)); }
canvas.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); dolly(1 + e.deltaY * .01); } }, { passive: false });
let pd = 0; canvas.addEventListener('touchmove', (e) => { if (e.touches.length === 2) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); if (pd) dolly(pd / d); pd = d; } }, { passive: true });
canvas.addEventListener('touchend', () => (pd = 0));
let flight = null;
$('#zin').onclick = () => fly(null, .6); $('#zout').onclick = () => fly(null, 1.6);
let idleT = 0; ctl.addEventListener('start', () => { ctl.autoRotate = false; idleT = 0; stopTour(); });
function fly(it, zoom) {
  const fromP = cam.position.clone(), fromT = ctl.target.clone(); let toT, toP;
  if (it) { toT = new THREE.Vector3(...it.pin); toT.y *= .4; const dir = fromP.clone().sub(fromT); dir.y = 0; dir.normalize(); const dist = it.dist || 300; toP = toT.clone().add(dir.multiplyScalar(dist)); toP.y = toT.y + dist * .6; }
  else { toT = fromT.clone(); toP = toT.clone().add(fromP.clone().sub(fromT).multiplyScalar(zoom)); }
  flight = { fromP, fromT, toP, toT, t: 0, dur: it ? 2.2 : .8 };
}

// ── pins, dock, info ──
const pinEls = {};
ORDER.forEach((id, i) => { const it = ITEMS[id]; const e = document.createElement('div'); e.className = 'pin'; e.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span>${it.name}</span>`;
  e.onclick = (ev) => { ev.stopPropagation(); select(id); }; $('#pins').appendChild(e); pinEls[id] = e; });
let filter = null;
CATS.forEach(([n, ids], k) => { const b = document.createElement('button'); b.className = 'chip' + (k === 0 ? ' on' : ''); b.innerHTML = `<i></i>${n}`;
  b.onclick = () => { document.querySelectorAll('.dock .chip:not(#tour)').forEach((c) => c.classList.remove('on')); b.classList.add('on'); filter = ids; stopTour(); if (ids) select(ids[0]); else deselect(); }; $('#dock').appendChild(b); });
let sel = null;
function select(id) {
  sel = id; const it = ITEMS[id], info = $('#info'); info.classList.add('swap');
  setTimeout(() => { $('#iCat').textContent = it.cat; $('#iName').textContent = it.name; $('#iDesc').textContent = it.desc;
    $('#iStats').innerHTML = (it.stats || []).map(([a, b]) => `<li><span>${a}</span><em>${b}</em></li>`).join('');
    $('#iFlow').innerHTML = ''; $('#iIdx').textContent = String(ORDER.indexOf(id) + 1).padStart(2, '0') + ' / ' + ORDER.length; info.classList.remove('swap'); }, 180);
  $('#stage').classList.add('sel'); Object.entries(pinEls).forEach(([k, e]) => e.classList.toggle('on', k === id)); ctl.autoRotate = false; fly(it);
}
function deselect() { sel = null; $('#stage').classList.remove('sel'); Object.values(pinEls).forEach((e) => e.classList.remove('on'));
  flight = { fromP: cam.position.clone(), fromT: ctl.target.clone(), toP: HOME.p.clone(), toT: HOME.t.clone(), t: 0, dur: 2.2 }; ctl.autoRotate = true; }
$('#iClose').onclick = () => { stopTour(); deselect(); };
const step = (d) => { const list = filter || ORDER; let i = list.indexOf(sel); i = (i + d + list.length) % list.length; select(list[i]); };
$('#iNext').onclick = () => { stopTour(); step(1); }; $('#iPrev').onclick = () => { stopTour(); step(-1); };
addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'Escape') deselect(); });
let tour = null;
function startTour() { tour = { i: -1, t: 0 }; $('#tour').classList.add('on'); $('#tour').innerHTML = '<i></i>■ Stop tour'; nextTour(); }
function nextTour() { tour.i = (tour.i + 1) % ORDER.length; tour.t = 0; select(ORDER[tour.i]); }
function stopTour() { if (!tour) return; tour = null; $('#tour').classList.remove('on'); $('#tour').innerHTML = '<i></i>▶ Tour the city'; $('#tourbar').style.width = 0; }
$('#tour').onclick = () => (tour ? stopTour() : startTour());

// ── loop ──
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); composer.setSize(w, h); cam.aspect = w / h; cam.fov = w < 760 ? 50 : 36; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(), tv = new THREE.Vector3(); let visible = true;
new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe($('#stage'));
function frame() {
  requestAnimationFrame(frame); if (!visible) return;
  const dt = Math.min(clock.getDelta(), .05);
  water.material.uniforms.time.value += dt * .4;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ORDER.forEach((id) => { const e = pinEls[id]; tv.set(...ITEMS[id].pin).project(cam); const vis = tv.z < 1 && Math.abs(tv.x) < 1.02 && Math.abs(tv.y) < 1.02;
    e.classList.toggle('hide', !vis); e.classList.toggle('dimmed', !!filter && !filter.includes(id)); e.style.transform = `translate(${(tv.x * .5 + .5) * w - 9}px,${(-tv.y * .5 + .5) * h - 9}px)`; });
  if (flight) { flight.t += dt / flight.dur; const k = flight.t >= 1 ? 1 : 1 - Math.pow(1 - flight.t, 3); cam.position.lerpVectors(flight.fromP, flight.toP, k); ctl.target.lerpVectors(flight.fromT, flight.toT, k); if (flight.t >= 1) flight = null; }
  if (!ctl.autoRotate && !sel && !tour) { idleT += dt; if (idleT > 8) ctl.autoRotate = true; }
  if (tour && !flight) { tour.t += dt; $('#tourbar').style.width = (tour.t / 7 * 100) + '%'; if (tour.t > 7) nextTour(); }
  ctl.update(); composer.render();
}
prog(100, 'Ready'); setTimeout(() => $('#load').classList.add('gone'), 400);
frame();

$('#f').onsubmit = (e) => { e.preventDefault(); location.href = 'mailto:hello@anthroposcities.com?subject=Founding%20citizen&body=' + encodeURIComponent(e.target[0].value); $('#ok').textContent = 'Thank you. Your mail app will open to confirm.'; };
