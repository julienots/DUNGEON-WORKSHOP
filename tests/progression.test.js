import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, rich } from './helpers.js';
import { RNG } from '../src/utils/rng.js';
import { MONSTER_MAP } from '../src/data/monsters.js';

test('niveau et évolution des monstres', () => {
  const g = newGame();
  rich(g);
  const m = g.state.monsters[0];
  assert.ok(g.monsters.levelUp(m.uid).ok);
  assert.equal(m.level, 2);
  const opts = g.monsters.evolutionOptions(m);
  assert.equal(opts.length, 2, 'deux branches pour le gobelin');
  assert.equal(opts[0].ok, false);
  m.level = 20;
  g.state.floors[0].cells['2,1'] = { room: 'lab', level: 1, trap: null };
  const res = g.monsters.evolve(m.uid, 'goblin_shaman');
  assert.ok(res.ok, res.reason);
  assert.equal(m.speciesId, 'goblin_shaman');
  assert.ok(g.codex.has('monsters', 'goblin_shaman'));
});

test('équipement : génération, équipement, amélioration, fusion, recyclage', () => {
  const g = newGame();
  rich(g);
  const rng = new RNG(1);
  const items = [0, 1, 2].map(() => g.equipment.add(g.equipment.generate(rng, { ilvl: 3, rarity: 'rare', slot: 'weapon' })));
  const m = g.state.monsters[0];
  const before = g.monsters.computeStats(m).atk;
  assert.ok(g.equipment.equip(items[0].uid, m.uid).ok);
  assert.ok(g.monsters.computeStats(m).atk > before, "l'arme augmente l'attaque");
  assert.ok(g.equipment.upgrade(items[0].uid).ok);
  g.equipment.unequip(items[0].uid);
  const fused = g.equipment.fuse(items.map((i) => i.uid));
  assert.ok(fused.ok, fused.reason);
  assert.equal(fused.item.rarity, 'epic');
  const metal = g.state.resources.metal;
  g.equipment.recycle([fused.item.uid]);
  assert.ok(g.state.resources.metal > metal);
});

test('invocations', () => {
  const g = newGame();
  rich(g);
  const r = g.shop.summon('advanced10');
  assert.ok(r.ok, r.reason);
  assert.equal(r.results.length, 10);
  for (const x of r.results) assert.ok(MONSTER_MAP[x.monster.speciesId]);
  assert.ok(r.results.some((x) => ['epic', 'legendary', 'mythic', 'ancient'].includes(MONSTER_MAP[x.monster.speciesId].rarity)), 'épique garanti');
});

test('recherche : coût, durée, déblocage', () => {
  const g = newGame();
  rich(g);
  const now = Date.now();
  assert.equal(g.dungeon.isRoomUnlocked('lava'), false);
  assert.ok(g.research.start('arch_reinforced', now).ok);
  g.research.update(now + 10 * 60000);
  assert.ok(g.research.start('arch_elemental_rooms', now).ok);
  g.research.update(now + 10 * 60000);
  assert.equal(g.dungeon.isRoomUnlocked('lava'), true);
  assert.ok(g.mods.get().monsterDef > 0, 'bonus appliqué');
});

test('trésorerie : accumulation, récolte, amélioration', () => {
  const g = newGame();
  g.treasury.update(600);
  assert.ok(g.state.treasury.vault > 0);
  const gold = g.state.resources.gold;
  const r = g.treasury.collect();
  assert.ok(r.ok && g.state.resources.gold === gold + r.amount);
  rich(g);
  const cap = g.treasury.capacity();
  assert.ok(g.treasury.upgrade().ok);
  assert.ok(g.treasury.capacity() > cap);
});

test('missions quotidiennes : progression et réclamation', () => {
  const g = newGame();
  const build = g.state.missions.daily.find((m) => m.id === 'd_build') || g.state.missions.daily[0];
  const def = g.missions.defOf('daily', build.id);
  g.state.stats[def.stat] = build.base + build.target;
  const res = g.missions.claim('daily', build.id);
  assert.ok(res.ok);
  assert.equal(g.missions.claim('daily', build.id).ok, false, 'pas de double réclamation');
});

test('succès : déblocage et réclamation', () => {
  const g = newGame();
  g.stats.add('adventurersKilled', 1);
  g.achievements.check();
  const crystals = g.state.resources.crystals;
  assert.ok(g.achievements.claim('a_first_kill').ok);
  assert.ok(g.state.resources.crystals > crystals);
});

test('Ascension : réinitialisation partielle et bonus permanents', () => {
  const g = newGame();
  rich(g, 1e12);
  for (let i = 0; i < 9; i++) {
    g.state.floors.at(-1).raidsDefended = 10;
    const n = g.state.floors.length + 1;
    if (n === 6 || n === 11) g.state.bosses.defeated[`f${n - 1}`] = 1;
    assert.ok(g.dungeon.unlockNextFloor().ok, `étage ${n}`);
  }
  assert.equal(g.state.floors.length, 10);
  const crystals = g.state.resources.crystals;
  const monsters = g.state.monsters.length;
  const r = g.prestige.ascend();
  assert.ok(r.ok && r.gain > 0);
  assert.equal(g.state.floors.length, 1);
  assert.equal(g.state.monsters.length, monsters, 'monstres conservés');
  assert.equal(g.state.resources.crystals, crystals, 'cristaux conservés');
  g.state.prestige.masterEssence = 100;
  const goldMod = g.mods.get().goldGain;
  assert.ok(g.prestige.buy('pr_wealth').ok);
  assert.ok(g.mods.get().goldGain > goldMod);
});

test('combat de boss : victoire, récompenses et gardien', () => {
  const g = newGame();
  rich(g, 1e12);
  for (let i = 0; i < 4; i++) {
    g.state.floors.at(-1).raidsDefended = 10;
    g.dungeon.unlockNextFloor();
  }
  const team = ['golem', 'troll', 'orc', 'vampire', 'dragon'].map((s) => {
    const m = g.monsters.create(s);
    m.level = 40;
    return m.uid;
  });
  const r = g.bosses.fight('f5', team);
  assert.ok(r.ok);
  assert.equal(r.win, true);
  assert.ok(r.first && r.granted.guardian, 'gardien obtenu');
  assert.ok(g.state.equipment.some((i) => i.unique), 'artefact unique');
  assert.equal(g.bosses.fight('f5', team).ok, false, 'une fois par jour');
});
