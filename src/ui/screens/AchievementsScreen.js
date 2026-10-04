import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { formatShort } from '../../utils/format.js';

/** Succès avec progression et récompenses. */
export const AchievementsScreen = {
  id: 'achievements',
  title: 'Succès',
  icon: '🏆',
  events: ['achievementsChanged', 'achievementUnlocked'],
  render() {
    const g = ctx.game;
    const list = g.achievements.list();
    const done = list.filter((a) => a.done).length;
    const wrap = h('div');
    wrap.appendChild(h('div.codex-summary', h('b', `Succès : ${done} / ${list.length}`), ProgressBar(done / list.length, { color: 'gold' })));
    list.sort((a, b) => (b.done && !b.claimed) - (a.done && !a.claimed) || a.claimed - b.claimed || b.value / b.target - a.value / a.target);
    for (const a of list) {
      wrap.appendChild(h(`div.mission${a.done ? '.done' : ''}${a.claimed ? '.claimed' : ''}`,
        h('div.mission-icon', a.def.icon),
        h('div.mission-body',
          h('div.mission-name', a.def.name),
          ProgressBar(a.value / a.target, { label: `${formatShort(a.value)} / ${formatShort(a.target)}`, color: a.done ? 'green' : 'gold' }),
          CostView(a.def.reward, { gain: true, compact: true }),
        ),
        a.claimed ? h('span.claimed-mark', '✓') : Button('Réclamer', { small: true, variant: a.done ? 'gold' : 'secondary', disabled: !a.done, sound: null, onClick: () => g.achievements.claim(a.def.id) }),
      ));
    }
    return wrap;
  },
};
