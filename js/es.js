// ANTHROPOS · portada en español: historia con la Tierra en vivo → ciudad → negocio → fundadores → ronda
import { mountView } from './cityengine.js';
import { byId } from './concepts.js';
import { CONFIG } from './config.js';
import { $, $$, EMBLEM } from './site.js';

$('#navMark').innerHTML = EMBLEM; $('#footMark').innerHTML = EMBLEM;


const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// ---------- nav ----------
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > innerHeight - 80), { passive: true });

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
$$('.kin, .eras article, .blk .big, .blk .body, .four article, .flow > div, .why article, .duo .f, .rounds article, .trust article, .reel figure, .counters > div').forEach((el) => { el.classList.add('rv'); io.observe(el); });

// ---------- formulario ----------
$('#invForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
  if (!f.nombre || !/^\S+@\S+\.\S+$/.test(f.correo || '') || !f.ok) { const { toast } = await import('./forms.js'); toast('Completa nombre, correo y la casilla.'); return; }
  const { submit, toast } = await import('./forms.js');
  const r = await submit('investor-interest', { ...f, idioma: 'es' }, 'Anthropos · Ronda semilla · ' + f.nombre);
  if (r === 'sent') { toast('Gracias. Te escribimos pronto.'); e.target.reset(); }
});
