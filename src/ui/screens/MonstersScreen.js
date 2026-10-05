import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { Tabs, Stat, Empty } from '../Card.js';
import { MonsterCard, monsterImg } from '../MonsterCard.js';
import { pickMonsters } from './pickers.js';
import { SKILLS } from '../../data/skills.js';
import { PASSIVES } from '../../data/passives.js';
import { ELEMENTS } from '../../data/elements.js';
import { STATUSES } from '../../data/statuses.js';
import { ROOMS } from '../../data/rooms.js';
import { EQUIP_EFFECTS, STAT_NAMES, isPctStat } from '../../data/equipment.js';
import { RARITY_INFO, EQUIP_SLOTS, EQUIP_SLOT_INFO, RARITIES } from '../../utils/constants.js';
import { formatShort, formatNumber } from '../../utils/format.js';
import { ECONOMY } from '../../config/economy.js';

export const MonstersScreen = {
  id: 'monsters',
  title: 'Monstres',
  icon: '👹',
  events: ['monstersChanged', 'equipmentChanged', 'resources'],
  initState: () => ({ tab: 'roster', filter: 'all', slot: 'all' }),
  render(api) {
    const g = ctx.game;
    const st = api.state;
    const wrap = h('div');
    wrap.appendChild(Tabs([
      { id: 'roster', icon: '👹', label: `Bestiaire ${g.state.monsters.length}/${g.monsters.rosterLimit()}` },
      { id: 'equipment', icon: '🗡️', label: `Équipement ${g.state.equipment.length}` },
    ], st.tab, (id) => {
      st.tab = id;
      api.refresh();
    }));
    if (st.tab === 'roster') wrap.appendChild(renderRoster(api));
    else wrap.appendChild(renderInventory(api));
    return wrap;
  },
};

function chips(options, active, onPick) {
  return h('div.chips', options.map((o) => h(`button.chip-btn${o.id === active ? '.active' : ''}`, { type: 'button', onclick: () => { sfx('click'); onPick(o.id); } }, o.label)));
}

function renderRoster(api) {
  const g = ctx.game;
  const st = api.state;
  const wrap = h('div');
  wrap.appendChild(chips([
    { id: 'all', label: 'Tous' }, { id: 'placed', label: '📍 Placés' }, { id: 'free', label: '💤 Réserve' }, { id: 'evolve', label: '🧬 Évolution' },
  ], st.filter, (id) => {
    st.filter = id;
    api.refresh();
  }));
  let list = g.state.monsters.slice();
  if (st.filter === 'placed') list = list.filter((m) => m.location);
  if (st.filter === 'free') list = list.filter((m) => !m.location);
  if (st.filter === 'evolve') list = list.filter((m) => g.monsters.evolutionOptions(m).some((e) => e.ok));
  list.sort((a, b) => g.monsters.power(b) - g.monsters.power(a));
  if (!list.length) {
    wrap.appendChild(Empty('Aucun monstre ici.', '👻'));
  } else {
    wrap.appendChild(h('div.mgrid', list.map((m) => MonsterCard(m, { onClick: () => openMonsterDetail(m.uid) }))));
  }
  wrap.appendChild(h('div.row.center.gap', Button('🌀 Invoquer des monstres', { variant: 'gold', onClick: () => ctx.router.go('Shop') })));
  return wrap;
}

// ------------------------------------------------------------------ fiche monstre
export function openMonsterDetail(uid) {
  const g = ctx.game;
  let entry;
  const build = () => {
    const m = g.monsters.get(uid);
    if (!m) {
      setTimeout(() => entry && ctx.ui.modals.close(entry), 0);
      return h('div');
    }
    const sp = g.monsters.species(m);
    const r = RARITY_INFO[sp.rarity];
    const stats = g.monsters.computeStats(m);
    const maxLvl = g.monsters.maxLevel(m);
    const wrap = h('div.mdetail', { style: { '--rc': r.color } });
    wrap.appendChild(h('div.mdetail-hero',
      h('div.mdetail-portrait', monsterImg(sp.id, 'mdetail-img')),
      h('div.mdetail-info',
        h('div.mdetail-rarity', { style: { color: r.color } }, `${r.name} · ${ELEMENTS[sp.element].icon} ${ELEMENTS[sp.element].name}`),
        h('div.mdetail-lvl', `Niveau ${m.level} / ${maxLvl}`),
        ProgressBar(m.level >= maxLvl ? 1 : m.xp / g.monsters.xpToNext(m), { label: m.level >= maxLvl ? 'MAX' : `XP ${formatShort(m.xp)}/${formatShort(g.monsters.xpToNext(m))}`, color: 'blue' }),
        h('div.small.muted', sp.desc),
        h('div.small', m.location ? `📍 Étage ${m.location.floor + 1} — ${ROOMS[g.dungeon.cell(m.location.floor, m.location.x, m.location.y)?.room]?.name || '?'}` : '💤 En réserve'),
      ),
    ));
    wrap.appendChild(h('div.stats-grid',
      Stat('❤️ PV', formatNumber(stats.hp)),
      Stat('⚔️ Attaque', formatNumber(stats.atk)),
      Stat('🛡️ Défense', formatNumber(stats.def)),
      Stat('💨 Vitesse', stats.spd.toFixed(1)),
      Stat('🎯 Critique', `${Math.round(stats.crit * 100)}%`),
      Stat('💪 Puissance', formatShort(stats.power), 'highlight'),
    ));

    // Traits (V2)
    const traits = g.monsters.traits(m);
    if (traits.length) {
      wrap.appendChild(h('div.trait-row', ...traits.map((t) => h(`div.trait-chip.rarity-${t.rarity}`, { style: { '--rc': RARITY_INFO[t.rarity].color }, title: t.desc, onclick: () => ctx.ui.toasts.show(`${t.name} : ${t.desc}`, { icon: t.icon }) },
        h('span.trait-icon', t.icon), h('span.trait-name', t.name)))));
    }

    // Niveau
    const lv = g.monsters.canLevelUp(m);
    wrap.appendChild(h('div.row.gap.wrap.center',
      Button('Niveau +1', { variant: 'primary', cost: lv.cost || (m.level < maxLvl ? g.monsters.levelUpCost(m) : null), disabled: !lv.ok, onClick: () => {
        const res = g.monsters.levelUp(uid);
        if (!res.ok) ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
      } }),
      Button('+5', { small: true, disabled: !lv.ok, onClick: () => {
        let n = 0;
        for (let i = 0; i < 5; i++) if (g.monsters.levelUp(uid).ok) n++;
        if (n) ctx.ui.toasts.show(`+${n} niveau${n > 1 ? 'x' : ''}`, { icon: '📈', type: 'success' });
      } }),
    ));
    if (!lv.ok && lv.reason) wrap.appendChild(h('div.small.muted.center', lv.reason));

    // Compétences
    const skills = h('div.skills');
    for (const sid of [sp.basic, ...sp.skills]) {
      const sk = SKILLS[sid];
      if (!sk) continue;
      const eff = (sk.statuses || []).map((s) => `${STATUSES[s.id].icon}`).join('');
      skills.appendChild(h('div.skill',
        h('span.skill-icon', sk.icon),
        h('div', h('b', sk.name), h('div.small', sk.desc || (sk.basic ? 'Attaque de base.' : '')), h('div.small.muted', `${sk.cooldown ? `⏱️ ${sk.cooldown}s` : 'Base'}${sk.power ? ` · 💥 ×${sk.power}` : ''}${eff ? ` · ${eff}` : ''}`)),
      ));
    }
    const pas = PASSIVES[sp.passive];
    skills.appendChild(h('div.skill.passive', h('span.skill-icon', '✴️'), h('div', h('b', `Passif : ${pas.name}`), h('div.small', pas.desc))));
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '📜 Compétences'), skills));

    // Équipement
    const slots = h('div.equip-slots');
    for (const slot of EQUIP_SLOTS) {
      const itUid = m.equipment[slot];
      const it = itUid ? g.equipment.get(itUid) : null;
      slots.appendChild(h(`div.equip-slot${it ? '.filled.rarity-' + it.rarity : ''}`, { style: it ? { '--rc': RARITY_INFO[it.rarity].color } : {}, onclick: () => (it ? openItemDetail(it.uid) : pickItem(uid, slot)) },
        h('div.equip-icon', it ? g.equipment.base(it).icon : EQUIP_SLOT_INFO[slot].icon),
        h('div.equip-name', it ? `+${it.level}` : EQUIP_SLOT_INFO[slot].name),
      ));
    }
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '🛡️ Équipement'), slots,
      h('div.row.end', Button('Auto-équiper', { small: true, variant: 'ghost', onClick: () => autoEquip(uid) }))));

    // Évolutions
    const evos = g.monsters.evolutionOptions(m);
    if (evos.length) {
      const list = h('div.evos');
      for (const e of evos) {
        const tr = RARITY_INFO[e.target.rarity];
        list.appendChild(h(`div.evo${e.ok ? '.ready' : ''}`, { style: { '--rc': tr.color } },
          monsterImg(e.target.id, 'evo-img'),
          h('div.evo-body',
            h('div', h('b', e.target.name), h('span.small', { style: { color: tr.color } }, ` · ${tr.name}`)),
            h('div.small', `${ELEMENTS[e.target.element].icon} ${e.target.desc}`),
            e.reasons.length ? h('div.small.bad', e.reasons.join(' · ')) : null,
            CostView(e.cost, { compact: true }),
          ),
          Button('Évoluer', { variant: e.ok ? 'gold' : 'secondary', small: true, disabled: !e.ok, onClick: () => doEvolve(uid, e.to) }),
        ));
      }
      wrap.appendChild(h('div.cell-section', h('div.cell-section-title', `🧬 Évolution${evos.length > 1 ? 's (choisissez une branche)' : ''}`), list));
    } else {
      wrap.appendChild(h('div.small.muted.center', 'Forme finale.'));
    }

    // Actions
    wrap.appendChild(h('div.row.gap.wrap.center',
      m.location ? Button('Retirer du donjon', { small: true, variant: 'ghost', onClick: () => g.monsters.unassign(uid) }) : null,
      Button('Libérer', { small: true, variant: 'danger', onClick: async () => {
        const ok = await ctx.ui.modals.confirm({ title: 'Libérer ce monstre ?', text: `${sp.name} quittera définitivement votre donjon (vous récupérez un peu d’essence). Son équipement est conservé.`, okLabel: 'Libérer', danger: true });
        if (!ok) return;
        const res = g.monsters.release(uid);
        if (!res.ok) ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
        else ctx.ui.modals.close(entry);
      } }),
    ));
    return wrap;
  };
  entry = ctx.ui.modals.open(build(), { title: g.monsters.species(g.monsters.get(uid)).name, icon: '👹', cls: 'modal-wide' });
  const refresh = () => {
    if (ctx.ui.modals.stack.includes(entry)) {
      const top = entry.body.scrollTop;
      ctx.ui.modals.refresh(entry, build());
      entry.body.scrollTop = top;
    }
  };
  const offs = [g.bus.on('monstersChanged', refresh), g.bus.on('equipmentChanged', refresh), g.bus.on('resources', () => {
    clearTimeout(entry._t);
    entry._t = setTimeout(refresh, 250);
  })];
  const prev = entry.onClose;
  entry.onClose = () => {
    offs.forEach((o) => o());
    prev?.();
  };
}

function doEvolve(uid, to) {
  const g = ctx.game;
  const before = g.monsters.species(g.monsters.get(uid));
  const res = g.monsters.evolve(uid, to);
  if (!res.ok) return ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
  const r = RARITY_INFO[res.species.rarity];
  ctx.ui.modals.open(h('div.center.evolve-anim', { style: { '--rc': r.color } },
    h('div.evolve-stage', monsterImg(before.id, 'evolve-from'), h('div.evolve-flash'), monsterImg(res.species.id, 'evolve-to')),
    h('p', `${before.name} a évolué en `, h('b', { style: { color: r.color } }, res.species.name), ' !'),
    Button('Magnifique !', { variant: 'gold', onClick: () => ctx.ui.modals.close() }),
  ), { title: 'Évolution !', icon: '🧬' });
}

function autoEquip(uid) {
  const g = ctx.game;
  const m = g.monsters.get(uid);
  let n = 0;
  for (const slot of EQUIP_SLOTS) {
    const best = g.equipment.bestFreeFor(slot);
    if (!best) continue;
    const cur = m.equipment[slot] ? g.equipment.get(m.equipment[slot]) : null;
    if (!cur || g.equipment.itemPower(best) > g.equipment.itemPower(cur)) {
      g.equipment.equip(best.uid, uid);
      n++;
    }
  }
  ctx.ui.toasts.show(n ? `${n} objet${n > 1 ? 's' : ''} équipé${n > 1 ? 's' : ''}` : 'Aucun meilleur objet disponible', { icon: '🛡️' });
}

function pickItem(monsterUid, slot) {
  const g = ctx.game;
  const items = g.state.equipment.filter((i) => i.slot === slot).sort((a, b) => g.equipment.itemPower(b) - g.equipment.itemPower(a));
  let entry;
  const content = items.length
    ? h('div.item-list', items.map((it) => itemRow(it, () => {
      g.equipment.equip(it.uid, monsterUid);
      ctx.ui.modals.close(entry);
    })))
    : Empty('Aucun objet pour cet emplacement. Les aventuriers vaincus en laissent tomber, et la Boutique en vend !', '🎒');
  entry = ctx.ui.modals.open(content, { title: `${EQUIP_SLOT_INFO[slot].icon} ${EQUIP_SLOT_INFO[slot].name}`, icon: null });
}

// ------------------------------------------------------------------ objets
function statText(stats) {
  return Object.entries(stats).map(([k, v]) => `${STAT_NAMES[k]} ${isPctStat(k) ? `+${Math.round(v * 100)}%` : `+${formatShort(v)}`}`).join(' · ');
}

export function itemRow(it, onClick) {
  const g = ctx.game;
  const base = g.equipment.base(it);
  const r = RARITY_INFO[it.rarity];
  const owner = it.equippedBy ? g.monsters.get(it.equippedBy) : null;
  return h(`div.item-row.rarity-${it.rarity}`, { style: { '--rc': r.color }, onclick: onClick },
    h('div.item-icon', base.icon),
    h('div.item-body',
      h('div', h('b', { style: { color: r.color } }, `${base.name} +${it.level}`), h('span.small.muted', ` · ${r.name}`)),
      h('div.small', statText(g.equipment.itemStats(it))),
      it.effect ? h('div.small.effect', `✴️ ${EQUIP_EFFECTS[it.effect].name} : ${EQUIP_EFFECTS[it.effect].desc}`) : null,
      owner ? h('div.small.muted', `Équipé : ${g.monsters.species(owner).name}`) : null,
    ),
    h('div.item-pow', formatShort(g.equipment.itemPower(it))),
  );
}

function renderInventory(api) {
  const g = ctx.game;
  const st = api.state;
  const wrap = h('div');
  wrap.appendChild(chips([{ id: 'all', label: 'Tous' }, ...EQUIP_SLOTS.map((s) => ({ id: s, label: `${EQUIP_SLOT_INFO[s].icon}` }))], st.slot, (id) => {
    st.slot = id;
    api.refresh();
  }));
  let items = g.state.equipment.slice();
  if (st.slot !== 'all') items = items.filter((i) => i.slot === st.slot);
  items.sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || g.equipment.itemPower(b) - g.equipment.itemPower(a));
  wrap.appendChild(h('div.small.muted', `${g.state.equipment.length}/${ECONOMY.equipment.maxInventory} objets — au-delà, les objets trouvés sont recyclés automatiquement.`));
  if (!items.length) wrap.appendChild(Empty('Aucun équipement. Vaincre des aventuriers en rapporte !', '🎒'));
  else wrap.appendChild(h('div.item-list', items.map((it) => itemRow(it, () => openItemDetail(it.uid)))));
  const commons = g.state.equipment.filter((i) => i.rarity === 'common' && !i.equippedBy && !i.unique);
  if (commons.length) {
    wrap.appendChild(h('div.row.center', Button(`♻️ Recycler ${commons.length} objets communs`, { small: true, variant: 'ghost', onClick: async () => {
      const ok = await ctx.ui.modals.confirm({ title: 'Recycler ?', text: `${commons.length} objets communs non équipés seront recyclés en métal et essence.`, okLabel: 'Recycler' });
      if (ok) {
        const r = g.equipment.recycle(commons.map((c) => c.uid));
        ctx.ui.toasts.show(`Recyclé : +${formatShort(r.gained.metal || 0)} métal`, { icon: '♻️' });
      }
    } })));
  }
  return wrap;
}

export function openItemDetail(itemUid) {
  const g = ctx.game;
  let entry;
  const build = () => {
    const it = g.equipment.get(itemUid);
    if (!it) {
      setTimeout(() => entry && ctx.ui.modals.close(entry), 0);
      return h('div');
    }
    const base = g.equipment.base(it);
    const r = RARITY_INFO[it.rarity];
    const owner = it.equippedBy ? g.monsters.get(it.equippedBy) : null;
    const maxL = g.equipment.maxLevel(it);
    const cands = g.equipment.fuseCandidates(it);
    const wrap = h('div.idetail', { style: { '--rc': r.color } },
      h('div.idetail-head', h('div.idetail-icon', base.icon), h('div', h('div.idetail-name', { style: { color: r.color } }, base.name), h('div.small', `${r.name} · ${EQUIP_SLOT_INFO[it.slot].name} · Niv. ${it.level}/${maxL} · Puissance ${formatShort(g.equipment.itemPower(it))}`))),
      h('div.idetail-stats', statText(g.equipment.itemStats(it))),
      it.effect ? h('div.effect', `✴️ ${EQUIP_EFFECTS[it.effect].name} : ${EQUIP_EFFECTS[it.effect].desc}`) : null,
      h('div.small', owner ? `Équipé sur ${g.monsters.species(owner).name}` : 'Non équipé'),
    );
    const upCost = it.level < maxL ? g.equipment.upgradeCost(it) : null;
    wrap.appendChild(h('div.row.gap.wrap.center',
      Button('Améliorer', { variant: 'primary', small: true, cost: upCost, disabled: !upCost || !g.economy.canAfford(upCost), onClick: () => {
        const res = g.equipment.upgrade(itemUid);
        if (!res.ok) ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
      } }),
      Button(owner ? 'Changer de porteur' : 'Équiper', { small: true, onClick: () => pickMonsters({ title: 'Équiper sur…', onConfirm: ([uid]) => g.equipment.equip(itemUid, uid) }) }),
      owner ? Button('Retirer', { small: true, variant: 'ghost', onClick: () => g.equipment.unequip(itemUid) }) : null,
    ));
    if (!it.unique) {
      const idx = RARITIES.indexOf(it.rarity);
      if (idx < RARITIES.length - 1) {
        wrap.appendChild(h('div.cell-section', h('div.cell-section-title', `🔥 Fusion (${ECONOMY.equipment.fuseCount} → ${RARITY_INFO[RARITIES[idx + 1]].name})`),
          h('div.small', `Objets compatibles (même emplacement et rareté, non équipés) : ${cands.length}`),
          Button('Fusionner', { variant: 'gold', small: true, cost: g.equipment.fuseCost(it.rarity), disabled: cands.length < ECONOMY.equipment.fuseCount - 1 || it.equippedBy, onClick: () => {
            const uids = [itemUid, ...cands.slice(0, ECONOMY.equipment.fuseCount - 1).map((c) => c.uid)];
            const res = g.equipment.fuse(uids);
            if (!res.ok) return ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
            ctx.ui.modals.close(entry);
            if (res.item) openItemDetail(res.item.uid);
            ctx.ui.toasts.show('Fusion réussie !', { icon: '🔥', type: 'gold' });
          } }),
          it.equippedBy ? h('div.small.muted', 'Retirez l’objet pour le fusionner.') : null,
        ));
      }
      wrap.appendChild(h('div.row.center', Button('♻️ Recycler', { small: true, variant: 'danger', onClick: async () => {
        const v = g.equipment.recycleValue(it);
        const ok = await ctx.ui.modals.confirm({ title: 'Recycler ?', text: `Vous obtiendrez : ${Object.entries(v).map(([k, n]) => `${n} ${g.economy.resourceName(k)}`).join(', ')}.`, okLabel: 'Recycler', danger: true });
        if (!ok) return;
        g.equipment.recycle([itemUid]);
        ctx.ui.modals.close(entry);
      } })));
    }
    return wrap;
  };
  entry = ctx.ui.modals.open(build(), { title: 'Équipement', icon: '🗡️' });
  const refresh = () => ctx.ui.modals.stack.includes(entry) && ctx.ui.modals.refresh(entry, build());
  const offs = [g.bus.on('equipmentChanged', refresh), g.bus.on('resources', () => {
    clearTimeout(entry._t);
    entry._t = setTimeout(refresh, 250);
  })];
  entry.onClose = () => offs.forEach((o) => o());
}
