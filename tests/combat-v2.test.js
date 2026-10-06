import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, makeUnit, simulateBattle } from '../src/systems/CombatSystem.js';
import { REACTIONS, COMBO_TIERS } from '../src/data/reactions.js';
import { STATUSES } from '../src/data/statuses.js';
import { BIOMES, BIOME_IDS } from '../src/data/biomes.js';
import { TRAPS, TRAP_SYNERGIES } from '../src/data/traps.js';
import { RESEARCH_MAP } from '../src/data/research.js';
import { RNG } from '../src/utils/rng.js';
import { newGame, rich, addRoom } from './helpers.js';

const unit = (o) => makeUnit({ hp: 1000, atk: 50, def: 0, spd: 10, crit: 0, mods: {}, ...o });

test('réactions : données valides', () => {
  for (const [k, r] of Object.entries(REACTIONS)) {
    assert.equal(k, k.split('+').sort().join('+'), `clé triée ${k}`);
    for (const st of r.statuses || []) assert.ok(STATUSES[st.id], `${k}: ${st.id}`);
  }
});

test('réaction feu + poison : déclenchée, émise et consomme l’aura', () => {
  const b = new Battle({ rng: new RNG(1), record: true });
  const src = unit({ id: 'a', side: 'A' });
  const tgt = unit({ id: 'b', side: 'B' });
  b.addUnits([src, tgt]);
  b.applyStatus(src, tgt, { id: 'poison', duration: 5, power: 0.1 });
  assert.equal(tgt.aura.element, 'poison');
  const hp = tgt.hp;
  b.attack(src, tgt, { power: 1 }, 'fire');
  const ev = b.events.find((e) => e.type === 'reaction');
  assert.ok(ev, 'événement de réaction');
  assert.equal(ev.name, REACTIONS['fire+poison'].name);
  assert.ok(tgt.statuses.some((s) => s.id === 'burn'));
  assert.ok(hp - tgt.hp > 50, 'dégâts de réaction en plus de l’attaque');
  assert.equal(b.stats.reactions, 1);
});

test('statuts : durée réelle transmise à l’affichage', () => {
  const b = new Battle({ rng: new RNG(1), record: true });
  const src = unit({ id: 'a', side: 'A' });
  const tgt = unit({ id: 'b', side: 'B' });
  b.addUnits([src, tgt]);
  b.applyStatus(src, tgt, { id: 'slow', duration: 3.5 });
  const ev = b.events.find((e) => e.type === 'status');
  assert.equal(ev.dur, 3.5);
});

test('combo : paliers atteints pour les monstres uniquement, bonus de dégâts', () => {
  const b = new Battle({ rng: new RNG(2), record: true });
  const src = unit({ id: 'a', side: 'A' });
  const tgt = unit({ id: 'b', side: 'B', hp: 1e9 });
  b.addUnits([src, tgt]);
  for (let i = 0; i < COMBO_TIERS[1].hits; i++) b.attack(src, tgt, { power: 1 }, 'neutral');
  assert.ok(b.events.some((e) => e.type === 'combo' && e.count === COMBO_TIERS[0].hits));
  assert.ok(b.comboBonus('A') >= COMBO_TIERS[1].bonus);
  assert.equal(b.comboBonus('B'), 0);
});

test('vitesse : spdMult de camp appliqué', () => {
  const b = new Battle({ rng: new RNG(1), sideMods: { A: {}, B: { spdMult: 0.5 } } });
  const u = unit({ id: 'b', side: 'B', spd: 20 });
  assert.equal(b.effStat(u, 'spd'), 10);
});

test('nouveaux pièges : données, recherches et synergies', () => {
  for (const id of ['roots', 'blades', 'mine', 'holy']) {
    const t = TRAPS[id];
    assert.ok(t, id);
    assert.ok(RESEARCH_MAP[t.unlock.research], `${id} : recherche ${t.unlock.research}`);
  }
  for (const s of TRAP_SYNERGIES) if (s.trapA) assert.ok(TRAPS[s.trapA], s.id);
});

test('biomes : 8 biomes, règles appliquées aux raids et à la production', () => {
  assert.equal(BIOME_IDS.length, 8);
  const g = newGame();
  rich(g);
  g.state.floors[0].biome = 'desert';
  const sm = g.biomes.sideMods(0);
  assert.equal(sm.A.healMult, 0.7);
  assert.equal(sm.B.elementDamage.light, 0.2);
  // affinité
  const m = g.state.monsters[0];
  g.state.floors[0].biome = 'forest';
  const withAff = g.monsters.computeStats(m, { roomId: 'basic', level: 1, fi: 0 });
  g.state.floors[0].biome = 'volcano';
  const without = g.monsters.computeStats(m, { roomId: 'basic', level: 1, fi: 0 });
  assert.ok(withAff.hp > without.hp, 'goblin (nature) en forêt');
  // production
  addRoom(g, 0, 0, 1, 'mine');
  g.state.floors[0].biome = 'forest';
  const metal0 = g.dungeon.productionPerMin(0).metal;
  g.state.floors[0].biome = 'volcano';
  assert.ok(g.dungeon.productionPerMin(0).metal > metal0 * 1.25);
  // la simulation de raid tourne dans chaque biome
  for (const id of BIOME_IDS) {
    g.state.floors[0].biome = id;
    const r = g.raids.simulate(0, { seed: 9, record: true });
    assert.ok(['victory', 'looted', 'retreat'].includes(r.outcome), id);
  }
});

test('dimension corrompue : anomalie déterministe par raid', () => {
  const g = newGame();
  g.state.floors[0].biome = 'corrupted';
  assert.deepEqual(g.biomes.rules(0, 5).anomaly, g.biomes.rules(0, 5).anomaly);
  assert.ok(g.biomes.rules(0, 5).anomaly);
});

test('changement de biome : verrouillage, coût, codex', () => {
  const g = newGame();
  rich(g);
  assert.equal(g.biomes.canChange(0, 'astral').ok, false, 'astral verrouillé au début');
  g.state.stats.maxFloor = 30;
  const r = g.biomes.change(0, 'astral');
  assert.ok(r.ok, r.reason);
  assert.equal(g.state.floors[0].biome, 'astral');
  assert.ok(g.codex.has('biomes', 'astral'));
  assert.equal(g.dungeon.def(0).theme, BIOMES.astral.theme);
});
