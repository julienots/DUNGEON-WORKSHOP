import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Tabs, Empty } from '../Card.js';
import { CostView } from '../CostView.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { ADVENTURER_LIST } from '../../data/adventurers.js';
import { SKILLS } from '../../data/skills.js';
import { formatNumber } from '../../utils/format.js';

const OUTCOME = { victory: ['🏆', 'Anéantis'], retreat: ['🏃', 'Retraite'], looted: ['💰', 'Coffre pillé'] };

/** Aventuriers : classes ennemies et journal des derniers raids. */
export const AdventurersScreen = {
  id: 'adventurers',
  title: 'Aventuriers',
  icon: '⚔️',
  events: ['raidEnd'],
  initState: () => ({ tab: 'log' }),
  render(api) {
    const g = ctx.game;
    const wrap = h('div');
    wrap.appendChild(Tabs([{ id: 'log', icon: '📜', label: 'Journal des raids' }, { id: 'classes', icon: '🧙', label: 'Classes' }], api.state.tab, (id) => {
      api.state.tab = id;
      api.refresh();
    }));
    if (api.state.tab === 'log') {
      const s = g.state.stats;
      wrap.appendChild(h('div.stats-line', `🛡️ ${formatNumber(s.raidsDefended)} raids repoussés · 💰 ${formatNumber(s.raidsLost)} pillages · 💀 ${formatNumber(s.adventurersKilled)} aventuriers vaincus`));
      if (!g.state.log.length) wrap.appendChild(Empty('Aucun raid pour l’instant. Les aventuriers arrivent bientôt…', '🕯️'));
      for (const l of g.state.log) {
        const [icon, label] = OUTCOME[l.outcome] || ['⚔️', l.outcome];
        wrap.appendChild(h(`div.log-row.out-${l.outcome}`,
          h('div.log-icon', icon),
          h('div.log-body',
            h('div', h('b', l.party.name), h('span.small.muted', ` · niv. ${l.party.level} · Étage ${l.floor + 1}`)),
            h('div.log-heroes', l.party.classes.map((c) => h('img', { src: SpriteFactory.url(`hero_${c}`), alt: '' }))),
            h('div.small', `${label} · ${l.kills}/${l.party.size} vaincus${l.items ? ` · 🎁 ${l.items}` : ''}${l.stolen ? ` · -${formatNumber(l.stolen)} or` : ''}`),
            l.outcome !== 'looted' ? CostView(l.rewards, { gain: true, compact: true }) : null,
          ),
          h('div.log-time', timeAgo(l.t)),
        ));
      }
    } else {
      for (const a of ADVENTURER_LIST) {
        const known = g.codex.has('adventurers', a.id);
        wrap.appendChild(h(`div.class-card${known ? '' : '.unknown'}`,
          h('img.class-img', { src: SpriteFactory.url(`hero_${a.id}`), alt: '' }),
          h('div',
            h('b', `${a.icon} ${known ? a.name : '???'}`),
            h('div.small', known ? a.desc : `Apparaît à partir de l’étage ${a.minFloor}.`),
            known ? h('div.small.muted', `Compétences : ${a.skills.map((s) => SKILLS[s].name).join(', ')}`) : null,
            known ? h('div.small', `Vaincus : ${formatNumber(g.state.stats[`kill_${a.id}`] || 0)}`) : null,
          ),
        ));
      }
    }
    return wrap;
  },
};

function timeAgo(t) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}
