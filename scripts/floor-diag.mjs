/**
 * DIAGNOSTIC PAR ÉTAGE
 * Charge une sauvegarde (écrite par `SAVE_OUT=... node scripts/bot.mjs`) et mesure, pour chaque étage,
 * le taux de victoire des raids, le biome, la menace, le nombre de salles / monstres / pièges.
 * Usage : node scripts/floor-diag.mjs <fichier-sauvegarde> [raids par étage=40]
 */
import { readFileSync } from 'node:fs';
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { SAVE_KEY } from '../src/utils/constants.js';

const file = process.argv[2];
const N = Number(process.argv[3] || 40);
const storage = new MemoryStorage();
storage.setItem(SAVE_KEY, readFileSync(file, 'utf8'));
const g = new Game({ storage });
g.state = g.saves.load();
g.afterLoad();

const s = g.state;
console.log('étage | biome      | menace | salles | monstres (niv. moy.) | pièges | victoires');
for (let fi = 0; fi < s.floors.length; fi++) {
  const f = s.floors[fi];
  const rooms = g.dungeon.roomCells(fi);
  const mons = s.monsters.filter((m) => m.location && m.location.floor === fi);
  const lvl = mons.length ? mons.reduce((a, m) => a + m.level, 0) / mons.length : 0;
  const traps = rooms.filter((r) => r.cell.trap).length;
  let wins = 0;
  for (let i = 0; i < N; i++) if (g.raids.simulate(fi, { seed: 1000 + i, record: false }).outcome === 'victory') wins++;
  console.log(
    `${String(fi + 1).padStart(5)} | ${String(f.biome || '-').padEnd(10)} | ${String(f.threat).padStart(6)} | ${String(rooms.length).padStart(6)} | ${String(mons.length).padStart(8)} (${lvl.toFixed(0).padStart(3)})       | ${String(traps).padStart(6)} | ${((wins / N) * 100).toFixed(0)} %`,
  );
}
