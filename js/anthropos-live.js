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

// ── what makes it self-sustaining: on the outskirts ──
prog(85, 'Wiring the sun, water and food…');
const SYS = new THREE.Group(); S.add(SYS);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6 }, o));
const ty = (x, z) => Math.max(terrainP(x, z), .6);
const SYSG = {}; const sg = (id) => { const g = new THREE.Group(); g.userData.id = id; SYS.add(g); SYSG[id] = g; g.visible = false; return g; };
const inst = (geo, m, list, fn) => { const im = new THREE.InstancedMesh(geo, m, list.length), d = new THREE.Object3D(); list.forEach((v, i) => { d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); fn(d, v, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = im.receiveShadow = true; return im; };
{ const g = sg('solar'), pts = []; for (let r = 0; r < 18; r++) for (let c = 0; c < 46; c++) pts.push([-420 + c * 18, 1130 + r * 13]);
  g.add(inst(new THREE.BoxGeometry(16, .4, 7), mat(0x1f3358, { roughness: .2, metalness: .7 }), pts, (d, [x, z]) => { d.position.set(x, ty(x, z) + 3, z); d.rotation.x = -.5; }));
  g.add(inst(new THREE.CylinderGeometry(.25, .25, 3, 5), mat(0x999999), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 1.5, z))); }
{ const g = sg('battery'), pts = []; for (let i = 0; i < 24; i++) pts.push([470 + (i % 6) * 18, 1150 + Math.floor(i / 6) * 9]);
  g.add(inst(new THREE.BoxGeometry(15, 5, 5), mat(0xf1f1ef, { roughness: .4 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 2.5, z))); }
const blades = [];
{ const g = sg('wind'), m = mat(0xf7f7f7, { roughness: .35 });
  for (let i = 0; i < 9; i++) { const x = -880 + i * 210, z = 1040 + Math.sin(i * 1.7) * 40, y = ty(x, z);
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3, 110, 16), m); tw.position.set(x, y + 55, z); tw.castShadow = true; g.add(tw);
    const hub = new THREE.Group(); hub.position.set(x, y + 110, z - 3); const sp = new THREE.Group(); hub.add(sp);
    for (let k = 0; k < 3; k++) { const p = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 52, .6), m); b.position.y = 26; b.castShadow = true; p.add(b); p.rotation.z = k * Math.PI * 2 / 3; sp.add(p); }
    g.add(hub); blades.push(sp); } }
{ const g = sg('desal'), x0 = 1180, z0 = bayP(1180) + 40, m = mat(0xeeeeee, { roughness: .45 });
  g.add(inst(new THREE.CylinderGeometry(9, 9, 16, 32), m, [0, 1, 2, 3, 4, 5], (d, i) => d.position.set(x0 + (i % 3) * 22, ty(x0, z0) + 8, z0 + Math.floor(i / 3) * 22)));
  const h = new THREE.Mesh(new THREE.BoxGeometry(70, 18, 34), mat(0xe2e0da)); h.position.set(x0 - 60, ty(x0, z0) + 9, z0 + 10); h.castShadow = true; g.add(h);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 220, 8), mat(0x777777, { metalness: .6 })); pipe.rotation.x = Math.PI / 2; pipe.position.set(x0 + 20, 0, z0 - 110); g.add(pipe); }
{ const g = sg('green'), glass = new THREE.MeshPhysicalMaterial({ color: 0xe3f2ee, roughness: .05, transmission: .5, transparent: true, opacity: .6 });
  const gg = new THREE.CylinderGeometry(8, 8, 90, 24, 1, false, 0, Math.PI); gg.rotateZ(Math.PI / 2); gg.rotateY(Math.PI / 2);
  const pts = []; for (let i = 0; i < 24; i++) pts.push([1150 + (i % 8) * 19, 260 + Math.floor(i / 8) * 105]);
  g.add(inst(gg, glass, pts, (d, [x, z]) => d.position.set(x, ty(x, z), z)));
  g.add(inst(new THREE.BoxGeometry(15, .6, 88), mat(0x4f7d35, { roughness: 1 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + .4, z))); }
{ const g = sg('fields'), cols = [0x8fae4a, 0xb3a659, 0x6f9440, 0xc7b867, 0x7ea046];
  for (let i = 0; i < 20; i++) { const x = 1160 + (i % 4) * 46, z = 620 + Math.floor(i / 4) * 40; const f = new THREE.Mesh(new THREE.BoxGeometry(42, .6, 36), mat(cols[i % 5], { roughness: 1 })); f.position.set(x, ty(x, z) + .3, z); f.receiveShadow = true; g.add(f); } }
{ const g = sg('works'), m = mat(0xdfe4ec, { roughness: .45 }), x0 = -1290, z0 = 420, y = ty(x0, z0);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(120, 22, 34), m); b.position.set(x0, y + 11, z0 - 45 + i * 45); b.castShadow = b.receiveShadow = true; g.add(b);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 120, 32, 1, false, 0, Math.PI), m); r.rotation.z = Math.PI / 2; r.rotation.y = Math.PI / 2; r.position.set(x0, y + 22, z0 - 45 + i * 45); g.add(r); }
  const mast = new THREE.Mesh(new THREE.BoxGeometry(3, 80, 3), mat(0xffc21a)); mast.position.set(x0 + 80, y + 40, z0); g.add(mast);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(70, 2.5, 2.5), mat(0xffc21a)); jib.position.set(x0 + 60, y + 80, z0); g.add(jib); }
{ const g = sg('digester'), m = mat(0xe6e0d4, { roughness: .5 }), x0 = -1260, z0 = 120, y = ty(x0, z0);
  g.add(inst(new THREE.SphereGeometry(15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m, [0, 1, 2, 3], (d, i) => d.position.set(x0 + (i % 2) * 38, y, z0 + Math.floor(i / 2) * 38))); }
SYS.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

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
const composer = new EffectComposer(R); composer.addPass(new RenderPass(S, cam)); composer.addPass(new OutputPass());

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
  water.material.uniforms.time.value += dt * .4; buildTick(dt); blades.forEach((b, i) => (b.rotation.z += dt * (1 + i * .05)));
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ORDER.forEach((id) => { const e = pinEls[id]; tv.set(...ITEMS[id].pin).project(cam); const vis = tv.z < 1 && Math.abs(tv.x) < 1.02 && Math.abs(tv.y) < 1.02;
    e.classList.toggle('hide', !vis); e.classList.toggle('dimmed', !!filter && !filter.includes(id)); e.style.transform = `translate(${(tv.x * .5 + .5) * w - 9}px,${(-tv.y * .5 + .5) * h - 9}px)`; });
  if (flight) { flight.t += dt / flight.dur; const k = flight.t >= 1 ? 1 : 1 - Math.pow(1 - flight.t, 3); cam.position.lerpVectors(flight.fromP, flight.toP, k); ctl.target.lerpVectors(flight.fromT, flight.toT, k); if (flight.t >= 1) flight = null; }
  if (build.done && !ctl.autoRotate && !sel && !tour) { idleT += dt; if (idleT > 8) ctl.autoRotate = true; }
  if (tour && !flight) { tour.t += dt; $('#tourbar').style.width = (tour.t / 7 * 100) + '%'; if (tour.t > 7) nextTour(); }
  ctl.update(); composer.render();
}
// ── the city rises from the land, then the systems, then the tour ──
const cap = document.createElement('div'); cap.className = 'buildcap'; $('#stage').appendChild(cap);
const st = document.createElement('style'); st.textContent = `.buildcap{position:absolute;left:var(--g);top:50%;transform:translateY(-50%);z-index:15;pointer-events:none;max-width:560px}
.buildcap .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);display:flex;gap:10px;align-items:center}.buildcap .k:before{content:"";width:28px;height:1px;background:#fff}
.buildcap h2{font-size:clamp(40px,6vw,104px);font-weight:600;letter-spacing:-.05em;line-height:1;margin:.15em 0 .2em;padding-bottom:.08em;color:#fff;text-shadow:0 4px 30px rgba(0,20,50,.45);transition:opacity .6s,transform .6s}
.buildcap .bar{width:220px;height:2px;background:rgba(255,255,255,.25);margin-top:14px}.buildcap .bar i{display:block;height:100%;background:#fff;width:0}
.buildcap.out h2{opacity:0;transform:translateY(14px)}.stage.building .title,.stage.building .dock,.stage.building #pins{opacity:0;pointer-events:none}
.buildcap .sk{pointer-events:auto;margin-top:18px;background:none;border:1px solid rgba(255,255,255,.4);color:#fff;font-size:11px;padding:6px 12px;cursor:pointer}`; document.head.appendChild(st);
cap.innerHTML = '<span class="k">Anthropos · Construction</span><h2 id="bc">The land.</h2><div class="bar"><i id="bb"></i></div><button class="sk" id="bskip">Skip →</button>';
$('#stage').classList.add('building');
const STEPS = [[0, 'The land.'], [.04, 'First, the Capitol.'], [.15, 'Downtown rises.'], [.42, 'The districts.'], [.7, 'Park, river and coast.'], [.88, 'The hills.'], [1.01, 'Then, what makes it self-sustaining.']];
const SYSORDER = ['solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester'];
let build = { t: -1.8, done: false, sys: -1, last: '' }; const BUILD_T = 16;
const sysPop = []; const ease = (k) => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
function setCap(t) { if (t === build.last) return; build.last = t; cap.classList.add('out'); setTimeout(() => { $('#bc').textContent = t; cap.classList.remove('out'); }, 350); }
function finishBuild() { if (build.done) return; build.done = true; UP.value = 1; SYSORDER.forEach((id) => { SYSG[id].visible = true; SYSG[id].scale.set(1, 1, 1); }); cap.remove(); $('#stage').classList.remove('building'); setTimeout(startTour, 600); }
$('#bskip').onclick = finishBuild;
cam.position.set(1300, 1050, -1250); ctl.target.set(0, 0, 420); ctl.autoRotate = true; ctl.autoRotateSpeed = .35;
function buildTick(dt) {
  if (build.done) return; build.t += dt;
  const p = Math.max(0, build.t / BUILD_T); UP.value = Math.min(1, p); $('#bb').style.width = Math.min(100, p * 70) + '%';
  for (const [at, txt] of STEPS) if (p >= at) var cur = txt; setCap(cur);
  if (p >= 1) { const k = Math.floor((build.t - BUILD_T) / .9);
    if (build.sys < 0) { build.sys = 0; flight = { fromP: cam.position.clone(), fromT: ctl.target.clone(), toP: new THREE.Vector3(0, 1500, -900), toT: new THREE.Vector3(0, 0, 600), t: 0, dur: 3 }; }
    while (build.sys <= k && build.sys < SYSORDER.length) { const g = SYSG[SYSORDER[build.sys]]; g.visible = true; g.scale.set(1, .001, 1); sysPop.push({ g, t: 0 }); build.sys++; }
    $('#bb').style.width = (70 + 30 * Math.min(1, (build.t - BUILD_T) / (SYSORDER.length * .9))) + '%';
    if (build.t - BUILD_T > SYSORDER.length * .9 + 2.5) finishBuild(); }
  sysPop.forEach((s) => { s.t += dt; const k = Math.min(1, s.t / .7); s.g.scale.y = Math.max(.001, ease(k)); });
}
prog(100); build.t = -1.8 - 3.6; setTimeout(() => $('#load').classList.add('gone'), 3600);
frame();

$('#f').onsubmit = (e) => { e.preventDefault(); location.href = 'mailto:hello@anthroposcities.com?subject=Founding%20citizen&body=' + encodeURIComponent(e.target[0].value); $('#ok').textContent = 'Thank you. Your mail app will open to confirm.'; };
