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

// growth: every vertex knows when its building is raised (bt 0..1), uP sweeps 0→1
const UP = { value: 0 };
const M = ink.marks, NM = M.length;
function btFor(count, key) { const a = new Float32Array(count); let k = 0;
  for (let v = 0; v < count; v++) { while (k < NM - 1 && v >= (M[k][key] ?? 0)) k++; a[v] = M[k].d < 0 ? 0 : k / NM; } return a; }
const GROW = `float gk=clamp((uP*1.12-bt)*16.,0.,1.);float ge=gk<=0.?0.0001:1.+2.7*pow(gk-1.,3.)+1.7*pow(gk-1.,2.);transformed.y*=max(ge,.0001);`;
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
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.)).xyz;vWN=normalize(mat3(modelMatrix)*normal);');
    sh.vertexShader = sh.vertexShader.replace('vWP=(modelMatrix*vec4(position,1.)).xyz;', 'vWP=(modelMatrix*vec4(transformed,1.)).xyz;');
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
const depthGrow = () => grow(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'd');
{ const g = geo(ink.faces); g.computeVertexNormals(); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.faces.length / 3, 'f'), 1));
  const m = new THREE.Mesh(g, grow(windows(new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: .55, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })), 'f'));
  m.customDepthMaterial = depthGrow(); m.castShadow = m.receiveShadow = true; city.add(m); }
if (ink._tf) { const g = geo(ink._tf); g.computeVertexNormals(); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink._tf.length / 3, 't'), 1));
  const cols = new Float32Array(ink._tf.length), c = new THREE.Color();
  for (let i = 0; i < ink._tf.length; i += 9) { c.setHSL(.24 + Math.random() * .07, .32 + Math.random() * .12, .26 + Math.random() * .1); for (let k = 0; k < 9; k += 3) { cols[i + k] = c.r; cols[i + k + 1] = c.g; cols[i + k + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, grow(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true, side: THREE.DoubleSide }), 't'));
  m.customDepthMaterial = depthGrow(); m.castShadow = m.receiveShadow = true; city.add(m); }
{ const g = geo(ink.edges); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.edges.length / 3, 'e'), 1)); city.add(new THREE.LineSegments(g, grow(new THREE.LineBasicMaterial({ color: 0x2c3038, transparent: true, opacity: .28 }), 'e'))); }
{ const g = geo(ink.details); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.details.length / 3, 'l'), 1)); city.add(new THREE.LineSegments(g, grow(new THREE.LineBasicMaterial({ color: 0x51585f, transparent: true, opacity: .16 }), 'l'))); }

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

// ── what makes it self-sustaining: on the outskirts, detailed and alive ──
prog(85);
const SYS = new THREE.Group(); S.add(SYS);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6 }, o));
const glow = (c, k = 2.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
const ty = (x, z) => Math.max(terrainP(x, z), .6);
const SYSG = {}; const sg = (id) => { const g = new THREE.Group(); g.userData.id = id; SYS.add(g); SYSG[id] = g; g.visible = false; return g; };
const inst = (geo, m, list, fn) => { const im = new THREE.InstancedMesh(geo, m, list.length), d = new THREE.Object3D(); list.forEach((v, i) => { d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); fn(d, v, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = im.receiveShadow = true; return im; };
const ANIM = []; const UT = { value: 0 };
const ELEC = { solar: 0x2f7bff, wind: 0x00f0ff, battery: 0xff2bd6, desal: 0x00d9ff, green: 0x7dff2e, fields: 0xc8ff3a, works: 0x9b5cff, digester: 0xff8a1f };
const _o = new THREE.Object3D();
// moving robots: a few small glowing machines per system
function rovers(g, n, col, path) { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 2.4, 3.4), mat(0xf2f2f2, { emissive: new THREE.Color(col), emissiveIntensity: .8 }), n); im.castShadow = true; g.add(im);
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(.9, 8, 6), glow(col, 4), n); g.add(lamp);
  ANIM.push((t) => { for (let i = 0; i < n; i++) { const [x, y, z, ry] = path(i, t); _o.position.set(x, y + 1.2, z); _o.rotation.set(0, ry, 0); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); _o.position.y += 1.8; _o.updateMatrix(); lamp.setMatrixAt(i, _o.matrix); } im.instanceMatrix.needsUpdate = lamp.instanceMatrix.needsUpdate = true; }); }

// SOLAR: cells, frames, a light sheen sweeping the field, inverters, cleaning robots
{ const g = sg('solar'), pts = []; for (let r = 0; r < 18; r++) for (let c = 0; c < 46; c++) pts.push([-420 + c * 18, 1130 + r * 13]);
  const pm = mat(0x16295a, { roughness: .15, metalness: .8, emissive: new THREE.Color(ELEC.solar), emissiveIntensity: .25 });
  pm.onBeforeCompile = (sh) => { sh.uniforms.uT = UT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;varying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvU=uv;vW=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vU;varying vec3 vW;uniform float uT;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec2 cl=abs(fract(vU*vec2(12.,5.))-.5);float grid=1.-smoothstep(.42,.48,max(cl.x,cl.y));
        diffuseColor.rgb=mix(vec3(.75,.8,.9),diffuseColor.rgb,grid);
        float sweep=smoothstep(60.,0.,abs(mod(vW.x+vW.z*.4-uT*160.,1400.)-700.));
        totalEmissiveRadiance+=vec3(.25,.55,1.)*sweep*1.6*grid;`); };
  pm.customProgramCacheKey = () => 'solarcells';
  g.add(inst(new THREE.BoxGeometry(16, .4, 7), pm, pts, (d, [x, z]) => { d.position.set(x, ty(x, z) + 3, z); d.rotation.x = -.5; }));
  g.add(inst(new THREE.BoxGeometry(16.6, .3, .4), mat(0xd8dde5, { metalness: .6, roughness: .3 }), pts, (d, [x, z]) => { d.position.set(x, ty(x, z) + 1.4, z + 3.2); }));
  g.add(inst(new THREE.CylinderGeometry(.25, .25, 3, 5), mat(0x999999), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 1.5, z)));
  const inv = []; for (let i = 0; i < 6; i++) inv.push([-380 + i * 150, 1120]);
  g.add(inst(new THREE.BoxGeometry(8, 5, 5), mat(0xeef2f8), inv, (d, [x, z]) => d.position.set(x, ty(x, z) + 2.5, z)));
  g.add(inst(new THREE.BoxGeometry(8.2, .6, 5.2), glow(ELEC.solar, 3), inv, (d, [x, z]) => d.position.set(x, ty(x, z) + 5.2, z)));
  rovers(g, 10, ELEC.solar, (i, t) => { const row = 1136 + (i * 2) * 13 + 6, x = -420 + ((t * 30 + i * 140) % 830); return [x, ty(x, row) + .5, row, 0]; }); }

// WIND: tapered blades, nacelles, blinking aviation lights, glowing hubs
const blades = [];
{ const g = sg('wind'), m = mat(0xf8f8f8, { roughness: .3 }), bladeG = new THREE.CylinderGeometry(.5, 2.4, 54, 8); bladeG.scale(1, 1, .28); bladeG.translate(0, 27, 0);
  for (let i = 0; i < 9; i++) { const x = -880 + i * 210, z = 1040 + Math.sin(i * 1.7) * 40, y = ty(x, z);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.2, 110, 20), m); tw.position.set(x, y + 55, z); g.add(tw);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 2, 24), mat(0xcfd3d8)); base.position.set(x, y + 1, z); g.add(base);
    const nac = new THREE.Mesh(new THREE.CapsuleGeometry(3, 10, 6, 12), m); nac.rotation.x = Math.PI / 2; nac.position.set(x, y + 111, z + 2); g.add(nac);
    const hub = new THREE.Group(); hub.position.set(x, y + 111, z - 5); const sp = new THREE.Group(); hub.add(sp);
    const cone = new THREE.Mesh(new THREE.SphereGeometry(2.6, 16, 12), m); cone.scale.z = 1.6; sp.add(cone);
    for (let k = 0; k < 3; k++) { const p = new THREE.Group(), b = new THREE.Mesh(bladeG, m); b.rotation.y = .25; p.add(b); const tip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4, .5), glow(ELEC.wind, 3)); tip.position.y = 52; p.add(tip); p.rotation.z = k * Math.PI * 2 / 3; sp.add(p); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, .6, 8, 40), glow(ELEC.wind, 3)); hub.add(ring);
    const red = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), glow(0xff2a2a, 4)); red.position.set(x, y + 117, z + 4); g.add(red);
    ANIM.push((t) => (red.visible = (t + i * .17) % 1.6 < .25));
    g.add(hub); blades.push(sp); } }

// BATTERY: containers with fan grilles and breathing magenta light strips
{ const g = sg('battery'), pts = []; for (let i = 0; i < 24; i++) pts.push([470 + (i % 6) * 18, 1150 + Math.floor(i / 6) * 9]);
  g.add(inst(new THREE.BoxGeometry(15, 5, 5), mat(0xf3f3f5, { roughness: .35 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 2.5, z)));
  g.add(inst(new THREE.CylinderGeometry(1.1, 1.1, .3, 16), mat(0x2b2d33), pts.flatMap(([x, z]) => [[x - 4, z], [x, z], [x + 4, z]]), (d, [x, z]) => d.position.set(x, ty(x, z) + 5.15, z)));
  const strip = glow(ELEC.battery, 3); g.add(inst(new THREE.BoxGeometry(15.2, .5, .3), strip, pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 3.8, z - 2.6)));
  const base = strip.color.clone(); ANIM.push((t) => strip.color.copy(base).multiplyScalar(.5 + .5 * (Math.sin(t * 2.2) * .5 + .5))); }

// DESALINATION: ribbed tanks, an intake pier into the sea, glowing aqua headers
{ const g = sg('desal'), x0 = 1180, z0 = bayP(1180) + 40, m = mat(0xf0f2f3, { roughness: .4 }), y0 = ty(x0, z0);
  const tanks = [0, 1, 2, 3, 4, 5].map((i) => [x0 + (i % 3) * 22, z0 + Math.floor(i / 3) * 22]);
  g.add(inst(new THREE.CylinderGeometry(9, 9, 16, 40), m, tanks, (d, [x, z]) => d.position.set(x, y0 + 8, z)));
  for (const k of [4, 9, 14]) g.add(inst(new THREE.TorusGeometry(9.1, .35, 6, 40), glow(ELEC.desal, 2.6), tanks, (d, [x, z]) => { d.position.set(x, y0 + k, z); d.rotation.x = Math.PI / 2; }));
  const h = new THREE.Mesh(new THREE.BoxGeometry(70, 18, 34), mat(0xe6e4de)); h.position.set(x0 - 60, y0 + 9, z0 + 10); g.add(h);
  const win = new THREE.Mesh(new THREE.BoxGeometry(70.4, 2, 34.4), glow(ELEC.desal, 2)); win.position.set(x0 - 60, y0 + 12, z0 + 10); g.add(win);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 200), mat(0xbfc4c8)); pier.position.set(x0 + 20, 1, z0 - 110); g.add(pier);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 200, 10), glow(ELEC.desal, 2.4)); pipe.rotation.x = Math.PI / 2; pipe.position.set(x0 + 20, 2.6, z0 - 110); g.add(pipe);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 4, 24), m); head.position.set(x0 + 20, 2, z0 - 212); g.add(head); }

// GREENHOUSES: ribbed glass, rows of plants, pulsing grow lights inside
{ const g = sg('green'), glass = new THREE.MeshPhysicalMaterial({ color: 0xeaf6f2, roughness: .04, transmission: .55, transparent: true, opacity: .45 });
  const gg = new THREE.CylinderGeometry(8, 8, 90, 28, 1, true, 0, Math.PI); gg.rotateZ(Math.PI / 2); gg.rotateY(Math.PI / 2);
  const pts = []; for (let i = 0; i < 24; i++) pts.push([1150 + (i % 8) * 19, 260 + Math.floor(i / 8) * 105]);
  g.add(inst(gg, glass, pts, (d, [x, z]) => d.position.set(x, ty(x, z), z)));
  const ribs = []; pts.forEach(([x, z]) => { for (let k = -4; k <= 4; k++) ribs.push([x, z + k * 10.5]); });
  g.add(inst(new THREE.TorusGeometry(8, .25, 4, 24, Math.PI), mat(0xffffff, { metalness: .5, roughness: .3 }), ribs, (d, [x, z]) => { d.position.set(x, ty(x, z), z); }));
  g.add(inst(new THREE.BoxGeometry(15, .6, 88), mat(0x3e6d2a, { roughness: 1 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + .4, z)));
  const plants = []; pts.forEach(([x, z]) => { for (let r = -2; r <= 2; r++) for (let k = 0; k < 14; k++) plants.push([x + r * 2.8, z - 40 + k * 6.2]); });
  g.add(inst(new THREE.IcosahedronGeometry(1.3, 1), mat(0x5fae3a, { roughness: .8 }), plants, (d, [x, z]) => { d.position.set(x, ty(x, z) + 1.6, z); d.scale.y = 1.4; }));
  const lamp = glow(0xff4fd8, 2.6); g.add(inst(new THREE.BoxGeometry(12, .4, 86), lamp, pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 6.5, z)));
  const lb = lamp.color.clone(); ANIM.push((t) => lamp.color.copy(lb).multiplyScalar(.6 + .4 * Math.sin(t * 1.3))); }

// FIELDS: crop rows and harvest robots crossing them
{ const g = sg('fields'), cols = [0x8fae4a, 0xb3a659, 0x6f9440, 0xc7b867, 0x7ea046];
  for (let i = 0; i < 20; i++) { const x = 1160 + (i % 4) * 46, z = 620 + Math.floor(i / 4) * 40; const f = new THREE.Mesh(new THREE.BoxGeometry(42, .6, 36), mat(cols[i % 5], { roughness: 1 })); f.position.set(x, ty(x, z) + .3, z); f.receiveShadow = true; g.add(f);
    const rows = []; for (let r = 0; r < 8; r++) rows.push(z - 15 + r * 4.3); g.add(inst(new THREE.BoxGeometry(40, .9, 1.2), mat(new THREE.Color(cols[i % 5]).multiplyScalar(.7)), rows, (d, rz) => d.position.set(x, ty(x, rz) + .8, rz))); }
  rovers(g, 8, ELEC.fields, (i, t) => { const col = i % 4, x0 = 1160 + col * 46, z = 620 + Math.floor(i / 4) * 80 + ((t * 8 + i * 13) % 34) - 17; const x = x0 - 18 + ((t * 14 + i * 7) % 36); return [x, ty(x, z) + .5, z, Math.PI / 2]; }); }

// WORKS: sawtooth roofs, violet window bands, robot arms at work, a moving crane
{ const g = sg('works'), m = mat(0xe4e8ef, { roughness: .45 }), x0 = -1290, z0 = 420, y = ty(x0, z0);
  for (let i = 0; i < 3; i++) { const zz = z0 - 45 + i * 45; const b = new THREE.Mesh(new THREE.BoxGeometry(120, 18, 36), m); b.position.set(x0, y + 9, zz); g.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(120.4, 2.4, 36.4), glow(ELEC.works, 2.4)); band.position.set(x0, y + 12, zz); g.add(band);
    const teeth = []; for (let k = 0; k < 8; k++) teeth.push(x0 - 52 + k * 15); const tg = new THREE.CylinderGeometry(0, 9, 9, 3); tg.rotateZ(Math.PI / 2); tg.scale(1, 1, 4);
    g.add(inst(tg, m, teeth, (d, x) => { d.position.set(x, y + 22.5, zz); })); }
  const arms = []; for (let i = 0; i < 6; i++) { const a = new THREE.Group(); a.position.set(x0 - 50 + i * 20, y, z0 + 75); const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 2, 16), mat(0x2d2f36)); a.add(base);
    const s1 = new THREE.Group(); s1.position.y = 2; const l1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 12, 1.6), mat(0xffb020)); l1.position.y = 6; s1.add(l1);
    const s2 = new THREE.Group(); s2.position.y = 12; const l2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 9, 1.3), mat(0xffb020)); l2.position.y = 4.5; s2.add(l2); const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), glow(ELEC.works, 4)); tip.position.y = 9; s2.add(tip);
    s1.add(s2); a.add(s1); g.add(a); arms.push([a, s1, s2, i]); }
  ANIM.push((t) => arms.forEach(([a, s1, s2, i]) => { a.rotation.y = Math.sin(t * .9 + i) * 1.2; s1.rotation.z = -.5 + Math.sin(t * 1.4 + i) * .4; s2.rotation.z = -1 + Math.sin(t * 1.9 + i * 2) * .6; }));
  const mast = new THREE.Mesh(new THREE.BoxGeometry(3, 80, 3), mat(0xffc21a)); mast.position.set(x0 + 80, y + 40, z0); g.add(mast);
  const jib = new THREE.Group(); jib.position.set(x0 + 80, y + 80, z0); const jb = new THREE.Mesh(new THREE.BoxGeometry(70, 2.5, 2.5), mat(0xffc21a)); jb.position.x = -25; jib.add(jb); g.add(jib);
  ANIM.push((t) => (jib.rotation.y = Math.sin(t * .25) * 1.4));
  rovers(g, 8, ELEC.works, (i, t) => { const a = t * .3 + i * .785; return [x0 + Math.cos(a) * 85, y + .3, z0 + Math.sin(a) * 85, -a]; }); }

// DIGESTER: ribbed domes, pipes and a flickering gas flare
{ const g = sg('digester'), m = mat(0xece5d8, { roughness: .5 }), x0 = -1260, z0 = 120, y = ty(x0, z0);
  const ds = [0, 1, 2, 3].map((i) => [x0 + (i % 2) * 38, z0 + Math.floor(i / 2) * 38]);
  g.add(inst(new THREE.SphereGeometry(15, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), m, ds, (d, [x, z]) => d.position.set(x, y, z)));
  g.add(inst(new THREE.TorusGeometry(15.05, .4, 6, 48), glow(ELEC.digester, 2.4), ds, (d, [x, z]) => { d.position.set(x, y + 1, z); d.rotation.x = Math.PI / 2; }));
  const st = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 34, 12), mat(0x9a9a9a, { metalness: .6 })); st.position.set(x0 + 70, y + 17, z0 + 19); g.add(st);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 12), glow(0xff7a1a, 4)); flame.position.set(x0 + 70, y + 38, z0 + 19); g.add(flame);
  ANIM.push((t) => { const k = 1 + .25 * Math.sin(t * 17) + .15 * Math.sin(t * 29); flame.scale.set(k, 1.2 * k, k); }); }
SYS.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });

// live cables: light pulses travel from each system into the city
const CABLES = [];
const cableMat = (c) => new THREE.ShaderMaterial({ uniforms: { uT: UT, uC: { value: new THREE.Color(c) } }, transparent: true, depthWrite: false, toneMapped: false,
  vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float uT;uniform vec3 uC;varying vec2 vU;void main(){float p=smoothstep(.08,0.,abs(fract(vU.x*5.-uT*.7)-.5)-.38);gl_FragColor=vec4(uC*(1.1+p*4.),.55+p*.45);}' });
const cable = (id, a, b, h) => { const A = new THREE.Vector3(a[0], ty(a[0], a[1]) + 6, a[1]), B = new THREE.Vector3(b[0], ty(b[0], b[1]) + 6, b[1]);
  const M = A.clone().lerp(B, .5); M.y += h; const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, M, B), 120, 2.2, 8), cableMat(ELEC[id])); SYSG[id].add(t); CABLES.push(t); };
cable('solar', [0, 1130], [0, 640], 90); cable('solar', [-300, 1130], [-260, 560], 70); cable('wind', [-450, 1040], [-430, 420], 120);
cable('battery', [515, 1150], [300, 560], 80); cable('desal', [1120, bayP(1180) + 50], [620, 90], 40); cable('green', [1150, 365], [700, 260], 50);
cable('fields', [1160, 700], [760, 520], 50); cable('works', [-1230, 420], [-760, 300], 60); cable('digester', [-1200, 140], [-760, 110], 40);

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
Object.assign(ITEMS, {
  solar: { cat: 'Energy', name: 'Solar Field', pin: [0, ty(0, 1250) + 30, 1250], desc: 'Rows of panels behind the hills produce more electricity than the city uses in a year. The sun pays the floor of life.', stats: [['Capacity', '320 MW'], ['Share of demand', '~85%']] },
  wind: { cat: 'Energy', name: 'Wind Ridge', pin: [-50, ty(-50, 1040) + 150, 1040], desc: 'Turbines on the ridge keep producing at night and in cloudy weeks, when the sun cannot.', stats: [['Turbines', '9'], ['Capacity', '60 MW']] },
  battery: { cat: 'Energy', name: 'Battery Storage', pin: [515, ty(515, 1165) + 20, 1165], desc: 'Stores the afternoon sun for the night. The city can run a full day without sun or wind.', stats: [['Storage', '1.2 GWh'], ['Autonomy', '~24 h']] },
  desal: { cat: 'Water', name: 'Desalination Plant', pin: [1150, 40, bayP(1180) + 50], desc: 'Turns sea water into drinking water with solar power. Every litre used in homes is treated and returned to the fields.', stats: [['Output', '15,000 m³/day'], ['Wastewater reused', '100%']] },
  green: { cat: 'Food', name: 'Greenhouses', pin: [1220, 40, 365], desc: 'Glass greenhouses grow vegetables and fruit all year with recycled water and the city’s own compost.', stats: [['Area', '40 ha'], ['Harvest', 'All year']] },
  fields: { cat: 'Food', name: 'Fields & Orchards', pin: [1230, 25, 700], desc: 'Fields and orchards for grains, fruit and olives, irrigated with treated water from the city.', stats: [['Area', '600 ha'], ['Irrigation', 'Recycled']] },
  works: { cat: 'Automation', name: 'Automated Works', pin: [-1290, 70, 420], desc: 'The machines that make life free. Robots build homes, make goods, repair the city and run the farms around the clock. Nobody has to work to live.', stats: [['Robots', '2,400'], ['Runs', '24 / 7 on solar'], ['Hours a resident must work', '0']] },
  digester: { cat: 'Waste', name: 'Biodigester', pin: [-1240, 40, 140], desc: 'Food scraps and sewage become biogas for kitchens and compost for the fields. Glass, metal and stone are rebuilt into the city. No landfill.', stats: [['Organic waste', '→ Gas + compost'], ['Landfill', '0']] },
});
const ORDER = Object.keys(ITEMS);
const CATS = [['All', null], ['Civic', ['capitol', 'mall', 'ring', 'university']], ['Districts', ['downtown', 'west', 'east']], ['Nature', ['park', 'river', 'hills']], ['Coast', ['beach', 'port', 'lighthouse']], ['Leisure', ['stadium']], ['Self-sustaining', ['solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester']]];

// ── post ──
const composer = new EffectComposer(R); composer.addPass(new RenderPass(S, cam));
if (!MOBILE) composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), .7, .5, 1.5));
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
const SYSORDER = ['solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester'];
const SYS0 = .62, SYSW = .0375;
const K = [[0, 0, 0, 400, 1800, 1200, -2.3], [.05, 0, 20, 230, 230, 110, -1.7], [.13, 0, 25, 270, 520, 260, -.3], [.24, 0, 0, 330, 1350, 950, 1.3],
  [.34, 60, 0, 480, 380, 170, 2.9], [.42, river(380), 0, 380, 260, 70, 4.2], [.5, 0, 0, -30, 650, 110, 5.3], [.58, 0, 40, 860, 620, 380, 6.5]];
SYSORDER.forEach((id, i) => { const [x, y, z] = ITEMS[id].pin; K.push([SYS0 + (i + .5) * SYSW, x, y * .4, z, id === 'solar' || id === 'wind' ? 700 : 520, 300, 7.4 + i * .95]); });
K.push([.95, 0, 0, 520, 2100, 1600, 15.2], [1, 0, 0, 450, 1500, 1050, 16]);
const CAPS = [[0, 'The land.'], [.04, 'First, the Capitol.'], [.11, 'Downtown rises.'], [.21, 'The districts.'], [.31, 'Park and river.'], [.46, 'The coast.'], [.55, 'The hills.']];
const SYSCAP = ['The sun pays.', 'The wind, at night.', 'Power, stored.', 'Water from the sea.', 'Food, grown here.', 'Fields and orchards.', 'Machines do the work.', 'Nothing is wasted.'];
SYSORDER.forEach((id, i) => CAPS.push([SYS0 + i * SYSW, SYSCAP[i]])); CAPS.push([.93, 'Anthropos.']);
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
