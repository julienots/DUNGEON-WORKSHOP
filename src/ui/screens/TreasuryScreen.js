import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { Stat } from '../Card.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { ECONOMY } from '../../config/economy.js';
import { formatNumber, formatShort, formatTime } from '../../utils/format.js';

/** Trésorerie : coffre passif, améliorations, paliers de bonus. */
export const TreasuryScreen = {
  id: 'treasury',
  title: 'Trésor',
  icon: '💰',
  events: ['treasuryChanged', 'resources', 'raidEnd'],
  tick(api) {
    const t = ctx.game.state.treasury;
    const cap = ctx.game.treasury.capacity();
    const el = api.body.querySelector('.vault-bar');
    if (el) {
      el.querySelector('.progress-fill').style.width = `${Math.min(100, (t.vault / cap) * 100).toFixed(1)}%`;
      el.querySelector('.progress-label').textContent = `${formatNumber(t.vault)} / ${formatNumber(cap)}`;
    }
  },
  render() {
    const g = ctx.game;
    const t = g.state.treasury;
    const cap = g.treasury.capacity();
    const inc = g.treasury.incomePerMin();
    const wrap = h('div.treasury');
    const full = t.vault >= cap;
    wrap.appendChild(h('div.vault',
      h('img.vault-img', { src: SpriteFactory.url('floor_core'), alt: '' }),
      h('div.vault-body',
        h('div.vault-title', `Chambre au trésor · Niveau ${t.level}`),
        h('div.vault-bar', ProgressBar(t.vault / cap, { label: `${formatNumber(t.vault)} / ${formatNumber(cap)}`, color: 'gold', height: 20 })),
        h('div.small', `+${formatShort(inc)} or/min · ${full ? '⚠️ Coffre plein ! Récoltez-le.' : `plein dans ${formatTime((cap - t.vault) / (inc / 60))}`}`),
        Button(`Récolter ${formatShort(t.vault)} 🪙`, { variant: 'gold', block: true, sound: null, disabled: t.vault < 1, onClick: () => {
          const r = g.treasury.collect();
          if (r.ok) ctx.ui.toasts.show(`+${formatNumber(r.amount)} or`, { icon: '🪙', type: 'gold' });
        } }),
      ),
    ));
    // Amélioration
    const up = g.treasury.canUpgrade();
    wrap.appendChild(h('div.cell-section',
      h('div.cell-section-title', `⬆️ Niveau ${t.level + 1}`),
      h('div.stats-grid',
        Stat('Capacité', `${formatShort(cap)} → ${formatShort(g.treasury.capacity(t.level + 1))}`),
        Stat('Revenu/min', `${formatShort(inc)} → ${formatShort(g.treasury.incomePerMin(t.level + 1))}`),
      ),
      Button('Améliorer le trésor', { variant: 'primary', block: true, cost: up.cost || g.treasury.upgradeCost(), disabled: !up.ok, onClick: () => {
        const r = g.treasury.upgrade();
        if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
      } }),
    ));
    // Paliers
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '🏅 Paliers de bonus'),
      h('div.milestones', ECONOMY.treasury.milestones.map((ms) => h(`div.milestone${t.level >= ms.level ? '.done' : ''}`, h('span.ms-lvl', `Niv. ${ms.level}`), h('span', ms.desc), h('span.ms-check', t.level >= ms.level ? '✓' : '🔒')))),
    ));
    // Production
    const prod = g.dungeon.productionPerMin();
    if (Object.keys(prod).length) {
      wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '⛏️ Production des salles (par minute)'), CostView(prod, { gain: true })));
    }
    // Journal
    const thefts = g.state.log.filter((l) => l.stolen).slice(0, 5);
    if (thefts.length) {
      wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '🦹 Derniers pillages'),
        thefts.map((l) => h('div.small', `Étage ${l.floor + 1} — ${l.party.name} a volé ${formatNumber(l.stolen)} or`)),
      ));
    }
    wrap.appendChild(h('p.small.muted', 'Le trésor se remplit même hors ligne. Des Chambres au trésor 💎 dans le donjon augmentent aussi les récompenses des raids. Protégez le coffre : les aventuriers qui l’atteignent pillent une partie du trésor !'));
    return wrap;
  },
};
