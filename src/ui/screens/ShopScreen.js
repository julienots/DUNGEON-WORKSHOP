import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { monsterImg } from '../MonsterCard.js';
import { openMonsterDetail, openItemDetail, itemRow } from './MonstersScreen.js';
import { ECONOMY } from '../../config/economy.js';
import { RARITY_INFO } from '../../utils/constants.js';
import { formatTime } from '../../utils/format.js';

/** Boutique 100% hors ligne : portails, coffres, échanges. Aucun achat réel. */
export const ShopScreen = {
  id: 'shop',
  title: 'Boutique',
  icon: '🛒',
  events: ['resources', 'monstersChanged'],
  tick(api) {
    const el = api.body.querySelector('.free-timer');
    if (el) {
      const left = (ctx.game.shop.freeChestReadyAt() - Date.now()) / 1000;
      if (left <= 0) api.refresh();
      else el.textContent = `Prochain coffre dans ${formatTime(left)}`;
    }
  },
  render() {
    const g = ctx.game;
    const wrap = h('div.shop');
    const nChests = g.collection.totalChests();
    wrap.appendChild(h('button.collection-banner', { type: 'button', onclick: () => { sfx('click'); ctx.router.go('Collection'); } },
      h('span.cb-icon', '🎁'), h('div', h('b', 'Coffres & Collection'), h('div.small', nChests ? `${nChests} coffre${nChests > 1 ? 's' : ''} à ouvrir !` : 'Coffres rares à anciens, skins, décorations')), h('span', '›')));
    // Coffre gratuit
    const ready = Date.now() >= g.shop.freeChestReadyAt();
    wrap.appendChild(h(`div.shop-card.free${ready ? '.ready' : ''}`,
      h('div.shop-art', '🎁'),
      h('div.shop-body', h('b', 'Coffre du Maître (gratuit)'), h('div.small', `Toutes les ${ECONOMY.shop.freeChestCooldownHours}h : or, essence, cristaux, parfois un objet.`), ready ? null : h('div.small.free-timer', '')),
      Button(ready ? 'Ouvrir' : 'Bientôt', { variant: ready ? 'gold' : 'secondary', disabled: !ready, sound: null, onClick: () => {
        const r = g.shop.openFreeChest();
        if (!r.ok) return;
        ctx.ui.modals.open(h('div.center', h('div.big-emoji.bounce', '🎁'), CostView(r.loot, { gain: true }), r.item ? itemRow(r.item, () => openItemDetail(r.item.uid)) : null,
          Button('Super !', { variant: 'primary', onClick: () => ctx.ui.modals.close() })), { title: 'Coffre ouvert !', icon: '🎁' });
      } }),
    ));
    // Portails
    wrap.appendChild(h('h3.section-title', '🌀 Portails d’invocation'));
    const portals = [
      ['basic', '🟢', 'Monstres communs (et parfois rares). Le prix augmente un peu à chaque invocation.'],
      ['advanced', '🔵', 'Rares, épiques et parfois légendaires !'],
      ['advanced10', '🟣', '10 invocations, au moins un épique garanti.'],
      ['dark', '⚫', 'Légendaires et mythiques. Nécessite la recherche « Portails dimensionnels ».'],
    ];
    for (const [type, dot, desc] of portals) {
      const def = ECONOMY.shop.summons[type];
      const unlocked = g.shop.isPortalUnlocked(type);
      const cost = g.shop.summonCost(type);
      const odds = g.shop.rarityWeights(def.pool);
      const total = Object.values(odds).reduce((a, b) => a + b, 0);
      const oddsText = Object.entries(odds).filter(([, v]) => v > 0).map(([k, v]) => `${RARITY_INFO[k].name} ${((v / total) * 100).toFixed(v / total < 0.01 ? 2 : 0)}%`).join(' · ');
      wrap.appendChild(h(`div.shop-card.portal-${type}${unlocked ? '' : '.locked'}`,
        h('div.shop-art.portal', dot),
        h('div.shop-body', h('b', def.name), h('div.small', desc), h('div.small.muted', oddsText)),
        Button(unlocked ? 'Invoquer' : '🔒', { variant: 'primary', cost: unlocked ? cost : null, disabled: !unlocked || !g.economy.canAfford(cost), sound: null, onClick: () => doSummon(type) }),
      ));
    }
    // Armurerie
    const ec = g.shop.equipmentChestCost();
    wrap.appendChild(h('h3.section-title', '🗡️ Armurerie'));
    wrap.appendChild(h('div.shop-card',
      h('div.shop-art', '🧰'),
      h('div.shop-body', h('b', ECONOMY.shop.equipmentChest.name), h('div.small', 'Un équipement aléatoire adapté à votre profondeur.')),
      Button('Ouvrir', { variant: 'primary', cost: ec, disabled: !g.economy.canAfford(ec), sound: null, onClick: () => {
        const r = g.shop.openEquipmentChest();
        if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
        ctx.ui.modals.open(h('div.center', h('div.big-emoji.bounce', '🧰'), itemRow(r.item, () => openItemDetail(r.item.uid)), Button('OK', { variant: 'primary', onClick: () => ctx.ui.modals.close() })), { title: 'Nouvel équipement', icon: '🗡️' });
      } }),
    ));
    // Échanges
    wrap.appendChild(h('h3.section-title', '⚖️ Marché noir'));
    for (const ex of ECONOMY.shop.exchanges) {
      const deal = g.shop.exchangeDeal(ex);
      const locked = ex.minFloor && g.state.floors.length < ex.minFloor;
      wrap.appendChild(h('div.shop-card.exchange',
        h('div.shop-body', h('b', ex.name), h('div.exchange-line', CostView(deal.give, { compact: true }), h('span', ' → '), CostView(deal.get, { gain: true, compact: true })), locked ? h('div.small.muted', `🔒 Étage ${ex.minFloor}`) : null),
        Button('Échanger', { small: true, disabled: locked || !g.economy.canAfford(deal.give), onClick: () => {
          const r = g.shop.exchange(ex.id);
          if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
          else ctx.ui.toasts.show('Échange effectué', { icon: '⚖️', type: 'success' });
        } }),
      ));
    }
    wrap.appendChild(h('p.small.muted.center', 'Aucun achat réel : tout s’obtient en jouant, même sans connexion.'));
    return wrap;
  },
};

function doSummon(type) {
  const g = ctx.game;
  const r = g.shop.summon(type);
  if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
  const cards = r.results.map((x, i) => {
    const sp = g.monsters.species(x.monster);
    const rr = RARITY_INFO[sp.rarity];
    return h(`div.summon-card.rarity-${sp.rarity}`, { style: { '--rc': rr.color, animationDelay: `${i * 0.12}s` }, onclick: () => { ctx.ui.modals.closeAll(); openMonsterDetail(x.monster.uid); } },
      h('div.summon-glow'),
      monsterImg(sp.id, 'summon-img'),
      h('div.summon-name', sp.name),
      h('div.summon-rarity', { style: { color: rr.color } }, rr.name),
      x.isNew ? h('div.summon-new', 'NOUVEAU') : null,
    );
  });
  ctx.ui.modals.open(h('div.summon-result', h('div.summon-grid', cards), h('div.row.center.gap',
    Button('Encore !', { variant: 'primary', onClick: () => { ctx.ui.modals.close(); doSummon(type); } }),
    Button('Fermer', { variant: 'ghost', onClick: () => ctx.ui.modals.close() }),
  )), { title: 'Invocation !', icon: '🌀', cls: 'modal-wide' });
}
