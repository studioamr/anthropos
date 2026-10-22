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
const SUN = new THREE.DirectionalLight(0xfff2e0, 3.4); SUN.position.set(-2200, 1700, -900); SUN.castShadow = true;
SUN.shadow.mapSize.set(4096, 4096); Object.assign(SUN.shadow.camera, { left: -2600, right: 2600, top: 1800, bottom: -1800, near: 50, far: 7000 });
SUN.shadow.bias = -.0004; SUN.shadow.normalBias = 1.2; SUN.target.position.set(0, 0, 800); S.add(SUN, SUN.target);

// ── the city ──
prog(15, 'Drawing Anthropos…');
const { ink } = buildPolis();
prog(55, 'Raising the buildings…');

// growth: every vertex knows when its building is raised (bt 0..1), uP sweeps 0→1
const UP = { value: 0 }, CAPP = { value: 0 };
const M = ink.marks, NM = M.length;
function btFor(count, key) { const a = new Float32Array(count); let k = 0;
  for (let v = 0; v < count; v++) { while (k < NM - 1 && v >= (M[k][key] ?? 0)) k++; a[v] = M[k].d < 0 ? 0 : k / NM; } return a; }
const GROW = `if(distance(position.xz,vec2(205.,470.))<44.||distance(position.xz,vec2(-60.,500.))<42.||distance(position.xz,vec2(420.,960.))<24.)transformed.y=-60.;if(position.z>-80.&&abs(position.x-(-170.+70.*sin(position.z/160.)+30.*sin(position.z/61.)))<40.&&position.y<6.)transformed.y=-60.;if(distance(position.xz,vec2(120.,820.))<92.||(abs(position.x)<97.&&position.z>150.&&position.z<315.&&position.y>1.))transformed.y=-60.;float gk=clamp((uP*1.08-bt)*9.,0.,1.);float ge=gk<=0.?0.0001:1.+2.7*pow(gk-1.,3.)+1.7*pow(gk-1.,2.);transformed.y*=max(ge,.0001);`;
function grow(mat, key) {
  const prev = mat.onBeforeCompile; mat.customProgramCacheKey = () => 'grow' + key;
  mat.onBeforeCompile = (sh, r) => { sh.uniforms.uP = UP;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float bt;uniform float uP;').replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GROW);
    if (prev) prev(sh, r); };
  return mat;
}
// windows on vertical faces (no textures, pure shader)
function windows(mat) {
  mat.customProgramCacheKey = () => 'modern';
  mat.onBeforeCompile = (sh) => { sh.uniforms.uNight = NIGHT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float kind;varying float vK;varying vec3 vWP;varying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvK=kind;vWN=normalize(mat3(modelMatrix)*normal);');
    sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vK;varying vec3 vWP;varying vec3 vWN;uniform float uNight;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side=1.-smoothstep(.3,.6,abs(vWN.y));
        vec2 q=vec2(abs(vWN.x)>abs(vWN.z)?vWP.z:vWP.x,vWP.y);
        float fl=fract((vWP.y-.3)/3.6);float slab=1.-step(.17,fl);
        float mul=step(.94,fract(q.x/1.6));float k=vWP.y>30.?1.:vK;float glass;
        if(k<.5) glass=(1.-slab)*(1.-mul);
        else if(k<1.5) glass=1.-max(mul*.7,slab*.35);
        else if(k<2.5) glass=(1.-slab)*(1.-step(.7,fract(q.x/1.3)));
        else glass=(1.-slab)*(1.-mul)*step(.12,fract(q.x/4.8));
        glass*=side*step(.9,vWP.y);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.09,.13,.16),glass*.94);
        float lit=step(.45,fract(sin(dot(floor(q/vec2(1.6,3.6)),vec2(12.9898,78.233)))*43758.5453));
        totalEmissiveRadiance+=glass*lit*uNight*vec3(1.,.78,.5)*2.;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.04,glass);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.9,glass);');
  };
  return mat;
}
const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return g; };
const city = new THREE.Group(); S.add(city);
const depthGrow = () => grow(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'd');
const UNI = [120, 820];
{ const g = geo(ink.faces); g.computeVertexNormals(); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.faces.length / 3, 'f'), 1));
  const KC = [0xf1efea, 0xc9d2d8, 0xd9ccb4, 0x3b3e43].map((c) => new THREE.Color(c)), grass = new THREE.Color(0x6e8f4a), gravel = new THREE.Color(0xd3cec5);
  const P = ink.faces, col = new Float32Array(P.length), kind = new Float32Array(P.length / 3), c = new THREE.Color();
  for (let i = 0; i < P.length; i += 9) { const cx = (P[i] + P[i + 3] + P[i + 6]) / 3, cz = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
    const key = Math.floor(cx / 7.5) * 7919 + Math.floor(cz / 7.5) * 104729; const h = Math.abs(Math.sin(key) * 43758.5453) % 1;
    const kd = h < .42 ? 0 : h < .62 ? 1 : h < .84 ? 2 : 3; c.copy(KC[kd]);
    if (P[i + 1] === P[i + 4] && P[i + 4] === P[i + 7] && P[i + 1] > 3) c.copy(h * 7 % 1 < .6 ? grass : gravel).offsetHSL(0, 0, (h * 11 % 1 - .5) * .06);
    for (let v = 0; v < 9; v += 3) { col[i + v] = c.r; col[i + v + 1] = c.g; col[i + v + 2] = c.b; kind[i / 3 + v / 3] = kd; } }
  g.setAttribute('kind', new THREE.BufferAttribute(kind, 1));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, grow(windows(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })), 'f'));
  m.customDepthMaterial = depthGrow(); m.castShadow = m.receiveShadow = true; city.add(m); }
if (ink._tf) { const g = geo(ink._tf); g.computeVertexNormals(); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink._tf.length / 3, 't'), 1));
  const cols = new Float32Array(ink._tf.length), c = new THREE.Color();
  for (let i = 0; i < ink._tf.length; i += 9) { c.setHSL(.23 + Math.random() * .08, .38 + Math.random() * .15, .2 + Math.random() * .1); for (let k = 0; k < 9; k += 3) { cols[i + k] = c.r; cols[i + k + 1] = c.g; cols[i + k + 2] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, grow(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, flatShading: true, side: THREE.DoubleSide }), 't'));
  m.customDepthMaterial = depthGrow(); m.castShadow = m.receiveShadow = true; city.add(m); }
{ const g = geo(ink.edges); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.edges.length / 3, 'e'), 1)); city.add(new THREE.LineSegments(g, grow(new THREE.LineBasicMaterial({ color: 0x5a4a52, transparent: true, opacity: .06 }), 'e'))); }
{ const g = geo(ink.details); g.setAttribute('bt', new THREE.BufferAttribute(btFor(ink.details.length / 3, 'l'), 1)); city.add(new THREE.LineSegments(g, grow(new THREE.LineBasicMaterial({ color: 0x7a6a62, transparent: true, opacity: .1 }), 'l'))); }

// ── road network: district grids, ring, radials, promenade (same rules in JS and GLSL) ──
const PU = 58, PV = 46, ST = 11, STAD = [640, 420];
const DTH = DISTRICTS.map((c, i) => (i ? Math.atan2(c[1] - DOWN[1], c[0] - DOWN[0]) : 0));
const segT = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return [Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz), t, Math.sqrt(L2)]; };
const noRoad = (x, z) => (x - PARK.x) ** 2 / (PARK.rx + 6) ** 2 + (z - PARK.z) ** 2 / (PARK.rz + 6) ** 2 < 1 || (Math.abs(x - DOWN[0]) < 90 && z > DOWN[1] - 120 && z < DOWN[1] + 58) || (Math.abs(x - DOWN[0]) < 42 && z > DOWN[1] && z < PARK.z) || Math.hypot(x - STAD[0], z - STAD[1]) < 96 || Math.hypot(x - 120, z - 820) < 96;
function roadAt(x, z) {
  const pz = z - bayP(x); if (pz > 52 && pz < 70 && Math.abs(x) < 1080) return 1;
  if (pz < 50 || noRoad(x, z)) return 0;
  let k = 0, best = 1e9; DISTRICTS.forEach((c, i) => { const d = Math.hypot(x - c[0], z - c[1]) / DRAD[i]; if (d < best) { best = d; k = i; } });
  if (best < .98) { const c = DISTRICTS[k], th = DTH[k], qx = x - c[0], qz = z - c[1], uu = qx * Math.cos(th) + qz * Math.sin(th) - (k ? PU / 2 : 0), vv = -qx * Math.sin(th) + qz * Math.cos(th) - (k ? PV / 2 : 0);
    const du = Math.abs(((uu / PU + .5) % 1 + 1) % 1 - .5) * PU, dv = Math.abs(((vv / PV + .5) % 1 + 1) % 1 - .5) * PV; if (du > PU / 2 - ST / 2 || dv > PV / 2 - ST / 2) return 1; }
  if (Math.abs(Math.hypot((x - DOWN[0]) / 1.35, z - DOWN[1]) - 170) < 9) return 2;
  for (let i = 1; i < DISTRICTS.length; i++) { const [d, t, L] = segT(x, z, DOWN, DISTRICTS[i]); if (d < 11 && t > 95 / L && t < 1 - 46 / L) return 2; }
  return 0; }
function roadShader(mat) { mat.customProgramCacheKey = () => 'paths';
  mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, { uP: UP, uD: { value: DISTRICTS.map((d) => new THREE.Vector2(...d)) }, uR: { value: DRAD.slice() }, uTh: { value: DTH }, uDown: { value: new THREE.Vector2(...DOWN) }, uPark: { value: new THREE.Vector4(PARK.x, PARK.z, PARK.rx, PARK.rz) } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRW=(modelMatrix*vec4(position,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vRW;uniform float uP;uniform vec2 uD[7];uniform float uR[7];uniform float uTh[7];uniform vec2 uDown;uniform vec4 uPark;
      float bayQ(float x){return -60.-120.*pow(x/1100.,2.)-10.*sin(x*.006);}
      float segd(vec2 p,vec2 a,vec2 b,out float t){vec2 d=b-a;t=clamp(dot(p-a,d)/dot(d,d),0.,1.);return length(p-a-t*d);}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 p=vRW.xz;float pz=p.y-bayQ(p.x);float stoneA=0.,greenA=0.,railA=0.;
      float rev=clamp((uP*1.12-length(p-vec2(0.,250.))/1500.)*10.,0.,1.);
      bool blocked=pow((p.x-uPark.x)/(uPark.z+6.),2.)+pow((p.y-uPark.y)/(uPark.w+6.),2.)<1.||(abs(p.x-uDown.x)<90.&&p.y>uDown.y-120.&&p.y<uDown.y+58.)||(abs(p.x-uDown.x)<42.&&p.y>uDown.y&&p.y<uPark.y)||length(p-vec2(640.,420.))<96.||length(p-vec2(120.,820.))<96.;
      if(vRW.y>-.8&&pz>50.&&rev>0.){
        if(!blocked){int k=0;float best=1e9;for(int i=0;i<7;i++){float d=length(p-uD[i])/uR[i];if(d<best){best=d;k=i;}}
          if(best<.98){vec2 c=uD[k];float th=uTh[k];vec2 q=p-c;float off=k>0?1.:0.;float uu=dot(q,vec2(cos(th),sin(th)))-off*29.,vv=dot(q,vec2(-sin(th),cos(th)))-off*23.;
            float du=abs(fract(uu/58.+.5)-.5)*58.,dv=abs(fract(vv/46.+.5)-.5)*46.;
            float st=max(step(23.5,du),step(17.5,dv));float path=max(step(26.9,du),step(20.9,dv));greenA=st*(1.-path);stoneA=path;}
          float rr=abs(length(vec2((p.x-uDown.x)/1.35,p.y-uDown.y))-170.);if(rr<9.){greenA=step(5.,rr);stoneA=1.-greenA;railA=(1.-step(.18,abs(rr-1.6)))+(1.-step(.18,abs(rr-3.1)));}
          for(int i=1;i<7;i++){float t;float d=segd(p,uDown,uD[i],t);float L=length(uD[i]-uDown);if(d<11.&&t>95./L&&t<1.-46./L){stoneA=1.-step(2.4,d);greenA=1.-stoneA;}}}
        if(pz>52.&&pz<70.&&abs(p.x)<1080.){stoneA=1.;greenA=0.;}}
      {float bd=1e9;for(int i=0;i<7;i++)bd=min(bd,length(p-uD[i])/uR[i]);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.66,.74,.55),(1.-smoothstep(.95,1.08,bd))*rev*step(50.,pz)*.55);}
      stoneA*=rev;greenA*=rev;railA*=rev;
      vec2 tl=abs(fract(p/vec2(1.6,.8))-.5);float tile=step(.46,max(tl.x,tl.y));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.5,.66,.34),greenA);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.83,.77)*(1.-tile*.08),stoneA);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.35,.36,.38),railA);`); };
  return mat; }

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
  const sand = new THREE.Color(0xd8c7a0), sage = new THREE.Color(0x748f4c), deep = new THREE.Color(0x56733a), dry = new THREE.Color(0x9c9068), pave = new THREE.Color(0xbdb7ab), park = new THREE.Color(0x5f8d3c), bed = new THREE.Color(0x1d4f6a);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), coast = bayP(x); let y;
    if (z < coast) { y = -2 - Math.min(14, (coast - z) * .05); c.copy(bed); }
    else {
      y = HW(x, z) - .05;
      const n = Math.sin(x * .013) * Math.cos(z * .011) * .5 + .5;
      c.copy(sage).lerp(deep, n * .5).lerp(dry, Math.min(1, Math.max(0, (y - 20) / 70)));
      if (z < coast + 52) c.copy(sand);
      const di = DISTRICTS.findIndex((d, k) => Math.hypot(x - d[0], z - d[1]) < DRAD[k] * 1.08); 
      if ((x - PARK.x) ** 2 / PARK.rx ** 2 + (z - PARK.z) ** 2 / PARK.rz ** 2 < 1) c.copy(park);
      if (RIV(x, z) < 17 || LAKE(x, z) < 1) { y = -1.6; c.copy(bed); }
    }
    p.setY(i, y); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, roadShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 }))); m.receiveShadow = true; S.add(m); }
// the wider world: plains, the western ridge and a mountain wall behind; the sea only in front
{ const N = MOBILE ? 200 : 360, g = new THREE.PlaneGeometry(11000, 8000, N, Math.round(N * .73)); g.rotateX(-Math.PI / 2); g.translate(0, 0, 1800);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const sand = new THREE.Color(0xd8c7a0), sage = new THREE.Color(0x748f4c), forest = new THREE.Color(0x3e5a2e), rock = new THREE.Color(0x7d766b), snow = new THREE.Color(0xf3f5f7), bed = new THREE.Color(0x1d4f6a);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), coast = bayP(x), y = HW(x, z);
    if (z < coast) c.copy(bed); else if (z < coast + 52) c.copy(sand);
    else { c.copy(sage).lerp(forest, sstep(60, 260, y) * .8 + vn(x * .004, z * .004) * .15).lerp(rock, sstep(380, 700, y)).lerp(snow, sstep(780, 980, y)); }
    const inner = Math.abs(x) < 1690 && z > -810 && z < 1470; p.setY(i, inner ? Math.min(y, 0) - 6 : y - .45); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); m.receiveShadow = true; S.add(m); }
// ── bridges: wherever a road meets both banks ──
const BRIDGES = new THREE.Group(); S.add(BRIDGES); BRIDGES.visible = false;
{ const deckM = new THREE.MeshStandardMaterial({ color: 0x9a978f, roughness: .7 }), topM = new THREE.MeshStandardMaterial({ color: 0xd9d3c6, roughness: .8 }), railM = new THREE.MeshStandardMaterial({ color: 0xdedcd6, roughness: .5, metalness: .3 });
  let run = null; const spans = [];
  for (let z = bayP(river(0)) + 30; z <= 1040; z += 1.5) { const x = river(z), hit = roadAt(x - 30, z) && roadAt(x + 30, z);
    if (hit && !run) run = { z0: z }; if (!hit && run) { if (z - run.z0 > 6) spans.push([run.z0, z]); run = null; } }
  spans.forEach(([z0, z1]) => { const zc = (z0 + z1) / 2, w = z1 - z0 + 3, xc = river(zc), L = 76;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L, 1.8, w), deckM); deck.position.set(xc, 1.6, zc); BRIDGES.add(deck);
    const top = new THREE.Mesh(new THREE.BoxGeometry(L, .12, w - 3), topM); top.position.set(xc, 2.56, zc); BRIDGES.add(top);
    for (const sgn of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 1.1, .35), railM); r.position.set(xc, 3.1, zc + sgn * (w / 2 - .3)); BRIDGES.add(r); }
    for (const px of [-18, 0, 18]) { const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 5, 12), deckM); pier.position.set(xc + px, -1.6, zc); BRIDGES.add(pier); } });
  BRIDGES.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); }

// ── life: people walking and cycling the garden streets ──
{ const N = MOBILE ? 1500 : 4500, W = [];
  let tries = 0; while (W.length < N && tries++ < N * 40) { const x = (Math.random() - .5) * 2200, z = -100 + Math.random() * 1150; const r = roadAt(x, z); if (!r || z < bayP(x) + 75) continue;
    let k = 0, best = 1e9; DISTRICTS.forEach((c, i) => { const d = Math.hypot(x - c[0], z - c[1]) / DRAD[i]; if (d < best) { best = d; k = i; } });
    const th = DTH[k], qx = x - DISTRICTS[k][0], qz = z - DISTRICTS[k][1], uu = qx * Math.cos(th) + qz * Math.sin(th) - (k ? 29 : 0), du = Math.abs(((uu / 58 + .5) % 1 + 1) % 1 - .5) * 58;
    const ax = r === 2 ? Math.random() * Math.PI : du > 23.5 ? th + Math.PI / 2 : th; W.push([x, z, Math.cos(ax), Math.sin(ax), Math.random() * 6.28, .5 + Math.random() * .9, Math.random() < .12]); }
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.32, 1.05, 3, 8), new THREE.MeshStandardMaterial({ roughness: .7 }), W.length); body.castShadow = true;
  const PC = [0xf4f1ea, 0x2b2f36, 0x3a6ea5, 0xc8553d, 0xe9c46a, 0x5b8a72, 0x9c6b98, 0xd9d9d9].map((c) => new THREE.Color(c)); W.forEach((w, i) => body.setColorAt(i, w[6] ? new THREE.Color(0xffb020) : PC[i % PC.length]));
  S.add(body); const o = new THREE.Object3D(); let last = 0;
  const lifeTick = (t) => { body.visible = UP.value > .55; if (!body.visible || t - last < .05) return; last = t;
    for (let i = 0; i < W.length; i++) { const [x, z, cx, cz, ph, sp, bike] = W[i], s2 = Math.sin(t * sp * (bike ? .5 : .12) + ph) * (bike ? 60 : 24); const px = x + cx * s2, pz = z + cz * s2;
      o.position.set(px, ty(px, pz) + (bike ? 1.3 : 1.05), pz); o.rotation.set(0, 0, bike ? Math.PI / 2 : 0); o.scale.set(1, bike ? 1.4 : 1, 1); o.updateMatrix(); body.setMatrixAt(i, o.matrix); }
    body.instanceMatrix.needsUpdate = true; };
  window.__life = lifeTick; }

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
    if (RIV(x, z) < 22 || LAKE(x, z) < 1.15 || roadAt(x, z) || roadAt(x + 3, z) || roadAt(x - 3, z) || roadAt(x, z + 3) || roadAt(x, z - 3)) continue; if (Math.hypot(x - UNI[0], z - UNI[1]) < 95) continue; if (Math.abs(x) < 100 && z > 145 && z < 320) continue; if (Math.hypot(x - 205, z - 470) < 46 || Math.hypot(x + 60, z - 500) < 44 || Math.hypot(x - 420, z - 960) < 26) continue;
    const inCity = DISTRICTS.some((d, k) => Math.hypot(x - d[0], z - d[1]) < DRAD[k] * 1.1); if (!inCity && Math.random() < .6) continue;
    T.push([x, HW(x, z), z, .7 + Math.random() * .9]); }
  const leafM = new THREE.MeshStandardMaterial({ roughness: .85 }), trunkM = new THREE.MeshStandardMaterial({ color: 0x6b4f38, roughness: 1 });
  const growTree = (m) => { m.onBeforeCompile = (sh) => { sh.uniforms.uP = UP; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uP;').replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 ip=instanceMatrix[3].xz;float gk=clamp((uP*1.12-length(ip-vec2(0.,250.))/1500.)*10.,0.,1.);transformed*=max(gk,.0001);`); }; m.customProgramCacheKey = () => 'treegrow'; return m; };
  const can = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.5, 1), growTree(leafM), T.length), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.35, .5, 4, 5), growTree(trunkM), T.length);
  const o = new THREE.Object3D(), cc = new THREE.Color();
  T.forEach(([x, y, z, s], i) => { o.position.set(x, y + 2 * s, z); o.scale.setScalar(s); o.rotation.set(0, Math.random() * 6, 0); o.updateMatrix(); tr.setMatrixAt(i, o.matrix);
    o.position.y = y + 5.6 * s; o.scale.set(s * (1 + Math.random() * .3), s * (1.1 + Math.random() * .4), s * (1 + Math.random() * .3)); o.updateMatrix(); can.setMatrixAt(i, o.matrix);
    const r = Math.random(); cc.setHSL(.22 + Math.random() * .1, .35 + Math.random() * .2, .18 + Math.random() * .12);
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
  g.add(inst(new THREE.BoxGeometry(10, 6, 6), surf(0x7f8b86, { roughness: .6, metalness: .3 }, 'vent'), inv, (d, [x, z]) => d.position.set(x, ty(x, z) + 3, z)));
  g.add(inst(new THREE.BoxGeometry(10.2, .7, 6.2), glow(ELEC.solar, 3), inv, (d, [x, z]) => d.position.set(x, ty(x, z) + 6.3, z)));
  rovers(g, 24, ELEC.solar, (i, t) => { const row = 1257 + i * 42, x = -800 + ((t * 40 + i * 230) % 1600); return [x, ty(x, row) + .5, row, 0]; }); }

// ── detail kit: real materials, pads, roads, fences, cars, trees, roof solar ──
function surf(color, o = {}, kind = 'corr') { const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .55, metalness: .3 }, o));
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vQ;varying vec3 vQN;').replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\nvQ=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;vQN=normalize(mat3(modelMatrix*instanceMatrix)*normal);\n#else\nvQ=(modelMatrix*vec4(position,1.)).xyz;vQN=normalize(mat3(modelMatrix)*normal);\n#endif');
    const body = kind === 'corr' ? 'float sd=1.-step(.6,abs(vQN.y));float h=abs(vQN.x)>abs(vQN.z)?vQ.z:vQ.x;float r=.5+.5*sin(h*6.2832/.9);diffuseColor.rgb*=mix(1.,.82+.18*r,sd);diffuseColor.rgb*=mix(1.,.9,sd*(1.-step(1.2,vQ.y-floor(vQ.y/40.)*40.)));'
      : kind === 'pad' ? 'vec2 j=abs(fract(vQ.xz/6.)-.5);float l=step(.47,max(j.x,j.y));diffuseColor.rgb*=1.-l*.18;diffuseColor.rgb*=.94+.06*fract(sin(dot(floor(vQ.xz/6.),vec2(12.9,78.2)))*43758.);'
      : kind === 'vent' ? 'float sd=1.-step(.6,abs(vQN.y));float h=abs(vQN.x)>abs(vQN.z)?vQ.z:vQ.x;float g=step(.5,fract(h/.5))*step(.35,fract(vQ.y/1.6))*sd;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.17,.18),g*.85);'
      : 'float st=step(.96,fract(vQ.y/2.2));diffuseColor.rgb*=1.-st*.25;';
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vQ;varying vec3 vQN;').replace('#include <color_fragment>', '#include <color_fragment>\n' + body); };
  m.customProgramCacheKey = () => 'surf' + kind; return m; }
const CONC = surf(0xb3aea4, { roughness: .9, metalness: 0 }, 'pad'), ASPH = mat(0x3a3c3f, { roughness: .95 }), LINE = mat(0xf0e6c8, { roughness: .8 });
function pad(g, x, z, w, d, rot = 0) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, .8, d), CONC); p.position.set(x, ty(x, z) + .2, z); p.rotation.y = rot; p.receiveShadow = true; g.add(p); return p; }
function road(g, a, b, wdt = 9) { const [x0, z0] = a, [x1, z1] = b, L = Math.hypot(x1 - x0, z1 - z0), r = new THREE.Mesh(new THREE.BoxGeometry(wdt, .9, L), ASPH);
  r.position.set((x0 + x1) / 2, ty((x0 + x1) / 2, (z0 + z1) / 2) + .25, (z0 + z1) / 2); r.rotation.y = Math.atan2(x1 - x0, z1 - z0); r.receiveShadow = true; g.add(r);
  const n = Math.floor(L / 8), dash = []; for (let i = 0; i < n; i++) dash.push(i / n); g.add(inst(new THREE.BoxGeometry(.4, .95, 3), LINE, dash, (o, t) => { o.position.set(x0 + (x1 - x0) * t, ty(x0, z0) + .3, z0 + (z1 - z0) * t); o.rotation.y = r.rotation.y; })); }
function fence(g, x, z, w, d) { const pts = []; for (let t = 0; t <= 1; t += 6 / Math.max(w, d)) pts.push([x - w / 2 + w * t, z - d / 2], [x - w / 2 + w * t, z + d / 2], [x - w / 2, z - d / 2 + d * t], [x + w / 2, z - d / 2 + d * t]);
  g.add(inst(new THREE.CylinderGeometry(.12, .12, 2.6, 4), mat(0x6b6f74, { metalness: .6 }), pts, (o, [px, pz]) => o.position.set(px, ty(px, pz) + 1.3, pz)));
  const fm = new THREE.MeshStandardMaterial({ color: 0x8a8f95, metalness: .6, roughness: .5, transparent: true, opacity: .35 });
  [[x, z - d / 2, w, 0], [x, z + d / 2, w, 0], [x - w / 2, z, d, Math.PI / 2], [x + w / 2, z, d, Math.PI / 2]].forEach(([px, pz, L, ry]) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(L, 2.4), fm); s.position.set(px, ty(px, pz) + 1.3, pz); s.rotation.y = ry; g.add(s); }); }
const CARC = [0xe8e8e8, 0x1e1f22, 0x8a9096, 0x2d4f7a, 0xa52a2a, 0xd8d2c4, 0x3a5a40].map((c) => new THREE.Color(c));
function cars(g, x, z, cols, rows, dir = 0) { const pts = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (Math.random() < .78) pts.push([x + c * 3.1, z + r * 7]);
  const body = inst(new THREE.BoxGeometry(2, 1.4, 4.6), mat(0xffffff, { roughness: .25, metalness: .6 }), pts, (o, [px, pz]) => { o.position.set(px, ty(px, pz) + .9, pz); o.rotation.y = dir; });
  pts.forEach((_, i) => body.setColorAt(i, CARC[i * 5 % CARC.length])); g.add(body);
  g.add(inst(new THREE.BoxGeometry(1.8, .7, 2.4), mat(0x15191e, { roughness: .1, metalness: .8 }), pts, (o, [px, pz]) => { o.position.set(px, ty(px, pz) + 1.9, pz - .2); o.rotation.y = dir; }));
  const lines = []; for (let c = 0; c <= cols; c++) lines.push(x - 1.55 + c * 3.1); g.add(inst(new THREE.BoxGeometry(.15, .95, 5.4), LINE, lines, (o, px) => o.position.set(px, ty(px, z) + .25, z + (rows - 1) * 3.5))); }
function trucks(g, list) { list.forEach(([x, z, ry]) => { const t = new THREE.Group(); t.position.set(x, ty(x, z), z); t.rotation.y = ry;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3, 2.8), mat(0xf2f2f2, { roughness: .3, metalness: .4 })); cab.position.set(0, 2, 5); t.add(cab);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.8, 11), mat(0x2f6bb3, { roughness: .4 })); box.position.set(0, 2.6, -2); t.add(box); t.traverse((o) => o.isMesh && (o.castShadow = true)); g.add(t); }); }
function grove(g, x, z, w, d, n) { const pts = []; for (let i = 0; i < n; i++) pts.push([x + (Math.random() - .5) * w, z + (Math.random() - .5) * d, .6 + Math.random() * .6]);
  const can = inst(new THREE.IcosahedronGeometry(2.6, 1), mat(0xffffff, { roughness: .85 }), pts, (o, [px, pz, s]) => { o.position.set(px, ty(px, pz) + 5 * s, pz); o.scale.setScalar(s); });
  pts.forEach((_, i) => can.setColorAt(i, new THREE.Color().setHSL(.24 + Math.random() * .08, .4, .2 + Math.random() * .1))); g.add(can);
  g.add(inst(new THREE.CylinderGeometry(.3, .45, 4, 5), mat(0x6b4f38), pts, (o, [px, pz, s]) => { o.position.set(px, ty(px, pz) + 2 * s, pz); o.scale.setScalar(s); })); }
function roofSolar(g, x, y, z, w, d) { const pts = []; for (let a = -w / 2 + 3; a < w / 2 - 3; a += 4.2) for (let b = -d / 2 + 3; b < d / 2 - 3; b += 2.6) pts.push([x + a, z + b]);
  g.add(inst(new THREE.BoxGeometry(3.8, .15, 2), mat(0x1a2a4a, { roughness: .35, metalness: .45 }), pts, (o, [px, pz]) => { o.position.set(px, y + .6, pz); o.rotation.x = -.2; })); }
// BATTERY · Megapack-style units on a fenced concrete yard with transformers and a substation
{ const g = sg('battery'), x0 = 1050, z0 = 1335; pad(g, x0, z0, 260, 130); fence(g, x0, z0, 264, 134); road(g, [x0 - 140, z0 - 72], [x0 + 140, z0 - 72], 10);
  const pts = []; for (let i = 0; i < 80; i++) pts.push([x0 - 108 + (i % 10) * 24, z0 - 44 + Math.floor(i / 10) * 12]);
  g.add(inst(new THREE.BoxGeometry(18, 7, 6.4), surf(0xc9cbc8, { roughness: .75, metalness: 0 }, 'vent'), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 4.1, z)));
  g.add(inst(new THREE.BoxGeometry(18.6, .6, 7), mat(0x4a4d52), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + .9, z)));
  g.add(inst(new THREE.BoxGeometry(18.2, .5, 6.6), mat(0x9ea2a6, { metalness: .3, roughness: .6 }), pts, (d, [x, z]) => d.position.set(x, ty(x, z) + 7.85, z)));
  const strip = glow(ELEC.battery, 1.4); g.add(inst(new THREE.BoxGeometry(.3, 4, .3), strip, pts, (d, [x, z]) => d.position.set(x + 8.6, ty(x, z) + 4.2, z - 3.3)));
  const base = strip.color.clone(); ANIM.push((t) => strip.color.copy(base).multiplyScalar(.5 + .5 * (Math.sin(t * 2.2) * .5 + .5)));
  const tr = []; for (let i = 0; i < 8; i++) tr.push([x0 - 100 + i * 28, z0 + 52]);
  g.add(inst(new THREE.BoxGeometry(6, 6, 5), surf(0x6f7d6a, { roughness: .6, metalness: .3 }, 'corr'), tr, (d, [x, z]) => d.position.set(x, ty(x, z) + 3.6, z)));
  g.add(inst(new THREE.CylinderGeometry(.5, .5, 3, 8), mat(0x8a5a3a), tr.flatMap(([x, z]) => [[x - 1.5, z], [x, z], [x + 1.5, z]]), (d, [x, z]) => d.position.set(x, ty(x, z) + 8, z)));
  const sub = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 22), surf(0xd6d3cc, { roughness: .7, metalness: .1 }, 'corr')); sub.position.set(x0 + 150, ty(x0 + 150, z0) + 7, z0); g.add(sub);
  const gantry = []; for (let i = 0; i < 5; i++) gantry.push([x0 + 150 + (i - 2) * 9, z0 + 30]);
  g.add(inst(new THREE.BoxGeometry(.8, 22, .8), mat(0x9aa0a6, { metalness: .8 }), gantry, (d, [x, z]) => d.position.set(x, ty(x, z) + 11, z)));
  cars(g, x0 + 90, z0 - 64, 8, 1); grove(g, x0, z0 + 120, 300, 40, 60); }

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

// DESALINATION · stainless tanks with ladders, RO hall with corrugated cladding, pipe racks, intake pier
{ const g = sg('desal'), [x0, z0] = C.desal, y0 = ty(x0, z0);
  pad(g, x0 - 40, z0 + 70, 300, 170); fence(g, x0 - 40, z0 + 70, 304, 174); road(g, [x0 - 190, z0 + 160], [x0 + 110, z0 + 160], 10);
  const steel = mat(0x8d959c, { roughness: .45, metalness: .6 }), blue = mat(0x2f6fb0, { roughness: .4, metalness: .3 }), grey = mat(0x7d848b, { roughness: .4, metalness: .7 });
  const tanks = []; for (let i = 0; i < 12; i++) tanks.push([x0 + (i % 4) * 32, z0 + 40 + Math.floor(i / 4) * 32]);
  g.add(inst(new THREE.CylinderGeometry(12, 12, 20, 48), surf(0x9ba3aa, { roughness: .45, metalness: .6 }, 'bands'), tanks, (d, [x, z]) => d.position.set(x, y0 + 10.4, z)));
  g.add(inst(new THREE.SphereGeometry(12, 32, 10, 0, Math.PI * 2, 0, Math.PI / 4), steel, tanks, (d, [x, z]) => d.position.set(x, y0 + 16, z)));
  g.add(inst(new THREE.TorusGeometry(12.2, .35, 6, 48), mat(0xf2c230), tanks, (d, [x, z]) => { d.position.set(x, y0 + 20.6, z); d.rotation.x = Math.PI / 2; }));
  g.add(inst(new THREE.BoxGeometry(.9, 21, .5), mat(0xf2c230, { metalness: .5 }), tanks, (d, [x, z]) => d.position.set(x + 12.2, y0 + 10.5, z)));
  g.add(inst(new THREE.TorusGeometry(12.1, .3, 6, 48), glow(ELEC.desal, 1.8), tanks, (d, [x, z]) => { d.position.set(x, y0 + 6, z); d.rotation.x = Math.PI / 2; }));
  const hall = new THREE.Mesh(new THREE.BoxGeometry(150, 20, 52), surf(0xdfe3e6, { roughness: .45, metalness: .5 }, 'corr')); hall.position.set(x0 - 120, y0 + 10.4, z0 + 70); g.add(hall);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(150.4, 3, 52.4), blue); stripe.position.set(x0 - 120, y0 + 4, z0 + 70); g.add(stripe);
  const doors = []; for (let i = 0; i < 6; i++) doors.push(x0 - 185 + i * 24); g.add(inst(new THREE.BoxGeometry(8, 7, .4), mat(0x5a6168, { metalness: .6 }), doors, (d, x) => d.position.set(x, y0 + 4, z0 + 43.9)));
  roofSolar(g, x0 - 120, y0 + 20.4, z0 + 70, 146, 48);
  const ro = []; for (let i = 0; i < 24; i++) ro.push([x0 - 180 + (i % 12) * 10, z0 + 125 + Math.floor(i / 12) * 8]);
  g.add(inst(new THREE.CylinderGeometry(1.4, 1.4, 9, 16), blue, ro, (d, [x, z]) => { d.position.set(x, y0 + 2.4, z); d.rotation.z = Math.PI / 2; }));
  const rack = []; for (let i = 0; i < 4; i++) rack.push(i); g.add(inst(new THREE.CylinderGeometry(.9, .9, 140, 10), grey, rack, (d, i) => { d.position.set(x0 - 30 + i * 2.2, y0 + 8, z0 + 60); d.rotation.x = Math.PI / 2; }));
  const legs = []; for (let i = 0; i < 12; i++) legs.push(z0 - 5 + i * 12); g.add(inst(new THREE.BoxGeometry(10, 8, .6), grey, legs, (d, z) => d.position.set(x0 - 27, y0 + 4, z)));
  const pier = new THREE.Mesh(new THREE.BoxGeometry(9, 2, 360), CONC); pier.position.set(x0 + 40, 1.2, z0 - 180); g.add(pier);
  const piles = []; for (let i = 0; i < 30; i++) piles.push(z0 - 360 + i * 12); g.add(inst(new THREE.CylinderGeometry(.7, .7, 8, 8), mat(0x555a5f), piles, (d, z) => d.position.set(x0 + 40, -3, z)));
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 360, 12), blue); pipe.rotation.x = Math.PI / 2; pipe.position.set(x0 + 43, 3.4, z0 - 180); g.add(pipe);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(.2, 1.1, 360), mat(0xf2c230)); rail.position.set(x0 + 36, 2.8, z0 - 180); g.add(rail);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 5, 32), CONC); head.position.set(x0 + 40, 2, z0 - 362); g.add(head);
  cars(g, x0 - 190, z0 + 140, 12, 2); grove(g, x0 - 40, z0 + 190, 320, 30, 70); }

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

// WORKS · four automated halls in dark corrugated metal, glazed sawtooth roofs with solar, docks, trucks, KUKA-style arms
{ const g = sg('works'), [x0, z0] = C.works, y = ty(x0, z0);
  pad(g, x0, z0 + 20, 470, 470); road(g, [x0 - 240, z0 + 270], [x0 + 240, z0 + 270], 12); road(g, [x0 + 240, z0 - 220], [x0 + 240, z0 + 270], 12); fence(g, x0, z0 + 20, 476, 476);
  const clad = surf(0x4b5058, { roughness: .45, metalness: .55 }, 'corr'), cladL = surf(0xb9bec4, { roughness: .45, metalness: .5 }, 'corr');
  const skyG = new THREE.MeshStandardMaterial({ color: 0x9cc3dd, roughness: .05, metalness: .6 });
  for (let i = 0; i < 4; i++) { const zz = z0 - 135 + i * 90;
    const b = new THREE.Mesh(new THREE.BoxGeometry(360, 22, 64), i % 2 ? cladL : clad); b.position.set(x0, y + 11.4, zz); g.add(b);
    const glazing = new THREE.Mesh(new THREE.BoxGeometry(360.4, 2.6, 64.4), mat(0x1c2733, { roughness: .05, metalness: .9 })); glazing.position.set(x0, y + 18, zz); g.add(glazing);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(360.6, .8, 64.6), glow(ELEC.works, 1.6)); accent.position.set(x0, y + 22.6, zz); g.add(accent);
    const teeth = []; for (let k = 0; k < 22; k++) teeth.push(x0 - 168 + k * 16);
    const slope = new THREE.BoxGeometry(16.2, .5, 64); g.add(inst(slope, i % 2 ? cladL : clad, teeth, (d, x) => { d.position.set(x - 1, y + 26.2, zz); d.rotation.z = -.5; }));
    g.add(inst(new THREE.BoxGeometry(.4, 7.6, 63), skyG, teeth, (d, x) => d.position.set(x + 7.2, y + 26, zz)));
    const sol = []; teeth.forEach((x) => { for (let r = -28; r <= 28; r += 4) sol.push([x - 1, zz + r]); });
    g.add(inst(new THREE.BoxGeometry(12, .2, 3.4), mat(0x1a2a4a, { roughness: .35, metalness: .45 }), sol, (d, [x, z]) => { d.position.set(x, y + 26.6, z); d.rotation.z = -.5; }));
    const docks = []; for (let k = 0; k < 10; k++) docks.push(x0 - 150 + k * 32); g.add(inst(new THREE.BoxGeometry(5, 6, .4), mat(0x3a3e44, { metalness: .6 }), docks, (d, x) => d.position.set(x, y + 3.4, zz + 32.3)));
    g.add(inst(new THREE.BoxGeometry(6, .4, 4), mat(0xf2c230), docks, (d, x) => d.position.set(x, y + 6.8, zz + 34))); }
  trucks(g, [[x0 - 150, z0 + 175, 0], [x0 - 54, z0 + 175, 0], [x0 + 42, z0 + 175, 0], [x0 + 138, z0 + 175, 0], [x0 + 230, z0 + 40, Math.PI / 2]]);
  const orange = mat(0xff7a1a, { roughness: .35, metalness: .3 }), black = mat(0x24262a, { metalness: .5 });
  const arms = []; for (let i = 0; i < 14; i++) { const a = new THREE.Group(); a.position.set(x0 - 170 + i * 26, y + .6, z0 + 228); a.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 2, 20), black));
    const s1 = new THREE.Group(); s1.position.y = 2; const j1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 16), orange); j1.rotation.z = Math.PI / 2; s1.add(j1); const l1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 15, 2.6), orange); l1.position.y = 8; s1.add(l1);
    const s2 = new THREE.Group(); s2.position.y = 16; const j2 = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3, 16), black); j2.rotation.z = Math.PI / 2; s2.add(j2); const l2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 11, 2), orange); l2.position.y = 6; s2.add(l2);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(.9, .5, 2.5, 10), black); tip.position.y = 12.5; s2.add(tip); const led = new THREE.Mesh(new THREE.SphereGeometry(.6, 8, 6), glow(ELEC.works, 4)); led.position.y = 14; s2.add(led);
    s1.add(s2); a.add(s1); g.add(a); arms.push([a, s1, s2, i]); }
  const conv = new THREE.Mesh(new THREE.BoxGeometry(380, 1.2, 7), mat(0x2a2c30, { metalness: .5 })); conv.position.set(x0, y + 1.2, z0 + 214); g.add(conv);
  const boxes = []; for (let i = 0; i < 40; i++) boxes.push(i); const bx = inst(new THREE.BoxGeometry(3, 2.4, 3), mat(0xc8a26a, { roughness: .9 }), boxes, () => {}); g.add(bx);
  ANIM.push((t) => { arms.forEach(([a, s1, s2, i]) => { a.rotation.y = Math.sin(t * .9 + i) * 1.2; s1.rotation.z = -.5 + Math.sin(t * 1.4 + i) * .4; s2.rotation.z = -1 + Math.sin(t * 1.9 + i * 2) * .6; });
    for (let i = 0; i < 40; i++) { _o.position.set(x0 - 190 + ((t * 12 + i * 9.5) % 380), y + 3, z0 + 214); _o.rotation.set(0, 0, 0); _o.updateMatrix(); bx.setMatrixAt(i, _o.matrix); } bx.instanceMatrix.needsUpdate = true; });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(4, 110, 4), mat(0xffc21a, { metalness: .4 })); mast.position.set(x0 + 220, y + 55, z0); g.add(mast);
  const jib = new THREE.Group(); jib.position.set(x0 + 220, y + 110, z0); const jb = new THREE.Mesh(new THREE.BoxGeometry(120, 3, 3), mat(0xffc21a, { metalness: .4 })); jb.position.x = -45; jib.add(jb); const cw = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 6), mat(0x55595f)); cw.position.x = 16; jib.add(cw); g.add(jib);
  ANIM.push((t) => (jib.rotation.y = Math.sin(t * .25) * 1.4));
  cars(g, x0 - 200, z0 - 230, 30, 3); grove(g, x0, z0 + 300, 500, 40, 120); grove(g, x0 - 270, z0, 30, 480, 60);
  rovers(g, 20, ELEC.works, (i, t) => { const a = t * .15 + i * .314; return [x0 + Math.cos(a) * 230, y + .8, z0 + 20 + Math.sin(a) * 230, -a]; }, 1.5); }

// DIGESTER · membrane domes on concrete rings, sludge tanks, pipe bridge, flare, control house, trucks
{ const g = sg('digester'), [x0, z0] = C.digester, y = ty(x0, z0);
  pad(g, x0 + 60, z0 + 40, 280, 190); fence(g, x0 + 60, z0 + 40, 284, 194); road(g, [x0 - 80, z0 + 145], [x0 + 200, z0 + 145], 10);
  const memb = new THREE.MeshStandardMaterial({ color: 0x6f7f6a, roughness: .55, metalness: .1 }), ring = surf(0xa9a49a, { roughness: .9, metalness: 0 }, 'pad');
  const ds = []; for (let i = 0; i < 6; i++) ds.push([x0 + (i % 3) * 52, z0 + Math.floor(i / 3) * 52]);
  g.add(inst(new THREE.CylinderGeometry(20.5, 20.5, 6, 48), ring, ds, (d, [x, z]) => d.position.set(x, y + 3.4, z)));
  g.add(inst(new THREE.SphereGeometry(20, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), memb, ds, (d, [x, z]) => { d.position.set(x, y + 6.4, z); d.scale.y = .62; }));
  g.add(inst(new THREE.TorusGeometry(20.4, .35, 6, 48), glow(ELEC.digester, 1.6), ds, (d, [x, z]) => { d.position.set(x, y + 6.5, z); d.rotation.x = Math.PI / 2; }));
  g.add(inst(new THREE.CylinderGeometry(1.2, 1.2, 3, 12), mat(0x9aa0a6, { metalness: .7 }), ds, (d, [x, z]) => d.position.set(x, y + 19.5, z)));
  const tanks = [[x0 + 170, z0], [x0 + 170, z0 + 40], [x0 + 205, z0 + 20]];
  g.add(inst(new THREE.CylinderGeometry(13, 13, 12, 40), surf(0x8f969c, { roughness: .45, metalness: .6 }, 'bands'), tanks, (d, [x, z]) => d.position.set(x, y + 6.4, z)));
  g.add(inst(new THREE.TorusGeometry(13.1, .3, 6, 40), mat(0xf2c230), tanks, (d, [x, z]) => { d.position.set(x, y + 12.4, z); d.rotation.x = Math.PI / 2; }));
  const pr = []; for (let i = 0; i < 3; i++) pr.push(i); g.add(inst(new THREE.CylinderGeometry(.8, .8, 200, 10), mat(0x9a6a3a, { metalness: .5, roughness: .5 }), pr, (d, i) => { d.position.set(x0 + 90, y + 9 + i * 1.8, z0 + 26); d.rotation.z = Math.PI / 2; }));
  const sup = []; for (let i = 0; i < 10; i++) sup.push(x0 - 10 + i * 20); g.add(inst(new THREE.BoxGeometry(.6, 10, 6), mat(0x7d848b, { metalness: .7 }), sup, (d, x) => d.position.set(x, y + 5, z0 + 26)));
  const house = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 20), surf(0xcfc8bb, { roughness: .6, metalness: .2 }, 'corr')); house.position.set(x0 + 60, y + 5.4, z0 + 110); g.add(house);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(40.4, 2, 20.4), mat(0x1c2733, { roughness: .05, metalness: .9 })); hb.position.set(x0 + 60, y + 6.8, z0 + 110); g.add(hb);
  roofSolar(g, x0 + 60, y + 10.4, z0 + 110, 38, 18);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 46, 16), mat(0x8a8f95, { metalness: .7 })); st.position.set(x0 + 230, y + 23, z0 + 70); g.add(st);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 2, 16), mat(0x3a3e44)); cap.position.set(x0 + 230, y + 46.5, z0 + 70); g.add(cap);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(3, 11, 14), glow(0xff7a1a, 3.4)); flame.position.set(x0 + 230, y + 53, z0 + 70); g.add(flame);
  ANIM.push((t) => { const k = 1 + .25 * Math.sin(t * 17) + .15 * Math.sin(t * 29); flame.scale.set(k, 1.2 * k, k); });
  trucks(g, [[x0 + 20, z0 + 160, Math.PI / 2], [x0 + 120, z0 + 160, Math.PI / 2]]); cars(g, x0 + 100, z0 + 128, 10, 1); grove(g, x0 + 60, z0 - 70, 300, 30, 70); }
// SUBSTATION · the solar field ties into the grid here
{ const g = SYSG.solar, x0 = 0, z0 = 1205;
  pad(g, x0, z0, 140, 70); fence(g, x0, z0, 144, 74); road(g, [x0 - 80, z0 - 42], [x0 + 80, z0 - 42], 9);
  const tr = []; for (let i = 0; i < 6; i++) tr.push([x0 - 50 + i * 20, z0 - 12]);
  g.add(inst(new THREE.BoxGeometry(8, 7, 6), surf(0x6f7d6a, { roughness: .6, metalness: .3 }, 'corr'), tr, (d, [x, z]) => d.position.set(x, ty(x, z) + 4, z)));
  g.add(inst(new THREE.BoxGeometry(.6, 6, 6.6), mat(0x5c6a58, { metalness: .4 }), tr.flatMap(([x, z]) => [[x - 4.4, z], [x + 4.4, z]]), (d, [x, z]) => d.position.set(x, ty(x, z) + 4, z)));
  g.add(inst(new THREE.CylinderGeometry(.5, .6, 3.4, 10), mat(0x8a5a3a), tr.flatMap(([x, z]) => [[x - 2, z], [x, z], [x + 2, z]]), (d, [x, z]) => d.position.set(x, ty(x, z) + 9.2, z)));
  const gan = []; for (let i = 0; i < 7; i++) gan.push([x0 - 60 + i * 20, z0 + 18]);
  g.add(inst(new THREE.BoxGeometry(.9, 24, .9), mat(0x9aa0a6, { metalness: .8 }), gan.flatMap(([x, z]) => [[x, z - 6], [x, z + 6]]), (d, [x, z]) => d.position.set(x, ty(x, z) + 12, z)));
  g.add(inst(new THREE.BoxGeometry(.8, .8, 13), mat(0x9aa0a6, { metalness: .8 }), gan, (d, [x, z]) => d.position.set(x, ty(x, z) + 23.6, z)));
  const wires = new THREE.Mesh(new THREE.BoxGeometry(124, .15, .15), mat(0x2a2c30)); wires.position.set(x0, ty(x0, z0) + 23, z0 + 14); g.add(wires); const w2 = wires.clone(); w2.position.z = z0 + 22; g.add(w2);
  const ctrl = new THREE.Mesh(new THREE.BoxGeometry(28, 8, 14), surf(0xd6d1c6, { roughness: .6, metalness: .1 }, 'corr')); ctrl.position.set(x0 + 50, ty(x0, z0) + 4.4, z0 + 20); g.add(ctrl);
  const cb = new THREE.Mesh(new THREE.BoxGeometry(28.4, 1.8, 14.4), mat(0x1c2733, { roughness: .05, metalness: .9 })); cb.position.set(x0 + 50, ty(x0, z0) + 5.4, z0 + 20); g.add(cb);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(28.6, .5, 14.6), glow(ELEC.solar, 2)); strip.position.set(x0 + 50, ty(x0, z0) + 8.6, z0 + 20); g.add(strip);
  cars(g, x0 + 30, z0 - 30, 6, 1); }

// THE MIND · a superintelligence core above the Capitol, linked to every system and district
{ const g = sg('ai'), core = new THREE.Group(); core.position.set(0, 230, 230); g.add(core);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(30, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(ELEC.ai).multiplyScalar(1.1), wireframe: true, toneMapped: false, transparent: true, opacity: .8 })); core.add(shell);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 24), glow(0xdff4ff, 1.5)); core.add(orb);
  const rings = [0, 1, 2].map((k) => { const r = new THREE.Mesh(new THREE.TorusGeometry(44 + k * 10, .7, 8, 96), glow(ELEC.ai, 1.4)); r.rotation.x = Math.PI / 2 + k * .5; core.add(r); return r; });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 6, 200, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(ELEC.ai).multiplyScalar(1.6), transparent: true, opacity: .14, toneMapped: false, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = -100;
  }
SYS.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
SYSG.ai.traverse((o) => { if (o.isMesh) o.castShadow = false; }); S.remove(SYSG.ai); SYS.remove(SYSG.ai);

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
// light pools: the city areas each system powers glow in its colour
const poolTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const pool = (id, x, z, r) => { const m = new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(ELEC[id]).multiplyScalar(1.3), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), m); p.rotation.x = -Math.PI / 2; p.position.set(x, ty(x, z) + 3, z); SYSG[id].add(p); const ph = Math.random() * 6; ANIM.push((t) => (m.opacity = .14 + .08 * Math.sin(t * 1.5 + ph))); };
pool('solar', 0, 560, 320); pool('solar', -260, 420, 260); pool('wind', -430, 300, 300); pool('battery', 300, 520, 260); pool('desal', 600, 90, 260); pool('green', 700, 260, 220); pool('fields', 760, 520, 220); pool('works', -760, 260, 280); pool('digester', -760, 110, 220);

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
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(86, 88, 1.2, 96), mat(0x5f8d3c, { roughness: .9 })); lawn.position.y = .6; U0.add(lawn);
  const path = new THREE.Mesh(new THREE.RingGeometry(40, 46, 96), mat(0xe4dccb)); path.rotation.x = -Math.PI / 2; path.position.y = 1.3; U0.add(path);
  for (let k = 0; k < 4; k++) { const a0 = k * Math.PI / 2 + .22, len = Math.PI / 2 - .44;
    for (let f = 0; f < 4; f++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 4.2, 64, 1, true, a0, len), f % 2 ? glassM : white); ring.position.y = 1.2 + f * 4.2 + 2.1; U0.add(ring);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 4.2, 64, 1, true, a0, len), f % 2 ? glassM : white); inner.position.y = ring.position.y; U0.add(inner); }
    const roof = new THREE.Mesh(new THREE.RingGeometry(58, 70, 48, 1, a0, len), white); roof.rotation.x = -Math.PI / 2; roof.position.y = 18; U0.add(roof);
    const garden = new THREE.Mesh(new THREE.RingGeometry(60, 68, 48, 1, a0 + .05, len - .1), mat(0x6e8f4a)); garden.rotation.x = -Math.PI / 2; garden.position.y = 18.2; U0.add(garden); }
  const rot = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 20, 64), glassM); rot.position.y = 11; U0.add(rot);
  for (let f = 0; f < 4; f++) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(23, 23, .9, 64), white); sl.position.y = 2 + f * 6; U0.add(sl); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(23, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15, metalness: .3 })); dome.position.y = 21; dome.scale.y = .7; U0.add(dome);
  const ocu = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 3, 24), glow(0xfff0c8, 2)); ocu.position.y = 37; U0.add(ocu);
  const trunkM = mat(0x8a6a4a), frondM = mat(0x3f7a32, { roughness: .7 });
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = 80, palm = new THREE.Group(); palm.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, 14, 6), trunkM); tr.position.y = 7; tr.rotation.z = .08; palm.add(tr);
    for (let k = 0; k < 6; k++) { const fr = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 1.6), frondM); fr.position.set(Math.cos(k) * 3.5, 14, Math.sin(k) * 3.5); fr.rotation.y = -k; fr.rotation.z = -.45; palm.add(fr); } U0.add(palm); }
  U0.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  U0.scale.y = .001; U0.visible = false;
  ANIM.push(() => { const k = Math.min(1, Math.max(0, (UP.value - .8) * 7)); U0.visible = k > 0; U0.scale.y = k <= 0 ? .001 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2); }); }

// ── the Capitol: a white monument — platform, dome and bowl, twin towers, reflecting pool ──
{ const G0 = new THREE.Group(); G0.position.set(0, .3, 230); S.add(G0);
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: .45 }), trav = surf(0xe2d8c4, { roughness: .7, metalness: 0 }, 'pad');
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: .3, metalness: 1 }), shade = new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: .2, metalness: .6 });
  const pool = new THREE.MeshStandardMaterial({ color: 0x173f57, roughness: .02, metalness: .7 });
  // reflecting pool and plaza toward the sea
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(190, .8, 150), trav); plaza.position.y = .3; G0.add(plaza);
  const pl = new THREE.Mesh(new THREE.BoxGeometry(150, .4, 36), pool); pl.position.set(0, .9, -48); G0.add(pl);
  const jets = []; for (let i = 0; i < 15; i++) jets.push(-70 + i * 10); G0.add(inst(new THREE.CylinderGeometry(.25, .5, 3.5, 8), glow(0xdff6ff, 1.2), jets, (d, x) => d.position.set(x, 2.8, -48)));
  // the long platform (the Congress) with ribbon of shade and a ceremonial ramp
  const plat = new THREE.Mesh(new THREE.BoxGeometry(150, 12, 62), white); plat.position.set(0, 6.8, 22); G0.add(plat);
  const rib = new THREE.Mesh(new THREE.BoxGeometry(146, 5, 62.4), shade); rib.position.set(0, 5.5, 22); G0.add(rib);
  const cols = []; for (let i = 0; i < 25; i++) cols.push(-72 + i * 6); G0.add(inst(new THREE.BoxGeometry(.9, 5, .9), white, cols, (d, x) => d.position.set(x, 5.5, -9.6)));
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 54), white); ramp.position.set(0, 6.4, -24); ramp.rotation.x = -.23; G0.add(ramp);
  const rampLine = new THREE.Mesh(new THREE.BoxGeometry(12.2, .2, 54), glow(0x9fe8ff, 1.2)); rampLine.position.set(0, 6.95, -24); rampLine.rotation.x = -.23; rampLine.scale.x = .05; G0.add(rampLine);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(150, .6, 62), trav); deck.position.set(0, 13.1, 22); G0.add(deck);
  // the dome (Senate) and the bowl (Assembly)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.scale.y = .55; dome.position.set(-36, 13.4, 22); G0.add(dome);
  const bowlP = []; for (let i = 0; i <= 24; i++) { const t = i / 24; bowlP.push(new THREE.Vector2(5 + 30 * Math.sin(t * Math.PI / 2) ** 1.4, t * 15)); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlP, 96), white); bowl.material.side = THREE.DoubleSide; bowl.position.set(36, 13.4, 22); G0.add(bowl);
  const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(35, .6, 8, 96), gold); bowlRim.rotation.x = Math.PI / 2; bowlRim.position.set(36, 28.4, 22); G0.add(bowlRim);
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(20, .5, 8, 96), gold); domeRing.rotation.x = Math.PI / 2; domeRing.position.set(-36, 13.6, 22); G0.add(domeRing);
  const ocu = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, .8, 24), glow(0xfff2d0, 1.6)); ocu.position.set(-36, 24.6, 22); G0.add(ocu);
  // twin towers joined by a sky bridge, behind the platform
  for (const sx of [-1, 1]) { const tw = new THREE.Mesh(new THREE.BoxGeometry(9, 110, 26), white); tw.position.set(sx * 6.2, 55.3, 72); G0.add(tw);
    const fins = []; for (let k = 0; k < 36; k++) fins.push(3.5 + k * 3); G0.add(inst(new THREE.BoxGeometry(9.3, .5, 26.3), shade, fins, (d, y) => d.position.set(sx * 6.2, y, 72)));
    const crown = new THREE.Mesh(new THREE.BoxGeometry(9.4, 1.2, 26.4), gold); crown.position.set(sx * 6.2, 110.9, 72); G0.add(crown); }
  for (const y of [44, 46.5]) { const br = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 26), white); br.position.set(0, y, 72); G0.add(br); }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), glow(0xffffff, 2.6)); beacon.position.set(0, 114, 72); G0.add(beacon);
  // flanking colonnades and the ceremonial axis to the park
  for (const sx of [-1, 1]) { const cs = []; for (let i = 0; i < 14; i++) cs.push(-50 + i * 8); G0.add(inst(new THREE.CylinderGeometry(.7, .7, 14, 16), white, cs, (d, z) => d.position.set(sx * 88, 7.3, z)));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 112), white); beam.position.set(sx * 88, 15, 2); G0.add(beam); const ln = new THREE.Mesh(new THREE.BoxGeometry(3.1, .2, 112), glow(0xffd9a0, 1.4)); ln.position.set(sx * 88, 14.1, 2); G0.add(ln); }
  // plinths with bronze sculptures along the pool
  [[-60, -72], [-20, -72], [20, -72], [60, -72]].forEach(([x, z], i) => { const p = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 5), trav); p.position.set(x, 2, z); G0.add(p);
    const sc = new THREE.Mesh(i % 2 ? new THREE.TorusKnotGeometry(1.6, .45, 80, 10) : new THREE.ConeGeometry(1.4, 6, 4), gold); sc.position.set(x, 6.4, z); G0.add(sc); });
  ANIM.push((t) => { beacon.scale.setScalar(1 + .35 * Math.max(0, Math.sin(t * 2.2))); });
  G0.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  G0.scale.y = .001; G0.visible = false;
  ANIM.push(() => { const k = CAPP.value; G0.visible = k > 0; G0.scale.y = k <= 0 ? .001 : Math.max(.001, k < 1 ? k * k * (3 - 2 * k) : 1); }); }

// ── places of life: the Baths, the Amphitheater, the Observatory ──
const LIFE3D = [];
function lifeG(x, z) { const g = new THREE.Group(); g.position.set(x, ty(x, z), z); S.add(g); g.visible = false; LIFE3D.push(g); return g; }
{ const white = mat(0xf3f0ea, { roughness: .45 }), stoneL = mat(0xd9cfbd, { roughness: .7 }), waterM = mat(0x2f7fa6, { roughness: .03, metalness: .5 }), bronzeL = mat(0x6b5236, { metalness: .8, roughness: .35 });
  // THERMAE · stepped pools under a long colonnade
  { const g = lifeG(205, 470);
    const base = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, 46), stoneL); base.position.y = .6; g.add(base);
    [[-14, -6, 30, 18], [16, -6, 22, 18], [0, 13, 54, 10]].forEach(([x, z, w, d]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, .3, d), waterM); p.position.set(x, 1.3, z); g.add(p); });
    const cols = []; for (let i = 0; i < 15; i++) cols.push(-33 + i * 4.7); g.add(inst(new THREE.CylinderGeometry(.45, .45, 8, 12), white, cols, (d, x) => d.position.set(x, 5.2, -21)));
    const roof = new THREE.Mesh(new THREE.BoxGeometry(72, 1, 8), white); roof.position.set(0, 9.6, -21); g.add(roof);
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 9, 40), white); hall.position.set(-27, 5.7, 12); g.add(hall);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(9.2, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), white); dome.position.set(-27, 10.2, 12); g.add(dome);
    const ocu = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, .6, 20), glow(0xfff0d0, 1.4)); ocu.position.set(-27, 19.4, 12); g.add(ocu); }
  // AMPHITHEATER · stone tiers facing the lake
  { const g = lifeG(-60, 500);
    for (let r = 0; r < 10; r++) { const r0 = 14 + r * 2.3, y = .8 + r * .8;
      const tread = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 2.3, 64, 1, Math.PI * .1, Math.PI * .8), stoneL); tread.rotation.x = -Math.PI / 2; tread.position.y = y; g.add(tread);
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, .8, 64, 1, true, Math.PI * .6, Math.PI * .8), stoneL); riser.material.side = THREE.DoubleSide; riser.position.y = y - .4; g.add(riser); }
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 1, 48, 1, false, -Math.PI / 2, Math.PI), white); stage.position.y = .5; g.add(stage);
    const sc = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 1.2), white); sc.position.set(0, 4.5, 11.5); g.add(sc);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(13, 40, 16, Math.PI, Math.PI, 0, Math.PI / 2), white); shell.material = white; shell.position.set(0, .6, 9); shell.scale.set(1, .8, .6); g.add(shell);
    const lamps = []; for (let i = 0; i < 9; i++) lamps.push(i); g.add(inst(new THREE.SphereGeometry(.5, 8, 6), glow(0xffd9a0, 2), lamps, (d, i) => { const a = Math.PI * (.12 + i * .095); d.position.set(Math.cos(a) * 37, 9, -Math.sin(a) * 37); })); }
  // OBSERVATORY · a white dome on the hill, open slit, telescope
  { const g = lifeG(420, 960);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 10, 48), white); drum.position.y = 5; g.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(12.2, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe8eaec, { metalness: .6, roughness: .25 })); dome.position.y = 10; g.add(dome);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(3, 13, 12.6), mat(0x1c2026)); slit.position.set(0, 16, 0); g.add(slit);
    const tel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 12, 16), bronzeL); tel.position.set(0, 18, -2); tel.rotation.x = -.6; g.add(tel);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(20, 21, 1, 48), stoneL); deck.position.y = .3; g.add(deck); }
  LIFE3D.forEach((g) => g.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }));
  ANIM.push(() => LIFE3D.forEach((g) => (g.visible = UP.value > .62))); }

// ── construction crews: cranes around the Capitol, then a crane front that moves outward ──
{ const yel = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: .5, metalness: .4 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: .5 });
  const mk = (h) => { const c = new THREE.Group(); const mast = new THREE.Mesh(new THREE.BoxGeometry(2.2, h, 2.2), yel); mast.position.y = h / 2; c.add(mast);
    const lat = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, 2.3), new THREE.MeshBasicMaterial({ color: 0x8a6a00, wireframe: true })); lat.position.y = h / 2; c.add(lat);
    const jib = new THREE.Group(); jib.position.y = h; const arm = new THREE.Mesh(new THREE.BoxGeometry(48, 1.6, 1.6), yel); arm.position.x = 14; jib.add(arm);
    const cw = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 3), dark); cw.position.x = -10; jib.add(cw); const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), dark); cab.position.y = -2; jib.add(cab);
    const line = new THREE.Mesh(new THREE.BoxGeometry(.15, h * .6, .15), dark); line.position.set(30, -h * .3, 0); jib.add(line); const hook = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), mat(0xb5562a)); hook.position.set(30, -h * .6, 0); jib.add(hook);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.7, 8, 6), glow(0xff3b2a, 4)); lamp.position.y = 3; jib.add(lamp); c.add(jib); c.userData.jib = jib; c.traverse((o) => o.isMesh && (o.castShadow = true)); S.add(c); c.visible = false; return c; };
  const capCr = [[-80, 170], [80, 170], [-80, 300], [80, 300]].map(([x, z]) => { const c = mk(70); c.position.set(x, .3, z); return c; });
  const front = Array.from({ length: 16 }, () => mk(55));
  ANIM.push((t) => {
    capCr.forEach((c, i) => { c.visible = CAPP.value > .001 && CAPP.value < .999; c.userData.jib.rotation.y = Math.sin(t * .5 + i) * 1.6 + i; });
    const u = UP.value, on = u > .002 && u < .985; const k = Math.min(NM - 1, Math.floor(u * 1.08 * NM)), R = Math.max(60, (M[k] && M[k].d) || 0);
    front.forEach((c, i) => { const a = i / 16 * Math.PI * 2 + .2, x = DOWN[0] + Math.cos(a) * R * 1.15, z = DOWN[1] + Math.sin(a) * R * .9;
      const okk = on && z > bayP(x) + 80 && Math.abs(x) < 1150 && z < 1000; c.visible = okk; if (okk) { c.position.set(x, ty(x, z), z); c.userData.jib.rotation.y = Math.sin(t * .6 + i * 1.7) * 1.8; } }); }); }

// ── places you can tap ──
const P = (x, z, y = 12) => [x, Math.max(terrainP(x, z), 0) + y, z];
const ITEMS = {
  capitol: { cat: 'Civic heart', name: 'The Capitol', pin: P(0, 230, 62), desc: 'The heart of Anthropos: a white monument on a long platform. The dome holds the Senate, the open bowl holds the Assembly, and the twin towers house the offices that serve them. A ceremonial ramp rises from the reflecting pool, open to every citizen.', stats: [['Towers', '2 × 110 m'], ['Assembly', 'Open bowl'], ['Governance', 'Charter']] },
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
Object.assign(ITEMS, {
  respublica: { cat: 'Vocation IV · Res Publica', name: 'Res Publica · The Forum', pin: P(-60, 330, 18), desc: 'The public thing. Citizens deliberate in person, under a short constitution, with an intelligence that serves the forum and never the other way round. The Capitol, the mall and the squares around them are the stage.', stats: [['Governance', 'In person'], ['Constitution', 'Short, written'], ['The Mind', 'Serves the forum']] },
  ars: { cat: 'Vocation I · Ars', name: 'Ars · The Arts District', pin: P(-260, 520, 30), desc: 'Music, sculpture, film, architecture and the night. Workshops at cost and patronage paid for by the wealth the machines produce. Every courtyard has a studio; every evening has a stage.', stats: [['Studios', 'At cost'], ['Patronage', 'City-funded'], ['Nights', 'Concerts · film · dance']] },
  scientia: { cat: 'Vocation II · Scientia', name: 'Scientia · The Knowledge District', pin: P(300, 540, 30), desc: 'Philosophy, science and engineering. Study not to get a job but to understand. Libraries open day and night, laboratories open to anyone, and the time clock becomes a bell again.', stats: [['Libraries', '24 / 7'], ['Labs', 'Open to all'], ['Tuition', 'Free for life']] },
  virtus: { cat: 'Vocation III · Virtus', name: 'Virtus · The District of Honor', pin: P(560, 300, 30), desc: 'The body as a work of art. Athletics, fencing, wrestling, the mountain and the sea. Compete with honor, lose with dignity, train again. The stadium is its temple.', stats: [['Stadium', '1'], ['Gymnasia', 'In every district'], ['Sea & mountain', 'At the door']] },
  thermae: { cat: 'Life', name: 'The Baths', pin: P(205, 470, 22), desc: 'Thermal pools under a long colonnade and a domed hall, open to every citizen. The afternoon ritual of Rome, returned: bathe, talk, rest, begin again.', stats: [['Pools', '3 + domed hall'], ['Open', 'Every day'], ['Cost', 'Free for citizens']] },
  amphi: { cat: 'Life', name: 'The Amphitheater', pin: P(-60, 500, 20), desc: 'Stone tiers facing the lake. Concerts, plays and lectures under the open sky, lit by lanterns at night.', stats: [['Seats', '~3,000'], ['Season', 'All year'], ['Entry', 'Free']] },
  observatory: { cat: 'Life', name: 'The Observatory', pin: [420, ty(420, 960) + 32, 960], desc: 'A public observatory on the hills behind the city. Dark-sky rules keep the stars visible from every rooftop.', stats: [['Telescope', '1.5 m'], ['Open nights', 'Every clear night']] },
  market: { cat: 'Life', name: 'The Evening Market', pin: P(300, bayP(300) + 62, 12), desc: 'Every evening the promenade fills with stalls of food grown within sight of the city, and dinners that run late by the sea.', stats: [['Stalls', '~200'], ['Food travels', '< 5 km']] },
});
const ORDER = ['capitol', 'respublica', 'downtown', 'ars', 'scientia', 'virtus', 'thermae', 'amphi', 'park', 'mall', 'river', 'ring', 'market', 'beach', 'university', 'observatory', 'stadium', 'west', 'east', 'hills', 'port', 'lighthouse', 'solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester'].filter((k) => ITEMS[k]);
const CATS = [['All', null], ['Life', ['respublica', 'ars', 'scientia', 'virtus', 'thermae', 'amphi', 'observatory', 'market', 'park', 'beach']], ['Civic', ['capitol', 'mall', 'ring', 'university']], ['Districts', ['downtown', 'west', 'east']], ['Nature', ['park', 'river', 'hills']], ['Coast', ['beach', 'port', 'lighthouse']], ['Leisure', ['stadium']], ['Self-sustaining', ['solar', 'wind', 'battery', 'desal', 'green', 'fields', 'works', 'digester']]];

// ── time of day: dawn · day · sunset · night ──
const PM2 = new THREE.PMREMGenerator(R), TOD = {};
const TIMES = {
  dawn:   { az: 75, el: 7, stops: [[0, '#28365f'], [.3, '#6a6aa8'], [.42, '#d993b4'], [.48, '#ffc49a'], [.5, '#fff0d0'], [.53, '#c9a6b4'], [1, '#2b2d3a']], sun: '#fff1d6', light: 0xffc9a0, li: 2.6, hemi: [0xd9c4ec, 0x4a4652, .55], fog: 0xe8c9c4, exp: 1.0, water: 0x2f6fa6, night: 0 },
  day:    { az: 215, el: 38, stops: [[0, '#2a64b8'], [.3, '#4f86cf'], [.43, '#93b9e2'], [.49, '#d6e4ef'], [.5, '#e9eef2'], [.53, '#9aa59a'], [1, '#3b4236']], sun: '#fffdf4', light: 0xfff2e0, li: 3.4, hemi: [0xcfe2ff, 0x5c5444, .55], fog: 0xc9d8e6, exp: 1.0, water: 0x135873, night: 0 },
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
setTime('day');

// ── post ──
const composer = new EffectComposer(R); composer.addPass(new RenderPass(S, cam));
if (!MOBILE) composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .45, 1.6));
composer.addPass(new OutputPass());

// ── controls ──
const HOME = { p: new THREE.Vector3(1050, 820, -980), t: new THREE.Vector3(0, 0, 400) };
cam.position.copy(HOME.p);
const ctl = new OrbitControls(cam, canvas);
ctl.target.copy(HOME.t); ctl.enableDamping = true; ctl.dampingFactor = .06; ctl.maxPolarAngle = Math.PI * .45; ctl.minDistance = 60; ctl.maxDistance = 4200;
ctl.enableZoom = false; ctl.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: THREE.MOUSE.PAN };
ctl.autoRotate = true; ctl.autoRotateSpeed = .25;
function dolly(f) { const v = cam.position.clone().sub(ctl.target); const l = THREE.MathUtils.clamp(v.length() * f, ctl.minDistance, ctl.maxDistance); cam.position.copy(ctl.target).add(v.setLength(l)); }
canvas.addEventListener('wheel', (e) => { if (!build.done) return; const d = cam.position.distanceTo(ctl.target);
  if ((e.deltaY > 0 && d < ctl.maxDistance - 5) || (e.deltaY < 0 && d > ctl.minDistance + 5) || e.ctrlKey || e.metaKey) { e.preventDefault(); ctl.autoRotate = false; idleT = 0; dolly(1 + Math.max(-.25, Math.min(.25, e.deltaY * (e.ctrlKey ? .01 : .0015)))); } }, { passive: false });
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
if ($('#dock')) CATS.forEach(([n, ids], k) => { const b = document.createElement('button'); b.className = 'chip' + (k === 0 ? ' on' : ''); b.innerHTML = `<i></i>${n}`;
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
if ($('#tour')) $('#tour').onclick = () => (tour ? stopTour() : startTour());


// ── arrival from space: the Earth turns, the camera dives to the coast ──
const GL = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(40, 1, .1, 100), t: -1, done: true };
{ const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'), img = x.createImageData(1024, 512);
  for (let j = 0; j < 512; j++) for (let i = 0; i < 1024; i++) { const u = i / 1024 * 8, v = j / 512 * 4, lat = Math.abs(j / 512 - .5) * 2;
    const n = vn(u, v) * .55 + vn(u * 2.3, v * 2.3) * .3 + vn(u * 5.1, v * 5.1) * .15; const k = (j * 1024 + i) * 4; let r, g, b;
    if (lat > .86) { r = g = b = 236; } else if (n > .53) { const m = vn(u * 3, v * 3); r = 70 + m * 80; g = 98 + m * 50; b = 48 + m * 20; if (lat > .7) { r += 60; g += 60; b += 60; } }
    else { const d = Math.min(1, (.53 - n) * 5); r = 18 + (1 - d) * 40; g = 62 + (1 - d) * 70; b = 120 + (1 - d) * 60; }
    img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255; }
  x.putImageData(img, 0, 0); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  GL.earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: .85 })); GL.scene.add(GL.earth);
  const cc = document.createElement('canvas'); cc.width = 1024; cc.height = 512; const cx = cc.getContext('2d'), ci = cx.createImageData(1024, 512);
  for (let j = 0; j < 512; j++) for (let i = 0; i < 1024; i++) { const n = vn(i / 1024 * 14 + 40, j / 512 * 7) * .6 + vn(i / 1024 * 30, j / 512 * 15) * .4; const k = (j * 1024 + i) * 4; ci.data[k] = ci.data[k + 1] = ci.data[k + 2] = 255; ci.data[k + 3] = Math.max(0, (n - .52) * 900); }
  cx.putImageData(ci, 0, 0); GL.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 64), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cc), transparent: true, depthWrite: false })); GL.scene.add(GL.clouds);
  GL.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 48), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vN;void main(){float f=pow(.72-dot(vN,vec3(0,0,1.)),3.);gl_FragColor=vec4(.35,.6,1.,1.)*f*1.6;}' })));
  const sp = new Float32Array(3000 * 3); for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(40); sp.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); GL.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: .06 })));
  const L = new THREE.DirectionalLight(0xffffff, 3); L.position.set(-3, 1.5, 4); GL.scene.add(L, new THREE.AmbientLight(0x334466, .6)); GL.scene.background = new THREE.Color(0x02040a);
  GL.earth.rotation.x = GL.clouds.rotation.x = .35; }
const warp = document.createElement('div'); warp.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none;background:radial-gradient(circle,#fff 0%,#cfe3ff 40%,#8fb4e0 100%);opacity:0;transition:opacity .45s'; $('#stage').appendChild(warp);
function globeTick(dt) { GL.t += dt; const t = GL.t, T = 3.1;
  GL.earth.rotation.y += dt * (t < 1.2 ? .5 : .5 + (t - 1.2) * .6); GL.clouds.rotation.y = GL.earth.rotation.y * 1.06;
  const k = Math.max(0, Math.min(1, (t - 1.1) / 1.6)), e = k * k * k; GL.cam.position.set(0, 0, 3.4 - e * 2.35); GL.cam.fov = 40 - e * 18; GL.cam.aspect = canvas.clientWidth / canvas.clientHeight; GL.cam.updateProjectionMatrix(); GL.cam.lookAt(0, 0, 0);
  warp.style.opacity = t > 2.45 ? 1 : 0;
  if (t > T) { GL.done = true; warp.style.opacity = 0; cam.position.set(400, 2600, -1200); ctl.target.set(0, 0, 420); } }
// ── loop ──
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; R.setSize(w, h, false); composer.setSize(w, h); cam.aspect = w / h; cam.fov = w < 760 ? 50 : 36; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(), tv = new THREE.Vector3(); let visible = true;
new IntersectionObserver((e) => (visible = e[0].isIntersecting)).observe($('#stage'));
function frame() {
  requestAnimationFrame(frame); if (!visible) return;
  const dt = Math.min(clock.getDelta(), .05);
  water.material.uniforms.time.value += dt * .4; BRIDGES.visible = UP.value > .3; window.__life && window.__life(UT.value); buildTick(dt); blades.forEach((b, i) => (b.rotation.z += dt * (1 + i * .05))); UT.value += dt; ANIM.forEach((f) => f(UT.value));
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ORDER.forEach((id) => { const e = pinEls[id]; tv.set(...ITEMS[id].pin).project(cam); const vis = tv.z < 1 && Math.abs(tv.x) < 1.02 && Math.abs(tv.y) < 1.02;
    e.classList.toggle('hide', !vis); e.classList.toggle('dimmed', !!filter && !filter.includes(id)); e.style.transform = `translate(${(tv.x * .5 + .5) * w - 9}px,${(-tv.y * .5 + .5) * h - 9}px)`; });
  if (flight) { flight.t += dt / flight.dur; const k = flight.t >= 1 ? 1 : 1 - Math.pow(1 - flight.t, 3); cam.position.lerpVectors(flight.fromP, flight.toP, k); ctl.target.lerpVectors(flight.fromT, flight.toT, k); if (flight.t >= 1) flight = null; }
  if (build.done && !ctl.autoRotate && !sel && !tour) { idleT += dt; if (idleT > 8) ctl.autoRotate = true; }
  if (tour && !flight) { tour.t += dt; $('#tourbar').style.width = (tour.t / 7 * 100) + '%'; if (tour.t > 7) nextTour(); }
  if (!GL.done && readQ() > .05) GL.done = true;
  if (!GL.done && visible && build.q < .03 && readQ() < .03) { if (GL.t < 0) GL.t = 0; globeTick(dt); if (!GL.done) { R.render(GL.scene, GL.cam); return; } }
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
const SYS0 = .62, SYSW = .034;
const K = [[0, 0, 0, 400, 1800, 1200, -2.3], [.05, 0, 20, 230, 230, 110, -1.7], [.13, 0, 25, 270, 520, 260, -.3], [.24, 0, 0, 330, 1350, 950, 1.3],
  [.34, 60, 0, 480, 380, 170, 2.9], [.42, river(380), 0, 380, 260, 70, 4.2], [.5, 0, 0, -30, 650, 110, 5.3], [.58, 0, 40, 860, 620, 380, 6.5]];
SYSORDER.forEach((id, i) => { const [x, y, z] = ITEMS[id].pin; const RR = { solar: 1500, wind: 1100, battery: 520, desal: 800, green: 900, fields: 1200, works: 950, digester: 600, ai: 520 }[id]; K.push([SYS0 + (i + .5) * SYSW, x, id === 'ai' ? 150 : y * .3, z, RR, RR * .55, 7.4 + i * .95]); });
K.push([.95, 0, 0, 900, 2700, 1100, 16.9], [1, 0, 40, 520, 1750, 430, 17.28]);
const CAPS = [[0, 'The land.'], [.04, 'First, the Capitol.'], [.11, 'Downtown rises.'], [.21, 'The districts.'], [.31, 'Park and river.'], [.46, 'The coast.'], [.55, 'The hills.']];
const SYSCAP = ['The sun pays.', 'The wind, at night.', 'Power, stored.', 'Water from the sea.', 'Food, grown here.', 'Fields and orchards.', 'Machines do the work.', 'Nothing is wasted.'];
SYSORDER.forEach((id, i) => CAPS.push([SYS0 + i * SYSW, SYSCAP[i]])); CAPS.push([.94, 'Anthropos.']);
const sm = (k) => k * k * (3 - 2 * k), clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeB = (k) => (k <= 0 ? .001 : 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2));
function pose(q) { let i = 0; while (i < K.length - 2 && q > K[i + 1][0]) i++; const a = K[i], b = K[i + 1], k = sm(clamp01((q - a[0]) / (b[0] - a[0])));
  const v = a.map((x, j) => x + (b[j] - x) * k); const T = new THREE.Vector3(v[1], v[2], v[3]); return [T.clone().add(new THREE.Vector3(Math.cos(v[6]) * v[4], v[5], Math.sin(v[6]) * v[4])), T]; }
let build = { done: false, last: '', q: 0 };
function setCap(t, q) { if (t === build.last) return; build.last = t; cap.classList.add('out'); setTimeout(() => { $('#bc').textContent = t; $('#bk').textContent = 'Anthropos · ' + String(Math.round(q * 100)).padStart(2, '0'); cap.classList.remove('out'); }, 260); }
function readQ() { const tot = SC.offsetHeight - innerHeight; return clamp01((scrollY - SC.offsetTop) / tot); }
function buildTick(dt) {
  const q = build.complete ? 1 : readQ(); build.q += (q - build.q) * Math.min(1, dt * 4); const Q = build.q;
  const interactive = q > .985;
  if (interactive && !build.done) { build.done = true; build.complete = true; ctl.autoRotateSpeed = .12; { const [hp, ht] = pose(1); HOME.p.copy(hp); HOME.t.copy(ht); } $('#stage').classList.remove('building'); ctl.enabled = true; ctl.autoRotate = true; }
  if (!interactive && build.done && !build.complete) { build.done = false; $('#stage').classList.add('building'); ctl.enabled = false; ctl.autoRotate = false; stopTour(); if (sel) { sel = null; $('#stage').classList.remove('sel'); } flight = null; }
  CAPP.value = clamp01((Q - .012) / .075); UP.value = sm(clamp01((Q - .1) / .52));
  SYSORDER.forEach((id, i) => { const k = clamp01((Q - (SYS0 + i * SYSW)) / (SYSW * .6)); const g = SYSG[id]; g.visible = k > 0; g.scale.y = easeB(k); });
  if (!build.done) { const [cp, ct] = pose(Q); cam.position.lerp(cp, .09); ctl.target.lerp(ct, .09);
    let cur = CAPS[0][1]; for (const [at, t] of CAPS) if (Q >= at) cur = t; setCap(cur, Q); $('#pi').style.height = Q * 100 + '%'; $('#bh').style.opacity = Q < .02 ? .8 : 0; }
}
if (/[?&]debug/.test(location.search)) window.__F = () => frame(), window.__S = SYSG, window.__B = () => [build, readQ(), UP.value], window.__go = (id, d = 260) => { const it = ITEMS[id]; it.dist = d; fly(it); flight.dur = .01; };
let U_T = 0; setInterval(() => (U_T += .05), 50);
prog(100); try { R.compile(S, cam); } catch (e) {}
requestAnimationFrame(() => requestAnimationFrame(() => { $('#load').classList.add('go'); setTimeout(() => { scrollTo(0, 0); $('#load').classList.add('out'); setTimeout(() => document.body.classList.remove('lock'), 900); }, 3500); }));
frame();

$('#f').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target), body = [...f.entries()].map(([k, v]) => k + ': ' + v).join('\n'); location.href = 'mailto:hello@anthroposcities.com?subject=' + encodeURIComponent('Anthropos registration · ' + f.get('as')) + '&body=' + encodeURIComponent(body); $('#ok').textContent = 'Thank you. Your mail app will open to confirm your registration.'; };
