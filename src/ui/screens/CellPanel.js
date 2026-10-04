import { h, clear } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { RoomCard } from '../RoomCard.js';
import { monsterImg } from '../MonsterCard.js';
import { pickMonsters } from './pickers.js';
import { openMonsterDetail } from './MonstersScreen.js';
import { ROOMS, BUILDABLE_ROOMS } from '../../data/rooms.js';
import { TRAPS, TRAP_LIST } from '../../data/traps.js';
import { STATUSES } from '../../data/statuses.js';
import { ELEMENTS } from '../../data/elements.js';
import { BALANCE } from '../../config/balance.js';
import { RARITY_INFO } from '../../utils/constants.js';
import { formatShort, formatPercent } from '../../utils/format.js';

/** Panneau d'une salle (feuille du bas) : infos, monstres, piège, améliorations, actions. */
export function openCellPanel(fi, x, y) {
  const g = ctx.game;
  const container = h('div.cell-panel');
  let off = [];
  const render = () => {
    const cell = g.dungeon.cell(fi, x, y);
    clear(container);
    if (!cell) {
      ctx.ui.closeSheet();
      return;
    }
    container.appendChild(buildContent(fi, x, y, cell, render));
  };
  render();
  off.push(g.bus.on('dungeonChanged', (f) => { if (f === fi) render(); }));
  off.push(g.bus.on('monstersChanged', render));
  off.push(g.bus.on('resources', () => {
    clearTimeout(container._t);
    container._t = setTimeout(render, 300);
  }));
  ctx.ui.openSheet(container, {
    cls: 'sheet-cell',
    onClose: () => {
      off.forEach((u) => u());
      off = [];
      ctx.phaser.scene.getScene('Dungeon')?.clearSelection?.();
    },
  });
}

function buildContent(fi, x, y, cell, rerender) {
  const g = ctx.game;
  const rd = ROOMS[cell.room];
  const wrap = h('div');
  // En-tête
  const lvlTxt = rd.special ? '' : ` · Niv. ${cell.level}`;
  wrap.appendChild(h('div.cell-head',
    h('img.cell-thumb', { src: spriteUrl(`floor_${cell.room}`), alt: '' }),
    h('div.cell-titles', h('div.cell-name', `${rd.icon} ${rd.name}${lvlTxt}`), h('div.cell-desc', rd.desc)),
  ));

  // Bonus
  const bonuses = [];
  if (rd.levelStat) bonuses.push(`${{ hp: '❤️ PV', atk: '⚔️ Attaque', def: '🛡️ Défense' }[rd.levelStat]} des monstres ${formatPercent(BALANCE.roomLevelBonus(cell.level) * (rd.levelStat === 'atk' ? 0.6 : rd.levelStat === 'def' ? 0.8 : 1))}`);
  if (rd.elementBonus) bonuses.push(`${ELEMENTS[rd.elementBonus.element].icon} Monstres ${ELEMENTS[rd.elementBonus.element].name.toLowerCase()} : PV +${Math.round(rd.elementBonus.hp * 100 * (1 + 0.02 * (cell.level - 1)))}%, ATQ +${Math.round(rd.elementBonus.atk * 100 * (1 + 0.02 * (cell.level - 1)))}%`);
  if (rd.onCombat) bonuses.push(`Aventuriers : ${rd.onCombat.map((s) => `${STATUSES[s.id].icon} ${STATUSES[s.id].name}`).join(', ')}`);
  if (rd.allyStatuses) bonuses.push(`Monstres : ${rd.allyStatuses.map((s) => `${STATUSES[s.id].icon} ${STATUSES[s.id].name}`).join(', ')}`);
  if (rd.rewardBonus) bonuses.push(`💰 Récompenses des raids +${Math.round((rd.rewardBonus + (rd.rewardPerLevel || 0) * (cell.level - 1)) * 100)}%`);
  if (rd.production) {
    const lvl = Math.pow(1.15, cell.level - 1) * (1 + fi * 0.5) * (1 + (g.mods.get().productionGain || 0));
    bonuses.push(`⛏️ Production : ${Object.entries(rd.production).map(([k, v]) => `+${formatShort(v * lvl)} ${g.economy.resourceName(k)}/min`).join(', ')}`);
  }
  if (rd.perk === 'evolution') bonuses.push('🧬 Permet les évolutions · -10% coût des niveaux');
  if (rd.perk === 'forge') bonuses.push('🔨 -20% coût d’amélioration des équipements');
  if (cell.room === 'core') bonuses.push('🎯 Les aventuriers qui l’atteignent volent une partie du Trésor.');
  if (cell.room === 'entrance') bonuses.push('🚪 Les groupes d’aventuriers arrivent ici.');
  const nextMs = (rd.milestones || []).find((m) => m.level > cell.level);
  if (nextMs) bonuses.push(`🎯 Niveau ${nextMs.level} : ${nextMs.desc}`);
  if (bonuses.length) wrap.appendChild(h('ul.bonus-list', bonuses.map((b) => h('li', b))));

  // Monstres
  const cap = g.dungeon.roomCapacity(cell);
  if (cap > 0) {
    const occupants = g.monsters.monstersAt(fi, x, y);
    const row = h('div.occupants');
    for (const m of occupants) {
      const sp = g.monsters.species(m);
      row.appendChild(h(`div.occupant.rarity-${sp.rarity}`, { style: { '--rc': RARITY_INFO[sp.rarity].color }, onclick: () => openMonsterDetail(m.uid) },
        monsterImg(sp.id, 'occ-img'),
        h('div.occ-name', sp.name),
        h('div.occ-lvl', `Niv. ${m.level}`),
        h('button.occ-remove', { type: 'button', 'aria-label': 'Retirer', onclick: (e) => { e.stopPropagation(); sfx('click'); g.monsters.unassign(m.uid); } }, '✕'),
      ));
    }
    for (let i = occupants.length; i < cap; i++) {
      row.appendChild(h('div.occupant.empty-slot', {
        onclick: () => pickMonsters({
          title: `Placer dans : ${rd.name}`,
          sort: 'free',
          filter: (m) => !!g.monsters.species(m).guardian === !!rd.guardianOnly && !(m.location && m.location.floor === fi && m.location.x === x && m.location.y === y),
          onConfirm: ([uid]) => {
            const r = g.monsters.assign(uid, fi, x, y);
            if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
            else sfx('equip');
          },
        }),
      }, h('div.plus', '＋'), h('div.occ-name', rd.guardianOnly ? 'Placer un gardien' : 'Placer un monstre')));
    }
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', `👹 Monstres ${occupants.length}/${cap}`), row));
  }

  // Piège
  if (rd.trapSlots) {
    const sec = h('div.cell-section', h('div.cell-section-title', '🧨 Piège'));
    if (cell.trap) {
      const t = TRAPS[cell.trap.id];
      const unit = g.traps.trapUnit(fi, x, y);
      const syn = unit.synergies;
      sec.appendChild(h('div.trap-info',
        h('img.trap-img', { src: spriteUrl(`trap_${t.id}`), alt: '' }),
        h('div',
          h('div', h('b', `${t.name} · Niv. ${cell.trap.level}`)),
          h('div.small', `💥 ${formatShort(unit.damage)} dégâts · ⏱️ ${unit.cooldown.toFixed(1)}s · 🎯 ${t.range >= 99 ? 'tout le groupe' : t.range + ' cible' + (t.range > 1 ? 's' : '')}`),
          t.effect ? h('div.small', `Effet : ${STATUSES[t.effect.id].icon} ${STATUSES[t.effect.id].name} (${Math.round((t.effect.chance ?? 1) * 100)}%)`) : null,
          syn.length ? h('div.synergies', syn.map((s) => h('span.syn-chip', `${s.icon} ${s.name}`))) : h('div.small.muted', 'Aucune synergie. Placez des éléments complémentaires à côté !'),
        ),
      ));
      const up = g.traps.canUpgrade(fi, x, y);
      sec.appendChild(h('div.row.gap.wrap',
        Button('Améliorer', { variant: 'primary', small: true, cost: up.cost || g.traps.upgradeCost(fi, cell.trap), disabled: !up.ok, onClick: () => feedback(g.traps.upgrade(fi, x, y), 'Piège amélioré !') }),
        Button('Retirer', { variant: 'ghost', small: true, onClick: () => feedback(g.traps.remove(fi, x, y), 'Piège retiré (remboursé à 50%)') }),
      ));
    } else {
      const grid = h('div.palette-grid.small-grid');
      for (const t of TRAP_LIST) {
        const unlocked = g.traps.isUnlocked(t.id);
        grid.appendChild(RoomCard({
          id: t.id, name: t.name, icon: t.icon, texture: `trap_${t.id}`, cost: g.traps.placeCost(fi, t.id),
          locked: !unlocked, lockText: g.traps.unlockText(t.id),
          onClick: () => {
            if (!unlocked) return ctx.ui.toasts.show(g.traps.unlockText(t.id), { icon: '🔒' });
            feedback(g.traps.place(fi, x, y, t.id), `${t.name} installé !`);
          },
        }));
      }
      sec.appendChild(grid);
    }
    wrap.appendChild(sec);
  }

  // Actions de salle
  if (!rd.special) {
    const up = g.dungeon.canUpgrade(fi, x, y);
    const actions = h('div.cell-actions',
      Button(`Améliorer → ${cell.level + 1}`, { variant: 'primary', cost: up.cost || g.dungeon.upgradeCost(fi, cell), disabled: !up.ok, onClick: () => feedback(g.dungeon.upgrade(fi, x, y), 'Salle améliorée !') }),
      h('div.row.gap.wrap',
        Button('Déplacer', { small: true, icon: '↔️', onClick: () => { ctx.ui.closeSheet(); g.bus.emit('hud:move', { x, y }); ctx.ui.toasts.show('Touchez une case bleue pour déplacer la salle.', { icon: '↔️' }); } }),
        Button('Transformer', { small: true, icon: '🔄', onClick: () => openChange(fi, x, y) }),
        Button('Détruire', { small: true, icon: '💥', variant: 'danger', onClick: async () => {
          const c = g.dungeon.canRemove(fi, x, y);
          if (!c.ok) return ctx.ui.toasts.show(c.reason, { icon: '⛔', type: 'error' });
          const ok = await ctx.ui.modals.confirm({ title: 'Détruire la salle ?', text: `${rd.name} sera détruite. Remboursement : 50% du coût.`, okLabel: 'Détruire', danger: true, icon: '💥' });
          if (ok) feedback(g.dungeon.remove(fi, x, y), 'Salle détruite');
        } }),
      ),
    );
    wrap.appendChild(actions);
  } else if (cell.room === 'core') {
    wrap.appendChild(h('div.row.gap', Button('Déplacer le coffre', { small: true, icon: '↔️', onClick: () => { ctx.ui.closeSheet(); g.bus.emit('hud:move', { x, y }); } })));
  }
  return wrap;
}

function feedback(res, okText) {
  if (res.ok) ctx.ui.toasts.show(okText, { icon: '✅', type: 'success', duration: 1400 });
  else {
    sfx('error');
    ctx.ui.toasts.show(res.reason || 'Impossible', { icon: '⛔', type: 'error' });
  }
}

function openChange(fi, x, y) {
  const g = ctx.game;
  const entry = ctx.ui.modals.open(() => h('div.palette-grid', BUILDABLE_ROOMS.filter((r) => g.dungeon.isRoomUnlocked(r.id)).map((r) => {
    const c = g.dungeon.canChange(fi, x, y, r.id);
    return RoomCard({
      id: r.id, name: r.name, icon: r.icon, texture: `floor_${r.id}`, cost: c.cost,
      locked: !c.ok && !c.cost, lockText: c.reason,
      onClick: () => {
        const res = g.dungeon.change(fi, x, y, r.id);
        feedback(res, `Transformée en ${r.name}`);
        if (res.ok) ctx.ui.modals.close(entry);
      },
    });
  })), { title: 'Transformer la salle (garde son niveau)', icon: '🔄', cls: 'modal-wide' });
}

function spriteUrl(key) {
  return SpriteFactory.url(key);
}
