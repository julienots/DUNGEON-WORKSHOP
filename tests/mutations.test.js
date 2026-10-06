import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MUTATIONS, MAX_MUTATIONS, MUTATION_MAX_LEVEL } from '../src/data/mutations.js';
import { MONSTERS, MONSTER_MAP } from '../src/data/monsters.js';
import { SKILLS } from '../src/data/skills.js';
import { PASSIVES } from '../src/data/passives.js';
import { Battle, makeUnit } from '../src/systems/CombatSystem.js';
import { RNG } from '../src/utils/rng.js';
import { newGame, addRoom, rich } from './helpers.js';

test('espèces : évolutions valides, compétences et passifs connus', () => {
  for (const m of MONSTERS) {
    for (const e of m.evolutions) assert.ok(MONSTER_MAP[e.to], `${m.id} → ${e.to}`);
    for (const sk of [m.basic, ...m.skills]) assert.ok(SKILLS[sk], `${m.id}: ${sk}`);
    assert.ok(PASSIVES[m.passive], `${m.id}: ${m.passive}`);
  }
  const triple = MONSTERS.filter((m) => m.evolutions.length >= 3).map((m) => m.id);
  assert.ok(triple.length >= 5, `arbres à 3 branches : ${triple}`);
});

test('mutation : salle requise, coût, tirage, niveaux et plafond', () => {
  const g = newGame();
  rich(g);
  const m = g.state.monsters[0];
  assert.equal(g.monsters.canMutate(m).ok, false, 'salle de mutation requise');
  addRoom(g, 0, 0, 1, 'mutation');
  const before = g.state.resources.legendaryEssence;
  const r = g.monsters.mutate(m.uid, new RNG(1));
  assert.ok(r.ok, r.reason);
  assert.ok(g.state.resources.legendaryEssence < before);
  assert.equal(m.mutations.length, 1);
  assert.ok(g.codex.has('mutations', m.mutations[0].id));
  for (let i = 0; i < 40; i++) g.monsters.mutate(m.uid, new RNG(100 + i));
  assert.ok(m.mutations.length <= MAX_MUTATIONS);
  assert.ok(m.mutations.every((x) => x.level >= 1 && x.level <= MUTATION_MAX_LEVEL));
  assert.equal(g.monsters.canMutate(m).ok, false, 'plafond atteint');
});

test('mutation : effets réels sur les statistiques et le combat', () => {
  const g = newGame();
  const m = g.state.monsters[0];
  m.traits = [];
  const base = g.monsters.computeStats(m);
  m.mutations = [{ id: 'reinforced_bones', level: 3 }, { id: 'lava_blood', level: 2 }];
  const st = g.monsters.computeStats(m);
  assert.ok(st.def > base.def);
  assert.ok(Math.abs(st.mods.resist.fire - 0.3) < 1e-9);
  // résistance au feu en combat
  const mk = (resist) => makeUnit({ id: 't', side: 'B', hp: 1e6, atk: 1, def: 0, spd: 1, mods: resist ? { resist: { fire: 0.5 } } : {} });
  const dmg = (resist) => {
    const b = new Battle({ rng: new RNG(3), record: false });
    const src = makeUnit({ id: 's', side: 'A', hp: 100, atk: 100, def: 0, spd: 1, crit: 0 });
    const tgt = mk(resist);
    b.addUnits([src, tgt]);
    b.attack(src, tgt, { power: 1 }, 'fire');
    return 1e6 - tgt.hp;
  };
  assert.ok(dmg(true) < dmg(false) * 0.6);
});

test('relance des traits', () => {
  const g = newGame();
  rich(g);
  addRoom(g, 0, 0, 1, 'mutation');
  const m = g.state.monsters[0];
  const r = g.monsters.rerollTraits(m.uid, new RNG(77));
  assert.ok(r.ok);
  assert.equal(m.traits.length, 2);
});

test('toutes les mutations ont un effet', () => {
  for (const [id, mu] of Object.entries(MUTATIONS)) assert.ok(mu.stats || mu.mods, id);
});
