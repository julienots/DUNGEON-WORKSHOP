import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { icon } from '../icons.js';
import { PRESTIGE_UPGRADES, ASCENSION_TITLES } from '../../data/prestige.js';
import { formatNumber } from '../../utils/format.js';

/** Ascension (prestige) : renaître plus puissant. */
export const PrestigeScreen = {
  id: 'prestige',
  title: 'Ascension',
  icon: '✨',
  events: ['prestigeChanged', 'floorsChanged', 'resources'],
  render() {
    const g = ctx.game;
    const p = g.state.prestige;
    const can = g.prestige.canAscend();
    const gain = g.prestige.previewGain();
    const wrap = h('div.prestige');
    wrap.appendChild(h('div.prestige-head',
      h('div.prestige-orb', '✨'),
      h('div',
        h('div.prestige-title', g.prestige.title()),
        h('div.small', `Ascensions : ${p.count} · Meilleur étage : ${p.bestFloor}`),
        h('div.me-amount', { html: `${icon('masterEssence')} <b>${formatNumber(p.masterEssence)}</b> Essence du Maître` }),
      ),
    ));
    wrap.appendChild(h('div.cell-section',
      h('div.cell-section-title', '🔁 Ascension'),
      h('p.small', 'Réinitialise : étages, salles, pièges, ressources (sauf cristaux), recherche (sauf Magie), trésor et niveaux des monstres.'),
      h('p.small', 'Conserve : monstres et leurs évolutions, équipements, cristaux, codex, succès, missions et améliorations d’Ascension.'),
      can.ok ? h('div.good', h('b', `Gain : +${formatNumber(gain)} Essence du Maître`)) : h('div.bad', `🔒 ${can.reason} (actuellement étage ${g.state.floors.length})`),
      Button('Ascension !', { variant: 'gold', block: true, disabled: !can.ok, onClick: async () => {
        const ok = await ctx.ui.modals.confirm({ title: 'Ascension ?', text: `Votre donjon sera réinitialisé. Vous gagnerez ${formatNumber(gain)} Essence du Maître.`, okLabel: 'Renaître', icon: '✨' });
        if (!ok) return;
        const r = g.prestige.ascend();
        if (r.ok) ctx.router.go('Dungeon');
      } }),
    ));
    const list = h('div.prestige-list');
    for (const u of PRESTIGE_UPGRADES) {
      const lvl = g.prestige.upgradeLevel(u.id);
      const max = lvl >= u.maxLevel;
      const cost = g.prestige.upgradeCost(u.id);
      list.appendChild(h('div.research-card',
        h('div.rc-icon', u.icon),
        h('div.rc-body', h('div.rc-title', h('b', u.name), h('span.rc-lvl', `${lvl}/${u.maxLevel}`)), h('div.small', u.desc)),
        max ? h('span.small.good', 'MAX') : Button('', { small: true, variant: p.masterEssence >= cost ? 'gold' : 'secondary', disabled: p.masterEssence < cost, icon: h('span', { html: `${icon('masterEssence')} ${formatNumber(cost)}` }), onClick: () => {
          const r = g.prestige.buy(u.id);
          if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
        } }),
      ));
    }
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '🌟 Améliorations permanentes'), list));
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '👑 Titres'), ASCENSION_TITLES.map((t) => h(`div.milestone${p.count >= t.count ? '.done' : ''}`, h('span.ms-lvl', `${t.count}×`), h('span', t.title), h('span.ms-check', p.count >= t.count ? '✓' : '🔒')))));
    return wrap;
  },
};
