import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { SAVE_KEY } from '../src/utils/constants.js';
import { MODES, RUN_MODE_IDS, CHALLENGES, RUN_MODIFIERS, RUN_BOONS, RUN_EVENTS, CURSE_LEVELS } from '../src/data/modes.js';
import { MASTERY_TREES, MASTERY_NODES } from '../src/data/mastery.js';
import { MOD_KEYS } from '../src/systems/ModifierSystem.js';
import { DAILY_FULL_RUNS } from '../src/systems/RunSystem.js';
import { newGame } from './helpers.js';

function lateGame() {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, readFileSync(new URL('./fixtures/save-v1-late.json', import.meta.url), 'utf8'));
  const g = new Game({ storage });
  const raw = JSON.parse(JSON.parse(storage.getItem(SAVE_KEY)).d);
  g.loadOrCreate(raw.lastSaveTimestamp + 1000);
  return g;
}
const topTeam = (g, n = 5) => g.state.monsters.slice().sort((a, b) => g.monsters.power(b) - g.monsters.power(a)).slice(0, n).map((m) => m.uid);

/** Joue la run jusqu'au bout (premier choix à chaque décision). */
function playOut(g, max = 300) {
  for (let i = 0; i < max; i++) {
    while (g.runs.run?.pending) assert.ok(g.runs.choose(0).ok);
    const r = g.runs.fight({ record: false });
    assert.ok(r.ok !== false, r.reason);
    if (r.ended) return r.endReport;
  }
  return g.runs.end('abandon');
}

test('données des modes cohérentes', () => {
  assert.equal(Object.keys(MODES).length, 8);
  for (const id of RUN_MODE_IDS) assert.ok(MODES[id].teamSize > 0, id);
  for (const c of Object.values(CHALLENGES)) assert.ok(c.first && c.repeat);
  for (const b of Object.values(RUN_BOONS)) assert.ok(b.weight > 0);
  for (const e of Object.values(RUN_EVENTS)) assert.ok(e.options.length >= 2);
  for (const n of Object.values(MASTERY_NODES)) for (const e of n.effects) assert.ok(MOD_KEYS.includes(e.mod), `${n.id}: ${e.mod}`);
  assert.equal(Object.keys(MASTERY_TREES).length, 5);
});

test('modes verrouillés en début de partie, débloqués par la progression', () => {
  const g = newGame();
  assert.equal(g.runs.isUnlocked('classic'), true);
  assert.equal(g.runs.isUnlocked('survival'), false);
  assert.equal(g.runs.start('survival', { teamUids: ['m1'] }).ok, false);
  const late = lateGame();
  for (const id of RUN_MODE_IDS) assert.equal(late.runs.isUnlocked(id), true, id);
});

for (const mode of RUN_MODE_IDS) {
  test(`mode ${mode} : une run complète se joue, verse ses récompenses et enregistre le record`, () => {
    const g = lateGame();
    const before = { ...g.state.resources };
    const opts = { teamUids: topTeam(g), seed: 42 };
    if (mode === 'challenge') opts.challenge = 'volcano';
    if (mode === 'cursed') opts.curse = 1;
    const st = g.runs.start(mode, opts);
    assert.ok(st.ok, st.reason);
    const rep = playOut(g);
    assert.ok(rep, 'rapport de fin');
    assert.equal(g.state.modes.activeRun, null);
    assert.ok(rep.score > 0, `score ${rep.score}`);
    assert.equal(g.state.modes.records[mode].runs, 1);
    const gained = Object.keys(rep.rewards).some((k) => g.state.resources[k] > before[k]);
    assert.ok(gained, 'au moins une ressource gagnée');
    if (MODES[mode].leaderboard) assert.equal(g.state.modes.leaderboards[mode].length, 1);
  });
}

test('run déterministe : même graine, même résultat', () => {
  const a = lateGame();
  const b = lateGame();
  a.runs.start('survival', { teamUids: topTeam(a), seed: 7 });
  b.runs.start('survival', { teamUids: topTeam(b), seed: 7 });
  assert.equal(playOut(a).score, playOut(b).score);
});

test('la run en cours survit à une sauvegarde / un rechargement', () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, readFileSync(new URL('./fixtures/save-v1-late.json', import.meta.url), 'utf8'));
  const g = new Game({ storage });
  g.loadOrCreate(Date.now());
  g.runs.start('random', { seed: 99 });
  g.runs.fight({ record: false });
  const stage = g.runs.run.stage;
  g.saveNow();
  const g2 = new Game({ storage });
  g2.loadOrCreate(Date.now());
  assert.ok(g2.runs.run);
  assert.equal(g2.runs.run.stage, stage);
  assert.equal(g2.runs.run.team.length, g.runs.run.team.length);
});

test('roguelite : draft de 3 monstres, bonus après victoire, Âmes conservées', () => {
  const g = lateGame();
  g.runs.start('roguelite', { seed: 3 });
  assert.equal(g.runs.run.pending.type, 'draft');
  for (let i = 0; i < 3; i++) g.runs.choose(i % 3);
  assert.equal(g.runs.run.team.length, 3);
  assert.equal(g.runs.run.pending, null);
  const r = g.runs.fight({ record: false });
  if (r.win && !r.ended) assert.equal(g.runs.run.pending.type, 'boon');
  const rep = playOut(g);
  assert.ok(rep.souls > 0);
  assert.equal(g.state.modes.roguelite.souls, rep.souls);
  // méta-progression
  g.state.modes.roguelite.souls = 1000;
  assert.ok(g.runs.buyMeta('rm_hp').ok);
  assert.equal(g.state.modes.roguelite.meta.rm_hp, 1);
  g.runs.start('roguelite', { seed: 4 });
  assert.ok(g.runs.run.buffs.hp >= 0.05);
});

test('modificateurs : règles appliquées et récompenses augmentées', () => {
  const g = lateGame();
  const rules = g.runs.buildRules({ mode: 'survival', modifiers: ['greed', 'no_heal', 'elites'], challenge: null, curse: null, daily: null, biome: null });
  assert.ok(Math.abs(rules.reward - (RUN_MODIFIERS.greed.reward + RUN_MODIFIERS.no_heal.reward + RUN_MODIFIERS.elites.reward)) < 1e-9);
  assert.equal(rules.healMult, 0);
  assert.equal(rules.betweenHeal, 0);
  assert.equal(rules.enemy.elite, true);
  assert.equal(rules.sideMods.A.healMult, 0);
  // Règle d'élément : une équipe non conforme est refusée
  const nonFire = g.state.monsters.find((m) => g.monsters.species(m).element !== 'fire');
  assert.equal(g.runs.start('survival', { teamUids: [nonFire.uid], modifiers: ['fire_only'] }).ok, false);
  // Mode sans modificateurs
  assert.equal(g.runs.start('infinite', { teamUids: topTeam(g), modifiers: ['greed'] }).ok, false);
});

test('aucun soin : healMult 0 bloque les soins en combat', async () => {
  const { Battle, makeUnit } = await import('../src/systems/CombatSystem.js');
  const { RNG } = await import('../src/utils/rng.js');
  const b = new Battle({ rng: new RNG(1), sideMods: { A: { healMult: 0 }, B: {} } });
  const u = makeUnit({ id: 'a', side: 'A', hp: 100, hpCurrent: 50, atk: 1, def: 1, spd: 1 });
  b.addUnits([u]);
  assert.equal(b.heal(null, u, 30), 0);
  assert.equal(u.hp, 50);
});

test('permadeath : un monstre tombé reste hors combat', () => {
  const g = lateGame();
  g.runs.start('challenge', { teamUids: topTeam(g), challenge: 'permadeath', seed: 5 });
  const run = g.runs.run;
  run.team[0].hpFrac = 0.01;
  run.team[0].dead = true;
  g.runs.fight({ record: false });
  if (g.runs.run) assert.equal(g.runs.run.team[0].dead, true);
});

test('récompenses réduites après les premières runs du jour', () => {
  const g = lateGame();
  let last;
  for (let i = 0; i <= DAILY_FULL_RUNS; i++) {
    g.runs.start('cursed', { teamUids: topTeam(g), curse: 1, seed: 11 });
    last = playOut(g);
  }
  assert.equal(last.reduced, true);
});

test('infini : palier conservé, reprise au dernier palier', () => {
  const g = lateGame();
  g.runs.start('infinite', { teamUids: topTeam(g), seed: 1 });
  const rep = playOut(g);
  const cp = g.state.modes.infinite.checkpoint;
  assert.equal(cp, Math.floor(rep.score / 10) * 10);
  g.runs.start('infinite', { teamUids: topTeam(g), seed: 2 });
  assert.equal(g.runs.run.startFloor, cp);
  assert.equal(g.runs.preview().floor, cp + 1);
});

test('défi du jour : identique pour une date, récompense une seule fois', () => {
  const g = lateGame();
  const d1 = g.runs.dailyChallenge(new Date(2026, 9, 5));
  const d2 = g.runs.dailyChallenge(new Date(2026, 9, 5));
  assert.deepEqual(d1, d2);
  const today = g.runs.dailyChallenge();
  const team = topTeam(g, 20).filter((u) => !today.element || g.monsters.species(g.monsters.get(u)).element === today.element).slice(0, 5);
  if (!team.length) return;
  const st = g.runs.start('challenge', { teamUids: team, daily: today, seed: 8 });
  assert.ok(st.ok, st.reason);
  const rep = playOut(g);
  if (rep.success) {
    assert.equal(rep.firstClear, true);
    assert.equal(g.runs.dailyChallenge().done, true);
  }
});

test('abandon : butin partiel, aucune run active', () => {
  const g = lateGame();
  g.runs.start('survival', { teamUids: topTeam(g), seed: 3 });
  g.runs.fight({ record: false });
  const rep = g.runs.abandon();
  assert.equal(rep.reason, 'abandon');
  assert.equal(g.runs.run, null);
});

test('maîtrise : points par niveau, chaîne de prérequis, effets réels, réinitialisation', () => {
  const g = newGame();
  assert.equal(g.progression.availablePoints(), 0);
  g.master.addXp(1e6);
  const pts = g.progression.availablePoints();
  assert.ok(pts > 3);
  assert.equal(g.progression.upgrade('mm_fury').ok, false, 'prérequis');
  const atk0 = g.mods.get().monsterAtk;
  assert.ok(g.progression.upgrade('mm_vigor').ok);
  assert.ok(g.progression.upgrade('mm_fury').ok);
  assert.ok(g.mods.get().monsterAtk > atk0);
  assert.equal(g.progression.availablePoints(), pts - 2);
  g.state.resources.crystals = 1000;
  assert.ok(g.progression.respec().ok);
  assert.equal(g.progression.availablePoints(), pts);
});

test('récompenses de niveau du Maître versées une seule fois par niveau', () => {
  const g = newGame();
  const c0 = g.state.resources.crystals;
  g.master.addXp(g.master.xpToNext());
  const c1 = g.state.resources.crystals;
  assert.ok(c1 > c0);
  g.progression.grantLevelRewards();
  assert.equal(g.state.resources.crystals, c1);
});

test('sauvegarde migrée : aucune récompense de niveau rétroactive', () => {
  const g = lateGame();
  assert.equal(g.state.player.rewardedLevel, g.state.player.level);
  assert.ok(g.progression.availablePoints() > 0, 'points de maîtrise rétroactifs');
});

test('niveaux de malédiction croissants', () => {
  for (let i = 1; i < CURSE_LEVELS.length; i++) {
    assert.ok(CURSE_LEVELS[i].reward > CURSE_LEVELS[i - 1].reward);
    assert.ok(CURSE_LEVELS[i].enemy > CURSE_LEVELS[i - 1].enemy);
  }
});
