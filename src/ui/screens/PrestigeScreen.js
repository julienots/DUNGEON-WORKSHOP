import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { icon } from '../icons.js';
import { PRESTIGE_UPGRADES, ASCENSION_TITLES } from '../../data/prestige.js';
import { formatNumber } from '../../utils/format.js';
import { PRESTIGE_TIERS, TIER_IDS, TIER_UPGRADES } from '../../data/prestigeTiers.js';
import { Tabs } from '../Card.js';
import { ProgressBar } from '../ProgressBar.js';

/** Ascension (prestige) : renaître plus puissant. */
export const PrestigeScreen = {
  id: 'prestige',
  title: 'Ascension',
  icon: '✨',
  events: ['prestigeChanged', 'floorsChanged', 'resources'],
  initState: () => ({ tier: 'ascension' }),
  render(api) {
    const g = ctx.game;
    const p = g.state.prestige;
    const tabs = Tabs([
      { id: 'ascension', icon: '✨', label: 'Ascension' },
      ...TIER_IDS.map((id) => ({ id, icon: PRESTIGE_TIERS[id].icon, label: PRESTIGE_TIERS[id].name })),
    ], api.state.tier, (id) => {
      api.state.tier = id;
      api.refresh();
    });
    if (api.state.tier !== 'ascension') return h('div.prestige', tabs, renderTier(api.state.tier));
    const can = g.prestige.canAscend();
    const gain = g.prestige.previewGain();
    const wrap = h('div.prestige');
    wrap.appendChild(tabs);
    wrap.appendChild(h('div.tier-ladder', ['✨ Ascension', ...TIER_IDS.map((id) => `${PRESTIGE_TIERS[id].icon} ${PRESTIGE_TIERS[id].name}`)].map((t, i) => h('span.tier-step', i ? '→ ' : '', t))));
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

/** Palier de Prestige 2.0 : conditions, gain, bonus permanents, améliorations. */
function renderTier(tier) {
  const g = ctx.game;
  const def = PRESTIGE_TIERS[tier];
  const st = g.tiers.t[tier];
  const can = g.tiers.canPerform(tier);
  const wrap = h('div.tier', { style: { '--mc': def.color } });
  wrap.appendChild(h('div.prestige-head',
    h('div.prestige-orb.tier-orb', def.icon),
    h('div',
      h('div.prestige-title', def.name),
      h('div.small', `Effectué ${st.count || 0} fois`),
      'points' in st ? h('div.me-amount', h('b', `${def.currencyIcon} ${formatNumber(st.points)}`), ` ${def.currency}`) : null,
    ),
  ));
  wrap.appendChild(h('p.small', def.desc));
  const reqs = g.tiers.requirements(tier);
  wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '📋 Conditions'),
    reqs.map((r) => h(`div.req-row${r.ok ? '.good' : ''}`, `${r.ok ? '✓' : '○'} ${r.label}`, h('span.small.muted', ` (${formatNumber(r.cur)})`)))));
  const bonus = Object.entries(def.perTier).map(([k, v]) => `${MOD_NAMES[k] || k} +${Math.round(v * 100)} %`).join(' · ');
  wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '🌟 Bonus permanents par passage'), h('div.small', bonus),
    (def.unlocks || []).map((u) => h(`div.req-row${(st.count || 0) >= u.at ? '.good' : ''}`, `${(st.count || 0) >= u.at ? '✓' : '🔒'} Passage ${u.at} : ${u.desc}`))));
  wrap.appendChild(Button(`${def.icon} ${def.name} !`, { variant: 'gold', block: true, disabled: !can.ok, onClick: async () => {
    const ok = await ctx.ui.modals.confirm({ title: `${def.name} ?`, text: `Une Ascension complète sera effectuée${def.resets.length ? ', et seront aussi réinitialisés : ' + def.resets.map((r) => RESET_NAMES[r]).join(', ') : ''}. Gain : ${can.gain} ${def.currency}.`, okLabel: def.name, icon: def.icon });
    if (!ok) return;
    const r = g.tiers.perform(tier);
    if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
    ctx.ui.toasts.show(`${def.icon} ${def.name} accomplie !`, { icon: def.icon, type: 'gold', duration: 4000 });
    ctx.router.go('Dungeon');
  } }));
  if (!can.ok) wrap.appendChild(h('div.small.bad.center', `🔒 ${can.reason}`));
  const ups = TIER_UPGRADES[tier] || [];
  if (ups.length) {
    const list = h('div.prestige-list');
    for (const u of ups) {
      const lvl = g.tiers.upgradeLevel(tier, u.id);
      const max = lvl >= u.max;
      const cost = g.tiers.upgradeCost(tier, u.id);
      list.appendChild(h('div.research-card',
        h('div.rc-icon', u.icon),
        h('div.rc-body', h('div.rc-title', h('b', u.name), h('span.rc-lvl', `${lvl}/${u.max}`)), h('div.small', u.desc)),
        max ? h('span.small.good', 'MAX') : Button(`${def.currencyIcon} ${cost}`, { small: true, variant: st.points >= cost ? 'gold' : 'secondary', disabled: st.points < cost, onClick: () => {
          const r = g.tiers.buy(tier, u.id);
          if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
        } }),
      ));
    }
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', `${def.currencyIcon} Améliorations`), list));
  }
  return wrap;
}

const MOD_NAMES = { goldGain: 'or', materialGain: 'matériaux', essenceGain: 'essence', darkGain: 'essence obscure', crystalGain: 'cristaux', xpGain: 'XP', monsterHp: 'PV des monstres', monsterAtk: 'attaque des monstres', trapDamage: 'dégâts des pièges', bossDamage: 'dégâts contre les boss' };
const RESET_NAMES = { ascensionUpgrades: 'améliorations d’Ascension', masterEssence: 'Essence du Maître', rebirthUpgrades: 'améliorations de Renaissance', transcendenceUpgrades: 'améliorations de Transcendance' };
