import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { migrateSaveV1ToV2, checkIntegrity, traitsForExisting } from '../src/core/migrations.js';
import { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_V1_BACKUP_KEY, SAVE_CORRUPT_PREFIX, SAVE_VERSION } from '../src/utils/constants.js';
import { TRAITS, TRAITS_PER_MONSTER } from '../src/data/traits.js';
import { BIOMES } from '../src/data/biomes.js';
import { newGame } from './helpers.js';

const FIXTURES = ['early', 'mid', 'late'];
const readFixture = (name) => readFileSync(new URL(`./fixtures/save-v1-${name}.json`, import.meta.url), 'utf8');
const innerState = (raw) => JSON.parse(JSON.parse(raw).d);

function loadFixture(name, now) {
  const storage = new MemoryStorage();
  const raw = readFixture(name);
  storage.setItem(SAVE_KEY, raw);
  const g = new Game({ storage });
  const v1 = innerState(raw);
  const res = g.loadOrCreate(now ?? v1.lastSaveTimestamp + 1000);
  return { g, storage, raw, v1, res };
}

for (const name of FIXTURES) {
  test(`migration V1 → V2 (${name}) : aucune progression perdue`, () => {
    const { g, storage, raw, v1, res } = loadFixture(name);
    const s = g.state;
    assert.equal(res.isNew, false);
    assert.equal(res.loadInfo.migratedFrom, 1);
    assert.equal(s.version, SAVE_VERSION);

    // 1) copie intacte de la V1
    assert.equal(storage.getItem(SAVE_V1_BACKUP_KEY), raw);

    // 2) progression conservée
    assert.equal(s.floors.length, v1.floors.length);
    assert.equal(s.monsters.length, v1.monsters.length);
    assert.equal(s.equipment.length, v1.equipment.length);
    assert.equal(s.prestige.count, v1.prestige.count);
    assert.equal(s.player.level, v1.player.level);
    assert.deepEqual(s.research.levels, v1.research.levels);
    for (const k of Object.keys(v1.resources)) assert.ok(s.resources[k] >= v1.resources[k], `ressource ${k}`);
    for (const [i, f] of v1.floors.entries()) {
      assert.deepEqual(Object.keys(s.floors[i].cells).sort(), Object.keys(f.cells).sort(), `cases de l'étage ${i + 1}`);
    }
    const byUid = new Map(v1.monsters.map((m) => [m.uid, m]));
    for (const m of s.monsters) {
      const old = byUid.get(m.uid);
      assert.ok(old, `monstre ${m.uid} conservé`);
      assert.equal(m.speciesId, old.speciesId);
      assert.ok(m.level >= old.level);
      assert.deepEqual(m.equipment, old.equipment);
    }

    // 3) nouvelles données
    assert.equal(s.resources.legendaryEssence, 0);
    assert.equal(s.resources.dimensionalFragments, 0);
    for (const m of s.monsters) {
      assert.equal(m.traits.length, TRAITS_PER_MONSTER);
      for (const t of m.traits) assert.ok(TRAITS[t]);
      assert.deepEqual(m.mutations, []);
      assert.equal(m.skin, 'classic');
    }
    for (const f of s.floors) assert.ok(BIOMES[f.biome]);
    assert.ok(Object.keys(s.codex.biomes).length >= 1);
    assert.equal(typeof s.settings.performanceMode, 'boolean');

    // 4) intégrité : plus rien à corriger
    assert.deepEqual(checkIntegrity(s), []);

    // 5) le jeu tourne et la sauvegarde V2 se recharge à l'identique
    const t0 = v1.lastSaveTimestamp + 2000;
    for (let i = 0; i < 60; i++) g.update(1, t0 + i * 1000);
    g.saveNow();
    const g2 = new Game({ storage });
    const r2 = g2.loadOrCreate(t0 + 61_000);
    assert.equal(r2.isNew, false);
    assert.equal(r2.loadInfo.migratedFrom, null);
    assert.deepEqual(g2.state.monsters.map((m) => m.traits), g.state.monsters.map((m) => m.traits));
    assert.equal(storage.getItem(SAVE_V1_BACKUP_KEY), raw, 'la copie V1 n’est jamais remplacée');
  });
}

test('migration déterministe : mêmes traits à chaque conversion', () => {
  const a = migrateSaveV1ToV2(innerState(readFixture('mid')));
  const b = migrateSaveV1ToV2(innerState(readFixture('mid')));
  assert.deepEqual(a.monsters.map((m) => m.traits), b.monsters.map((m) => m.traits));
  assert.deepEqual(a.monsters[0].traits, traitsForExisting(a.monsters[0]));
});

test('migration idempotente', () => {
  const once = migrateSaveV1ToV2(innerState(readFixture('late')));
  const snapshot = JSON.stringify({ ...once, meta: null });
  const twice = migrateSaveV1ToV2(once);
  assert.equal(JSON.stringify({ ...twice, meta: null }), snapshot);
});

test('les traits ont un effet réel sur les statistiques', () => {
  const g = newGame();
  const m = g.state.monsters[0];
  m.traits = [];
  const base = g.monsters.computeStats(m);
  m.traits = ['sturdy', 'berserker'];
  const st = g.monsters.computeStats(m);
  assert.ok(st.hp > base.hp);
  assert.ok(st.atk > base.atk);
  m.traits = ['bloodthirsty'];
  assert.ok(g.monsters.computeStats(m).mods.lifesteal >= 0.06);
});

test('un nouveau monstre reçoit 2 traits distincts découverts dans le Codex', () => {
  const g = newGame();
  const m = g.monsters.create('orc');
  assert.equal(m.traits.length, 2);
  assert.notEqual(m.traits[0], m.traits[1]);
  for (const t of m.traits) assert.ok(g.codex.has('traits', t));
});

test('sauvegarde illisible : copie conservée, jamais écrasée', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, '{"v":1,"c":"faux","d":"{}"}');
  const g = new Game({ storage });
  const res = g.loadOrCreate(Date.now());
  assert.equal(res.isNew, true);
  assert.ok(res.loadInfo.preservedKey?.startsWith(SAVE_CORRUPT_PREFIX));
  assert.equal(storage.getItem(res.loadInfo.preservedKey), '{"v":1,"c":"faux","d":"{}"}');
});

test('sauvegarde principale corrompue : la copie de secours V1 est migrée', () => {
  const storage = new MemoryStorage();
  const raw = readFixture('mid');
  storage.setItem(SAVE_KEY, raw.slice(0, 200));
  storage.setItem(SAVE_BACKUP_KEY, raw);
  const g = new Game({ storage });
  const res = g.loadOrCreate(innerState(raw).lastSaveTimestamp + 1000);
  assert.equal(res.isNew, false);
  assert.equal(res.loadInfo.migratedFrom, 1);
  assert.equal(g.state.floors.length, innerState(raw).floors.length);
});

test('échec du chargement : recoverFromLoadFailure conserve la sauvegarde brute', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, readFixture('early'));
  const g = new Game({ storage });
  const res = g.recoverFromLoadFailure(new Error('boom'));
  assert.equal(storage.getItem(res.loadInfo.preservedKey), readFixture('early'));
  assert.equal(res.isNew, true);
});

test('import d’un code exporté en V1 : migré vers V2', () => {
  const g = newGame();
  const v1 = innerState(readFixture('mid'));
  const v1Code = g.saves.exportString(v1);
  const state = g.saves.importString(v1Code);
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.monsters.length, v1.monsters.length);
  assert.ok(state.monsters.every((m) => m.traits.length === TRAITS_PER_MONSTER));
});

test('intégrité : références cassées réparées sans perte', () => {
  const g = newGame();
  const s = g.state;
  const m = g.monsters.create('orc');
  m.location = { floor: 7, x: 0, y: 0 };
  m.equipment.weapon = 'i999';
  s.uidSeq = 1;
  s.resources.gold = NaN;
  s.currentFloor = 9;
  const fixes = checkIntegrity(s);
  assert.ok(fixes.length >= 4);
  assert.equal(m.location, null);
  assert.equal(m.equipment.weapon, undefined);
  assert.equal(s.resources.gold, 0);
  assert.equal(s.currentFloor, 0);
  assert.ok(s.uidSeq > 2);
  assert.deepEqual(checkIntegrity(s), []);
});

test('une sauvegarde plus récente que le jeu est refusée sans être effacée', () => {
  const storage = new MemoryStorage();
  const g0 = newGame(storage);
  g0.state.version = SAVE_VERSION + 5;
  g0.saveNow();
  const raw = storage.getItem(SAVE_KEY);
  storage.removeItem(SAVE_BACKUP_KEY);
  const g = new Game({ storage });
  const res = g.loadOrCreate();
  assert.equal(res.isNew, true);
  assert.equal(storage.getItem(res.loadInfo.preservedKey), raw);
});

test('principale illisible mais secours valide : la principale est quand même conservée', () => {
  const storage = new MemoryStorage();
  const g0 = newGame(storage);
  g0.saveNow();
  storage.setItem(SAVE_KEY, 'cassé');
  const g = new Game({ storage });
  const res = g.loadOrCreate();
  assert.equal(res.isNew, false);
  assert.equal(storage.getItem(res.loadInfo.preservedKey), 'cassé');
});
