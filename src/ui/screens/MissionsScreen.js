import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { Tabs, Empty } from '../Card.js';
import { formatShort, formatTime } from '../../utils/format.js';
import { nextMidnight, nextMonday } from '../../utils/helpers.js';
import { MONSTER_MAP } from '../../data/monsters.js';
import { RARITY_INFO } from '../../utils/constants.js';

function rewardView(reward) {
  const res = {};
  const extras = [];
  for (const [k, v] of Object.entries(reward || {})) {
    if (!v) continue;
    if (k === 'monster') extras.push(h('span.chip', `🥚 ${MONSTER_MAP[v]?.name || (v === 'advanced' ? 'Monstre rare+' : 'Monstre')}`));
    else if (k === 'equipment') extras.push(h('span.chip', { style: { color: RARITY_INFO[v]?.color } }, `🗡️ Objet ${RARITY_INFO[v]?.name || ''}`));
    else res[k] = v;
  }
  return h('div.reward', CostView(res, { gain: true, compact: true }), extras);
}

function missionCard({ icon, name, value, target, done, claimed, reward, onClaim }) {
  return h(`div.mission${done ? '.done' : ''}${claimed ? '.claimed' : ''}`,
    h('div.mission-icon', icon),
    h('div.mission-body',
      h('div.mission-name', name),
      ProgressBar(value / target, { label: `${formatShort(value)} / ${formatShort(target)}`, color: done ? 'green' : 'gold' }),
      rewardView(reward),
    ),
    claimed ? h('span.claimed-mark', '✓') : Button('Réclamer', { small: true, variant: done ? 'gold' : 'secondary', disabled: !done, sound: null, onClick: onClaim }),
  );
}

/** Missions quotidiennes, hebdomadaires, permanentes et d'événement. */
export const MissionsScreen = {
  id: 'missions',
  title: 'Missions',
  icon: '📜',
  events: ['missionsChanged', 'stat'],
  initState: () => ({ tab: 'daily' }),
  render(api) {
    const g = ctx.game;
    if (api.state.tab === 'daily' && this.data?.tab) api.state.tab = this.data.tab;
    g.missions.refresh();
    const tab = api.state.tab;
    const count = (k) => g.missions.list(k).filter((x) => x.done && !x.inst.claimed).length;
    const wrap = h('div');
    const ev = g.events.current();
    wrap.appendChild(Tabs([
      { id: 'daily', icon: '☀️', label: 'Jour', badge: count('daily') },
      { id: 'weekly', icon: '📅', label: 'Semaine', badge: count('weekly') },
      { id: 'permanent', icon: '🏛️', label: 'Permanentes', badge: g.missions.chains().filter((c) => c.done).length },
      { id: 'event', icon: ev?.icon || '🎉', label: 'Événement', badge: count('event') },
    ], tab, (id) => {
      api.state.tab = id;
      this.data = null;
      api.refresh();
    }));
    const claim = (kind, id) => {
      const r = g.missions.claim(kind, id);
      if (r.ok) ctx.ui.toasts.show('Récompense obtenue !', { icon: '🎁', type: 'gold' });
    };
    if (tab === 'daily' || tab === 'weekly' || tab === 'event') {
      const reset = tab === 'daily' ? nextMidnight() : tab === 'weekly' ? nextMonday() : ev?.endsAt;
      wrap.appendChild(h('div.small.muted.center', `${tab === 'event' ? `${ev.icon} ${ev.name} — ` : ''}Renouvellement dans ${formatTime((reset - Date.now()) / 1000)}`));
      const list = g.missions.list(tab);
      if (!list.length) wrap.appendChild(Empty('Aucune mission.', '📜'));
      for (const m of list) wrap.appendChild(missionCard({ icon: m.def.icon, name: m.name, value: m.value, target: m.target, done: m.done, claimed: m.inst.claimed, reward: m.reward, onClaim: () => claim(tab, m.inst.id) }));
    } else {
      for (const c of g.missions.chains()) {
        wrap.appendChild(missionCard({
          icon: c.chain.icon,
          name: c.complete ? `${c.chain.name} — terminé !` : `${c.chain.name} (${c.index + 1}/${c.total})`,
          value: c.value, target: c.target, done: c.done, claimed: c.complete, reward: c.reward,
          onClaim: () => {
            const r = g.missions.claimChain(c.chain.id);
            if (r.ok) ctx.ui.toasts.show('Objectif accompli !', { icon: '🏛️', type: 'gold' });
          },
        }));
      }
    }
    return wrap;
  },
};
