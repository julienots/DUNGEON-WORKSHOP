import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { Tabs } from '../Card.js';
import { BIOMES } from '../../data/biomes.js';
import { BOSSES } from '../../data/bosses.js';
import { formatShort, formatTime } from '../../utils/format.js';

const RES_KEYS = ['gold', 'stone', 'metal', 'crystals', 'essence', 'darkEssence', 'legendaryEssence', 'dimensionalFragments'];

function rewardView(r) {
  const g = ctx.game;
  const res = Object.fromEntries(Object.entries(r).filter(([k]) => RES_KEYS.includes(k)));
  const other = g.seasons.rewardLabel(r);
  return h('div.season-reward', Object.keys(res).length ? CostView(res, { gain: true, compact: true }) : null, other ? h('span.small', other) : null);
}

/** Saison hors ligne (passe de récompenses + défis) et objectifs endgame. */
export const SeasonScreen = {
  id: 'season',
  title: 'Saison',
  icon: '🎟️',
  events: ['seasonChanged', 'endgameChanged', 'resources', 'stat'],
  initState: () => ({ tab: 'track' }),
  tick(api) {
    const el = api.body.querySelector('.season-left');
    if (el) el.textContent = `Fin dans ${formatTime((ctx.game.seasons.info().end - Date.now()) / 1000)}`;
  },
  render(api) {
    const g = ctx.game;
    const info = g.seasons.info();
    const se = info.season;
    const xp = g.seasons.xp();
    const tiers = g.seasons.tiers();
    const next = tiers.find((t) => !t.reached);
    const wrap = h('div.season');
    const b = BIOMES[se.biome];
    wrap.appendChild(h('div.season-head', { style: { '--mc': '#' + b.tint.toString(16).padStart(6, '0') } },
      h('div.season-icon', se.icon),
      h('div.season-body',
        h('div.small.muted', `Saison ${info.number}`),
        h('b.season-name', se.name),
        h('div.small', se.desc),
        h('div.small.season-left', `Fin dans ${formatTime((info.end - Date.now()) / 1000)}`),
        ProgressBar(next ? xp / next.xp : 1, { label: `${formatShort(xp)} XP${next ? ` / ${formatShort(next.xp)}` : ' · passe terminé !'}`, color: 'gold' }),
      ),
    ));
    const claimable = tiers.filter((t) => t.reached && !t.claimed).length;
    const egClaim = g.endgame.claimableCount();
    wrap.appendChild(Tabs([
      { id: 'track', icon: '🎟️', label: 'Passe', badge: claimable },
      { id: 'missions', icon: '🎯', label: 'Défis', badge: g.seasons.missions().filter((m) => m.done && !m.claimed).length },
      { id: 'endgame', icon: '🏆', label: 'Endgame', badge: egClaim },
    ], api.state.tab, (id) => {
      api.state.tab = id;
      api.refresh();
    }));
    if (api.state.tab === 'track') {
      wrap.appendChild(h('div.small.muted', `XP de saison : raids repoussés, étapes de modes, boss, missions, coffres, mutations. Familles en vedette aux portails : ${se.featured.join(', ')}. Boss de saison : ${BOSSES[se.boss]?.icon || ''} ${BOSSES[se.boss]?.name || ''}.`));
      const list = h('div.season-track');
      for (const t of tiers) {
        list.appendChild(h(`div.season-tier${t.reached ? '.reached' : ''}${t.claimed ? '.claimed' : ''}`,
          h('div.st-num', String(t.index + 1)),
          h('div.st-body', h('div.small.muted', `${formatShort(t.xp)} XP`), rewardView(t.reward)),
          t.claimed ? h('span.claimed-mark', '✓') : Button('Réclamer', { small: true, variant: t.reached ? 'gold' : 'secondary', disabled: !t.reached, sound: null, onClick: () => {
            const r = g.seasons.claimTier(t.index);
            if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔' });
            sfx('reward');
          } }),
        ));
      }
      wrap.appendChild(list);
    } else if (api.state.tab === 'missions') {
      for (const m of g.seasons.missions()) {
        wrap.appendChild(h(`div.mission${m.done ? '.done' : ''}${m.claimed ? '.claimed' : ''}`,
          h('div.mission-icon', m.icon),
          h('div.mission-body', h('div.mission-name', m.name), ProgressBar(m.value / m.target, { label: `${formatShort(m.value)} / ${formatShort(m.target)}`, color: m.done ? 'green' : 'gold' }), h('div.small', `+${m.xp} XP de saison`)),
          m.claimed ? h('span.claimed-mark', '✓') : Button('Valider', { small: true, variant: m.done ? 'gold' : 'secondary', disabled: !m.done, onClick: () => g.seasons.claimMission(m.id) }),
        ));
      }
    } else {
      const title = g.state.endgame?.title;
      if (title) wrap.appendChild(h('div.center.season-title', `👑 Titre : ${title}`));
      for (const goal of g.endgame.list()) {
        wrap.appendChild(h(`div.mission${goal.done ? '.done' : ''}${goal.claimed ? '.claimed' : ''}`,
          h('div.mission-icon', goal.icon),
          h('div.mission-body', h('div.mission-name', goal.name), ProgressBar(Math.min(1, goal.value / goal.target), { label: `${formatShort(goal.value)} / ${formatShort(goal.target)}`, color: goal.done ? 'green' : 'purple' }), rewardView(goal.reward), h('div.small.muted', `Titre : ${goal.title}`)),
          goal.claimed ? h('span.claimed-mark', '✓') : Button('Réclamer', { small: true, variant: goal.done ? 'gold' : 'secondary', disabled: !goal.done, onClick: () => {
            const r = g.endgame.claim(goal.id);
            if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔' });
            else ctx.ui.toasts.show(`Titre obtenu : ${goal.title}`, { icon: '👑', type: 'gold' });
          } }),
        ));
      }
    }
    return wrap;
  },
};
