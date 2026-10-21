// ANTHROPOS · envíos, chips, invitar, aviso
import { CONFIG } from './config.js';

// Si hay endpoint, POST JSON. Si no, abre el correo con el resumen (nunca se pierde una solicitud).
export async function submit(kind, rec, subject) {
  const all = JSON.parse(localStorage.getItem('lyc-outbox') || '[]'); all.push({ kind, ...rec }); localStorage.setItem('lyc-outbox', JSON.stringify(all));
  if (CONFIG.endpoint) {
    try { const r = await fetch(CONFIG.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ kind, ...rec }) }); if (r.ok) return 'sent'; } catch {}
  }
  const body = Object.entries(rec).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
  location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return 'mail';
}

export function chips(root) {
  const out = {};
  root.querySelectorAll('[data-chips]').forEach((g) => {
    const key = g.dataset.chips, single = g.hasAttribute('data-single');
    g.querySelectorAll('.chip').forEach((c) => {
      c.setAttribute('aria-pressed', 'false');
      c.onclick = () => {
        if (single) g.querySelectorAll('.chip').forEach((o) => o !== c && o.setAttribute('aria-pressed', 'false'));
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
        out[key] = [...g.querySelectorAll('.chip[aria-pressed="true"]')].map((o) => o.textContent.trim());
      };
    });
  });
  return out;
}

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600);
}

export async function invite(url = new URL('city.html', location.href).href) {
  const text = `I joined the founding list of the first self-sustaining city. Come with me: ${CONFIG.brand || CONFIG.name}.`;
  if (navigator.share) { try { await navigator.share({ title: CONFIG.name, text, url }); return; } catch {} }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Invitation link copied'); } catch { prompt('Copy this link', url); }
}
