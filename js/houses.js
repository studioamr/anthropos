// LYCEON · motor isométrico y las 8 casas (dibujo de línea en canvas 2D)
const C30 = Math.cos(Math.PI / 6);
export const INK = '#141414';

export function makeIso(g, S, ox, oy) {
  const P = (x, y, z = 0) => [ox + (x - y) * C30 * S, oy + (x + y) * 0.5 * S - z * S];
  const poly = (pts, fill, lw = 1, stroke = INK, alpha = 1) => {
    g.beginPath(); pts.forEach((p, i) => { const [a, b] = P(...p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath();
    if (fill) { g.globalAlpha = alpha; g.fillStyle = fill; g.fill(); g.globalAlpha = 1; }
    if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); }
  };
  const line = (a, b, lw = 0.8, stroke = INK, alpha = 1) => { const [x1, y1] = P(...a), [x2, y2] = P(...b); g.globalAlpha = alpha; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); g.globalAlpha = 1; };
  // caja: caras visibles +x (derecha), +y (izquierda) y techo
  const box = (x, y, z, w, d, h, c = {}) => {
    const top = c.top || '#ffffff', L = c.l || '#f0f0ec', R = c.r || '#e2e2dd', lw = c.lw ?? Math.max(0.6, S / 14);
    poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], R, lw);
    poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], L, lw);
    poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top, lw);
  };
  // franja de ventanas sobre las caras visibles
  const band = (x, y, z, w, d, z0, z1, fill = '#2a2c2e', a = 0.85) => {
    poly([[x + w, y + 0.3, z0], [x + w, y + d - 0.3, z0], [x + w, y + d - 0.3, z1], [x + w, y + 0.3, z1]], fill, 0.5, INK, a);
    poly([[x + 0.3, y + d, z0], [x + w - 0.3, y + d, z0], [x + w - 0.3, y + d, z1], [x + 0.3, y + d, z1]], fill, 0.5, INK, a);
  };
  const winX = (x, y, z, d, n, z0, z1, fill = '#2a2c2e') => { for (let i = 0; i < n; i++) { const yy = y + (i + 0.5) * d / n; poly([[x, yy - 0.25, z0], [x, yy + 0.25, z0], [x, yy + 0.25, z1], [x, yy - 0.25, z1]], fill, 0.4, INK, 0.85); } };
  const winY = (x, y, z, w, n, z0, z1, fill = '#2a2c2e') => { for (let i = 0; i < n; i++) { const xx = x + (i + 0.5) * w / n; poly([[xx - 0.25, y, z0], [xx + 0.25, y, z0], [xx + 0.25, y, z1], [xx - 0.25, y, z1]], fill, 0.4, INK, 0.85); } };
  const ellipse = (cx, cy, z, r, fill, lw = 0.9) => {
    const [a, b] = P(cx, cy, z); g.beginPath(); g.ellipse(a, b, r * S * C30 * 1.15, r * S * 0.5 * 1.15, 0, 0, 6.283);
    if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.stroke(); }
  };
  const cyl = (cx, cy, z, r, h, fill = '#f2f2ee', top = '#fff') => {
    const [a, b] = P(cx, cy, z), [, b2] = P(cx, cy, z + h); const rx = r * S * C30 * 1.15, ry = r * S * 0.5 * 1.15;
    g.beginPath(); g.moveTo(a - rx, b2); g.lineTo(a - rx, b); g.ellipse(a, b, rx, ry, 0, Math.PI, 0, true); g.lineTo(a + rx, b2); g.closePath();
    g.fillStyle = fill; g.fill(); g.lineWidth = 0.9; g.strokeStyle = INK; g.stroke();
    ellipse(cx, cy, z + h, r, top);
  };
  const dome = (cx, cy, z, r, fill = '#fff') => {
    const [a, b] = P(cx, cy, z); const rx = r * S * C30 * 1.15, ry = r * S * 0.5 * 1.15;
    g.beginPath(); g.ellipse(a, b, rx, ry, 0, 0, Math.PI); g.ellipse(a, b, rx, r * S * 1.05, 0, Math.PI, 0); g.closePath();
    g.fillStyle = fill; g.fill(); g.lineWidth = 0.9; g.strokeStyle = INK; g.stroke();
    for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(a, b - k * r * S * 0.25, rx * Math.sqrt(1 - (k / 4) ** 2), ry * Math.sqrt(1 - (k / 4) ** 2), 0, 0, Math.PI); g.lineWidth = 0.4; g.stroke(); }
  };
  const cone = (cx, cy, z, r, h, fill = '#d9d6cf') => {
    const [a, b] = P(cx, cy, z), [, t] = P(cx, cy, z + h); const rx = r * S * C30 * 1.15, ry = r * S * 0.5 * 1.15;
    g.beginPath(); g.moveTo(a - rx, b); g.lineTo(a, t); g.lineTo(a + rx, b); g.ellipse(a, b, rx, ry, 0, 0, Math.PI); g.closePath();
    g.fillStyle = fill; g.fill(); g.lineWidth = 0.9; g.strokeStyle = INK; g.stroke();
  };
  const tree = (x, y, z = 0, s = 1) => {
    const [a, b] = P(x, y, z), [, t] = P(x, y, z + 2.4 * s);
    g.beginPath(); g.moveTo(a, b); g.lineTo(a, t); g.lineWidth = 0.9; g.strokeStyle = INK; g.stroke();
    const R = S * 1.2 * s;
    for (let i = 0; i < 9; i++) { const ang = i * 2.39996, r = R * 0.55 * Math.sqrt(i / 9); g.beginPath(); g.arc(a + Math.cos(ang) * r, t - R * 0.5 + Math.sin(ang) * r * 0.8, R * 0.42, 0, 6.283); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 0.7; g.stroke(); }
  };
  const dot = (a, b) => { g.beginPath(); g.arc(a, b, Math.max(0.6, S * 0.06), 0, 6.283); g.fillStyle = '#7d7d79'; g.fill(); };
  return { dot, P, poly, line, box, band, winX, winY, ellipse, cyl, dome, cone, tree, S };
}

// Cada casa ocupa ~8×8 unidades a partir de (x,y). Se dibujan de atrás hacia adelante.
export const STYLES = [
  { id: 'purist', name: 'Purist', after: 'After Le Corbusier', note: 'A white box on pilotis with a ribbon window and a roof garden.',
    draw(I, x, y) {
      for (const [a, b] of [[0.6, 0.6], [3.6, 0.6], [6.6, 0.6], [0.6, 5.4], [3.6, 5.4], [6.6, 5.4]]) I.box(x + a, y + b, 0, 0.35, 0.35, 2.6);
      I.box(x + 3, y + 2, 0, 2.2, 2, 2.6, { r: '#d8d8d2', l: '#e6e6e1' });
      I.box(x, y, 2.6, 7.6, 6.2, 3); I.band(x, y, 2.6, 7.6, 6.2, 3.7, 4.7);
      I.cyl(x + 2, y + 2, 5.6, 1.1, 1.4, '#fff'); I.box(x + 4.6, y + 0.8, 5.6, 2.4, 0.3, 1.2);
    } },
  { id: 'palladian', name: 'Palladian', after: 'After Palladio', note: 'A square villa with a dome and a portico on every side.',
    draw(I, x, y) {
      I.box(x, y, 0, 8, 8, 0.8, { top: '#f4f2ec' });
      I.box(x + 1.6, y + 1.6, 0.8, 4.8, 4.8, 3.6); I.winX(x + 6.4, y + 1.6, 0.8, 4.8, 4, 1.8, 3.4); I.winY(x + 1.6, y + 6.4, 0.8, 4.8, 4, 1.8, 3.4);
      for (let i = 0; i < 4; i++) { I.box(x + 6.9, y + 2.3 + i * 1.1, 0.8, 0.3, 0.3, 2.9); I.box(x + 2.3 + i * 1.1, y + 6.9, 0.8, 0.3, 0.3, 2.9); }
      I.poly([[x + 7.3, y + 2, 3.7], [x + 7.3, y + 6, 3.7], [x + 7.3, y + 4, 4.8]], '#fff', 0.9); I.poly([[x + 6.4, y + 2, 3.7], [x + 7.3, y + 2, 3.7], [x + 7.3, y + 4, 4.8], [x + 6.4, y + 4, 4.8]], '#ecece7', 0.9);
      I.poly([[x + 2, y + 7.3, 3.7], [x + 6, y + 7.3, 3.7], [x + 4, y + 7.3, 4.8]], '#fff', 0.9);
      I.cyl(x + 4, y + 4, 4.4, 1.5, 0.8, '#f1f0ea'); I.dome(x + 4, y + 4, 5.2, 1.5);
    } },
  { id: 'prairie', name: 'Prairie', after: 'After Frank Lloyd Wright', note: 'Cantilevered terraces in long horizontal layers over a stone core.',
    draw(I, x, y) {
      I.box(x + 3, y + 2.5, 0, 2, 2, 6.6, { top: '#d9d4c8', l: '#cfc9bb', r: '#c2bcae' });
      I.box(x + 0.5, y + 1, 0, 6, 4.5, 1.9, { l: '#e8e5dd', r: '#ddd9cf' }); I.band(x + 0.5, y + 1, 0, 6, 4.5, 0.5, 1.6);
      I.box(x - 0.6, y + 0.4, 1.9, 8.4, 5.4, 0.45, { top: '#f6f4ef' });
      I.box(x + 1.5, y + 0.2, 2.35, 5, 7, 1.7, { l: '#e8e5dd', r: '#ddd9cf' }); I.band(x + 1.5, y + 0.2, 2.35, 5, 7, 2.7, 3.8);
      I.box(x + 0.6, y - 0.4, 4.05, 7, 8.6, 0.45, { top: '#f6f4ef' });
      I.box(x + 3, y + 2.5, 6.6, 2, 2, 0.2, { top: '#cfc9bb' });
    } },
  { id: 'glass', name: 'Glass pavilion', after: 'After Mies van der Rohe', note: 'Two white planes, eight columns, and nothing but glass between them.',
    draw(I, x, y) {
      I.box(x - 0.4, y + 4.4, 0.5, 4, 3.2, 0.25);
      for (const [a, b] of [[0, 0.8], [3.5, 0.8], [7, 0.8], [0, 5.6], [3.5, 5.6], [7, 5.6]]) I.box(x + a, y + b, 0, 0.3, 0.3, 4.2);
      I.box(x, y + 0.8, 1.1, 7.3, 5.1, 0.3);
      I.poly([[x + 6.3, y + 1.6, 1.4], [x + 6.3, y + 5.2, 1.4], [x + 6.3, y + 5.2, 3.9], [x + 6.3, y + 1.6, 3.9]], '#9fb4b8', 0.6, '#141414', 0.35);
      I.poly([[x + 1.5, y + 5.2, 1.4], [x + 6.3, y + 5.2, 1.4], [x + 6.3, y + 5.2, 3.9], [x + 1.5, y + 5.2, 3.9]], '#9fb4b8', 0.6, '#141414', 0.35);
      I.box(x + 3, y + 2.8, 1.4, 1.6, 1, 2.5, { top: '#d6cfc0', l: '#d6cfc0', r: '#cbc3b2' });
      I.box(x, y + 0.8, 3.9, 7.3, 5.1, 0.3);
    } },
  { id: 'tower', name: 'Tower house', after: 'After the Scottish tower house', note: 'A stone keep with a turret and a low hall beside it.',
    draw(I, x, y) {
      const st = { top: '#ebe7de', l: '#e2ddd2', r: '#d6d0c3' };
      I.box(x + 4.5, y + 1, 0, 3.4, 5, 2.8, st); I.poly([[x + 7.9, y + 1, 2.8], [x + 7.9, y + 6, 2.8], [x + 6.2, y + 6, 4.2], [x + 6.2, y + 1, 4.2]], '#cfc8b8', 0.9); I.poly([[x + 4.5, y + 6, 2.8], [x + 7.9, y + 6, 2.8], [x + 6.2, y + 6, 4.2]], '#e2ddd2', 0.9);
      I.box(x + 0.5, y + 0.5, 0, 4, 4, 9, st);
      I.winX(x + 4.5, y + 0.5, 0, 4, 2, 2.5, 3.6); I.winX(x + 4.5, y + 0.5, 0, 4, 2, 5.5, 6.6); I.winY(x + 0.5, y + 4.5, 0, 4, 2, 4, 5.1); I.winY(x + 0.5, y + 4.5, 0, 4, 1, 7, 8);
      for (let i = 0; i < 4; i++) { I.box(x + 0.5 + i * 1.05, y + 4.1, 9, 0.5, 0.4, 0.6, st); I.box(x + 4.1, y + 0.5 + i * 1.05, 9, 0.4, 0.5, 0.6, st); }
      I.cyl(x + 4.4, y + 4.4, 7.5, 0.75, 2.6, '#e2ddd2', '#ebe7de'); I.cone(x + 4.4, y + 4.4, 10.1, 0.85, 1.6);
    } },
  { id: 'patio', name: 'Patio house', after: 'After Mexican modernism', note: 'Colored walls around a hidden courtyard, and one tall wall against the sky.',
    draw(I, x, y) {
      const pink = { top: '#f1d2cd', l: '#e2b0a8', r: '#d39a91' }, ochre = { top: '#f3dc9c', l: '#e8c46a', r: '#d9b055' }, viol = { top: '#c9c2df', l: '#a99fcf', r: '#9a8fc2' };
      I.box(x, y, 0, 7.6, 3.2, 3.4, pink); I.box(x, y + 3.2, 0, 3, 4.4, 3.4, pink);
      I.poly([[x + 3.2, y + 3.4, 0.05], [x + 7.6, y + 3.4, 0.05], [x + 7.6, y + 7.6, 0.05], [x + 3.2, y + 7.6, 0.05]], '#ffffff', 0.6);
      I.box(x + 4.6, y + 4.6, 0, 2, 1.2, 0.4, { top: '#9fb4b8' });
      I.box(x + 7.4, y + 3.2, 0, 0.35, 4.4, 2.2, viol); I.box(x + 3, y + 7.4, 0, 4.75, 0.35, 2.2, viol);
      I.box(x + 1.2, y + 7.8, 0, 3.6, 0.45, 6.2, ochre); I.winX(x + 7.6, y, 0, 3.2, 1, 1.4, 2.8);
    } },
  { id: 'concrete', name: 'Concrete court', after: 'After Tadao Ando', note: 'Smooth concrete, one slit of light, and an open court cut through the middle.',
    draw(I, x, y) {
      const cc = { top: '#e4e4e1', l: '#d6d6d2', r: '#cacac6' };
      I.box(x, y, 0, 3, 7.6, 4, cc); I.box(x + 5, y, 0, 3, 7.6, 4, cc);
      I.poly([[x + 3, y + 0.2, 0.02], [x + 5, y + 0.2, 0.02], [x + 5, y + 7.4, 0.02], [x + 3, y + 7.4, 0.02]], '#f6f6f3', 0.5);
      I.box(x + 3, y + 7.4, 0, 2, 0.2, 4, cc);
      I.poly([[x + 8, y + 3.6, 0.3], [x + 8, y + 3.9, 0.3], [x + 8, y + 3.9, 3.7], [x + 8, y + 3.6, 3.7]], '#1e1e1e', 0.4);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { if (c === 3) continue; const [a, b] = I.P(x + 8, y + 0.6 + c * 1.3, 0.55 + r * 0.95); I.dot(a, b); }
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { const [a, b] = I.P(x + 0.7 + c * 1.4, y + 7.6, 0.55 + r * 0.95); I.dot(a, b); }
    } },
  { id: 'deconstructed', name: 'Deconstructed', after: 'After Frank Gehry', note: 'Tilted planes, raw materials, and an older house hidden inside.',
    draw(I, x, y) {
      I.box(x + 1, y + 1, 0, 5, 4, 2.6, { l: '#efe9df', r: '#e2dacb' }); I.poly([[x + 1, y + 1, 2.6], [x + 6, y + 1, 2.6], [x + 6, y + 5, 2.6], [x + 1, y + 5, 2.6]], '#fff', 0.8);
      I.poly([[x + 5.6, y + 0.6, 0], [x + 7.8, y + 1.4, 0], [x + 7.4, y + 1.8, 4.6], [x + 5, y + 0.4, 3.8]], '#c9cdd0', 0.9);
      I.poly([[x + 0.8, y + 5.4, 0], [x + 4.6, y + 6.8, 0], [x + 4.2, y + 7.4, 3.2], [x + 0.2, y + 5.6, 4.1]], '#d7dade', 0.9);
      const P2 = [[x + 3.2, y + 1.2, 2.6], [x + 6.6, y + 2.2, 2.6], [x + 6, y + 4.6, 5.6], [x + 2.8, y + 3.2, 4.4]];
      I.poly(P2, '#e8ebee', 0.9); for (let i = 1; i < 6; i++) I.line([x + 3.2 + i * 0.57, y + 1.2 + i * 0.17, 2.6], [x + 2.8 + i * 0.53, y + 3.2 + i * 0.23, 4.4 + i * 0.2], 0.5, '#141414', 0.6);
      I.poly([[x + 6.8, y + 5, 0], [x + 8, y + 5.8, 0], [x + 8, y + 5.8, 3], [x + 6.6, y + 5, 3.6]], null, 0.8);
      for (let i = 0; i <= 6; i++) { I.line([x + 6.8 + i * 0.2, y + 5 + i * 0.13, 0], [x + 6.6 + i * 0.23, y + 5 + i * 0.13, 3.6 - i * 0.1], 0.35); I.line([x + 6.8, y + 5, i * 0.55], [x + 8, y + 5.8, i * 0.5], 0.35); }
    } },
];

