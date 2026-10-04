import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { SAVE_KEY, SAVE_BACKUP_KEY } from '../src/utils/constants.js';
import { newGame } from './helpers.js';

test('sauvegarde puis chargement : la progression est conservée', () => {
  const storage = new MemoryStorage();
  const g = newGame(storage);
  g.dungeon.build(0, 2, 1, 'combat');
  g.state.resources.crystals = 777;
  g.saveNow();
  const g2 = new Game({ storage });
  const { isNew } = g2.loadOrCreate(Date.now());
  assert.equal(isNew, false);
  assert.equal(g2.dungeon.cell(0, 2, 1).room, 'combat');
  assert.equal(g2.state.resources.crystals, 777);
});

test('nouvelle partie si aucune sauvegarde', () => {
  const g = new Game({ storage: new MemoryStorage() });
  const { isNew } = g.loadOrCreate();
  assert.equal(isNew, true);
  assert.equal(g.state.floors.length, 1);
  assert.equal(g.state.monsters.length, 1);
});

test('export / import', () => {
  const g = newGame();
  g.state.resources.gold = 123456;
  const code = g.saves.exportString();
  assert.ok(code.startsWith('DW1:'));
  const state = g.saves.importString(code);
  assert.equal(state.resources.gold, 123456);
  assert.throws(() => g.saves.importString('DW1:abc'), /./);
  assert.throws(() => g.saves.importString('n’importe quoi'), /invalide/);
});

test('sauvegarde corrompue : récupération de la copie de secours', () => {
  const storage = new MemoryStorage();
  const g = newGame(storage);
  g.state.resources.gold = 4242;
  g.saveNow();
  storage.setItem(SAVE_BACKUP_KEY, storage.getItem(SAVE_KEY));
  storage.setItem(SAVE_KEY, '{"v":1,"c":"x","d":"{}"}');
  const g2 = new Game({ storage });
  const { isNew } = g2.loadOrCreate();
  assert.equal(isNew, false);
  assert.equal(g2.state.resources.gold, 4242);
});

test('migration : champs manquants complétés', () => {
  const g = newGame();
  const raw = JSON.parse(JSON.stringify(g.state));
  delete raw.settings;
  delete raw.prestige;
  raw.version = 0;
  const v = g.saves.validate(raw);
  assert.ok(v.settings && v.prestige && v.version >= 1);
});

test('réinitialisation', () => {
  const storage = new MemoryStorage();
  const g = newGame(storage);
  g.state.resources.gold = 99999;
  g.saveNow();
  g.resetAll();
  assert.notEqual(g.state.resources.gold, 99999);
});
