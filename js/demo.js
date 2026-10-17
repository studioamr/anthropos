// ANTHROPOS · recorrido ilustrativo: escuchar → proponer → ejecutar (cifras de ejemplo, rotuladas como tales)
const STEPS = [
  {
    tab: 'Aggregate preferences', kicker: 'What superintelligence could uncover',
    q: 'Who would move, and what would it take?',
    p: 'Superintelligence connects friends, budgets, and shared needs to find the city’s first residents.',
    log: ['Reading 1,200 member answers', 'Matching friends who want to move together', 'Grouping budgets into price bands', 'Flagging needs: schools, studios, clinics'],
    vis: (el) => {
      el.innerHTML = `<div class="dv-title"><span>Members · example</span><span class="mono" data-n>0 ready</span></div><div class="people">${'<i></i>'.repeat(192)}</div>
      <div class="bars">${[['Home on the water', 72], ['Budget $0.6M–1.5M', 58], ['Move within 24 mo.', 41], ['Need studio space', 47], ['Need a school', 34]].map(([t, v]) => `<div class="b"><span>${t}</span><div class="t"><i data-w="${v}"></i></div><span>${v}%</span></div>`).join('')}</div>`;
      const dots = [...el.querySelectorAll('.people i')]; let n = 0;
      const order = dots.map((_, i) => i).sort(() => Math.random() - 0.5);
      const iv = setInterval(() => {
        for (let k = 0; k < 6 && n < 118; k++, n++) { const d = dots[order[n]]; d.className = n % 5 === 0 ? 'f' : 'y'; }
        el.querySelector('[data-n]').textContent = `${n} ready`;
        if (n >= 118) clearInterval(iv);
      }, 90);
      setTimeout(() => el.querySelectorAll('.bars i').forEach((i) => (i.style.width = i.dataset.w + '%')), 500);
      return () => clearInterval(iv);
    },
  },
  {
    tab: 'Create proposal', kicker: 'From preferences to a plan',
    q: 'What should we ask a partner to build?',
    p: 'The answers become a single proposal that citizens can read, amend, and vote on. Nothing moves without a human vote.',
    log: ['Drafting Proposal 001 from 118 commitments', 'Sizing homes, rooms, and studios to demand', 'Checking the draft against the charter', 'Opening a 7-day vote to all citizens'],
    vis: (el) => {
      const L = [['Private residences', '240'], ['Resort rooms', '60'], ['Music and art studios', '18'], ['School, K–12', '1'], ['Stated demand', '$312M'], ['Target first move-in', '2028']];
      el.innerHTML = `<div class="dv-title"><span>Proposal 001 · example</span><span class="mono">Draft</span></div>
        <div class="doc"><h5>Phase I neighborhood</h5><p class="caption" style="margin:4px 0 10px">A waterfront neighborhood for residents, fellows, and guests.</p>${L.map(([a, b]) => `<div class="ln"><span>${a}</span><b>${b}</b></div>`).join('')}</div>
        <div class="votes"><span>Yes <b data-y>0%</b></span><div class="t"><i style="width:0;background:#111"></i><i style="width:0;background:#c9c9c3"></i></div><span>No <b data-x>0%</b></span></div>
        <p class="caption">Citizens vote · quorum <span data-q>pending</span></p>`;
      const ls = [...el.querySelectorAll('.ln')]; let i = 0, c = null;
      const iv = setInterval(() => { if (i < ls.length) ls[i++].classList.add('on'); else clearInterval(iv); }, 420);
      const to = setTimeout(() => {
        const [a, b] = el.querySelectorAll('.votes .t i'); a.style.width = '81%'; b.style.width = '19%';
        let y = 0; c = setInterval(() => { if (!el.isConnected || !el.querySelector('[data-y]')) return clearInterval(c); y += 3; if (y >= 81) { y = 81; clearInterval(c); el.querySelector('[data-q]').textContent = 'met'; } el.querySelector('[data-y]').textContent = y + '%'; el.querySelector('[data-x]').textContent = Math.round(y * 19 / 81) + '%'; }, 40);
      }, 2900);
      return () => { clearInterval(iv); clearTimeout(to); clearInterval(c); };
    },
  },
  {
    tab: 'Execute', kicker: 'Demand, put to bid',
    q: 'Who will build it, and on what terms?',
    p: 'With a ratified proposal, the republic puts its demand to bid: governments, financiers, and developers compete to deliver it.',
    log: ['Sending the proposal to qualified developers', 'Comparing bids on price, timeline, and quality', 'Recommending a partner; council ratifies', 'Publishing the contract to every citizen'],
    vis: (el) => {
      const S = [['Request for proposals sent', '9 firms'], ['Bids received', '4'], ['Terms compared', 'price · time · quality'], ['Land option negotiated', '18 mo.'], ['Council ratifies', 'vote 2 of 2'], ['Ground is broken', 'Phase I']];
      el.innerHTML = `<div class="dv-title"><span>Execution · example</span><span class="mono" data-p>0 / ${S.length}</span></div><div class="steps">${S.map(([a, b]) => `<div class="s"><span class="k"></span><span>${a}</span><span class="mono">${b}</span></div>`).join('')}</div>`;
      const ss = [...el.querySelectorAll('.s')]; let i = 0;
      const iv = setInterval(() => {
        if (i > 0) ss[i - 1].classList.add('done');
        if (i < ss.length) { ss[i].classList.add('on'); i++; el.querySelector('[data-p]').textContent = `${i} / ${S.length}`; } else clearInterval(iv);
      }, 1100);
      return () => clearInterval(iv);
    },
  },
];

export function mountDemo(root, { dur = 9000 } = {}) {
  root.innerHTML = `<div class="demo-top"><span>Building a new city</span><span class="mono" style="color:var(--muted)">Illustrative walkthrough</span></div>
    <div class="demo-tabs" role="tablist">${STEPS.map((s, i) => `<button role="tab" id="demo-tab-${i}" aria-selected="${i === 0}" style="--dur:${dur}ms">${s.tab}<i></i></button>`).join('')}</div>
    <div class="demo-body" id="demo-panel" role="tabpanel"><div class="demo-q"><div class="eyebrow"></div><h4></h4><p class="body"></p><div class="demo-log"></div></div><div class="demo-vis"></div></div>
    <div class="demo-foot"><span class="caption" style="margin:0">Illustrative. Figures are examples, not results. Every decision is ratified by citizens.</span><a class="link-arrow" href="article.html?a=charter">Read the draft charter →</a></div>`;
  const tabs = [...root.querySelectorAll('[role=tab]')];
  let cur = -1, timer = null, cleanup = null, logT = [], paused = false, seen = false;
  const show = (i) => {
    cur = i; cleanup && cleanup(); logT.forEach(clearTimeout); logT = [];
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); const bar = t.querySelector('i'); bar.style.animation = 'none'; bar.offsetWidth; bar.style.animation = ''; });
    const s = STEPS[i], q = root.querySelector('.demo-q');
    q.querySelector('.eyebrow').textContent = s.kicker; q.querySelector('h4').textContent = s.q; q.querySelector('p').textContent = s.p;
    const log = q.querySelector('.demo-log'); log.innerHTML = s.log.map((l) => `<div>${l}</div>`).join('');
    [...log.children].forEach((d, k) => logT.push(setTimeout(() => d.classList.add('on'), 300 + k * 650)));
    cleanup = s.vis(root.querySelector('.demo-vis'));
    clearTimeout(timer); if (!paused) timer = setTimeout(() => show((i + 1) % STEPS.length), dur);
  };
  tabs.forEach((t, i) => (t.onclick = () => show(i)));
  root.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); tabs.forEach((t) => (t.querySelector('i').style.animationPlayState = 'paused')); });
  root.addEventListener('mouseleave', () => { paused = false; tabs.forEach((t) => (t.querySelector('i').style.animationPlayState = 'running')); clearTimeout(timer); timer = setTimeout(() => show((cur + 1) % STEPS.length), 2500); });
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !seen) { seen = true; show(0); } }, { threshold: 0.3 }).observe(root);
}
