import { h, vibrate } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { Tabs } from '../Card.js';
import { monsterImg } from '../MonsterCard.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { CHESTS, CHEST_IDS, CHEST_SHOP } from '../../data/chests.js';
import { SKINS, SKIN_IDS, DECORATIONS, DECORATION_IDS } from '../../data/cosmetics.js';
import { MONSTER_MAP } from '../../data/monsters.js';
import { EQUIPMENT_BASES, UNIQUE_ARTIFACTS } from '../../data/equipment.js';
import { RARITY_INFO } from '../../utils/constants.js';

/** Collection (V2) : coffres, skins, décorations. */
export const CollectionScreen = {
  id: 'collection',
  title: 'Collection',
  icon: '🎁',
  events: ['collectionChanged', 'resources'],
  initState: () => ({ tab: 'chests' }),
  render(api) {
    const g = ctx.game;
    const c = g.state.collection;
    const wrap = h('div.collection');
    wrap.appendChild(Tabs([
      { id: 'chests', icon: '🎁', label: 'Coffres', badge: g.collection.totalChests() },
      { id: 'skins', icon: '🎨', label: 'Skins' },
      { id: 'decor', icon: '🏺', label: 'Décorations' },
    ], api.state.tab, (id) => {
      api.state.tab = id;
      api.refresh();
    }));
    if (api.state.tab === 'chests') {
      if (c.serums) wrap.appendChild(h('div.small.center', `🧪 ${c.serums} sérum${c.serums > 1 ? 's' : ''} de mutation (utilisables dans la fiche d’un monstre)`));
      const grid = h('div.chest-grid');
      for (const id of CHEST_IDS) {
        const def = CHESTS[id];
        const n = c.chests[id] || 0;
        const shop = CHEST_SHOP[id];
        grid.appendChild(h(`div.chest-card${n ? '.has' : ''}`, { style: { '--rc': def.color } },
          h('img.chest-img', { src: SpriteFactory.url(`chest_${id}`), alt: '' }),
          h('div.chest-name', def.name),
          h('div.chest-count', `×${n}`),
          n ? Button('Ouvrir', { variant: 'gold', small: true, sound: null, onClick: () => openChest(id) }) : null,
          shop ? Button('Acheter', { small: true, cost: shop.cost, disabled: !g.collection.canBuy(id).ok, onClick: () => {
            const r = g.collection.buy(id);
            if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
            else ctx.ui.toasts.show(`${def.name} acheté !`, { icon: def.icon, type: 'success' });
          } }) : null,
        ));
      }
      wrap.appendChild(grid);
      wrap.appendChild(h('p.small.muted.center', 'Coffres gagnés : boss vaincus, modes de jeu, défi du jour, niveaux du Maître, saisons.'));
    } else if (api.state.tab === 'skins') {
      wrap.appendChild(h('p.small.muted', 'Un style débloqué s’applique à n’importe quel monstre (fiche du monstre). Purement cosmétique.'));
      const grid = h('div.skin-grid');
      const sample = g.state.monsters[0]?.speciesId || 'goblin';
      for (const id of SKIN_IDS) {
        const s = SKINS[id];
        const owned = g.collection.hasSkin(id);
        const r = RARITY_INFO[s.rarity];
        grid.appendChild(h(`div.skin-card${owned ? '' : '.locked'}`, { style: { '--rc': r.color } },
          monsterImg(sample, `skin-img${owned ? '' : '.silhouette'}`, id),
          h('b', owned ? `${s.icon} ${s.name}` : '???'),
          h('div.small', { style: { color: r.color } }, r.name),
        ));
      }
      wrap.appendChild(grid);
    } else {
      wrap.appendChild(h('p.small.muted', 'Touchez une salle du donjon puis « Décorer » pour poser une décoration. Purement cosmétique.'));
      const grid = h('div.skin-grid');
      for (const id of DECORATION_IDS) {
        const d = DECORATIONS[id];
        const n = c.decorations[id] || 0;
        const r = RARITY_INFO[d.rarity];
        grid.appendChild(h(`div.skin-card${n ? '' : '.locked'}`, { style: { '--rc': r.color } },
          h(`img.decor-img${n ? '' : '.silhouette'}`, { src: SpriteFactory.url(`decor_${id}`), alt: '' }),
          h('b', n ? d.name : '???'),
          h('div.small', n ? `×${n} · ${g.collection.decorationsUsed(id)} posée(s)` : r.name),
        ));
      }
      wrap.appendChild(grid);
    }
    return wrap;
  },
};

function itemView(it) {
  const g = ctx.game;
  const r = RARITY_INFO[it.rarity] || RARITY_INFO.common;
  let img = null;
  let label = '';
  let sub = r.name;
  switch (it.type) {
    case 'monster':
      img = monsterImg(it.id, 'loot-img');
      label = MONSTER_MAP[it.id].name;
      if (it.isNew) sub = `NOUVEAU · ${r.name}`;
      break;
    case 'equipment': {
      const base = EQUIPMENT_BASES.find((b) => b.id === it.baseId) || UNIQUE_ARTIFACTS[it.baseId];
      img = h('div.loot-emoji', base?.icon || '🗡️');
      label = base?.name || 'Équipement';
      break;
    }
    case 'serum':
      img = h('div.loot-emoji', '🧪');
      label = 'Sérum de mutation';
      break;
    case 'skin':
      img = monsterImg(g.state.monsters[0]?.speciesId || 'goblin', 'loot-img', it.id);
      label = `Skin ${SKINS[it.id].name}`;
      break;
    case 'decoration':
      img = h('img.loot-img', { src: SpriteFactory.url(`decor_${it.id}`), alt: '' });
      label = DECORATIONS[it.id].name;
      break;
    default:
      img = h('div.loot-emoji', it.duplicate ? '♻️' : '💰');
      label = it.duplicate ? 'Doublon converti' : 'Ressources';
      sub = null;
  }
  return h(`div.loot-item.rarity-${it.rarity}`, { style: { '--rc': r.color } },
    img, h('b', label), sub ? h('div.small', { style: { color: r.color } }, sub) : null,
    it.res ? CostView(it.res, { gain: true, compact: true }) : null);
}

/** Ouverture animée : le coffre tremble, s'ouvre dans un éclair, puis les récompenses apparaissent une à une. */
export function openChest(rarity) {
  const g = ctx.game;
  const res = g.collection.open(rarity);
  if (!res.ok) return ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
  const def = CHESTS[rarity];
  const loot = h('div.loot-list');
  const chest = h('img.chest-open-img', { src: SpriteFactory.url(`chest_${rarity}`), alt: '' });
  const stage = h('div.chest-stage', { style: { '--rc': def.color } }, h('div.chest-rays'), chest, h('div.chest-flash'));
  const again = (g.state.collection.chests[rarity] || 0) > 0;
  const foot = h('div.row.gap.center.chest-foot',
    again ? Button('Ouvrir un autre', { variant: 'gold', small: true, sound: null, onClick: () => { ctx.ui.modals.close(entry); openChest(rarity); } }) : null,
    Button('Super !', { variant: 'primary', small: true, onClick: () => ctx.ui.modals.close(entry) }),
  );
  const entry = ctx.ui.modals.open(h('div.chest-open', stage, loot, foot), { title: def.name, icon: def.icon });
  sfx('chest');
  vibrate(30);
  setTimeout(() => {
    stage.classList.add('opened');
    sfx('levelup');
    res.items.forEach((it, i) => setTimeout(() => {
      loot.appendChild(itemView(it));
      sfx(['legendary', 'mythic', 'ancient'].includes(it.rarity) ? 'evolve' : 'coins');
    }, 350 + i * 320));
    setTimeout(() => foot.classList.add('show'), 350 + res.items.length * 320);
  }, 900);
}
