import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { ProgressBar } from '../ProgressBar.js';
import { Tabs } from '../Card.js';
import { CostView } from '../CostView.js';
import { MASTERY_TREES, MASTERY_RESPEC_COST, masterLevelReward } from '../../data/mastery.js';
import { formatShort } from '../../utils/format.js';

/** Niveau du Maître et arbres de maîtrise. */
export const MasteryScreen = {
  id: 'mastery',
  title: 'Maîtrise',
  icon: '🧠',
  events: ['masteryChanged', 'masterLevelUp', 'stat'],
  initState: () => ({ tree: 'monsters' }),
  render(api) {
    const g = ctx.game;
    const p = g.state.player;
    const pr = g.progression;
    const wrap = h('div.mastery');
    const need = g.master.xpToNext();
    wrap.appendChild(h('div.master-card',
      h('div.master-level', h('small', 'Maître'), h('b', String(p.level))),
      h('div.master-body',
        ProgressBar(p.xp / need, { label: `${formatShort(p.xp)} / ${formatShort(need)} XP`, color: 'gold' }),
        h('div.small', 'XP : construction, combats, boss, découvertes, missions, modes de jeu.'),
        h('div.small.muted', h('span', 'Prochain niveau : '), CostView(masterLevelReward(p.level + 1), { gain: true, compact: true }), h('span', ' + 1 point de maîtrise')),
      ),
    ));
    const avail = pr.availablePoints();
    wrap.appendChild(h('div.mastery-points', h('b', `🧠 ${avail} point${avail > 1 ? 's' : ''} disponible${avail > 1 ? 's' : ''}`), h('span.small.muted', ` · ${pr.spentPoints()} / ${pr.totalPoints()} utilisés`)));

    wrap.appendChild(Tabs(Object.entries(MASTERY_TREES).map(([id, t]) => ({ id, label: `${t.icon} ${t.short}` })), api.state.tree, (id) => {
      api.state.tree = id;
      api.refresh();
    }));
    const tree = MASTERY_TREES[api.state.tree];
    const list = h('div.mastery-tree', { style: { '--mc': tree.color } });
    tree.nodes.forEach((n, i) => {
      const lvl = pr.level(n.id);
      const check = pr.canUpgrade(n.id);
      const locked = i > 0 && pr.level(tree.nodes[i - 1].id) < 1;
      list.appendChild(h(`div.mastery-node${locked ? '.locked' : ''}${lvl >= n.max ? '.maxed' : ''}`,
        h('div.mastery-icon', locked ? '🔒' : n.icon),
        h('div.mastery-body',
          h('b', `${n.name} ${lvl}/${n.max}`),
          h('div.small', `${n.desc} par niveau`),
          h('div.mastery-pips', Array.from({ length: n.max }, (_, k) => h(`span.pip${k < lvl ? '.on' : ''}`))),
        ),
        Button(lvl >= n.max ? 'Max' : `+1 (${n.cost} pt${n.cost > 1 ? 's' : ''})`, { small: true, variant: check.ok ? 'primary' : 'secondary', disabled: !check.ok, onClick: () => {
          const r = pr.upgrade(n.id);
          if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔' });
        } }),
      ));
    });
    wrap.appendChild(list);
    wrap.appendChild(h('div.row.gap.center',
      Button(`↺ Réinitialiser (${MASTERY_RESPEC_COST} 💎)`, { small: true, variant: 'ghost', disabled: !pr.spentPoints(), onClick: () => {
        const r = pr.respec();
        ctx.ui.toasts.show(r.ok ? 'Points de maîtrise rendus' : r.reason, { icon: r.ok ? '↺' : '⛔', type: r.ok ? 'success' : 'error' });
      } }),
    ));
    return wrap;
  },
};
