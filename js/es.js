// ANTHROPOS · portada en español: historia con la Tierra en vivo → ciudad → negocio → fundadores → ronda
import { mountEarth } from './earth.js';
import { mountView } from './cityengine.js';
import { byId } from './concepts.js';
import { CONFIG } from './config.js';
import { $, $$, EMBLEM } from './site.js';

$('#navMark').innerHTML = EMBLEM; $('#footMark').innerHTML = EMBLEM;

// ---------- la historia ----------
const story = $('.story'), chs = $$('.ch'), N = chs.length;
const E = mountEarth($('#earth'));
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => x * x * (3 - 2 * x);
// un fotograma clave por capítulo: cámara (lat, lon, distancia) y las tres perillas del planeta
const K = [
  { lat: 16, lon: -100, d: 3.3, m: 0, o: 0, l: 1, y: 'Hoy', f: 1 },
  { lat: 10, lon: -40, d: 3.0, m: 1, o: 0, l: 0, y: '−4,540 M', f: 0 },
  { lat: 0, lon: 20, d: 3.0, m: 0, o: 1, l: 0, y: '−3,800 M', f: 0.15 },
  { lat: 8, lon: 35, d: 2.9, m: 0, o: 0, l: 0, y: '−300,000', f: 0.6 },
  { lat: 28, lon: 45, d: 2.9, m: 0, o: 0, l: 0.12, y: '−10,000', f: 0.8 },
  { lat: 45, lon: 0, d: 2.8, m: 0, o: 0, l: 0.5, y: '1760', f: 0.9 },
  { lat: 30, lon: -40, d: 3.0, m: 0, o: 0, l: 1, y: 'Hoy', f: 0.95 },
  { lat: 25, lon: -75, d: 3.1, m: 0, o: 0, l: 1, y: '2035', f: 0.98 },
  { lat: 14, lon: -92, d: 2.1, m: 0, o: 0, l: 1, y: '2026', f: 1 },
  { lat: 18.2, lon: -102.6, d: 1.55, m: 0, o: 0, l: 1, y: '2026', f: 1 },
];
const lerp = (a, b, t) => a + (b - a) * t;
const lonLerp = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };
let target = 0, cur = 0, fx = false;
function mountFx() { if (fx) return; fx = true; mountView($('#cityfx'), () => byId(CONFIG.cityConcept).build(), { noWheel: true, theme: 'dark', maxDpr: 1.25, growMs: 4500 }); }
function progress() { const r = story.getBoundingClientRect(), h = story.offsetHeight - innerHeight; return clamp(-r.top / h); }
function apply(p) {
  const x = p * (N - 1), i = Math.min(N - 2, Math.floor(x)), t = sm(clamp(x - i)), a = K[i], b = K[i + 1];
  E.lat = lerp(a.lat, b.lat, t); E.lon = lonLerp(a.lon, b.lon, t); E.dist = lerp(a.d, b.d, t);
  E.molten = lerp(a.m, b.m, t); E.ocean = lerp(a.o, b.o, t); E.lights = lerp(a.l, b.l, t);
  // tiempo real: en el capítulo 0 la cámara se pasea despacito
  if (x < 1) E.lon += (performance.now() / 1000) * 0.6 * (1 - x);
  chs.forEach((c, k) => { const dd = Math.abs(x - k), o = clamp(1 - dd * 2.2); c.style.opacity = o; c.style.transform = `translateY(${(x - k) * -60}px)`; c.style.visibility = o > 0.01 ? 'visible' : 'hidden'; c.classList.toggle('on', o > 0.5); });
  const near = Math.round(x); $('#eraYear').textContent = K[near].y; $('#eraFill').style.width = (lerp(a.f, b.f, t) * 100).toFixed(1) + '%';
  $('#veil').style.opacity = clamp((x - 8.6) / 0.4) * 0.8;
  const cf = clamp((x - 8.35) / 0.5); $('#cityfx').style.opacity = cf; if (x > 7.5) mountFx();
  $('#live').style.opacity = clamp(1 - x * 1.5);
  document.body.classList.toggle('in-story', p < 0.995);
}
function loop() { cur += (target - cur) * 0.12; apply(cur); requestAnimationFrame(loop); }
addEventListener('scroll', () => (target = progress()), { passive: true });
target = cur = progress(); loop();

const fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' });
const tick = () => ($('#clock').textContent = 'En vivo · ' + fmt.format(new Date()));
tick(); setInterval(tick, 1000);

// ---------- nav ----------
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > story.offsetHeight - 80), { passive: true });

// ---------- la ciudad ----------
const once = (el, fn, m = '300px') => { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: m }); io.observe(el); };
once($('#cityMap'), () => mountView($('#cityMap'), () => byId(CONFIG.cityConcept).build(), { noWheel: true, view: 'center' }));
$$('.counters b[data-c]').forEach((b) => once(b, () => {
  const to = +b.dataset.c, t0 = performance.now();
  const f = (now) => { const k = clamp((now - t0) / 1600), v = to * (1 - Math.pow(1 - k, 3)); b.textContent = Math.round(v).toLocaleString('es-MX') + (k >= 1 ? b.dataset.s || '' : ''); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}, '0px'));

// ---------- la vida: cada imagen una sola vez ----------
const REEL = [['dinner', 'Cenas largas'], ['sea', 'El mar por la mañana'], ['dj', 'Música en los patios'], ['gallery', 'Inauguraciones'], ['friends', 'Amigos'], ['rooftop', 'Azoteas']];
$('#reel').innerHTML = REEL.map(([k, t]) => `<figure><img src="img/soc/${k}.jpg" alt="${t}" loading="lazy"><figcaption class="mono">${t}</figcaption></figure>`).join('');

// ---------- la ronda ----------
const ROUNDS = [['Semilla', 10, '2026 – 27', 'Sitio, plan maestro, permisos', true], ['Tierra', 90, '2027', 'Compra de tierra e infraestructura base'], ['Fase I', 300, '2028', 'Primer distrito, energía y agua'], ['Fase II', 600, '2029 – 32', 'Ciudad completa para 100,000']];
$('#rounds').innerHTML = ROUNDS.map(([n, m, y, d, now]) => `<article class="${now ? 'now' : ''}"><span class="mono">${now ? 'Abierta · ' : ''}${y}</span><b>$${m}M</b><h3>${n}</h3><p>${d}</p><i style="width:${Math.max(2, m / 10)}%"></i></article>`).join('');
const USE = [['Selección de sitio y opciones de tierra', 40], ['Plan maestro e ingeniería', 25], ['Permisos y gobierno', 20], ['Equipo', 15]];
$('#useBars').innerHTML = USE.map(([t, v]) => `<div><span>${t}</span><i><em style="width:${v}%"></em></i><b class="mono">${v}%</b></div>`).join('');

// ---------- aparecer al hacer scroll ----------
const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { rootMargin: '0px 0px -12% 0px' });
$$('.blk .big, .blk .body, .four article, .flow > div, .why article, .duo .f, .rounds article, .trust article, .reel figure, .counters > div').forEach((el) => { el.classList.add('rv'); io.observe(el); });

// ---------- formulario ----------
$('#invForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  if (!f.nombre || !/^\S+@\S+\.\S+$/.test(f.correo || '') || !f.ok) { const { toast } = await import('./forms.js'); toast('Completa nombre, correo y la casilla.'); return; }
  const { submit, toast } = await import('./forms.js');
  const r = await submit('investor-interest', { ...f, idioma: 'es' }, 'Anthropos · Ronda semilla · ' + f.nombre);
  if (r === 'sent') { toast('Gracias. Te escribimos pronto.'); e.target.reset(); }
});
