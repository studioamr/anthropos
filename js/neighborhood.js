// LYCEON · constructor de vecindario: elige tu casa, invita a tu gente, exporta la imagen
import { CONFIG } from './config.js';
import { $, $$, WORDMARK, esc } from './site.js';
import { makeIso, STYLES, INK } from './houses.js';
import { invite, toast } from './forms.js';

$('#hsMark').innerHTML = WORDMARK(22);
const SETTINGS = { center: 'The Center', beach: 'The Beach', hills: 'The Hills' };
const LOTS = [[-26, -4], [-4, -26], [17, -4], [-4, 17], [-24, -24], [15, -24], [15, 15], [-24, 15]];
const KEY = 'lyc-hood';
const houseName = (k) => STYLES[k].name + (/house$/i.test(STYLES[k].name) ? '' : ' house');

// ── estado (localStorage, o lo que trae un enlace de invitación) ──
const blank = () => ({ name: '', hood: '', setting: 'center', chat: '', lots: [0, 1, 2, 3].map(() => ({ style: null, owner: '' })), mine: null, sel: 0, pick: 0 });
let st = blank();
try {
  const h = new URLSearchParams(location.hash.slice(1)).get('h');
  if (h) { const s = JSON.parse(decodeURIComponent(escape(atob(h)))); st = { ...blank(), ...s, mine: null, name: '', sel: s.lots.findIndex((l) => l.style === null) }; if (st.sel < 0) st.sel = 0; st.invited = true; }
  else { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) st = { ...blank(), ...s }; }
} catch {}
const persist = () => { if (!st.invited) try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} };

// ── lienzo ──
const cv = $('#hood'), wrap = $('#hsWrap'), g = cv.getContext('2d');
let W = 0, H = 0, dpr = 1, zoom = 1, pan = [0, 0];
const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight - 44; cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px'; draw(); };

let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
function scene(g, W, H, S, ox, oy, { labels = true } = {}) {
  const I = makeIso(g, S, ox, oy);
  g.fillStyle = '#fbfbf9'; g.fillRect(0, 0, W, H);
  seed = 3;
  // fondo según el lugar
  if (st.setting === 'beach') {
    for (let k = 0; k < 16; k++) { const d = -40 - k * 2.6; g.globalAlpha = 0.5 - k * 0.025; I.line([d + 60, -60, 0], [-60, d + 60, 0], 0.6); g.globalAlpha = 1; }
    for (let i = 0; i < 900; i++) { const u = rnd() * 140 - 70, v = -36 + rnd() * 6 - u; const [a, b] = I.P(u, v, 0); g.fillStyle = 'rgba(20,20,20,.35)'; g.fillRect(a, b, 1, 1); }
  } else if (st.setting === 'hills') {
    for (let k = 1; k < 10; k++) { const [a, b] = I.P(-44, -44, k * 0.9); g.beginPath(); g.ellipse(a, b, (46 - k * 4) * S * 0.95, (46 - k * 4) * S * 0.48, 0, Math.PI * 0.95, Math.PI * 2.05); g.lineWidth = 0.6; g.strokeStyle = 'rgba(20,20,20,.45)'; g.stroke(); }
    for (let k = 1; k < 7; k++) { const [a, b] = I.P(30, -52, k * 0.9); g.beginPath(); g.ellipse(a, b, (30 - k * 4) * S * 0.95, (30 - k * 4) * S * 0.48, 0, Math.PI * 0.9, Math.PI * 2.1); g.lineWidth = 0.6; g.strokeStyle = 'rgba(20,20,20,.35)'; g.stroke(); }
  } else {
    for (const [x, y] of [[-46, -30], [-38, -46], [-26, -48], [-48, -14], [26, -46], [-50, 4]]) I.box(x, y, 0, 6, 6, 4 + rnd() * 6, { top: '#fff', l: '#f6f6f3', r: '#ededea', lw: 0.5 });
  }
  // calles y plaza
  const plaza = [0.5, 0.5];
  for (const [x, y] of LOTS.slice(0, st.lots.length)) I.line([plaza[0], plaza[1], 0], [x + 4.5, y + 4.5, 0], 0.6, INK, 0.45);
  I.ellipse(plaza[0], plaza[1], 0, 5, '#ffffff', 0.9); I.ellipse(plaza[0], plaza[1], 0, 3.6, null, 0.4);
  I.cyl(plaza[0], plaza[1], 0, 0.9, 0.5, '#fff'); I.cyl(plaza[0], plaza[1], 0.5, 0.25, 1.2, '#fff');
  // árboles (deterministas, fuera de lotes y plaza)
  const trees = [];
  for (let i = 0; i < 110; i++) {
    const x = rnd() * 84 - 41, y = rnd() * 84 - 41;
    if (Math.hypot(x - 0.5, y - 0.5) < 7) continue;
    if (LOTS.slice(0, st.lots.length).some(([lx, ly]) => x > lx - 1.5 && x < lx + 10 && y > ly - 1.5 && y < ly + 10)) continue;
    if (st.setting === 'beach' && x + y < -32) continue;
    trees.push([x, y, 0.7 + rnd() * 0.6]);
  }
  // lotes + árboles en orden de profundidad
  const items = [
    ...st.lots.map((l, i) => ({ d: LOTS[i][0] + LOTS[i][1] + 9, f: () => lot(I, i) })),
    ...trees.map(([x, y, s]) => ({ d: x + y, f: () => I.tree(x, y, 0, s) })),
  ].sort((a, b) => a.d - b.d);
  items.forEach((it) => it.f());
  if (labels) st.lots.forEach((_, i) => flag(I, i));
}
function lot(I, i) {
  const [x, y] = LOTS[i], l = st.lots[i];
  const sel = i === st.sel;
  I.poly([[x, y, 0], [x + 9, y, 0], [x + 9, y + 9, 0], [x, y + 9, 0]], sel ? '#f0f0ec' : '#ffffff', sel ? 1.2 : 0.6);
  const style = sel && (st.mine === null || st.mine === i) ? st.pick : l.style;
  if (style === null || style === undefined) {
    g.setLineDash([3, 3]); I.poly([[x + 1.5, y + 1.5, 0], [x + 7.5, y + 1.5, 0], [x + 7.5, y + 7.5, 0], [x + 1.5, y + 7.5, 0]], null, 0.7); g.setLineDash([]);
  } else STYLES[style].draw(I, x + 0.5, y + 0.5);
}
function flag(I, i) {
  const [x, y] = LOTS[i], l = st.lots[i];
  const txt = st.mine === i ? (st.name || 'You') : l.owner ? l.owner : (i === st.sel && st.mine === null ? 'You?' : `House ${i + 1}`);
  const [a, b] = I.P(x + 4.5, y + 4.5, 11.5), [, b0] = I.P(x + 4.5, y + 4.5, 7.5);
  g.font = `400 ${Math.max(10, I.S * 1.15)}px Jost, Futura, sans-serif`;
  const w = g.measureText(txt).width + 14, h = Math.max(18, I.S * 2);
  g.beginPath(); g.moveTo(a, b0); g.lineTo(a, b); g.lineWidth = 0.8; g.strokeStyle = INK; g.stroke();
  const mine = st.mine === i || (i === st.sel && st.mine === null);
  g.fillStyle = mine ? INK : '#fff'; g.fillRect(a - w / 2, b - h, w, h); g.strokeRect(a - w / 2, b - h, w, h);
  g.fillStyle = mine ? '#fff' : INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, a, b - h / 2 + 0.5);
}
function view() { const S = Math.min(W, H) / 66 * zoom; return { S, ox: W / 2 + pan[0], oy: H / 2 + pan[1] - S * 3 }; }
function draw() {
  if (!W) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const { S, ox, oy } = view(); scene(g, W, H, S, ox, oy);
  $('#hoodTitle').textContent = st.hood || 'Your neighborhood';
  $('#hoodSet').textContent = SETTINGS[st.setting];
}

// ── interacción en el lienzo ──
let drag = null, moved = false;
cv.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, ...pan]; moved = false; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; if (Math.hypot(dx, dy) > 4) moved = true; pan = [drag[2] + dx, drag[3] + dy]; draw(); });
cv.addEventListener('pointerup', (e) => {
  drag = null; if (moved) return;
  const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const { S, ox, oy } = view(), C = Math.cos(Math.PI / 6);
  const a = (mx - ox) / (C * S), b = (my - oy) / (0.5 * S), x = (a + b) / 2, y = (b - a) / 2;
  let hit = st.lots.findIndex((_, i) => x >= LOTS[i][0] && x <= LOTS[i][0] + 9 && y >= LOTS[i][1] && y <= LOTS[i][1] + 9);
  if (hit < 0) { // clic sobre la casa (por encima del suelo)
    const I = makeIso(g, S, ox, oy);
    st.lots.forEach((_, i) => { const [lx, ly] = LOTS[i]; const [x0] = I.P(lx, ly + 9), [x1] = I.P(lx + 9, ly), [, yt] = I.P(lx, ly, 11), [, yb] = I.P(lx + 9, ly + 9); if (mx > x0 && mx < x1 && my > yt && my < yb) hit = i; });
  }
  if (hit >= 0) selectLot(hit);
});
cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.min(3, Math.max(0.5, zoom * (e.deltaY > 0 ? 0.9 : 1.1))); draw(); }, { passive: false });
$$('[data-z]').forEach((b) => (b.onclick = () => { const z = b.dataset.z; if (z === 'in') zoom = Math.min(3, zoom * 1.25); if (z === 'out') zoom = Math.max(0.5, zoom / 1.25); if (z === 'reset') { zoom = 1; pan = [0, 0]; } draw(); }));

// ── panel ──
function selectLot(i) {
  if (st.mine !== null && st.mine !== i) { toast(st.lots[i].owner ? `${st.lots[i].owner}’s house` : `House ${i + 1} is for a friend. Invite them.`); }
  st.sel = i; st.pick = st.lots[i].style ?? st.pick ?? 0; ui(); draw();
}
function ui() {
  $('#lots').innerHTML = st.lots.map((l, i) => `<button aria-pressed="${i === st.sel}" data-l="${i}">House ${i + 1}<small>${st.mine === i ? 'yours' : l.owner ? esc(l.owner) : l.style !== null ? STYLES[l.style].name : 'open'}</small></button>`).join('');
  $$('#lots button').forEach((b) => (b.onclick = () => selectLot(+b.dataset.l)));
  $('#lotCount').textContent = `${st.lots.length} of 8 houses`;
  $('#addLot').disabled = st.lots.length >= 8;
  $$('#styles button').forEach((b, k) => b.setAttribute('aria-pressed', k === st.pick));
  $$('#setting .chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.s === st.setting));
  const n = st.lots.length; $('#count').textContent = `${n} houses. Who’s coming with you?`;
  $('#export').disabled = st.mine === null;
  $('#tip').textContent = st.mine === null ? 'Choose and save your house to export the image.' : 'Export your neighborhood as an image to share.';
  $('#save').textContent = st.mine === st.sel ? 'Update my house' : 'Choose this house';
}
$('#styles').innerHTML = STYLES.map((s) => `<button type="button" title="${esc(s.note)}"><canvas width="300" height="184"></canvas><b>${esc(s.name)}</b><small>${esc(s.after)}</small></button>`).join('');
$$('#styles button').forEach((b, k) => {
  const c = b.querySelector('canvas'), x = c.getContext('2d'); const I = makeIso(x, 10.5, 150, 100);
  I.ellipse(4.5, 4.5, 0, 6.2, '#f6f6f3', 0); STYLES[k].draw(I, 0.5, 0.5);
  b.onclick = () => { st.pick = k; ui(); draw(); };
});
$('#addLot').onclick = () => { if (st.lots.length < 8) { st.lots.push({ style: null, owner: '' }); st.sel = st.lots.length - 1; ui(); draw(); persist(); } };
$$('#setting .chip').forEach((c) => (c.onclick = () => { st.setting = c.dataset.s; ui(); draw(); persist(); }));
$('#dname').value = st.name; $('#hname').value = st.hood; $('#chat').value = st.chat;
$('#dname').oninput = (e) => { st.name = e.target.value.trim(); draw(); };
$('#hname').oninput = (e) => { st.hood = e.target.value.trim(); draw(); };
$('#chat').oninput = (e) => { st.chat = e.target.value.trim(); };
$('#save').onclick = () => {
  if (!st.name) { $('#dname').focus(); toast('Add your display name first'); return; }
  if (st.lots[st.sel].owner && st.mine !== st.sel) { toast('That house is taken. Choose an open one.'); return; }
  if (st.mine !== null && st.mine !== st.sel) { st.lots[st.mine] = { style: null, owner: '' }; }
  st.mine = st.sel; st.lots[st.sel] = { style: st.pick, owner: st.name };
  if (st.invited) { st.invited = false; }
  persist(); ui(); draw();
  $('#saved').hidden = false;
  $('#savedMsg').textContent = `${houseName(st.pick)} saved in ${st.hood || 'your neighborhood'}, ${SETTINGS[st.setting]}. Invite friends to claim the other houses.`;
};
$('#share').onclick = () => {
  const data = { hood: st.hood, setting: st.setting, chat: st.chat, lots: st.lots, pick: 0 };
  const url = new URL('neighborhood.html', location.href); url.hash = 'h=' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  invite(url.href);
};

// ── exportar imagen ──
$('#export').onclick = async () => {
  await document.fonts.ready;
  const EW = 2000, EH = 1400, c = document.createElement('canvas'); c.width = EW; c.height = EH; const x = c.getContext('2d');
  const S = 30; scene(x, EW, EH, S, EW / 2, EH / 2 + 40);
  x.fillStyle = 'rgba(255,255,255,.94)'; x.fillRect(0, 0, EW, 150); x.fillRect(0, EH - 120, EW, 120);
  x.fillStyle = INK; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = '400 22px Jost, sans-serif'; x.fillText(`${CONFIG.name.toUpperCase()}  ·  NEIGHBORHOOD CONCEPT`.split('').join(' '), 60, 70);
  x.font = '300 52px Jost, sans-serif'; x.fillText((st.hood || 'Our neighborhood').toUpperCase(), 60, 128);
  x.textAlign = 'right'; x.font = '400 22px "Chivo Mono", monospace'; x.fillText(`${SETTINGS[st.setting]} · ${CONFIG.country}`, EW - 60, 70);
  x.textAlign = 'left'; x.font = '300 24px Jost, sans-serif';
  x.fillText(st.lots.map((l, i) => `${i + 1}. ${l.owner || 'Open'}${l.style !== null ? ' — ' + STYLES[l.style].name : ''}`).join('     '), 60, EH - 52);
  const a = document.createElement('a'); a.download = `${(st.hood || 'neighborhood').replace(/\W+/g, '-').toLowerCase()}-${CONFIG.name.toLowerCase()}.png`; a.href = c.toDataURL('image/png'); a.click();
};

new ResizeObserver(resize).observe(wrap);
document.fonts?.ready.then(draw);
ui(); resize();
if (st.mine !== null) { $('#saved').hidden = false; $('#savedMsg').textContent = `Your ${houseName(st.lots[st.mine].style)} is saved. Invite friends to claim the other houses.`; }
