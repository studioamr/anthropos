// ANTHROPOS · portada v2 (blanca): emblema en partículas, mapa en tinta, galerías, recorrido de acción colectiva
import { CONFIG } from './config.js';
import { mountView } from './cityengine.js';
import { byId } from './concepts.js';
import { DISPATCHES, ESSAYS } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const EMBLEM = `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><circle cx="20" cy="20" r="18.4"/><path d="M8.5 15.5h23M9.5 13.2h21M12 15.5v13M17.3 15.5v13M22.7 15.5v13M28 15.5v13M8 28.8h24M7 31h26M14.5 13.2a5.5 5.5 0 0 1 11 0"/></svg>`;
['#navMark', '#footMark', '#cardMark'].forEach((s) => $(s) && ($(s).innerHTML = EMBLEM));

// ── nav, menú, cursor, progreso ──
const nav = $('#nav');
const onScroll = () => { nav.classList.toggle('solid', scrollY > innerHeight * 0.8); const h = document.documentElement; $('#prog').style.width = (scrollY / (h.scrollHeight - innerHeight)) * 100 + '%'; };
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const menu = $('#menu'), setM = (o) => { menu.classList.toggle('open', o); $('#menuBtn').setAttribute('aria-expanded', o); document.documentElement.style.overflow = o ? 'hidden' : ''; };
$('#menuBtn').onclick = () => setM(true); $('#menuClose').onclick = () => setM(false); $$('#menu a').forEach((a) => a.addEventListener('click', () => setM(false)));
addEventListener('keydown', (e) => e.key === 'Escape' && setM(false));
const cur = $('#cursor');
addEventListener('pointermove', (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
addEventListener('pointerover', (e) => cur.classList.toggle('big', !!e.target.closest('a,button,figure,.steel,.strip')));

// ── aparición y paralaje ──
$$('.blk-h, .row-h, .news, .counters, .map, .campaign, .wide, .mason, .strip, .duo, .life, .from, .mem, .split > *, .ideas, .statement > *, .steps').forEach((el) => el.classList.add('rv'));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.rv').forEach((el) => io.observe(el));
const once = (el, fn, m = '250px') => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); fn(); } }, { rootMargin: m }); o.observe(el); };
const countUp = (el, to, f, dur = 1800) => { if (reduce) return (el.textContent = f(to)); const t0 = performance.now(); const tk = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = f(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tk); }; requestAnimationFrame(tk); };

// ── texto animado: letras, palabras y etiquetas que se escriben solas ──
function splitWords(el, base = 0, step = 0.06) {
  let i = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((w) => {
        if (!w) return; if (/^\s+$/.test(w)) { frag.append(' '); return; }
        const o = document.createElement('span'); o.className = 'wd'; const inn = document.createElement('span'); inn.textContent = w; inn.style.setProperty('--d', `${base + i++ * step}s`); o.append(inn); frag.append(o);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el); el.classList.add('wsplit');
}
function splitChars(el, base = 0.15, step = 0.028) {
  let i = 0;
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) { const frag = document.createDocumentFragment(); [...n.textContent].forEach((c) => { if (c === ' ') { frag.append(' '); return; } const sp = document.createElement('span'); sp.className = 'ch-l'; sp.textContent = c; sp.style.setProperty('--d', `${base + i++ * step}s`); frag.append(sp); }); n.replaceWith(frag); }
    else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
  });
  walk(el);
}
function typeIn(el, speed = 0.022) { const t = el.textContent; el.textContent = ''; el.classList.add('type'); [...t].forEach((c, i) => { const s = document.createElement('span'); s.className = 'c'; s.textContent = c; s.style.setProperty('--d', `${i * speed}s`); el.append(s); }); }
const watch = (el, m = '-12%') => { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); o.disconnect(); } }, { rootMargin: `0px 0px ${m} 0px` }); o.observe(el); };
// portada: el título letra por letra
const heroEl = $('.hero'); $$('.hero h1 .ln').forEach((ln, k) => splitChars(ln, 0.2 + k * 0.45));
requestAnimationFrame(() => setTimeout(() => heroEl.classList.add('go'), 60));
// títulos de sección palabra por palabra; párrafos con desenfoque; etiquetas tipo máquina
$$('.blk-h h2, .h2, .h2b, .steps h3, .finale h2, .campaign h3').forEach((h) => { splitWords(h); watch(h); });
$$('.blk .body, .feats, .credit').forEach((p) => { p.classList.add('fade'); watch(p); });
$$('.blk-h .mono.acc, .mem-r .mono.acc, .split .mono.acc, .row-h .mono').forEach((m) => { typeIn(m); watch(m); });
$$('.nc, .feats li, .row-h, .steps article').forEach((l) => { l.classList.add('line-in'); watch(l); });
// ── declaración cinética ──
const kin = $('#kinetic');
kin.innerHTML = kin.innerHTML.replace(/(<em>[^<]*<\/em>|[^\s<]+)/g, (w) => `<span class="w">${w}</span>`);
const words = $$('.w', kin);
const kS = () => { const r = kin.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * 0.9 - r.top) / (r.height + innerHeight * 0.3))); const n = Math.round(p * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n)); };
addEventListener('scroll', kS, { passive: true }); kS();

// ── noticias ──
$('#newsGrid') && ($('#newsGrid').innerHTML = DISPATCHES.slice(0, 4).map((d) => `<a class="nc" href="article.html?a=${d.slug}"><div class="src mono"><span>${esc(d.kind)}</span><span>${esc(d.date)}</span></div><h3>${esc(d.title)}</h3><figure><img src="${d.cover}" alt="" loading="lazy"></figure></a>`).join(''));

// ── la ciudad: cifras del diseño ──
$$('.counters b[data-c]').forEach((b) => once(b, () => countUp(b, +b.dataset.c, (v) => Math.round(v).toLocaleString('en-US') + (b.dataset.s || '')), '0px'));
once($('#cityMap'), () => mountView($('#cityMap'), () => byId(CONFIG.cityConcept).build(), { noWheel: true }));

// ── la ronda ──
const fmtM = (m) => (m >= 1000 ? `$${m / 1000}B` : `$${m}M`);
const ROUNDS = [
  { n: 'Seed', m: 10, now: true, when: 'Now · 2026–27', p: 'Counsel and structure, the master plan, site studies and an option on the land.' },
  { n: 'Land', m: 90, when: '2027', p: 'Buys the land through a bank trust and secures the permits, once the site is chosen.' },
  { n: 'Phase I', m: 300, when: '2028', p: 'Energy, water and roads, and the first neighborhood: residences, resort, club and studios.' },
  { n: 'Phase II', m: 600, when: '2029–2032', p: 'The rest of the city, its civic buildings and its hills, with project debt and home sales.' },
];
$('#rounds').innerHTML = ROUNDS.map((x, i) => `<article class="round${x.now ? ' now' : ''}"><span class="st mono"><i></i>${x.now ? 'Raising first' : 'Round ' + (i + 1)}</span><div class="amt">${fmtM(x.m)}</div><h3>${x.n}</h3><span class="mono dim">${x.when}</span><p>${x.p}</p></article>`).join('');
$('#totBar').innerHTML = ROUNDS.map((x) => `<i class="${x.now ? 'now' : ''}" style="flex-grow:${x.m}"></i>`).join('');
$('#declMark') && ($('#declMark').innerHTML = EMBLEM);
$$('.chapters4 h3, .howtok b, .why4 b').forEach((h) => { splitWords(h); watch(h); });

// ── inversionistas ──
import('./forms.js').then(({ submit, toast }) => {
  $('#intForm').onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); let err = '';
    if (!f.name?.trim()) err = 'Please add your name.'; else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email || '')) err = 'Please use a valid email.'; else if (!f.country?.trim()) err = 'Please add your country.'; else if (!f.status) err = 'Please choose an investor type.'; else if (!f.ok) err = 'Please confirm you understand this is not an offer.';
    $('#intErr').textContent = err; if (err) return;
    const how = await submit('investor-interest', { ...f, at: new Date().toISOString() }, `Investor briefing · ${f.round} · ${f.name}`);
    e.target.classList.add('done');
    e.target.innerHTML = `<p class="mono acc">Registered</p><h3 style="font-weight:300;font-size:clamp(34px,4vw,60px);letter-spacing:-.03em;margin-top:12px">Thank you, ${esc(f.name.split(' ')[0])}.</h3><p class="body" style="margin-top:14px;max-width:560px">${how === 'mail' ? 'Your email app opened with your request. Send it and the founding office will reply with the briefing.' : 'The founding office will send you the briefing.'} Documents are shared only where the law allows.</p>`;
    toast('Request sent');
  };
});
