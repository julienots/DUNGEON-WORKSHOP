import { h } from './dom.js';
import { ctx } from './context.js';
import { Button } from './Button.js';
import { MONSTERS } from '../data/monsters.js';
import { BIOME_IDS, BIOMES } from '../data/biomes.js';
import { CHEST_IDS } from '../data/chests.js';
import { RUN_MODE_IDS, MODES } from '../data/modes.js';
import { createFloorState } from '../core/GameState.js';
import { RESOURCE_KEYS } from '../utils/constants.js';

/**
 * MODE DÉVELOPPEUR (V2) — désactivé par défaut, jamais visible pour un joueur normal.
 * Activation : ouvrir le jeu avec `?debug=1` dans l'adresse.
 */
export function isDebugEnabled() {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

export function installDebugPanel() {
  if (!isDebugEnabled()) return;
  const btn = h('button.debug-fab', { type: 'button', 'aria-label': 'Debug', onclick: () => openDebug() }, '🐞');
  document.body.appendChild(btn);
  window.__DW_DEBUG = true;
}

function act(label, fn, variant = 'secondary') {
  return Button(label, { small: true, variant, onClick: () => {
    try {
      const msg = fn();
      ctx.game.bus.emit('resources');
      ctx.game.requestSave(true);
      ctx.ui.toasts.show(msg || `${label} ✓`, { icon: '🐞', type: 'success' });
    } catch (e) {
      ctx.ui.toasts.show(String(e.message || e), { icon: '🐞', type: 'error' });
    }
  } });
}

function openDebug() {
  const g = ctx.game;
  const species = h('select.debug-select', MONSTERS.map((m) => h('option', { value: m.id }, `${m.name} (${m.rarity})`)));
  const biome = h('select.debug-select', BIOME_IDS.map((id) => h('option', { value: id }, BIOMES[id].name)));
  const mode = h('select.debug-select', RUN_MODE_IDS.map((id) => h('option', { value: id }, MODES[id].name)));
  const body = h('div.debug',
    h('p.small.muted', 'Outils de test — ne pas utiliser en partie normale.'),
    h('h3.section-title', '💰 Ressources'),
    h('div.row.gap.wrap',
      act('+1M partout', () => { for (const k of RESOURCE_KEYS) g.economy.add({ [k]: k === 'legendaryEssence' || k === 'dimensionalFragments' ? 100 : 1e6 }, false); }),
      act('×1000 or', () => { g.state.resources.gold *= 1000; }),
      act('Tout à 0', () => { for (const k of RESOURCE_KEYS) g.state.resources[k] = 0; }, 'danger'),
    ),
    h('h3.section-title', '👹 Monstres'),
    h('div.row.gap.wrap', species,
      act('Ajouter', () => { g.monsters.create(species.value); return `${species.value} ajouté`; }),
      act('+10 niveaux (tous)', () => { for (const m of g.state.monsters) m.level = Math.min(g.monsters.maxLevel(m), m.level + 10); g.bus.emit('monstersChanged'); }),
      act('Niveau max (tous)', () => { for (const m of g.state.monsters) m.level = g.monsters.maxLevel(m); g.bus.emit('monstersChanged'); }),
    ),
    h('h3.section-title', '🏰 Étages, biomes, boss'),
    h('div.row.gap.wrap',
      act('+1 étage', () => {
        const n = g.state.floors.length + 1;
        g.state.floors.push(createFloorState(n));
        g.state.stats.maxFloor = Math.max(g.state.stats.maxFloor, n);
        g.state.prestige.bestFloor = Math.max(g.state.prestige.bestFloor, n);
        g.bus.emit('floorsChanged');
      }),
      act('Boss : tous vaincus', () => { for (const b of g.bosses.floorBosses()) g.state.bosses.defeated[b.key] = 1; }),
      biome,
      act('Biome de l’étage', () => { g.state.floors[g.viewFloor].biome = biome.value; g.bus.emit('biomeChanged', g.viewFloor); }),
      act('Déverrouiller salles et pièges', () => { g.dungeon.isRoomUnlocked = () => true; g.traps.isUnlocked = () => true; return 'Salles et pièges déverrouillés (session)'; }),
    ),
    h('h3.section-title', '🎮 Modes et collection'),
    h('div.row.gap.wrap', mode,
      act('Débloquer les modes', () => { g.state.stats.maxFloor = Math.max(g.state.stats.maxFloor, 25); }),
      act('Lancer', () => {
        g.runs.isUnlocked = () => true;
        if (g.runs.run) g.runs.abandon();
        const team = g.state.monsters.slice().sort((a, b) => g.monsters.power(b) - g.monsters.power(a)).slice(0, 5).map((m) => m.uid);
        const r = g.runs.start(mode.value, { teamUids: team, challenge: 'volcano', curse: 1 });
        if (!r.ok) throw new Error(r.reason);
        ctx.ui.modals.closeAll();
        ctx.router.go('Run');
      }),
      ...CHEST_IDS.map((id) => act(`+ ${id}`, () => g.collection.addChest(id, 1))),
      act('+XP Maître', () => { g.master.addXp(g.master.xpToNext() * 3); }),
    ),
    h('h3.section-title', '⏱️ Temps et sauvegarde'),
    h('div.row.gap.wrap',
      act('Simuler 1 h hors ligne', () => {
        const r = g.offline.run(Date.now() - 3600e3, Date.now());
        if (r && !r.suspicious) ctx.ui.showOfflineReport(r);
      }),
      act('Sauvegarder', () => { g.saveNow(); }),
      act('Copier la sauvegarde (console)', () => { console.log(g.saves.exportString()); return 'Code exporté dans la console'; }),
      act('Raid immédiat', () => { g.raids.rt(g.viewFloor).nextAt = Date.now(); }),
    ),
  );
  ctx.ui.modals.open(body, { title: 'Mode développeur', icon: '🐞', cls: 'modal-wide' });
}
