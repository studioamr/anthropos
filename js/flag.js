// LYCEON · bandera ondeando (canvas 2D, sin video)
import { EMBLEM } from './site.js';

export function flag(cv) {
  const g = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = 560, H = 380; cv.width = W * dpr; cv.height = H * dpr; g.scale(dpr, dpr);
  const FW = 420, FH = 270, X0 = 46, Y0 = 52;
  // textura de la bandera: campo marfil, franja de tinta en el asta, emblema al centro
  const tex = document.createElement('canvas'); tex.width = FW * 2; tex.height = FH * 2;
  const t = tex.getContext('2d'); t.scale(2, 2);
  t.fillStyle = '#f3f1ec'; t.fillRect(0, 0, FW, FH);
  t.fillStyle = '#141414'; t.fillRect(0, 0, 54, FH);
  t.fillRect(54, FH * 0.5 - 0.6, FW - 54, 1.2);
  const img = new Image();
  const svg = EMBLEM.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" ').replace('currentColor', '#141414').replace(/currentColor/g, '#141414');
  img.onload = () => {
    t.fillStyle = '#f3f1ec'; t.beginPath(); t.arc(54 + (FW - 54) / 2, FH / 2, 78, 0, 6.283); t.fill();
    t.drawImage(img, 54 + (FW - 54) / 2 - 70, FH / 2 - 70, 140, 140);
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let run = true;
  new IntersectionObserver(([e]) => (run = e.isIntersecting)).observe(cv);
  const strip = 3;
  const draw = (ms) => {
    const time = reduce ? 0 : ms / 1000;
    g.clearRect(0, 0, W, H);
    // asta
    g.fillStyle = '#2a2a28'; g.fillRect(X0 - 6, 18, 3, H - 30);
    g.beginPath(); g.arc(X0 - 4.5, 16, 4, 0, 6.283); g.fill();
    for (let x = 0; x < FW; x += strip) {
      const k = x / FW; // amplitud crece hacia el vuelo
      const ph = k * 7.5 - time * 3.1;
      const dy = Math.sin(ph) * 14 * k + Math.sin(ph * 0.5 + time) * 5 * k;
      const shade = Math.cos(ph) * k;
      const sx = x * 2;
      g.drawImage(tex, sx, 0, strip * 2, FH * 2, X0 + x, Y0 + dy, strip + 0.6, FH * (1 - 0.06 * k * (0.5 + 0.5 * Math.sin(ph))));
      g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade * 0.18})` : `rgba(0,0,0,${-shade * 0.22})`;
      g.fillRect(X0 + x, Y0 + dy, strip + 0.6, FH * (1 - 0.06 * k * (0.5 + 0.5 * Math.sin(ph))));
    }
    if (!reduce) requestAnimationFrame(loop);
  };
  const loop = (ms) => { if (run) draw(ms); else requestAnimationFrame(loop); };
  requestAnimationFrame(draw);
}
