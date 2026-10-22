// ANTHROPOS · embajada: mosaico, axonometría del estudio y voto de la próxima ciudad
import { CONFIG } from './config.js';
import { $, EMBLEM } from './site.js';
import { submit, toast } from './forms.js';

$('#embMark').innerHTML = EMBLEM;

// mosaico en blanco y negro que se va encendiendo
const IM = ['soc/dinner', 'soc/rooftop', 'soc/pier', 'soc/dj', 'soc/friends', 'soc/bust', 'soc/gallery', 'soc/sea', 'era/piazza', 'res-salon', 'res-sculpture', 'res-pool', 'res-courtyard', 'res-spa', 'res-canal'];
const tiles = $('#tiles');
tiles.innerHTML = Array.from({ length: 18 }, (_, i) => `<div style="background-image:url(img/${IM[i % IM.length]}.jpg)"></div>`).join('');
const ds = [...tiles.children];
ds.forEach((d, i) => setTimeout(() => d.classList.add('on'), 120 * i));
setInterval(() => { const d = ds[(Math.random() * ds.length) | 0]; d.classList.remove('on'); setTimeout(() => { d.style.backgroundImage = `url(img/${IM[(Math.random() * IM.length) | 0]}.jpg)`; d.classList.add('on'); }, 1300); }, 1600);

$('#forStrip').innerHTML = ['Founders', 'Engineers', 'Researchers', 'Artists', 'Musicians', 'Architects', 'Writers', 'Athletes', 'Filmmakers', 'Designers'].map((t) => `<span>${t}</span>`).join('');

// axonometría isométrica del estudio
const svg = $('#axo');
const K = 14, ox = 450, oy = 150, c = Math.cos(Math.PI / 6), s = 0.5;
const P = (x, y, z) => [ox + (x - z) * c * K, oy + (x + z) * s * K - y * K];
const pts = (a) => a.map((p) => P(...p).map((v) => v.toFixed(1)).join(',')).join(' ');
let out = '';
const poly = (a, fill = 'none', w = 1, op = 1) => (out += `<polygon points="${pts(a)}" fill="${fill}" stroke="#141414" stroke-width="${w}" stroke-linejoin="round" opacity="${op}"/>`);
const line = (a, b, w = 0.8, op = 1) => { const [x1, y1] = P(...a), [x2, y2] = P(...b); out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#141414" stroke-width="${w}" opacity="${op}"/>`; };
const box = (x, y, z, w, h, d, fill = '#fff') => {
  poly([[x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]], fill, 0.9);
  poly([[x, y, z + d], [x + w, y, z + d], [x + w, y + h, z + d], [x, y + h, z + d]], '#f1f1ee', 0.9);
  poly([[x + w, y, z], [x + w, y, z + d], [x + w, y + h, z + d], [x + w, y + h, z]], '#e6e6e2', 0.9);
};
const W = 30, D = 20, H = 9;
// piso y muros de fondo
poly([[0, 0, 0], [W, 0, 0], [W, 0, D], [0, 0, D]], '#fafaf8', 1.2);
for (let x = 2; x < W; x += 2) line([x, 0, 0], [x, 0, D], 0.4, 0.25);
poly([[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0]], '#f5f5f2', 1.2);
poly([[0, 0, 0], [0, 0, D], [0, H, D], [0, H, 0]], '#efefeb', 1.2);
// ventanales de acero
for (let x = 1.5; x < W - 1; x += 4) { poly([[x, 2.2, 0], [x + 3, 2.2, 0], [x + 3, 7.6, 0], [x, 7.6, 0]], '#fff', 0.9); line([x + 1.5, 2.2, 0], [x + 1.5, 7.6, 0], 0.5); line([x, 4.9, 0], [x + 3, 4.9, 0], 0.5); }
for (let z = 2; z < D - 1; z += 4.5) { poly([[0, 2.2, z], [0, 2.2, z + 3.4], [0, 7.6, z + 3.4], [0, 7.6, z]], '#fff', 0.9); line([0, 4.9, z], [0, 4.9, z + 3.4], 0.5); }
// mesas largas con sillas
for (const z of [5, 10]) { box(4, 0, z, 12, 1.4, 1.8); for (let x = 5; x < 16; x += 2.2) { box(x, 0, z - 1.2, 0.8, 0.9, 0.8, '#fff'); box(x, 0, z + 2.2, 0.8, 0.9, 0.8, '#fff'); } }
// barra
box(20, 0, 2, 1.6, 2.2, 9, '#dcdcd7');
for (let z = 3; z < 11; z += 1.8) box(18.2, 0, z, 0.8, 1.4, 0.8, '#fff');
// cuarto de escucha: sofás y bocinas
box(4, 0, 15, 7, 1, 2.2, '#e9e9e5'); box(12.5, 0, 15, 2.2, 1, 3.6, '#e9e9e5'); box(7, 0, 12.6, 3, 0.7, 1.4, '#fff');
box(2, 0, 13, 1.2, 4, 1.2, '#cfcfca'); box(2, 0, 18, 1.2, 4, 1.2, '#cfcfca');
// escenario y cabina
box(22, 0, 14, 7, 0.8, 5.5, '#f1f1ee'); box(24.5, 0.8, 15.5, 2.6, 1.6, 1.2, '#dcdcd7');
// plantas
for (const [x, z] of [[28, 2], [17.5, 17], [1.5, 1.5]]) { box(x, 0, z, 1, 1, 1, '#fff'); for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 0.4 + (i % 5) * 0.16; const [px, py] = P(x + 0.5 + Math.cos(a) * r, 1.4 + (i % 7) * 0.32, z + 0.5 + Math.sin(a) * r); out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.6" fill="#141414" opacity=".55"/>`; } }
// cotas
const [lx, ly] = P(W / 2, 0, D + 2.2); out += `<text x="${lx}" y="${ly}" font-family="Chivo Mono,monospace" font-size="11" fill="#777" text-anchor="middle">30 m</text>`;
const [rx, ry] = P(W + 2.4, 0, D / 2); out += `<text x="${rx}" y="${ry}" font-family="Chivo Mono,monospace" font-size="11" fill="#777" text-anchor="middle">20 m</text>`;
svg.innerHTML = out;

// voto de la próxima ciudad
$('#voteCity').onsubmit = async (e) => {
  e.preventDefault();
  const city = e.target.city.value.trim(); if (!city) return;
  const how = await submit('embassy-vote', { city, at: new Date().toISOString() }, `Next embassy · ${city}`);
  $('#voteNote').textContent = how === 'mail' ? `Your email app opened with your vote for ${city}; send it to count.` : `Vote recorded for ${city}. Thank you.`;
  toast('Thank you for voting'); e.target.reset();
};
