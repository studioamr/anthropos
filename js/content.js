// LYCEON · despachos e ideas (todo texto original; nada de prensa ajena)
const p = (...xs) => xs.map((x) => (x.startsWith('<') ? x : `<p>${x}</p>`)).join('');

export const ESSAYS = [
  {
    slug: 'thinking-state', n: 'I', kicker: 'Essay', home: true, date: 'October 16, 2026',
    title: 'The Thinking State', cover: 'img/essay-1.jpg',
    dek: 'Every great polity was built around its scarcest resource. Ours will be built around intelligence, and it should own its own.',
    body: p(
      'Every polity that mattered was organized around whatever was scarcest in its age. River kingdoms were organized around water, and the officials who measured the flood became priests. Maritime republics were organized around ships, so their senates were full of captains and insurers. The industrial nation-state was organized around labor: it counted workers, schooled them, taxed their wages, and drafted their sons.',
      'We are entering an age in which the scarce thing is no longer labor. It is judgment, coordination, and attention, which are the faculties a superintelligence supplies in abundance. A state that does not hold its own intelligence will rent it, and whoever rents their mind sooner or later rents their sovereignty too.',
      '<h2>Intelligence as a commons</h2>',
      'We propose that a republic treat intelligence the way the ancient city treated its walls and its granary: as common infrastructure, held in trust for its citizens and paid for from a common budget. In practice that means a treasury of compute, models the republic runs or contracts for under its own rules, and a public record of every instruction given to them.',
      'This is not technocracy. Technocracy put experts in place of citizens. Our proposal is the opposite, because it puts the expert’s tools in every citizen’s hands. When a member of Lyceon asks why a road runs where it does, why a budget grew, or why a proposal failed, they should get an honest and complete answer in seconds, along with the reasoning and the dissent.',
      '<h2>What a thinking state does</h2>',
      'It listens at scale. A town hall hears forty voices, while a thinking state can hear forty thousand, cluster what they share, and still surface the lonely objection that turns out to be right.',
      'It drafts. Most of governance is drafting: budgets, ordinances, contracts, and schedules. Drafting is precisely the kind of work machines have learned to do well, quickly, and in plain language.',
      'It remembers. Institutions decay when their memory leaves with their staff. A republic whose every decision is recorded, indexed, and explainable cannot quietly forget why it made a promise.',
      '<h2>What it must never do</h2>',
      'It must never decide alone. In Lyceon the machine proposes and the citizens dispose. Every binding act, whether a law, a budget, or a contract, requires a human vote under a written charter that the machine cannot amend.',
      '<blockquote>The machine proposes. The citizens dispose. The charter binds them both.</blockquote>',
      'A state that thinks is not a state that rules itself. It is a state whose people can finally see what they are ruling.'
    ),
  },
  {
    slug: 'after-the-office', n: 'II', kicker: 'Essay', home: true, date: 'October 16, 2026',
    title: 'After the Office', cover: 'img/essay-2.jpg',
    dek: 'For two centuries a job told us who we were and where to live. What do we become when it no longer has to?',
    body: p(
      'Ask a stranger who they are and they will usually tell you what they do. This is a recent habit. For most of history, a person was first a member of a family, a faith, a guild, or a city, and only incidentally a producer of goods.',
      'The industrial age changed that. The railway and the telegraph pulled work into cities, and cities pulled people after the work. Your address followed your employer, your friendships followed your office, and in time your identity followed your title. We became, in the economist’s phrase, <em>homo economicus</em>, and our nations measured themselves by output.',
      '<h2>The great unbundling</h2>',
      'Superintelligence is about to unbundle the job. The tasks that filled the modern office, such as analysis, drafting, coding, research, and review, are exactly the tasks these systems now do. This will happen unevenly and with real pain, and a serious republic should say so plainly. But the direction is clear: less and less of a human life will need to be spent producing.',
      'When work no longer decides where you live, something else will. We think people will choose places the way they once chose a school or a church: for the company, the customs, and the kind of life a place makes possible.',
      '<h2>Not leisure, but excellence</h2>',
      'The usual fear is that a life without labor is a life of idleness. The Greeks had a better word for the time freed from necessity: <em>scholē</em>, the root of our word school. Free time was not empty time. It was the time in which a person could pursue the excellences that labor crowded out, such as the arts, inquiry, athletics, friendship, and the government of the city.',
      'Lyceon is built on that older idea. We are not founding a resort for people who have finished working. We are founding a city for people who have finally been freed to do their best work, the kind nobody would ever pay them for.',
      '<blockquote>A life was never meant to be measured by its output.</blockquote>',
      'There will be studios before there are offices, a stadium before a mall, and a reading room before a food court. The streets will be laid out for walking and arguing. If we have done it right, a visitor who asks a resident “what do you do?” will receive a longer and stranger answer than they expected.'
    ),
  },
  {
    slug: 'the-last-committee', n: 'III', kicker: 'Essay', home: true, date: 'October 16, 2026',
    title: 'The Last Committee', cover: 'img/essay-3.jpg',
    dek: 'Representative democracy was a workaround for the cost of listening. That cost is about to fall to almost nothing.',
    body: p(
      'Representative government was an engineering compromise. A nation of millions could not gather in one square, so it sent delegates. The delegates could not read millions of letters, so they hired staff, the staff formed committees, and the committees wrote the laws. Each layer was a way of coping with the cost of listening.',
      'That cost is collapsing. A superintelligence can read every submission, model every amendment, and explain every trade-off to every citizen in their own language. The committee was a machine for compressing the public will, and we now have a better one.',
      '<h2>Three verbs</h2>',
      'Lyceon governs through a loop of three verbs. <strong>Aggregate:</strong> the republic gathers what its members want, need, and fear, and makes the result public. <strong>Propose:</strong> it drafts concrete options that reconcile those wants, along with the costs and the minority objections. <strong>Execute:</strong> once citizens ratify an option, the republic carries it out, publishes every step, and measures whether it worked.',
      'Each pass through the loop should leave the republic a little wiser than the last. Campaigns are its unit of action. The first is to found a city, and later ones will build schools, fund fellowships, and negotiate with governments.',
      '<h2>Guardrails</h2>',
      'No system of this kind should be trusted on its own say-so. Ours is bound by a charter that can only be amended by a supermajority of citizens, never by the system itself. Every model instruction is logged and published. A human council can freeze any campaign, and members can always leave with their data.',
      'The point is not to remove humans from politics. It is to remove the bottleneck that made politics a profession. When the cost of listening falls to zero, there is no longer any excuse for not listening.'
    ),
  },
  {
    slug: 'meet-me-in-the-lyceum', n: 'IV', kicker: 'Essay', home: false, date: 'October 16, 2026',
    title: 'Meet Me in the Lyceum', cover: 'img/essay-4.jpg',
    dek: 'Aristotle taught while walking under a colonnade. We are building a city for the same kind of conversation.',
    body: p(
      'Outside the walls of Athens there was a grove sacred to Apollo Lykeios, with a gymnasium and a covered walkway, the <em>peripatos</em>. Aristotle taught there while walking, and his students, the Peripatetics, took their name from the path. The Lyceum was a school, but it was also a place: a running track, a garden, a library, and a colonnade where people argued until dark.',
      'We named the republic after it because we believe ideas need places. The internet can gather a movement, but it cannot give that movement a plaza, a long table, or a shared morning swim. Cultures form where people can bump into each other without an appointment.',
      '<h2>A city that walks</h2>',
      'The plan of our first city begins with a walk. A colonnade circles a central court, and eight avenues lead out from it, through rings of homes and studios, down to the sea and up into the hills. Nothing essential is more than a short walk away, and cars stay at the edge.',
      'Around the court we have placed the institutions a free people will actually use: an odeon for music, a library, a gymnasium, an academy on the hill, an amphitheater facing the water, and a stadium. The city is designed to look stripped and classical, in stone, bronze, shade, and water. We want it to feel built to last, and humble about its age.',
      '<h2>Why stone</h2>',
      'Software ages in months. Cities are measured in centuries. A republic that thinks at machine speed needs a physical home that changes slowly: stone you can lean on, trees that take a generation to grow, and a colonnade worn smooth by people walking and talking.',
      '<blockquote>Meet me in the Lyceum. Bring a question.</blockquote>'
    ),
  },
  {
    slug: 'charter', n: '—', kicker: 'Draft Charter · MMXXVI', home: false, date: 'October 16, 2026',
    title: 'Draft Charter, Version One', cover: 'img/essay-5.jpg',
    dek: 'The founding principles of the republic, published for comment before any member is bound by them.',
    body: p(
      'This is a draft, published so that the first members can read, question, and amend it before it binds anyone. It is not a legal instrument. Lyceon will always operate under the laws of every country in which it acts.',
      '<h2>Article I · Purpose</h2>',
      'Lyceon exists to help its members live excellent lives in an age of abundant intelligence, and to found cities designed for that purpose.',
      '<h2>Article II · Membership</h2>',
      'Membership is open to any adult who accepts this charter, whatever their nationality, origin, or faith. Members gather by vocation and character. No member may be admitted or excluded on the basis of ethnicity, race, religion, sex, or national origin. Any member may leave at any time and take their data with them.',
      '<h2>Article III · The loop</h2>',
      'The republic acts through campaigns. Each campaign aggregates the views of members, proposes concrete options in public, and executes only what citizens ratify by vote. Every instruction given to an automated system acting for the republic is logged and published to members.',
      '<h2>Article IV · Human sovereignty</h2>',
      'No automated system may adopt, amend, or suspend a law, a budget, or a contract. No automated system may amend this charter. A council of members, elected for fixed terms, may freeze any campaign pending a vote.',
      '<h2>Article V · The common budget</h2>',
      'The republic keeps a common budget of compute and funds, reported to members every quarter. No part of it may be promised to members as a financial return.',
      '<h2>Article VI · Host countries</h2>',
      'Lyceon builds only with the consent of host governments and under their laws. It will seek to create jobs, pay taxes, and train local talent wherever it builds.',
      '<h2>Article VII · Amendment</h2>',
      'This charter may be amended by two-thirds of voting citizens, in a vote open for no fewer than fourteen days.',
      '<p class="caption">Comments: write to the founding office. Version one, Anno MMXXVI.</p>'
    ),
  },
];

export const DISPATCHES = [
  {
    slug: 'founding-list', kind: 'Announcement', date: 'October 16, 2026', year: 2026, cover: 'img/res-aerial.jpg',
    title: 'Lyceon opens its founding list and launches Campaign I',
    dek: 'The first campaign asks one question: would you move to a new city on Panama’s Pacific coast?',
    body: p(
      'Lyceon opened its founding list today and launched Campaign I, Commit to Move. The campaign asks prospective members to describe the city they would move to, the budget they would bring, and the people they would bring with them.',
      'The first goal is 1,000 commitments. Together, these stated budgets form a single measure of housing demand, which Lyceon will use to negotiate for land, financing, and building partners. A commitment is a statement of intent. It is not a deposit, a purchase, or an investment.',
      '<h2>What happens next</h2>',
      'Once the first goal is met, members will shape a proposal for the Phase I neighborhood. That proposal will then be put to bid among developers and partners. Every step will be published in these dispatches.'
    ),
  },
  {
    slug: 'why-panama', kind: 'Letter', date: 'October 16, 2026', year: 2026, cover: 'img/hero.jpg',
    title: 'Why Panama: the case for the Azuero Coast',
    dek: 'A dollar economy, two oceans, the hub of the Americas, and a coast that is still open.',
    body: p(
      'We looked for a place with open land on the water, a stable rule of law, easy access to the world, and room to build something of our own. Panama’s Pacific coast, on the Azuero Peninsula, came first on our list.',
      '<h2>The reasons</h2>',
      '<strong>The coast.</strong> Long beaches, dry tropical forest, and hills that run down to the sea, with a long dry season.',
      '<strong>The connections.</strong> Panama City’s international airport is one of the best-connected hubs in the Americas, with direct flights across the hemisphere and to Europe.',
      '<strong>The economy.</strong> The US dollar circulates as legal tender, and the country has long welcomed foreign residents and international firms.',
      '<strong>The setting.</strong> Fishing towns, surf beaches, and colonial villages close by, with room for a new neighborhood to grow.',
      'Site selection is in progress, and we have not acquired any land. We will report each step, including the sites we reject and the reasons why.'
    ),
  },
  {
    slug: 'charter-published', kind: 'Charter', date: 'October 16, 2026', year: 2026, cover: 'img/essay-5.jpg',
    title: 'Draft Charter, version one, published for comment',
    dek: 'Seven articles, written to be argued with. No member is bound until the founding vote.',
    body: p(
      'We have published the first draft of the Lyceon charter. It is short on purpose: seven articles covering purpose, membership, how the republic acts, human sovereignty over every binding decision, the common budget, host countries, and amendment.',
      'Two provisions matter most to us. First, no automated system may ever adopt a law, a budget, or a contract, or amend the charter itself. Second, membership is open to any adult who accepts the charter, whatever their origin. We gather by vocation and character, never by ancestry.',
      '<p><a class="link-arrow" href="article.html?a=charter">Read the draft charter →</a></p>'
    ),
  },
  {
    slug: 'commitment-to-city', kind: 'Field notes', date: 'October 16, 2026', year: 2026, cover: 'img/site-1.jpg',
    title: 'How a commitment becomes a city',
    dek: 'From a form on a website to ground broken on a coast, in three steps.',
    body: p(
      '<strong>01 · Gather.</strong> Members commit to move and tell us what they need: a home on the water or in the hills, a studio, a school, and room for friends. The goal is 1,000 commitments.',
      '<strong>02 · Shape.</strong> Superintelligence turns those answers into a draft plan: how many homes, what kind, which shared spaces, and at what prices. Members amend it and vote.',
      '<strong>03 · Put to bid.</strong> With a ratified plan and a demonstrated demand, we seek a site, financing, and a building partner, and publish the terms.',
      'At no point does a commitment become a payment. When homes are ready to sell, they will be sold under the laws of the host country, with full disclosures, by licensed parties.'
    ),
  },
];

export const ALL = [...DISPATCHES, ...ESSAYS];
export const readMin = (e) => Math.max(2, Math.round(e.body.replace(/<[^>]+>/g, '').split(/\s+/).length / 220));
