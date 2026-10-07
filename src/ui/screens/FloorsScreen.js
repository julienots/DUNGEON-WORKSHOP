import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { pickMonsters, teamPowerInfo } from './pickers.js';
import { BOSS_TEAM_SIZE } from '../../systems/BossSystem.js';
import { floorDef } from '../../data/floors.js';
import { BOSS_LIST } from '../../data/bosses.js';
import { ELEMENTS } from '../../data/elements.js';
import { BIOMES, BIOME_IDS, biomeChangeCost } from '../../data/biomes.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { formatShort } from '../../utils/format.js';

/** Liste des étages, déblocage du suivant, gardiens (boss). */
export function showFloors() {
  const g = ctx.game;
  let entry;
  const build = () => {
    const wrap = h('div.floors');
    // Étage suivant
    const next = g.dungeon.nextFloorInfo();
    const nd = floorDef(next.number);
    wrap.appendChild(h('div.next-floor',
      h('div.next-floor-title', `⬇️ Étage ${next.number} — ${nd.tierName}`),
      next.reconquest ? h('div.small.good', '♻️ Reconquête : étage déjà atteint, 4× moins de raids exigés') : null,
      next.reasons.length ? h('ul.req-list', next.reasons.map((r) => h('li', r))) : h('div.small.good', '✓ Conditions remplies'),
      h('div.row.gap.wrap',
        Button('Creuser l’étage', {
          variant: next.ok ? 'gold' : 'secondary', cost: next.cost, disabled: !next.ok,
          onClick: () => {
            const r = g.dungeon.unlockNextFloor();
            if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
            ctx.ui.modals.close(entry);
            g.setViewFloor(r.floor);
            ctx.ui.toasts.show(`Étage ${r.floor + 1} creusé ! Construisez ses défenses.`, { icon: '⛏️', type: 'gold', duration: 3500 });
          },
        }),
      ),
    ));
    // Gardien bloquant
    const gate = g.bosses.floorBosses().filter((b) => !b.defeated || b.repeatAvailable);
    for (const b of g.bosses.floorBosses()) wrap.appendChild(bossCard(b, () => ctx.ui.modals.close(entry)));
    const arena = g.bosses.arenaBosses();
    if (arena.length) {
      wrap.appendChild(h('h3.section-title', '🏟️ Arène des boss'));
      for (const b of arena) wrap.appendChild(bossCard(b, () => ctx.ui.modals.close(entry)));
    }
    if (!gate.length && !g.bosses.floorBosses().length) {
      const upcoming = BOSS_LIST.map((b) => b.floor).sort((a, b) => a - b).find((n) => n > g.state.floors.length);
      if (upcoming) wrap.appendChild(h('div.muted.small.center', `👑 Prochain gardien à l’étage ${upcoming}.`));
    }
    // Étages
    const list = h('div.floor-list');
    g.state.floors.forEach((f, i) => {
      const d = floorDef(i + 1);
      const monsters = g.state.monsters.filter((m) => m.location?.floor === i).length;
      const rooms = Object.keys(f.cells).length;
      const total = f.raidsDefended + f.raidsLost;
      list.appendChild(h(`div.floor-card${i === g.viewFloor ? '.current' : ''}`, {
        onclick: () => {
          sfx('click');
          g.setViewFloor(i);
          ctx.ui.modals.close(entry);
          if (ctx.router.current !== 'Dungeon') ctx.router.go('Dungeon');
        },
      },
      h('div.floor-card-num', String(i + 1)),
      h('div.floor-card-body',
        h('div.floor-card-title', `${d.tierName}`),
        h('div.small', `🏠 ${rooms} salles · 👹 ${monsters} · 🛡️ ${f.raidsDefended}/${total} raids`),
        h('div.small', `Menace ${f.threat}/${d.maxThreat} · Aventuriers niv. ~${g.adventurers.partyLevel(i + 1, f.threat)}`),
        h('div.small.biome-line', `${g.biomes.get(i).icon} ${g.biomes.get(i).name}`, h('button.biome-change', { type: 'button', onclick: (e) => { e.stopPropagation(); showBiomePicker(i, () => ctx.ui.modals.refresh(entry, build())); } }, 'Changer')),
        ProgressBar(f.threat / d.maxThreat, { color: 'red', height: 6 }),
        !monsters && rooms > 1 ? h('div.small.floor-warn', '⚠️ Aucun monstre : les pièges seuls ne peuvent pas achever les aventuriers') : null,
      ),
      h('div.floor-card-go', i === g.viewFloor ? '👁️' : '›'),
      ));
    });
    wrap.appendChild(list);
    wrap.appendChild(h('p.muted.small', 'La menace monte à chaque victoire : les aventuriers deviennent plus forts… et rapportent plus.'));
    return wrap;
  };
  entry = ctx.ui.modals.open(build(), { title: 'Étages du donjon', icon: '🏰', cls: 'modal-wide' });
}

export function bossCard(b, onClose) {
  const g = ctx.game;
  const rec = g.bosses.recommendedPower(b);
  const status = b.arena ? (b.available ? 'Arène : un combat récompensé par jour' : 'Arène : revenez demain') : b.event ? (b.available ? 'Disponible aujourd’hui' : 'Revenez demain') : b.defeated ? (b.repeatAvailable ? 'Vaincu · récompense quotidienne disponible' : 'Vaincu · revenez demain') : `Garde l’accès à l’étage ${b.floor + 1}`;
  const can = b.event || b.arena ? b.available : !b.defeated || b.repeatAvailable;
  const reward = b.event || b.arena ? (b.firstDone ? b.boss.rewards.repeat : b.boss.rewards.first) : b.defeated ? b.boss.rewards.repeat : b.boss.rewards.first;
  const res = Object.fromEntries(Object.entries(reward).filter(([k]) => !['artifact', 'species'].includes(k)));
  return h(`div.boss-card${can ? '' : '.done'}`,
    h('img.boss-img', { src: SpriteFactory.url(`boss_${b.boss.id}`), alt: '' }),
    h('div.boss-body',
      h('div.boss-name', `${b.boss.icon} ${b.boss.name}${b.tier ? ' éveillé' : ''} · niv. ${b.level}`),
      h('div.small', `${ELEMENTS[b.boss.element].icon} ${b.boss.desc}`),
      h('div.small.muted', status),
      h('div.small', `${b.boss.phases.length + 1} phases · Puissance recommandée ${formatShort(rec)}`),
      h('div.boss-rewards', CostView(res, { gain: true }), reward.artifact ? h('span.chip', '🔮 Artefact unique') : null, reward.species ? h('span.chip', '🥚 Monstre') : null, !b.defeated && b.boss.guardian ? h('span.chip', '👑 Gardien') : null),
      can ? Button('Affronter', { variant: 'danger', small: true, onClick: () => startBossFight(b, onClose) }) : null,
    ),
  );
}

export function startBossFight(b, onClose) {
  const g = ctx.game;
  const rec = g.bosses.recommendedPower(b);
  const best = g.state.monsters.filter((m) => !g.monsters.species(m).guardian || true).sort((a, c) => g.monsters.power(c) - g.monsters.power(a)).slice(0, BOSS_TEAM_SIZE).map((m) => m.uid);
  pickMonsters({
    title: `Équipe contre ${b.boss.name}`,
    multi: true,
    max: BOSS_TEAM_SIZE,
    preselected: best,
    confirmLabel: '⚔️ Combattre',
    info: teamPowerInfo(rec),
    onConfirm: (uids) => {
      const result = g.bosses.fight(b.key, uids);
      if (!result.ok) return ctx.ui.toasts.show(result.reason, { icon: '⛔', type: 'error' });
      onClose?.();
      ctx.ui.modals.closeAll();
      ctx.router.openBattle({ mode: 'boss', result, floor: b.floor ? b.floor - 1 : g.viewFloor });
    },
  });
}

/** Fenêtre de résultat d'un combat de boss. */
export function showBossResult(result, onClose) {
  const g = ctx.game;
  const items = [];
  if (result.win) {
    const gr = result.granted || {};
    if (gr.resources) items.push(CostView(gr.resources, { gain: true }));
    if (gr.artifact) items.push(h('div.reward-line', `🔮 Artefact unique : ${g.equipment.base(gr.artifact).name}`));
    if (gr.monster) items.push(h('div.reward-line', `🥚 Nouveau monstre : ${g.monsters.species(gr.monster).name}`));
    if (gr.guardian) items.push(h('div.reward-line', `👑 Gardien obtenu : ${g.monsters.species(gr.guardian).name} (placez-le dans un Antre du gardien)`));
    if (result.first && !result.entry.event && result.entry.floor) items.push(h('div.reward-line.good', `⬇️ L’accès à l’étage ${result.entry.floor + 1} est ouvert !`));
  }
  items.push(h('div.small.muted', `Vos monstres gagnent ${formatShort(result.xp)} XP.`));
  ctx.ui.modals.open(h('div.center',
    h('img.boss-result-img', { src: SpriteFactory.url(`boss_${result.boss.id}`), alt: '' }),
    h('p', result.win ? `${result.boss.name} est vaincu !` : `${result.boss.name} a repoussé votre équipe. Renforcez vos monstres et réessayez !`),
    ...items,
    Button('Continuer', { variant: 'primary', block: true, onClick: () => ctx.ui.modals.close() }),
  ), { title: result.win ? 'Victoire !' : 'Défaite…', icon: result.win ? '🏆' : '💀', onClose });
}

/** Choix du biome d'un étage (V2). */
export function showBiomePicker(fi, onDone) {
  const g = ctx.game;
  let entry;
  const build = () => {
    const wrap = h('div.choice-list');
    const unlocked = g.biomes.unlocked();
    const cost = biomeChangeCost(fi + 1);
    if (!cost.dimensionalFragments) delete cost.dimensionalFragments;
    wrap.appendChild(h('p.small', 'Chaque biome change les règles de l’étage : élément favorisé (affinité +10 % pour vos monstres de cet élément), production, butin et effets spéciaux.'));
    for (const id of BIOME_IDS) {
      const b = BIOMES[id];
      const cur = g.biomes.id(fi) === id;
      const lock = !unlocked.includes(id);
      wrap.appendChild(h(`button.choice-card${cur ? '.selected' : ''}${lock ? '.locked' : ''}`, {
        type: 'button',
        onclick: () => {
          if (cur) return;
          if (lock) return ctx.ui.toasts.show(`Atteignez l’étage ${b.unlockFloor} pour ce biome.`, { icon: '🔒' });
          const r = g.biomes.change(fi, id);
          if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
          sfx('unlock');
          ctx.ui.toasts.show(`Étage ${fi + 1} : ${b.icon} ${b.name}`, { icon: '🗺️', type: 'success' });
          ctx.ui.modals.close(entry);
          onDone?.();
        },
      },
      h('div.choice-icon', lock ? '🔒' : b.icon),
      h('div.choice-body', h('b', `${b.name}${cur ? ' (actuel)' : ''}`), h('div.small', `${ELEMENTS[b.element].icon} ${ELEMENTS[b.element].name} · ${b.desc}`), lock ? h('div.small.muted', `Étage ${b.unlockFloor} requis`) : null),
      ));
    }
    wrap.appendChild(h('div.small.muted.center', h('span', 'Coût du changement : '), CostView(cost, { compact: true })));
    return wrap;
  };
  entry = ctx.ui.modals.open(build(), { title: `Biome de l’étage ${fi + 1}`, icon: '🗺️', cls: 'modal-wide' });
}
