// ANTHROPOS · la Tierra en tiempo real: el sol de este instante, luces de ciudad, nubes y atmósfera.
// La historia (fuego → océano → humanos → fábrica → hoy) se controla con tres perillas: molten, ocean, lights.
import * as THREE from 'three';

const R = 1;
// dirección en el marco de la Tierra para (lat, lon) en grados, con la UV estándar de SphereGeometry
export const dir = (lat, lon) => { const a = THREE.MathUtils.degToRad(lat), b = THREE.MathUtils.degToRad(lon); return new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)); };

// punto subsolar ahora mismo (aprox. de ±1°: declinación + hora UTC, sin ecuación del tiempo)
export function subsolar(d = new Date()) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0), doy = (d - start) / 864e5;
  const lat = 23.44 * Math.sin((2 * Math.PI * (doy - 81)) / 365);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  return { lat, lon: (12 - h) * 15 };
}

const NOISE = `
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}`;

export function mountEarth(canvas, { maxDpr = 1.5 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 200);
  const tl = new THREE.TextureLoader(), tex = (f, srgb = true) => { const t = tl.load('img/earth/' + f, () => (dirty = 3)); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  const U = {
    day: { value: tex('earth_atmos_2048.jpg') }, night: { value: tex('earth_lights_2048.png') }, spec: { value: tex('earth_specular_2048.jpg', false) },
    sun: { value: new THREE.Vector3(1, 0, 0) }, molten: { value: 0 }, ocean: { value: 0 }, lights: { value: 1 }, time: { value: 0 },
  };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: `varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vO;
      void main(){vUv=uv;vO=position;vN=normalize((modelMatrix*vec4(normal,0.)).xyz);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform sampler2D day,night,spec;uniform vec3 sun;uniform float molten,ocean,lights,time;
      varying vec2 vUv;varying vec3 vN;varying vec3 vW;varying vec3 vO;${NOISE}
      void main(){
        vec3 N=normalize(vN),V=normalize(cameraPosition-vW),L=normalize(sun);
        float d=dot(N,L),dayf=smoothstep(-.15,.25,d);
        vec3 c=texture2D(day,vUv).rgb;
        float sea=texture2D(spec,vUv).r;
        // mundo océano: todo agua, con mar profundo y bancos claros
        float on=fbm(vO*5.+3.);
        vec3 oc=mix(vec3(.010,.045,.11),vec3(.03,.13,.22),on);
        c=mix(c,oc,ocean);
        vec3 col=c*(.025+1.15*clamp(d,0.,1.));
        float sp=pow(max(dot(reflect(-L,N),V),0.),28.)*mix(sea,1.,ocean)*dayf;
        col+=vec3(1.,.93,.8)*sp*.55;
        // luces de ciudad: aparecen de las más brillantes a las más tenues
        vec3 nl=texture2D(night,vUv).rgb;float lum=dot(nl,vec3(.33));
        float gate=smoothstep(1.-lights,1.-lights+.18,lum)*lights;
        col+=nl*vec3(1.,.78,.5)*gate*(1.-dayf)*1.8*(1.-ocean);
        // atmósfera en el borde
        float fr=pow(1.-max(dot(N,V),0.),3.);
        col+=vec3(.32,.58,1.)*fr*(dayf*.9+.06)*(1.-molten);
        // planeta de fuego
        float n=fbm(vO*2.6+vec3(11.3,time*.02,-4.1)),m=fbm(vO*7.+vec3(-3.,1.7,time*.03));
        float crack=(1.-smoothstep(0.,.035,abs(n-.5)))*(.6+.6*m);
        vec3 crust=mix(vec3(.05,.02,.015),vec3(.16,.06,.03),m)*(.35+.65*clamp(d+.3,0.,1.));
        vec3 lava=crust+vec3(1.,.36,.06)*(crack*1.6+pow(m,3.)*.45)+vec3(.9,.25,.04)*fr*.8;
        col=mix(col,lava,molten);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  }));
  scene.add(earth);

  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 96, 72), new THREE.MeshLambertMaterial({ map: tex('earth_clouds_1024.png'), transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(clouds);
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.4); scene.add(sunLight); scene.add(new THREE.AmbientLight(0x223344, 0.08));

  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 96, 72), new THREE.ShaderMaterial({
    uniforms: { sun: U.sun, k: { value: 1 } }, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN;varying vec3 vW;void main(){vN=normalize((modelMatrix*vec4(normal,0.)).xyz);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 sun;uniform float k;varying vec3 vN;varying vec3 vW;
      void main(){vec3 V=normalize(cameraPosition-vW);float c=clamp(-dot(vN,V),0.,1.);float i=pow(smoothstep(0.,.27,c),2.2);float lit=smoothstep(-.3,.35,dot(-vN,normalize(sun)));
      gl_FragColor=vec4(vec3(.36,.62,1.)*i*(.04+.9*lit)*k,1.);}`,
  }));
  scene.add(atmo);

  // estrellas
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 4000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40); sp.push(v.x, v.y, v.z); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(stars);

  // estado que la página controla
  const S = { lat: 15, lon: -100, dist: 3.4, molten: 0, ocean: 0, lights: 1, liveDate: null };
  let dirty = 3, running = false, visible = true, last = 0;
  function size() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 52 : 35; cam.updateProjectionMatrix(); dirty = 3; }
  new ResizeObserver(size).observe(canvas); size();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(canvas);

  function frame(now) {
    running = false; if (!visible || document.hidden) return;
    const t = now / 1000, dt = Math.min(0.05, t - last); last = t;
    const s = subsolar(new Date());
    U.sun.value.copy(dir(s.lat, s.lon)); sunLight.position.copy(U.sun.value).multiplyScalar(10);
    U.molten.value = S.molten; U.ocean.value = S.ocean; U.lights.value = S.lights; U.time.value = t;
    clouds.rotation.y += dt * 0.004; clouds.material.opacity = 0.85 * (1 - S.molten) * (1 - S.ocean * 0.4);
    atmo.material.uniforms.k.value = 1 - S.molten * 0.7;
    const p = dir(S.lat, S.lon).multiplyScalar(S.dist);
    cam.position.copy(p); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
    // ya cerca del suelo, inclinamos la vista hacia el horizonte como un dron que baja
    if (S.dist < 1.6) { const k = (1.6 - S.dist) / 0.5; cam.rotateX(Math.min(1, k) * 0.35); }
    renderer.render(scene, cam);
    start();
  }
  function start() { if (running) return; running = true; requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', start);
  start();
  return S;
}
