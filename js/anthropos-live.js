// ANTHROPOS · render en vivo de Anthropos Polis (la ciudad de concepts.js) con look de maqueta profesional.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Ink } from './cityengine.js';
import { buildPolis, bayP, terrainP, river, PARK, DISTRICTS, DRAD, DOWN } from './polis.js';

const $ = (s) => document.querySelector(s);
const MOBILE = matchMedia('(max-width:760px)').matches || matchMedia('(hover:none)').matches;
const prog = (p) => { $('#lb').style.width = p + '%'; };

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

const _mark = Ink.prototype.mark;
Ink.prototype.mark = function (d) { _mark.call(this, d); this.marks[this.marks.length - 1].t = this._tf ? this._tf.length / 3 : 0; };

// ── renderer ──
const canvas = $('#gl');
const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
R.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
R.shadowMap.enabled = !MOBILE; R.shadowMap.type = THREE.PCFSoftShadowMap;
const S = new THREE.Scene();
{ const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0e0f12'); g.addColorStop(.25, '#3a3d44'); g.addColorStop(.42, '#9da1aa'); g.addColorStop(.5, '#eef0f3'); g.addColorStop(.53, '#8d9098'); g.addColorStop(1, '#16171a');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  const sg2 = x.createRadialGradient(150, 250, 0, 150, 250, 120); sg2.addColorStop(0, 'rgba(255,255,255,1)'); sg2.addColorStop(.2, 'rgba(235,238,245,.7)'); sg2.addColorStop(1, 'rgba(220,224,230,0)'); x.fillStyle = sg2; x.fillRect(0, 0, 1024, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; S.background = t;
  const pm = new THREE.PMREMGenerator(R); S.environment = pm.fromEquirectangular(t).texture; }
S.fog = new THREE.Fog(0xb8bcc4, 3200, 12000);
const cam = new THREE.PerspectiveCamera(36, 1, 2, 16000);
const HEMI = new THREE.HemisphereLight(0xe8ebf0, 0x3a3c42, .5); S.add(HEMI);
const NIGHT = { value: 0 };
const SUN = new THREE.DirectionalLight(0xffffff, 3.6); SUN.position.set(-2200, 1700, -900); SUN.castShadow = true;
SUN.shadow.mapSize.set(4096, 4096); Object.assign(SUN.shadow.camera, { left: -2600, right: 2600, top: 1800, bottom: -1800, near: 50, far: 7000 });
SUN.shadow.bias = -.0004; SUN.shadow.normalBias = 1.2; SUN.target.position.set(0, 0, 800); S.add(SUN, SUN.target);

// ── the city ──
prog(15, 'Drawing Anthropos…');
const { ink } = buildPolis();
prog(55, 'Raising the buildings…');

// growth: every vertex knows when its building is raised (bt 0..1), uP sweeps 0→1
const UP = { value: 0 };
const M = ink.marks, NM = M.length;
function btFor(count, key) { const a = new Float32Array(count); let k = 0;
  for (let v = 0; v < count; v++) { while (k < NM - 1 && v >= (M[k][key] ?? 0)) k++; a[v] = M[k].d < 0 ? 0 : k / NM; } return a; }
const GROW = `if(distance(position.xz,vec2(120.,820.))<92.)transformed.y=-60.;float gk=clamp((uP*1.12-bt)*16.,0.,1.);float ge=gk<=0.?0.0001:1.+2.7*pow(gk-1.,3.)+1.7*pow(gk-1.,2.);transformed.y*=max(ge,.0001);`;
function grow(mat, key) {
  const prev = mat.onBeforeCompile; mat.customProgramCacheKey = () => 'grow' + key;
  mat.onBeforeCompile = (sh, r) => { sh.uniforms.uP = UP;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float bt;uniform float uP;').replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GROW);
    if (prev) prev(sh, r); };
  return mat;
}
// windows on vertical faces (no textures, pure shader)
function windows(mat) {
  mat.customProgramCacheKey = () => 'win';
  mat.onBeforeCompile = (sh) => { sh.uniforms.uNight = NIGHT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.)).xyz;vWN=normalize(mat3(modelMatrix)*normal);');
    sh.vertexShader = sh.vertexShader.replace('vWP=(modelMatrix*vec4(position,1.)).xyz;', 'vWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;uniform float uNight;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side=1.-smoothstep(.3,.6,abs(vWN.y));
        vec2 q=vec2(abs(vWN.x)>abs(vWN.z)?vWP.z:vWP.x,vWP.y);
        vec2 f=fract(q/vec2(2.6,3.1));
        float win=smoothstep(.18,.22,f.x)*smoothstep(.82,.78,f.x)*smoothstep(.3,.34,f.y)*smoothstep(.86,.82,f.y)*side*step(2.4,vWP.y);
        float tower=smoothstep(26.,40.,vWP.y);
        win=max(win,side*tower*smoothstep(.05,.12,f.y)*smoothstep(.98,.9,f.y));
        diffuseColor.rgb*=mix(.82,1.,smoothstep(0.,9.,vWP.y));
        float band=side*(1.-step(3.2,vWP.y));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.62,band);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.075,.085),win*.92);
        float lit=step(.42,fract(sin(dot(floor(q/vec2(2.6,3.1))+floor(vWP.xz*.03)*7.,vec2(12.9898,78.233)))*43758.5453));
        totalEmissiveRadiance+=win*lit*uNight*vec3(1.,.76,.45)*2.4;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.04,win);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.92,win);');
  };
  return mat;
}
const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return g; };
const city = new THREE.Group(); S.add(city);
const depthGrow = () => grow(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'd');
const UNI = [120, 820];
{ const g = geo(ink.faces); g.computeVertexNormals(); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.faces.length / 3, 'f'), 1));
  const PAL = [0xe9ebee, 0xc9ccd2, 0xb3b7bf, 0xdcdfe4, 0xa4a8b0, 0xf4f5f7, 0x8f939b].map((c) => new THREE.Color(c));
  const P = ink.faces, col = new Float32Array(P.length), c = new THREE.Color(), roof = new THREE.Color(0xd9cfc2);
  for (let i = 0; i < P.length; i += 9) { const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
    const k = Math.floor(cx / 7.5) * 7919 + Math.floor(cz / 7.5) * 104729; const h = Math.abs(Math.sin(k) * 43758.5453) % 1;
    c.copy(PAL[Math.floor(h * PAL.length)]);
    const ny = Math.abs((P[i + 4] - P[i + 1]) * 0); if (P[i + 1] === P[i + 4] && P[i + 4] === P[i + 7] && P[i + 1] > 3) { if (h * 7 % 1 < .7) c.setHSL(0, 0, .22 + (h * 13 % 1) * .1); else c.setHSL(0, 0, .7); }
    for (let v = 0; v < 9; v += 3) { col[i + v] = c.r; col[i + v + 1] = c.g; col[i + v + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, grow(windows(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .28, metalness: .5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })), 'f'));
  m.customDepthMaterial = depthGrow(); m.castShadow = m.receiveShadow = true; city.add(m); }
if (ink._tf) { const g = geo(ink._tf); g.computeVertexNormals(); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink._tf.length / 3, 't'), 1));
  const cols = new Float32Array(ink._tf.length), c = new THREE.Color();
  for (let i = 0; i < ink._tf.length; i += 9) { c.setHSL(0, 0, .22 + Math.random() * .2); for (let k = 0; k < 9; k += 3) { cols[i + k] = c.r; cols[i + k + 1] = c.g; cols[i + k + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, grow(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true, side: THREE.DoubleSide }), 't'));
  m.customDepthMaterial = depthGrow(); m.castShadow = m.receiveShadow = true; city.add(m); }
{ const g = geo(ink.edges); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.edges.length / 3, 'e'), 1)); city.add(new THREE.LineSegments(g, grow(new THREE.LineBasicMaterial({ color: 0x5a4a52, transparent: true, opacity: .06 }), 'e'))); }
{ const g = geo(ink.details); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.details.length / 3, 'l'), 1)); city.add(new THREE.LineSegments(g, grow(new THREE.LineBasicMaterial({ color: 0x7a6a62, transparent: true, opacity: .1 }), 'l'))); }

// ── terrain surface under the drawing ──
prog(75, 'Shaping the bay…');
const vh = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (vh(ix, iz) * (1 - u) + vh(ix + 1, iz) * u) * (1 - v) + (vh(ix, iz + 1) * (1 - u) + vh(ix + 1, iz + 1) * u) * v; };
const ridged = (x, z) => { let a = 0, f = 1, w = .5; for (let k = 0; k < 5; k++) { a += w * (1 - Math.abs(vn(x * f, z * f) * 2 - 1)) ** 2; f *= 2.1; w *= .5; } return a; };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function HW(x, z) { const coast = bayP(x); if (z < coast) return -2 - Math.min(14, (coast - z) * .05);
  let h = terrainP(x, z) + 150 * Math.exp(-((x + 1500) ** 2) / 700 ** 2 - ((z - 1950) ** 2) / 300 ** 2);
  const m = Math.max(sstep(2500, 3700, z), sstep(2700, 3900, Math.abs(x)) * sstep(coast + 300, coast + 1200, z));
  return h + m * (260 + 900 * ridged(x * .00055, z * .00055)); }
const RIV = (x, z) => (z > bayP(x) - 10 ? Math.abs(x - river(z)) : 1e9);
const LAKE = (x, z) => (x - PARK.x - 40) ** 2 / 76 ** 2 + (z - PARK.z) ** 2 / 36 ** 2;
{ const N = MOBILE ? 220 : 380, g = new THREE.PlaneGeometry(3400, 2300, N, Math.round(N * .68)); g.rotateX(-Math.PI / 2); g.translate(0, 0, 330);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const sand = new THREE.Color(0xd4d6da), sage = new THREE.Color(0x8e9299), deep = new THREE.Color(0x63676e), dry = new THREE.Color(0xa6a9af), pave = new THREE.Color(0xc4c7cc), park = new THREE.Color(0x585c63), bed = new THREE.Color(0x1d4f7a);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), coast = bayP(x); let y;
    if (z < coast) { y = -2 - Math.min(14, (coast - z) * .05); c.copy(bed); }
    else {
      y = HW(x, z) - .05;
      const n = Math.sin(x * .013) * Math.cos(z * .011) * .5 + .5;
      c.copy(sage).lerp(deep, n * .5).lerp(dry, Math.min(1, Math.max(0, (y - 20) / 70)));
      if (z < coast + 52) c.copy(sand);
      const di = DISTRICTS.findIndex((d, k) => Math.hypot(x - d[0], z - d[1]) < DRAD[k] * 1.08); if (di >= 0) c.lerp(pave, .28 + .2 * (Math.sin(x * .09) * Math.sin(z * .09) > .6 ? 1 : 0));
      if ((x - PARK.x) ** 2 / PARK.rx ** 2 + (z - PARK.z) ** 2 / PARK.rz ** 2 < 1) c.copy(park);
      if (RIV(x, z) < 17 || LAKE(x, z) < 1) { y = -1.6; c.copy(bed); }
    }
    p.setY(i, y); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.receiveShadow = true; S.add(m); }
// the wider world: plains, the western ridge and a mountain wall behind; the sea only in front
{ const N = MOBILE ? 200 : 360, g = new THREE.PlaneGeometry(11000, 8000, N, Math.round(N * .73)); g.rotateX(-Math.PI / 2); g.translate(0, 0, 1800);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const sand = new THREE.Color(0xd4d6da), sage = new THREE.Color(0x8e9299), forest = new THREE.Color(0x4c5056), rock = new THREE.Color(0x777b82), snow = new THREE.Color(0xf4f5f7), bed = new THREE.Color(0x1d4f7a);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), coast = bayP(x), y = HW(x, z);
    if (z < coast) c.copy(bed); else if (z < coast + 52) c.copy(sand);
    else { c.copy(sage).lerp(forest, sstep(60, 260, y) * .8 + vn(x * .004, z * .004) * .15).lerp(rock, sstep(380, 700, y)).lerp(snow, sstep(780, 980, y)); }
    const inner = Math.abs(x) < 1690 && z > -810 && z < 1470; p.setY(i, inner ? Math.min(y, 0) - 6 : y - .45); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.receiveShadow = true; S.add(m); }
// ── urban forest: trees in every street, courtyard and gap ──
{ const CS = 3, X0 = -1300, Z0 = -500, NX = Math.ceil(2600 / CS), NZ = Math.ceil(1600 / CS), occ = new Uint8Array(NX * NZ);
  const F = ink.faces;
  for (let i = 0; i < F.length; i += 9) { const ymax = Math.max(F[i + 1], F[i + 4], F[i + 7]); if (ymax < 2.2) continue;
    const x0 = Math.min(F[i], F[i + 3], F[i + 6]), x1 = Math.max(F[i], F[i + 3], F[i + 6]), z0 = Math.min(F[i + 2], F[i + 5], F[i + 8]), z1 = Math.max(F[i + 2], F[i + 5], F[i + 8]);
    if (x1 - x0 > 160 || z1 - z0 > 160) continue;
    for (let gx = Math.floor((x0 - X0) / CS) - 1; gx <= Math.floor((x1 - X0) / CS) + 1; gx++) for (let gz = Math.floor((z0 - Z0) / CS) - 1; gz <= Math.floor((z1 - Z0) / CS) + 1; gz++) if (gx >= 0 && gz >= 0 && gx < NX && gz < NZ) occ[gz * NX + gx] = 1; }
  const T = [], N = MOBILE ? 7000 : 15000; let tries = 0;
  while (T.length < N && tries++ < N * 12) { const x = X0 + Math.random() * 2600, z = Z0 + Math.random() * 1600;
    const coast = bayP(x); if (z < coast + 58) continue; const gx = Math.floor((x - X0) / CS), gz = Math.floor((z - Z0) / CS); if (occ[gz * NX + gx]) continue;
    if (RIV(x, z) < 22 || LAKE(x, z) < 1.15) continue; if (Math.hypot(x - UNI[0], z - UNI[1]) < 95) continue;
    const inCity = DISTRICTS.some((d, k) => Math.hypot(x - d[0], z - d[1]) < DRAD[k] * 1.1); if (!inCity && Math.random() < .6) continue;
    T.push([x, HW(x, z), z, .7 + Math.random() * .9]); }
  const leafM = new THREE.MeshStandardMaterial({ roughness: .35, metalness: .5 }), trunkM = new THREE.MeshStandardMaterial({ color: 0x6b4f38, roughness: 1 });
  const growTree = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uP = UP; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uP;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 ip=instanceMatrix[3].xz;float gk=clamp((uP*1.12-length(ip-vec2(0.,250.))/1500.)*10.,0.,1.);transformed*=max(gk,.0001);`); }; m.customProgramCacheKey = () => 'treegrow'; return m; };
  const can = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.5, 1), growTree(leafM), T.length), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .5, 4, 5), growTree(trunkM), T.length);
  const o = new THREE.Object3D(), cc = new THREE.Color();
  T.forEach(([x, y, z, s], i) => { o.position.set(x, y + 2 * s, z); o.scale.setScalar(s); o.rotation.set(0, Math.random() * 6, 0); o.updateMatrix(); tr.setMatrixAt(i, o.matrix);
    o.position.y = y + 5.6 * s; o.scale.set(s * (1 + Math.random() * .3), s * (1.1 + Math.random() * .4), s * (1 + Math.random() * .3)); o.updateMatrix(); can.setMatrixAt(i, o.matrix);
    const r = Math.random(); cc.setHSL(0, 0, r < .12 ? .82 + Math.random() * .1 : .3 + Math.random() * .25);
    can.setColorAt(i, cc); });
  can.castShadow = can.receiveShadow = tr.castShadow = true; S.add(can, tr); }

const wn = new THREE.TextureLoader().load('img/tex/waternormals.jpg', (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
const water = new Water(new THREE.PlaneGeometry(12000, 12000), { textureWidth: MOBILE ? 256 : 1024, textureHeight: MOBILE ? 256 : 1024, waterNormals: wn,
  sunDirection: SUN.position.clone().normalize(), sunColor: 0xfff0d8, waterColor: 0x1a6fa8, distortionScale: 3, fog: true });
water.rotation.x = -Math.PI / 2; water.position.y = -.3; S.add(water);

// ── what makes it self-sustaining: real scale, detailed and alive ──
prog(85);
const SYS = new THREE.Group(); S.add(SYS);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6 }, o));
const glow = (c, k = 2.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
const ty = (x, z) => Math.max(HW(x, z), .6);
const SYSG = {}; const sg = (id) => { const g = new THREE.Group(); g.userData.id = id; SYS.add(g); SYSG[id] = g; g.visible = false; return g; };
const inst = (geo, m, list, fn) => { const im = new THREE.InstancedMesh(geo, m, list.length), d = new THREE.Object3D(); list.forEach((v, i) => { d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); fn(d, v, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = im.receiveShadow = true; return im; };
const ANIM = []; const UT = { value: 0 };
const ELEC = { solar: 0x2f7bff, wind: 0x00f0ff, battery: 0xff2bd6, desal: 0x00d9ff, green: 0x7dff2e, fields: 0xc8ff3a, works: 0x9b5cff, digester: 0xff8a1f, ai: 0xbfeaff };
const _o = new THREE.Object3D();
function rovers(g, n, col, path, s = 1) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(5 * s, 2.4 * s, 3.4 * s), mat(0xf2f2f2, { emissive: new THREE.Color(col), emissiveIntensity: .8 }), n); im.castShadow = true; g.add(im);
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(.9 * s, 8, 6), glow(col, 4), n); g.add(lamp);
  ANIM.push((t) => { for (let i = 0; i < n; i++) { const [x, y, z, ry] = path(i, t); _o.position.set(x, y + 1.2 * s, z); _o.rotation.set(0, ry, 0); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); _o.position.y += 1.8 * s; _o.updateMatrix(); lamp.setMatrixAt(i, _o.matrix); } im.instanceMatrix.needsUpdate = lamp.instanceMatrix.needsUpdate = true; }); }
const C = { solar: [0, 1750], battery: [1050, 1330], wind: [-1500, 1950], desal: [1650, bayP(1650) + 50], green: [1730, 400], fields: [1900, 1230], works: [-1750, 450], digester: [-1650, -40], ai: [0, 230] };

// SOLAR · 1.6 × 1 km of panels, cells, a sweep of light, inverters and cleaning robots
{ const g = sg('solar'), pts = []; for (let z = 1250; z <= 2250; z += 14) for (let x = -800; x <= 800; x += 18) pts.push([x, z]);
  const pm = mat(0x16295a, { roughness: .15, metalness: .8, emissive: new THREE.Color(ELEC.solar), emissiveIntensity: .25 });
  pm.onBeforeCompile = (sh) => { sh.uniforms.uT = UT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;varying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvU=uv;vW=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;varying vec3 vW;uniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cl=abs(fract(vU*vec2(12.,5.))-.5);float grid=1.-smoothstep(.42,.48,max(cl.x,cl.y));
        diffuseColor.rgb=mix(vec3(.75,.8,.9),diffuseColor.rgb,grid);
        float sweep=smoothstep(90.,0.,abs(mod(vW.x+vW.z*.5-uT*240.,2600.)-1300.));
        totalEmissiveRadiance+=vec3(.25,.55,1.)*sweep*.55*grid;`); };
  pm.customProgramCacheKey = () => 'solarcells2';
  g.add(inst(new THREE.BoxGeometry(16, .4, 7), pm, pts, (d, [x, z]) => { d.position.set(x, ty(x, z) + 3, z); d.rotation.x = -.5; }));
  if (!MOBILE) g.add(inst(new THREE.CylinderGeometry(.3, .3, 3, 5), mat(0x999999), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 1.5, z)));
  const inv = []; for (let x = -720; x <= 720; x += 160) for (let z = 1300; z <= 2200; z += 150) inv.push([x, z]);
  g.add(inst(new THREE.BoxGeometry(10, 6, 6), mat(0xeef2f8), inv, (d, [x, z]) => d.position.set(x, ty(x, z) + 3, z)));
  g.add(inst(new THREE.BoxGeometry(10.2, .7, 6.2), glow(ELEC.solar, 3), inv, (d, [x, z]) => d.position.set(x, ty(x, z) + 6.3, z)));
  const sub = new THREE.Mesh(new THREE.BoxGeometry(90, 14, 50), mat(0xe9edf2)); sub.position.set(0, ty(0, 1210) + 7, 1210); g.add(sub);
  rovers(g, 24, ELEC.solar, (i, t) => { const row = 1257 + i * 42, x = -800 + ((t * 40 + i * 230) % 1600); return [x, ty(x, row) + .5, row, 0]; }); }

// BATTERY · 80 containers, fan grilles, breathing light strips
{ const g = sg('battery'), pts = []; for (let i = 0; i < 80; i++) pts.push([960 + (i % 10) * 20, 1290 + Math.floor(i / 10) * 11]);
  g.add(inst(new THREE.BoxGeometry(16, 6, 6), mat(0xf3f3f5, { roughness: .35 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 3, z)));
  g.add(inst(new THREE.CylinderGeometry(1.2, 1.2, .3, 16), mat(0x2b2d33), pts.flatMap(([x, z]) => [[x - 4.5, z], [x, z], [x + 4.5, z]]), (d, [x, z]) => d.position.set(x, ty(x, z) + 6.15, z)));
  const strip = glow(ELEC.battery, 3); g.add(inst(new THREE.BoxGeometry(16.2, .6, .3), strip, pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 4.4, z - 3.1)));
  const base = strip.color.clone(); ANIM.push((t) => strip.color.copy(base).multiplyScalar(.5 + .5 * (Math.sin(t * 2.2) * .5 + .5))); }

// WIND · 12 turbines on the western ridge
const blades = [];
{ const g = sg('wind'), m = mat(0xf8f8f8, { roughness: .3 }), bladeG = new THREE.CylinderGeometry(.6, 3, 62, 8); bladeG.scale(1, 1, .28); bladeG.translate(0, 31, 0);
  for (let i = 0; i < 12; i++) { const x = -2250 + i * 130, z = 1900 + Math.sin(i * 1.3) * 90, y = ty(x, z);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(2, 4, 120, 20), m); tw.position.set(x, y + 60, z); g.add(tw);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 2, 24), mat(0xcfd3d8)); base.position.set(x, y + 1, z); g.add(base);
    const nac = new THREE.Mesh(new THREE.CapsuleGeometry(3.4, 12, 6, 12), m); nac.rotation.x = Math.PI / 2; nac.position.set(x, y + 121, z + 2); g.add(nac);
    const hub = new THREE.Group(); hub.position.set(x, y + 121, z - 6); const sp = new THREE.Group(); hub.add(sp);
    const cone = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), m); cone.scale.z = 1.6; sp.add(cone);
    for (let k = 0; k < 3; k++) { const p = new THREE.Group(), b = new THREE.Mesh(bladeG, m); b.rotation.y = .25; p.add(b); const tip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5, .6), glow(ELEC.wind, 3)); tip.position.y = 60; p.add(tip); p.rotation.z = k * Math.PI * 2 / 3; sp.add(p); }
    hub.add(new THREE.Mesh(new THREE.TorusGeometry(4.8, .7, 8, 40), glow(ELEC.wind, 3)));
    const red = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), glow(0xff2a2a, 4)); red.position.set(x, y + 128, z + 4); g.add(red);
    ANIM.push((t) => (red.visible = (t + i * .17) % 1.6 < .25));
    g.add(hub); blades.push(sp); } }

// DESALINATION · tanks, process hall, intake pier
{ const g = sg('desal'), [x0, z0] = C.desal, m = mat(0xf0f2f3, { roughness: .4 }), y0 = ty(x0, z0);
  const tanks = []; for (let i = 0; i < 12; i++) tanks.push([x0 + (i % 4) * 30, z0 + 40 + Math.floor(i / 4) * 30]);
  g.add(inst(new THREE.CylinderGeometry(12, 12, 20, 40), m, tanks, (d, [x, z]) => d.position.set(x, y0 + 10, z)));
  for (const k of [5, 11, 17]) g.add(inst(new THREE.TorusGeometry(12.1, .45, 6, 40), glow(ELEC.desal, 2.6), tanks, (d, [x, z]) => { d.position.set(x, y0 + k, z); d.rotation.x = Math.PI / 2; }));
  const h = new THREE.Mesh(new THREE.BoxGeometry(150, 22, 50), mat(0xe6e4de)); h.position.set(x0 - 120, y0 + 11, z0 + 70); g.add(h);
  const win = new THREE.Mesh(new THREE.BoxGeometry(150.4, 2.4, 50.4), glow(ELEC.desal, 2)); win.position.set(x0 - 120, y0 + 15, z0 + 70); g.add(win);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 360), mat(0xbfc4c8)); pier.position.set(x0 + 40, 1, z0 - 180); g.add(pier);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 360, 10), glow(ELEC.desal, 2.4)); pipe.rotation.x = Math.PI / 2; pipe.position.set(x0 + 40, 3, z0 - 180); g.add(pipe);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 5, 24), m); head.position.set(x0 + 40, 2, z0 - 362); g.add(head); }

// GREENHOUSES · ~40 ha of glass, plants and grow lights
{ const g = sg('green'), glass = new THREE.MeshPhysicalMaterial({ color: 0xeaf6f2, roughness: .04, transmission: .55, transparent: true, opacity: .45 });
  const gg = new THREE.CylinderGeometry(9, 9, 110, 24, 1, true, 0, Math.PI); gg.rotateZ(Math.PI / 2); gg.rotateY(Math.PI / 2);
  const pts = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 30; c++) pts.push([1400 + c * 22, 160 + r * 125]);
  g.add(inst(gg, glass, pts, (d, [x, z]) => d.position.set(x, ty(x, z), z)));
  const ribs = []; pts.forEach(([x, z]) => { for (let k = -5; k <= 5; k++) ribs.push([x, z + k * 10.5]); });
  g.add(inst(new THREE.TorusGeometry(9, .25, 4, 20, Math.PI), mat(0xffffff, { metalness: .5, roughness: .3 }), ribs, (d, [x, z]) => d.position.set(x, ty(x, z), z)));
  g.add(inst(new THREE.BoxGeometry(17, .6, 108), mat(0x3e6d2a, { roughness: 1 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + .4, z)));
  const plants = []; pts.forEach(([x, z]) => { for (let r = -2; r <= 2; r++) for (let k = 0; k < 16; k++) plants.push([x + r * 3.1, z - 50 + k * 6.6]); });
  g.add(inst(new THREE.IcosahedronGeometry(1.4, 0), mat(0x5fae3a, { roughness: .8 }), plants, (d, [x, z]) => { d.position.set(x, ty(x, z) + 1.6, z); d.scale.y = 1.4; }));
  const lamp = glow(0xff4fd8, 2.6); g.add(inst(new THREE.BoxGeometry(13, .4, 106), lamp, pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 7.4, z)));
  const lb = lamp.color.clone(); ANIM.push((t) => lamp.color.copy(lb).multiplyScalar(.6 + .4 * Math.sin(t * 1.3))); }

// FIELDS · ~1 km² of crops with stripes and harvest robots
{ const g = sg('fields'), pts = [], cols = [0x8fae4a, 0xb3a659, 0x6f9440, 0xc7b867, 0x7ea046, 0xa7b45a];
  for (let x = 1420; x <= 2380; x += 48) for (let z = 760; z <= 1700; z += 44) pts.push([x, z]);
  const fm = mat(0xffffff, { roughness: 1 });
  fm.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW2;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW2=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW2;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=.78+.22*smoothstep(.3,.7,abs(fract(vW2.z/4.)-.5)*2.);'); };
  fm.customProgramCacheKey = () => 'rows';
  const im = inst(new THREE.BoxGeometry(46, .8, 42), fm, pts, (d, [x, z]) => d.position.set(x, ty(x, z) + .3, z)); pts.forEach((p, i) => im.setColorAt(i, new THREE.Color(cols[(i * 7) % 6]))); g.add(im);
  rovers(g, 30, ELEC.fields, (i, t) => { const x = 1420 + (i % 6) * 190 + ((t * 10 + i * 9) % 40) - 20, z = 760 + Math.floor(i / 6) * 190 + ((t * 18 + i * 13) % 900); return [x, ty(x, z) + .6, z, 0]; }, 1.4); }

// WORKS · four automated halls, robot arms, conveyor, crane, robot fleet
{ const g = sg('works'), [x0, z0] = C.works, m = mat(0xe4e8ef, { roughness: .45 }), y = ty(x0, z0);
  for (let i = 0; i < 4; i++) { const zz = z0 - 135 + i * 90; const b = new THREE.Mesh(new THREE.BoxGeometry(360, 26, 64), m); b.position.set(x0, y + 13, zz); g.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(360.4, 3, 64.4), glow(ELEC.works, 2.4)); band.position.set(x0, y + 17, zz); g.add(band);
    const teeth = []; for (let k = 0; k < 22; k++) teeth.push(x0 - 168 + k * 16); const tg = new THREE.CylinderGeometry(0, 10, 10, 3); tg.rotateZ(Math.PI / 2); tg.scale(1, 1, 6.2);
    g.add(inst(tg, m, teeth, (d, x) => d.position.set(x, y + 31, zz))); }
  const arms = []; for (let i = 0; i < 14; i++) { const a = new THREE.Group(); a.position.set(x0 - 170 + i * 26, y, z0 + 230); a.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3.4, 2, 16), mat(0x2d2f36)));
    const s1 = new THREE.Group(); s1.position.y = 2; const l1 = new THREE.Mesh(new THREE.BoxGeometry(2, 16, 2), mat(0xffb020)); l1.position.y = 8; s1.add(l1);
    const s2 = new THREE.Group(); s2.position.y = 16; const l2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), mat(0xffb020)); l2.position.y = 6; s2.add(l2); const tip = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), glow(ELEC.works, 4)); tip.position.y = 12; s2.add(tip);
    s1.add(s2); a.add(s1); g.add(a); arms.push([a, s1, s2, i]); }
  const conv = new THREE.Mesh(new THREE.BoxGeometry(380, 1.5, 6), glow(ELEC.works, 1.4)); conv.position.set(x0, y + 1, z0 + 214); g.add(conv);
  ANIM.push((t) => arms.forEach(([a, s1, s2, i]) => { a.rotation.y = Math.sin(t * .9 + i) * 1.2; s1.rotation.z = -.5 + Math.sin(t * 1.4 + i) * .4; s2.rotation.z = -1 + Math.sin(t * 1.9 + i * 2) * .6; }));
  const mast = new THREE.Mesh(new THREE.BoxGeometry(4, 110, 4), mat(0xffc21a)); mast.position.set(x0 + 220, y + 55, z0); g.add(mast);
  const jib = new THREE.Group(); jib.position.set(x0 + 220, y + 110, z0); const jb = new THREE.Mesh(new THREE.BoxGeometry(120, 3, 3), mat(0xffc21a)); jb.position.x = -45; jib.add(jb); g.add(jib);
  ANIM.push((t) => (jib.rotation.y = Math.sin(t * .25) * 1.4));
  rovers(g, 20, ELEC.works, (i, t) => { const a = t * .15 + i * .314; return [x0 + Math.cos(a) * 240, y + .3, z0 + Math.sin(a) * 240, -a]; }, 1.5); }

// DIGESTER · ribbed domes, pipes, gas flare
{ const g = sg('digester'), [x0, z0] = C.digester, m = mat(0xece5d8, { roughness: .5 }), y = ty(x0, z0);
  const ds = []; for (let i = 0; i < 6; i++) ds.push([x0 + (i % 3) * 52, z0 + Math.floor(i / 3) * 52]);
  g.add(inst(new THREE.SphereGeometry(20, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m, ds, (d, [x, z]) => d.position.set(x, y, z)));
  g.add(inst(new THREE.TorusGeometry(20.05, .5, 6, 48), glow(ELEC.digester, 2.4), ds, (d, [x, z]) => { d.position.set(x, y + 1, z); d.rotation.x = Math.PI / 2; }));
  const st = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 46, 12), mat(0x9a9a9a, { metalness: .6 })); st.position.set(x0 + 150, y + 23, z0 + 26); g.add(st);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(3.4, 12, 12), glow(0xff7a1a, 4)); flame.position.set(x0 + 150, y + 52, z0 + 26); g.add(flame);
  ANIM.push((t) => { const k = 1 + .25 * Math.sin(t * 17) + .15 * Math.sin(t * 29); flame.scale.set(k, 1.2 * k, k); }); }

// THE MIND · a superintelligence core above the Capitol, linked to every system and district
{ const g = sg('ai'), core = new THREE.Group(); core.position.set(0, 230, 230); g.add(core);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(ELEC.ai).multiplyScalar(1.1), wireframe: true, toneMapped: false, transparent: true, opacity: .8 })); core.add(shell);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 24), glow(0xdff4ff, 1.5)); core.add(orb);
  const rings = [0, 1, 2].map((k) => { const r = new THREE.Mesh(new THREE.TorusGeometry(44 + k * 10, .7, 8, 96), glow(ELEC.ai, 1.4)); r.rotation.x = Math.PI / 2 + k * .5; core.add(r); return r; });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 6, 200, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(ELEC.ai).multiplyScalar(1.6), transparent: true, opacity: .14, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = -100; core.add(beam);
  ANIM.push((t) => { shell.rotation.y = t * .3; shell.rotation.x = t * .17; rings.forEach((r, k) => (r.rotation.z = t * (.4 + k * .25))); orb.scale.setScalar(1 + .08 * Math.sin(t * 2.6)); }); }
SYS.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });

// live cables with travelling light pulses
const lineMat = (c, speed = .7) => new THREE.ShaderMaterial({ uniforms: { uT: UT, uC: { value: new THREE.Color(c) }, uS: { value: speed } }, transparent: true, depthWrite: false, toneMapped: false,
  vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float uT,uS;uniform vec3 uC;varying vec2 vU;void main(){float p=smoothstep(.08,0.,abs(fract(vU.x*5.-uT*uS)-.5)-.38);gl_FragColor=vec4(uC*(1.1+p*4.),.5+p*.5);}' });
const link = (grp, c, a, b, h, r = 2.4, speed) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), M = A.clone().lerp(B, .5); M.y += h;
  grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 140, r, 8), lineMat(c, speed))); };
const at = (x, z, dy = 8) => [x, ty(x, z) + dy, z];
link(SYSG.solar, ELEC.solar, at(0, 1240), at(0, 640), 140, 3); link(SYSG.solar, ELEC.solar, at(-500, 1240), at(-260, 560), 120, 3);
link(SYSG.wind, ELEC.wind, at(-1500, 1880), at(-430, 420), 260); link(SYSG.battery, ELEC.battery, at(960, 1290), at(300, 560), 140);
link(SYSG.desal, ELEC.desal, at(1530, bayP(1650) + 120), at(620, 90), 60); link(SYSG.green, ELEC.green, at(1400, 400), at(700, 260), 80);
link(SYSG.fields, ELEC.fields, at(1420, 1100), at(760, 520), 90); link(SYSG.works, ELEC.works, at(-1570, 420), at(-760, 300), 90); link(SYSG.digester, ELEC.digester, at(-1500, -20), at(-760, 110), 60);
// the mind talks to everything
[...Object.values(C).filter((p) => p !== C.ai), ...DISTRICTS].forEach(([x, z]) => link(SYSG.ai, new THREE.Color(ELEC.ai).multiplyScalar(.16), [0, 230, 230], at(x, z, 30), 160, .45, 1.4));
// light pools: the city areas each system powers glow in its colour
const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const pool = (id, x, z, r) => { const m = new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(ELEC[id]).multiplyScalar(1.3), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), m); p.rotation.x = -Math.PI / 2; p.position.set(x, ty(x, z) + 3, z); SYSG[id].add(p); const ph = Math.random() * 6; ANIM.push((t) => (m.opacity = .4 + .2 * Math.sin(t * 1.5 + ph))); };
pool('solar', 0, 560, 320); pool('solar', -260, 420, 260); pool('wind', -430, 300, 300); pool('battery', 300, 520, 260); pool('desal', 600, 90, 260); pool('green', 700, 260, 220); pool('fields', 760, 520, 220); pool('works', -760, 260, 280); pool('digester', -760, 110, 220); pool('ai', 0, 300, 420);

// city life: trams of light on the ring, boats in the bay
{ const tm = glow(0xfff2c8, 2.2), trams = new THREE.InstancedMesh(new THREE.BoxGeometry(24, 4, 4), tm, 10); S.add(trams); trams.visible = false;
  const boats = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 3, 22), mat(0xffffff, { roughness: .3 }), 14); boats.castShadow = true; S.add(boats); boats.visible = false;
  ANIM.push((t) => { trams.visible = boats.visible = UP.value > .55;
    for (let i = 0; i < 10; i++) { const a = t * .06 + i * .628; _o.position.set(DOWN[0] + Math.cos(a) * 170 * 1.35, 3, DOWN[1] + Math.sin(a) * 170); _o.rotation.set(0, -Math.atan2(Math.cos(a) * 170, -Math.sin(a) * 229.5), 0); _o.updateMatrix(); trams.setMatrixAt(i, _o.matrix); }
    for (let i = 0; i < 14; i++) { const u = ((t * .01 + i / 14) % 1) * 2 - 1, x = u * 1500, z = bayP(x) - 140 - (i % 3) * 90; _o.position.set(x, .8 + Math.sin(t * 1.5 + i) * .3, z); _o.rotation.set(0, Math.PI / 2, 0); _o.updateMatrix(); boats.setMatrixAt(i, _o.matrix); }
    trams.instanceMatrix.needsUpdate = boats.instanceMatrix.needsUpdate = true; }); }

// ── the new University: a glass library rotunda inside a ring of curved white colleges ──
{ const U0 = new THREE.Group(), y = ty(...UNI); U0.position.set(UNI[0], y, UNI[1]); S.add(U0);
  const white = mat(0xfbf8f2, { roughness: .35 }), glassM = new THREE.MeshStandardMaterial({ color: 0x1d3a52, roughness: .03, metalness: .95 });
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(86, 88, 1.2, 96), mat(0x6a6e75, { roughness: .9 })); lawn.position.y = .6; U0.add(lawn);
  const path = new THREE.Mesh(new THREE.RingGeometry(40, 46, 96), mat(0xd8dade)); path.rotation.x = -Math.PI / 2; path.position.y = 1.3; U0.add(path);
  for (let k = 0; k < 4; k++) { const a0 = k * Math.PI / 2 + .22, len = Math.PI / 2 - .44;
    for (let f = 0; f < 4; f++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 4.2, 64, 1, true, a0, len), f % 2 ? glassM : white); ring.position.y = 1.2 + f * 4.2 + 2.1; U0.add(ring);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 4.2, 64, 1, true, a0, len), f % 2 ? glassM : white); inner.position.y = ring.position.y; U0.add(inner); }
    const roof = new THREE.Mesh(new THREE.RingGeometry(58, 70, 48, 1, a0, len), white); roof.rotation.x = -Math.PI / 2; roof.position.y = 18; U0.add(roof);
    const garden = new THREE.Mesh(new THREE.RingGeometry(60, 68, 48, 1, a0 + .05, len - .1), mat(0x50545b)); garden.rotation.x = -Math.PI / 2; garden.position.y = 18.2; U0.add(garden); }
  const rot = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 20, 64), glassM); rot.position.y = 11; U0.add(rot);
  for (let f = 0; f < 4; f++) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(23, 23, .9, 64), white); sl.position.y = 2 + f * 6; U0.add(sl); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(23, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15, metalness: .3 })); dome.position.y = 21; dome.scale.y = .7; U0.add(dome);
  const ocu = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3, 24), glow(0xfff0c8, 2)); ocu.position.y = 37; U0.add(ocu);
  const trunkM = mat(0x8a6a4a), frondM = mat(0x55595f, { roughness: .5, metalness: .4 });
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = 80, palm = new THREE.Group(); palm.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, 14, 6), trunkM); tr.position.y = 7; tr.rotation.z = .08; palm.add(tr);
    for (let k = 0; k < 6; k++) { const fr = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 1.6), frondM); fr.position.set(Math.cos(k) * 3.5, 14, Math.sin(k) * 3.5); fr.rotation.y = -k; fr.rotation.z = -.45; palm.add(fr); } U0.add(palm); }
  U0.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  U0.scale.y = .001; U0.visible = false;
  ANIM.push(() => { const k = Math.min(1, Math.max(0, (UP.value - .8) * 7)); U0.visible = k > 0; U0.scale.y = k <= 0 ? .001 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); }); }

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
  university: { cat: 'Knowledge', name: 'University', pin: P(120, 820, 50), dist: 260, desc: 'On the first slopes of the hills: a glass library rotunda under a white dome, inside a ring of curved colleges with roof gardens, lawns and palms. Learning is free for life.', stats: [['Library', 'Glass rotunda'], ['Colleges', 'Ring of 4'], ['Tuition', 'Free']] },
  hills: { cat: 'Nature', name: 'Hill Villages', pin: P(-520, 860, 30), desc: 'Villages of small houses on the green hills behind the city, oriented to the view of the bay.', stats: [['Villages', '3'], ['Homes', 'Low, scattered']] },
  beach: { cat: 'Coast', name: 'Beach & Promenade', pin: P(-250, bayP(-250) + 28, 10), desc: 'Three rows of low beach houses between the seafront promenade and the sand, along the whole bay.', stats: [['Beach', 'Whole bay'], ['Houses', 'Low, 1–2 floors']] },
  port: { cat: 'Coast', name: 'Port', pin: P(380, bayP(380) - 60, 10), desc: 'Piers, a breakwater and harbour warehouses on the east side of the bay.', stats: [['Piers', '4'], ['Warehouses', '12']] },
  lighthouse: { cat: 'Coast', name: 'Lighthouse', pin: [-980, 50, bayP(-980) - 10], desc: 'The lighthouse at the west point of the bay, the first thing you see arriving by sea.', stats: [['Height', '43 m']] },
};
const PIN = (k, dy) => [C[k][0], ty(...C[k]) + dy, C[k][1]];
Object.assign(ITEMS, {
  ai: { cat: 'Superintelligence', name: 'The Mind', pin: [0, 230, 230], desc: 'The intelligence that runs Anthropos. It balances energy, water and food minute by minute, dispatches the robots, routes the trams and keeps every system in the loop. Citizens set the goals in the charter; the Mind carries them out.', stats: [['Linked systems', 'All'], ['Decisions', 'Every second'], ['Governed by', 'The charter']] },
  solar: { cat: 'Energy', name: 'Solar Field', pin: PIN('solar', 40), desc: 'A 1.6 × 1 km field of panels behind the hills. It produces more electricity than the city uses in a year. The sun pays the floor of life.', stats: [['Size', '~160 ha'], ['Capacity', '320 MW'], ['Share of demand', '~85%']] },
  wind: { cat: 'Energy', name: 'Wind Ridge', pin: PIN('wind', 170), desc: 'Twelve turbines on the western ridge keep producing at night and in cloudy weeks, when the sun cannot.', stats: [['Turbines', '12'], ['Hub height', '120 m'], ['Capacity', '60 MW']] },
  battery: { cat: 'Energy', name: 'Battery Storage', pin: PIN('battery', 30), desc: 'Eighty storage containers hold the afternoon sun for the night. The city can run a full day without sun or wind.', stats: [['Storage', '1.2 GWh'], ['Autonomy', '~24 h']] },
  desal: { cat: 'Water', name: 'Desalination Plant', pin: PIN('desal', 50), desc: 'Turns sea water into drinking water with solar power. Every litre used in homes is treated and returned to the fields.', stats: [['Output', '15,000 m³/day'], ['Wastewater reused', '100%']] },
  green: { cat: 'Food', name: 'Greenhouses', pin: PIN('green', 40), desc: 'One hundred and twenty glass greenhouses grow vegetables and fruit all year with recycled water and the city’s own compost.', stats: [['Area', '~40 ha'], ['Harvest', 'All year']] },
  fields: { cat: 'Food', name: 'Fields & Orchards', pin: PIN('fields', 30), desc: 'Fields and orchards for grains, fruit and olives, irrigated with treated water and tended by harvest robots.', stats: [['Area', '~100 ha'], ['Irrigation', 'Recycled']] },
  works: { cat: 'Automation', name: 'Automated Works', pin: PIN('works', 80), desc: 'The machines that make life free. Robots build homes, make goods, repair the city and run the farms around the clock. Nobody has to work to live.', stats: [['Robots', '2,400'], ['Runs', '24 / 7 on solar'], ['Hours a resident must work', '0']] },
  digester: { cat: 'Waste', name: 'Biodigester', pin: PIN('digester', 60), desc: 'Food scraps and sewage become biogas for kitchens and compost for the fields. Glass, metal and stone are rebuilt into the city. No landfill.', stats: [['Organic waste', '→ Gas + compost'], ['Landfill', '0']] },
});
const ORDER = Object.keys(ITEMS);
const CATS = [['All', null], ['Civic', ['capitol', 'mall', 'ring', 'university']], ['Districts', ['downtown', 'west', 'east']], ['Nature', ['park', 'river', 'hills']], ['Coast', ['beach', 'port', 'lighthouse']], ['Leisure', ['stadium']], ['Self-sustaining', ['ai', 'solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester']]];

// ── time of day: dawn · day · sunset · night ──
const PM2 = new THREE.PMREMGenerator(R), TOD = {};
const TIMES = {
  dawn:   { az: 75, el: 7, stops: [[0, '#28365f'], [.3, '#6a6aa8'], [.42, '#d993b4'], [.48, '#ffc49a'], [.5, '#fff0d0'], [.53, '#c9a6b4'], [1, '#2b2d3a']], sun: '#fff1d6', light: 0xffc9a0, li: 2.6, hemi: [0xd9c4ec, 0x4a4652, .55], fog: 0xe8c9c4, exp: 1.0, water: 0x2f6fa6, night: 0 },
  day:    { az: 210, el: 52, stops: [[0, '#1f5fc4'], [.3, '#4f8fe0'], [.44, '#9cc6f2'], [.5, '#e2f0fb'], [.53, '#a9bccb'], [1, '#2f3640']], sun: '#ffffff', light: 0xfff6e8, li: 3.6, hemi: [0xdfeeff, 0x5a5e66, .6], fog: 0xcfe0f0, exp: 1.0, water: 0x1a78b8, night: 0 },
  sunset: { az: 250, el: 5, stops: [[0, '#1a2457'], [.28, '#5b3f8e'], [.4, '#c4588a'], [.46, '#ff7a45'], [.5, '#ffd27a'], [.53, '#a8607a'], [1, '#231c2c']], sun: '#fff0c0', light: 0xff9a5e, li: 3.2, hemi: [0xffc2a8, 0x4a3646, .5], fog: 0xf0a487, exp: 1.02, water: 0x1f5f96, night: .15 },
  night:  { az: 140, el: 34, stops: [[0, '#01030a'], [.3, '#050b20'], [.45, '#0e1a3c'], [.5, '#22345e'], [.53, '#0c1224'], [1, '#04060c']], sun: '#e8eeff', light: 0x8fa8ff, li: .55, hemi: [0x3a4c86, 0x08090e, .3], fog: 0x0c1430, exp: 1.0, water: 0x0b2547, night: 1, stars: 1 } };
function dirOf(az, el) { const a = az * Math.PI / 180, e = el * Math.PI / 180; return new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)); }
function skyTex(T) { const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, H);
  T.stops.forEach(([o, col]) => g.addColorStop(o, col)); x.fillStyle = g; x.fillRect(0, 0, W, H);
  if (T.stars) for (let i = 0; i < 2600; i++) { const y = Math.random() * H * .48, r = Math.random() * 1.3; x.fillStyle = `rgba(255,255,255,${.3 + Math.random() * .7})`; x.beginPath(); x.arc(Math.random() * W, y, r, 0, 7); x.fill(); }
  const d = dirOf(T.az, T.el), u = Math.atan2(d.z, d.x) / (2 * Math.PI) + .5, v = Math.asin(d.y) / Math.PI + .5, sx = u * W, sy = (1 - v) * H;
  const halo = x.createRadialGradient(sx, sy, 0, sx, sy, T.stars ? 90 : 420); halo.addColorStop(0, T.sun); halo.addColorStop(.06, T.sun); halo.addColorStop(.25, T.stars ? 'rgba(200,215,255,.25)' : 'rgba(255,220,170,.45)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = halo; x.fillRect(0, 0, W, H); x.fillStyle = T.sun; x.beginPath(); x.arc(sx, sy, T.stars ? 9 : 16, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t; }
let NOW = 'sunset';
function setTime(name) { NOW = name; const T = TIMES[name]; if (!TOD[name]) { const sk = skyTex(T); TOD[name] = { sk, env: PM2.fromEquirectangular(sk).texture }; }
  S.background = TOD[name].sk; S.environment = TOD[name].env;
  const d = dirOf(T.az, T.el); SUN.position.copy(SUN.target.position).addScaledVector(d, 3200); SUN.color.set(T.light); SUN.intensity = T.li;
  HEMI.color.set(T.hemi[0]); HEMI.groundColor.set(T.hemi[1]); HEMI.intensity = T.hemi[2]; S.fog.color.set(T.fog); R.toneMappingExposure = T.exp; NIGHT.value = T.night;
  water.material.uniforms.waterColor.value.set(T.water); water.material.uniforms.sunDirection.value.copy(d); water.material.uniforms.sunColor.value.set(T.light);
  document.querySelectorAll('.tod button').forEach((b) => b.classList.toggle('on', b.dataset.t === name)); }
{ const st = document.createElement('style'); st.textContent = `.tod{position:absolute;top:64px;right:var(--g);z-index:22;display:flex;gap:4px;background:rgba(10,12,16,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.18);padding:4px}
.tod button{all:unset;cursor:pointer;font-size:11px;letter-spacing:.04em;padding:6px 11px;color:rgba(255,255,255,.75);display:flex;gap:6px;align-items:center;transition:background .3s,color .3s}
.tod button:hover{color:#fff}.tod button.on{background:#fff;color:#000}.tod i{font-style:normal;font-size:13px}
.veil{position:absolute;inset:0;z-index:21;pointer-events:none;background:#000;opacity:0;transition:opacity .35s}.veil.on{opacity:.55}
@media(max-width:760px){.tod{top:auto;bottom:64px;right:50%;transform:translateX(50%)}.tod button span{display:none}}`; document.head.appendChild(st);
  const box = document.createElement('div'); box.className = 'tod'; box.innerHTML = [['dawn', '◒', 'Dawn'], ['day', '☀', 'Day'], ['sunset', '◐', 'Sunset'], ['night', '☾', 'Night']].map(([k, i, n]) => `<button data-t="${k}"><i>${i}</i><span>${n}</span></button>`).join('');
  $('#stage').appendChild(box); const veil = document.createElement('div'); veil.className = 'veil'; $('#stage').appendChild(veil);
  box.querySelectorAll('button').forEach((b) => (b.onclick = () => { if (b.dataset.t === NOW) return; veil.classList.add('on'); setTimeout(() => { setTime(b.dataset.t); veil.classList.remove('on'); }, 350); })); }
setTime('sunset');

// ── post ──
const composer = new EffectComposer(R); composer.addPass(new RenderPass(S, cam));
if (!MOBILE) composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .45, 1.6));
composer.addPass(new OutputPass());

// ── controls ──
const HOME = { p: new THREE.Vector3(1050, 820, -980), t: new THREE.Vector3(0, 0, 400) };
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
let idleT = 0; ctl.addEventListener('start', () => { if (!build.done) return; ctl.autoRotate = false; idleT = 0; stopTour(); });
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
  water.material.uniforms.time.value += dt * .4; buildTick(dt); blades.forEach((b, i) => (b.rotation.z += dt * (1 + i * .05))); UT.value += dt; ANIM.forEach((f) => f(UT.value));
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ORDER.forEach((id) => { const e = pinEls[id]; tv.set(...ITEMS[id].pin).project(cam); const vis = tv.z < 1 && Math.abs(tv.x) < 1.02 && Math.abs(tv.y) < 1.02;
    e.classList.toggle('hide', !vis); e.classList.toggle('dimmed', !!filter && !filter.includes(id)); e.style.transform = `translate(${(tv.x * .5 + .5) * w - 9}px,${(-tv.y * .5 + .5) * h - 9}px)`; });
  if (flight) { flight.t += dt / flight.dur; const k = flight.t >= 1 ? 1 : 1 - Math.pow(1 - flight.t, 3); cam.position.lerpVectors(flight.fromP, flight.toP, k); ctl.target.lerpVectors(flight.fromT, flight.toT, k); if (flight.t >= 1) flight = null; }
  if (build.done && !ctl.autoRotate && !sel && !tour) { idleT += dt; if (idleT > 8) ctl.autoRotate = true; }
  if (tour && !flight) { tour.t += dt; $('#tourbar').style.width = (tour.t / 7 * 100) + '%'; if (tour.t > 7) nextTour(); }
  ctl.update(); composer.render();
}
// ── SCROLL: empty land → the whole city, with the camera spinning, diving and pulling out ──
const cap = document.createElement('div'); cap.className = 'buildcap'; $('#stage').appendChild(cap);
const st = document.createElement('style'); st.textContent = `.buildcap{position:absolute;left:var(--g);bottom:14vh;z-index:15;pointer-events:none;max-width:620px}
.buildcap .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.75);display:flex;gap:10px;align-items:center}.buildcap .k:before{content:"";width:28px;height:1px;background:#fff}
.buildcap h2{font-size:clamp(42px,6.4vw,112px);font-weight:600;letter-spacing:-.05em;line-height:1;margin:.12em 0 .15em;padding-bottom:.08em;color:#fff;text-shadow:0 4px 30px rgba(0,20,50,.5);transition:opacity .5s,transform .5s,filter .5s}
.buildcap .hint{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#fff;opacity:.8;display:flex;gap:8px;align-items:center}.buildcap .hint i{animation:bob 1.6s infinite;display:inline-block}
@keyframes bob{50%{transform:translateY(5px)}}
.buildcap.out h2{opacity:0;transform:translateY(16px);filter:blur(6px)}
.stage.building .title,.stage.building .dock,.stage.building #pins,.stage.building .ctrl{opacity:0;pointer-events:none}.stage.building #gl{pointer-events:none}
.stage:not(.building) .buildcap{opacity:0}.buildcap{transition:opacity .8s}
.prog{position:absolute;right:var(--g);top:50%;transform:translateY(-50%);z-index:15;width:2px;height:34vh;background:rgba(255,255,255,.25);pointer-events:none;transition:opacity .8s}.prog i{display:block;width:100%;background:#fff;height:0}
.stage:not(.building) .prog{opacity:0}`; document.head.appendChild(st);
cap.innerHTML = '<span class="k" id="bk">Anthropos · 00</span><h2 id="bc">The land.</h2><span class="hint" id="bh">Scroll to build the city <i>↓</i></span>';
const pr = document.createElement('div'); pr.className = 'prog'; pr.innerHTML = '<i id="pi"></i>'; $('#stage').appendChild(pr);
$('#stage').classList.add('building'); ctl.enabled = false; ctl.autoRotate = false;
const SC = $('#scrolly'); const sizeSC = () => (SC.style.height = innerHeight * 11 + 'px'); sizeSC(); addEventListener('resize', sizeSC);
const SYSORDER = ['solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester', 'ai'];
const SYS0 = .62, SYSW = .034;
const K = [[0, 0, 0, 400, 1800, 1200, -2.3], [.05, 0, 20, 230, 230, 110, -1.7], [.13, 0, 25, 270, 520, 260, -.3], [.24, 0, 0, 330, 1350, 950, 1.3],
  [.34, 60, 0, 480, 380, 170, 2.9], [.42, river(380), 0, 380, 260, 70, 4.2], [.5, 0, 0, -30, 650, 110, 5.3], [.58, 0, 40, 860, 620, 380, 6.5]];
SYSORDER.forEach((id, i) => { const [x, y, z] = ITEMS[id].pin; const RR = { solar: 1500, wind: 1100, battery: 520, desal: 800, green: 900, fields: 1200, works: 950, digester: 600, ai: 520 }[id]; K.push([SYS0 + (i + .5) * SYSW, x, id === 'ai' ? 150 : y * .3, z, RR, RR * .55, 7.4 + i * .95]); });
K.push([.95, 0, 0, 1000, 3100, 950, 17.28], [1, 0, 0, 800, 2500, 800, 17.7]);
const CAPS = [[0, 'The land.'], [.04, 'First, the Capitol.'], [.11, 'Downtown rises.'], [.21, 'The districts.'], [.31, 'Park and river.'], [.46, 'The coast.'], [.55, 'The hills.']];
const SYSCAP = ['The sun pays.', 'The wind, at night.', 'Power, stored.', 'Water from the sea.', 'Food, grown here.', 'Fields and orchards.', 'Machines do the work.', 'Nothing is wasted.', 'And a mind that runs it all.'];
SYSORDER.forEach((id, i) => CAPS.push([SYS0 + i * SYSW, SYSCAP[i]])); CAPS.push([.94, 'Anthropos.']);
const sm = (k) => k * k * (3 - 2 * k), clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeB = (k) => (k <= 0 ? .001 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2));
function pose(q) { let i = 0; while (i < K.length - 2 && q > K[i + 1][0]) i++; const a = K[i], b = K[i + 1], k = sm(clamp01((q - a[0]) / (b[0] - a[0])));
  const v = a.map((x, j) => x + (b[j] - x) * k); const T = new THREE.Vector3(v[1], v[2], v[3]); return [T.clone().add(new THREE.Vector3(Math.cos(v[6]) * v[4], v[5], Math.sin(v[6]) * v[4])), T]; }
let build = { done: false, last: '', q: 0 };
function setCap(t, q) { if (t === build.last) return; build.last = t; cap.classList.add('out'); setTimeout(() => { $('#bc').textContent = t; $('#bk').textContent = 'Anthropos · ' + String(Math.round(q * 100)).padStart(2, '0'); cap.classList.remove('out'); }, 260); }
function readQ() { const tot = SC.offsetHeight - innerHeight; return clamp01((scrollY - SC.offsetTop) / tot); }
function buildTick(dt) {
  const q = readQ(); build.q += (q - build.q) * Math.min(1, dt * 4); const Q = build.q;
  const interactive = q > .985;
  if (interactive && !build.done) { build.done = true; $('#stage').classList.remove('building'); ctl.enabled = true; ctl.autoRotate = true; }
  if (!interactive && build.done) { build.done = false; $('#stage').classList.add('building'); ctl.enabled = false; ctl.autoRotate = false; stopTour(); if (sel) { sel = null; $('#stage').classList.remove('sel'); } flight = null; }
  UP.value = sm(clamp01(Q / .6));
  SYSORDER.forEach((id, i) => { const k = clamp01((Q - (SYS0 + i * SYSW)) / (SYSW * .6)); const g = SYSG[id]; g.visible = k > 0; g.scale.y = easeB(k); });
  if (!build.done) { const [cp, ct] = pose(Q); cam.position.lerp(cp, .09); ctl.target.lerp(ct, .09);
    let cur = CAPS[0][1]; for (const [at, t] of CAPS) if (Q >= at) cur = t; setCap(cur, Q); $('#pi').style.height = Q * 100 + '%'; $('#bh').style.opacity = Q < .02 ? .8 : 0; }
}
let U_T = 0; setInterval(() => (U_T += .05), 50);
prog(100); setTimeout(() => $('#load').classList.add('gone'), 4400);
frame();

$('#f').onsubmit = (e) => { e.preventDefault(); location.href = 'mailto:hello@anthroposcities.com?subject=Founding%20citizen&body=' + encodeURIComponent(e.target[0].value); $('#ok').textContent = 'Thank you. Your mail app will open to confirm.'; };
