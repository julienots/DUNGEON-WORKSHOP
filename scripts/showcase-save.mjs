/**
 * SAUVEGARDE VITRINE (captures de la fiche Google Play)
 * Construit une partie avancée lisible : salles variées, monstres de toutes les familles, pièges,
 * collection entamée. Écrit le contenu brut de la clé localStorage.
 * Usage : node scripts/showcase-save.mjs <fichier-de-sortie>
 */
import { writeFileSync } from 'node:fs';
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { SAVE_KEY, RESOURCE_KEYS } from '../src/utils/constants.js';

const out = process.argv[2];
const g = new Game({ storage: new MemoryStorage() });
const now = Date.now();
g.newGame(now);
g.tutorial.skip();
g.watching = false;
for (const k of RESOURCE_KEYS) g.economy.add({ [k]: k === 'legendaryEssence' || k === 'dimensionalFragments' ? 40 : 5e9 }, false);
g.dungeon.isRoomUnlocked = () => true;
g.traps.isUnlocked = () => true;

// 8 étages débloqués (gardiens vaincus)
for (let n = 0; n < 7; n++) {
  g.state.floors[g.state.floors.length - 1].raidsDefended = 500;
  for (const b of g.bosses.floorBosses()) g.state.bosses.defeated[b.key] = 1;
  const r = g.dungeon.unlockNextFloor();
  if (!r.ok) throw new Error(r.reason);
}

const layouts = [
  ['lava', 'crypt', 'treasure', 'toxic', 'frozen', 'storm', 'grove', 'combat', 'sanctum', 'lab', 'mine', 'forge'],
  ['crypt', 'combat', 'lava', 'treasure', 'grove', 'frozen', 'toxic', 'storm'],
];
const species = [
  ['dragon', 'lich_lord', 'vampire_count', 'beholder', 'flame_lord', 'frost_wyvern', 'spider_queen', 'orc_lord', 'banshee', 'royal_mimic', 'slime_royal', 'goblin_king', 'storm_elemental', 'myconid_king', 'fallen_seraph', 'archdemon'],
  ['shadow_dragon', 'necromancer', 'ice_dragon', 'reaper', 'lava_golem', 'tempest_lord', 'eye_tyrant', 'ancestral_troll'],
];
const traps = ['fire', 'spikes', 'lightning', 'poison', 'ice', 'arcane', 'mine', 'roots'];

function furnish(fi, rooms, mons) {
  for (let i = 0; i < 3; i++) {
    if (g.dungeon.canExpand(fi, 'down').ok) g.dungeon.expand(fi, 'down');
    if (g.dungeon.canExpand(fi, 'right').ok) g.dungeon.expand(fi, 'right');
  }
  const f = g.state.floors[fi];
  for (const room of rooms) {
    let done = false;
    for (let y = 0; y < f.rows && !done; y++) for (let x = 0; x < f.cols && !done; x++) if (g.dungeon.canBuild(fi, x, y, room).ok) done = g.dungeon.build(fi, x, y, room).ok;
  }
  let t = 0;
  for (const r of g.dungeon.roomCells(fi)) {
    for (let k = 0; k < 6 && r.cell.level < 25; k++) g.dungeon.upgrade(fi, r.x, r.y);
    if (g.traps.canPlace(fi, r.x, r.y, traps[t % traps.length]).ok) {
      g.traps.place(fi, r.x, r.y, traps[t % traps.length]);
      t++;
    }
  }
  const cells = g.dungeon.roomCells(fi).filter((r) => g.dungeon.roomCapacity(r.cell) > 0);
  mons.forEach((sid, i) => {
    const m = g.monsters.create(sid, { silent: true, level: 60 + (i * 7) % 30 });
    const c = cells[i % cells.length];
    g.monsters.assign(m.uid, fi, c.x, c.y);
  });
}
furnish(0, layouts[0], species[0]);
furnish(7, layouts[1], species[1]);
for (const m of ['goblin', 'skeleton', 'slime', 'bat', 'imp', 'wisp']) g.monsters.create(m, { silent: true, level: 30 });

// Progression visible : maître, collection, saison
g.master.addXp(g.master.xpToNext() * 25);
g.collection.addChest('epic', 2);
g.collection.addChest('legendary', 1);
for (const s of ['lava', 'ice', 'astral']) g.state.collection.skins[s] = true;
g.state.stats.maxFloor = 8;
g.state.prestige.bestFloor = 8;
g.state.currentFloor = 0;
g.state.meta.trapRuleNotice = true;
g.state.resources.gold = 2.4e6;
g.state.resources.crystals = 1850;
g.state.resources.essence = 96000;
g.saves.save(g.state, now);
writeFileSync(out, g.saves.storage.getItem(SAVE_KEY));
console.log(`Vitrine : ${g.state.floors.length} étages, ${g.state.monsters.length} monstres → ${out}`);
