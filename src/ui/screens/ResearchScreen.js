import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { Tabs } from '../Card.js';
import { RESEARCH_CATEGORIES, RESEARCH_MAP } from '../../data/research.js';
import { formatTime } from '../../utils/format.js';

/** Arbre technologique : Architecture, Monstres, Pièges, Économie, Magie. */
export const ResearchScreen = {
  id: 'research',
  title: 'Recherche',
  icon: '🧪',
  events: ['researchChanged', 'resources', 'floorsChanged'],
  initState: () => ({ cat: 'economy' }),
  tick(api) {
    // Mise à jour légère des barres de progression
    for (const el of api.body.querySelectorAll('[data-research-active]')) {
      const a = ctx.game.state.research.active.find((x) => x.id === el.dataset.researchActive);
      if (!a) continue;
      const total = a.endsAt - a.startedAt;
      const r = Math.min(1, (Date.now() - a.startedAt) / total);
      el.querySelector('.progress-fill').style.width = `${(r * 100).toFixed(1)}%`;
      el.querySelector('.progress-label').textContent = formatTime((a.endsAt - Date.now()) / 1000);
      const rush = el.querySelector('.rush-cost');
      if (rush) rush.textContent = `💎 ${ctx.game.research.rushCost(a)}`;
    }
  },
  render(api) {
    const g = ctx.game;
    const wrap = h('div');
    // Laboratoires actifs
    const slots = g.research.slots();
    const act = h('div.research-active');
    for (let i = 0; i < slots; i++) {
      const a = g.state.research.active[i];
      if (a) {
        const def = RESEARCH_MAP[a.id];
        const r = Math.min(1, (Date.now() - a.startedAt) / (a.endsAt - a.startedAt));
        act.appendChild(h('div.research-slot.busy', { dataset: { researchActive: a.id } },
          h('span.rs-icon', def.icon),
          h('div.rs-body', h('b', `${def.name} → niv. ${g.research.level(a.id) + 1}`), ProgressBar(r, { label: formatTime((a.endsAt - Date.now()) / 1000), color: 'blue' })),
          Button('', { small: true, variant: 'gold', icon: h('span.rush-cost', `💎 ${g.research.rushCost(a)}`), onClick: () => {
            const res = g.research.rush(a.id);
            if (!res.ok) ctx.ui.toasts.show(res.reason || 'Impossible', { icon: '⛔', type: 'error' });
          } }),
        ));
      } else {
        act.appendChild(h('div.research-slot.free', h('span.rs-icon', '🔬'), h('div.rs-body', h('b', 'Laboratoire libre'), h('div.small.muted', 'Choisissez une recherche ci-dessous.'))));
      }
    }
    wrap.appendChild(act);
    wrap.appendChild(Tabs(Object.entries(RESEARCH_CATEGORIES).map(([id, c]) => ({ id, icon: c.icon, label: c.name })), api.state.cat, (id) => {
      api.state.cat = id;
      api.refresh();
    }));
    const list = h('div.research-list');
    const nodes = g.research.byCategory(api.state.cat);
    // Prêtes d'abord, puis verrouillées
    const order = { ready: 0, poor: 1, busy: 2, active: 3, locked: 4, max: 5 };
    const sorted = nodes.map((n) => ({ n, s: g.research.status(n.id) })).sort((a, b) => order[a.s.state] - order[b.s.state]);
    for (const { n, s } of sorted) {
      const lvl = g.research.level(n.id);
      const card = h(`div.research-card.state-${s.state}`,
        h('div.rc-icon', n.icon),
        h('div.rc-body',
          h('div.rc-title', h('b', n.name), h('span.rc-lvl', n.maxLevel > 1 ? `${lvl}/${n.maxLevel}` : lvl ? '✓' : '')),
          h('div.small', n.desc),
          s.state === 'locked' ? h('div.small.bad', `🔒 Requis : ${s.reasons.join(', ')}`) : null,
          s.state === 'max' ? h('div.small.good', '✓ Terminé') : null,
          s.cost && s.state !== 'max' ? h('div.rc-cost', CostView(s.cost, { compact: true }), h('span.small.muted', `⏱️ ${formatTime(g.research.duration(n.id))}`)) : null,
        ),
        s.state === 'ready' || s.state === 'poor' || s.state === 'busy'
          ? Button('Rechercher', { small: true, variant: s.state === 'ready' ? 'primary' : 'secondary', disabled: s.state !== 'ready', onClick: () => {
            const res = g.research.start(n.id);
            if (!res.ok) ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
          } })
          : s.state === 'active' ? h('span.small.good', '⏳ En cours') : null,
      );
      list.appendChild(card);
    }
    wrap.appendChild(list);
    return wrap;
  },
};
