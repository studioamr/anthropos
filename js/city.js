// ANTHROPOS · Campaña I (city.html)
import { CONFIG } from './config.js';
import { $, $$, fmtUSD, stats } from './site.js';
import { mountCity } from './city3d.js';
import { mountDemo } from './demo.js';
import { submit, chips, invite, toast } from './forms.js';

mountCity($('#city3d'));
mountDemo($('#demo'));

// progreso real
(async () => {
  const s = await stats();
  const goal = CONFIG.goalCommitments;
  $('#pGoal').textContent = goal.toLocaleString('en-US');
  $('#pGoal2').textContent = fmtUSD(CONFIG.goalDemandUSD);
  $('#pCount').textContent = s.committed.toLocaleString('en-US');
  $('#pDemand').textContent = fmtUSD(s.demand);
  const pct = (s.committed / goal) * 100;
  $('#pPct').textContent = `${pct.toFixed(1)}% of the first goal`;
  $('#liveLine').textContent = s.committed > 0
    ? `${s.committed.toLocaleString('en-US')} people have committed · updated ${s.updated}`
    : `The founding list is open · be among the first ${goal.toLocaleString('en-US')}`;
  setTimeout(() => { $('#pBar').style.width = Math.max(pct, 0.8) + '%'; $('#pBar2').style.width = Math.max((s.demand / CONFIG.goalDemandUSD) * 100, 0.8) + '%'; }, 500);
  if (s.mine) showDone(JSON.parse(localStorage.getItem('lyc-commit')));
})();

// formulario por pasos
const form = $('#commitForm');
const NAMES = ['About you', 'Your home', 'Your city'];
const picks = chips(form);
let step = 1;
const steps = $$('fieldset', form);
const go = (n) => {
  step = n; steps.forEach((f) => (f.hidden = +f.dataset.step !== n));
  $('#stepNo').textContent = `${n} / 3`; $('#stepName').textContent = NAMES[n - 1];
  $('#prev').hidden = n === 1; $('#next').textContent = n === 3 ? 'Commit to move' : 'Continue'; $('#formErr').textContent = '';
};
const valid = () => {
  const f = new FormData(form);
  if (step === 1) {
    if (!f.get('name')?.trim()) return 'Please tell us your name.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.get('email') || '')) return 'Please use a valid email.';
  }
  if (step === 2 && !picks.setting?.length) return 'Choose a setting: Center, Beach, or Hills.';
  if (step === 3 && !form.ok.checked) return 'Please confirm you understand a commitment is not a purchase.';
  return '';
};
$('#prev').onclick = () => go(step - 1);
$('#next').onclick = async () => {
  const e = valid(); if (e) { $('#formErr').textContent = e; return; }
  if (step < 3) return go(step + 1);
  const f = Object.fromEntries(new FormData(form));
  const rec = { ...f, setting: picks.setting?.[0], needs: picks.needs || [], at: new Date().toISOString(), campaign: 'I' };
  $('#next').disabled = true;
  const how = await submit('commit', rec, `Commit to move · ${rec.name}`);
  localStorage.setItem('lyc-commit', JSON.stringify(rec));
  showDone(rec, how);
};
function showDone(rec, how) {
  steps.forEach((f) => (f.hidden = true)); $('.form-nav', form).hidden = true; $('.steps-head', form).hidden = true;
  $('#done').hidden = false;
  if (rec) $('#doneMsg').textContent = `Thank you, ${String(rec.name || '').split(' ')[0] || 'friend'}. ${how === 'mail' ? 'Your email app opened with your commitment; send it to confirm.' : 'Your commitment is recorded.'} We will write to you before every step of the campaign.`;
}
[$('#invite'), $('#invite2')].forEach((b) => b && (b.onclick = () => invite()));
