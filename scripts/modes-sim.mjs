/**
 * Calibrage des modes : joue des runs automatiques sur les sauvegardes de référence (tests/fixtures).
 * Usage : node scripts/modes-sim.mjs [nbRuns]
 */
import { readFileSync } from 'node:fs';
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { SAVE_KEY } from '../src/utils/constants.js';
import { CHALLENGES, CURSE_LEVELS } from '../src/data/modes.js';

const N = Number(process.argv[2] || 12);
const MODES = ['survival', 'challenge', 'random', 'roguelite', 'cursed', 'bossRush', 'infinite'];

function load(name) {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, readFileSync(`tests/fixtures/save-v1-${name}.json`, 'utf8'));
  const g = new Game({ storage });
  const raw = JSON.parse(JSON.parse(storage.getItem(SAVE_KEY)).d);
  g.loadOrCreate(raw.lastSaveTimestamp + 1000);
  return g;
}

for (const fx of ['early', 'mid', 'late']) {
  const base = load(fx);
  const team = base.state.monsters.slice().sort((a, b) => base.monsters.power(b) - base.monsters.power(a)).slice(0, 5).map((m) => m.uid);
  const snapshot = JSON.stringify(base.state);
  console.log(`\n=== ${fx} (réf. niveau ${base.runs.rosterRefLevel()}, équipe ${team.map((u) => base.monsters.get(u).level).join('/')})`);
  for (const mode of MODES) {
    const opts = (i) => ({
      teamUids: team, seed: 1000 + i,
      challenge: mode === 'challenge' ? Object.keys(CHALLENGES)[i % Object.keys(CHALLENGES).length] : undefined,
      curse: mode === 'cursed' ? CURSE_LEVELS[i % 3].level : undefined,
    });
    const scores = [];
    let wins = 0;
    let gold = 0;
    let crystals = 0;
    for (let i = 0; i < N; i++) {
      const g = new Game({ storage: new MemoryStorage() });
      g.state = JSON.parse(snapshot);
      g.afterLoad();
      g.runs.isUnlocked = () => true;
      const st = g.runs.start(mode, opts(i));
      if (!st.ok) {
        console.log(mode, st.reason);
        break;
      }
      let rep = null;
      for (let s = 0; s < 400 && !rep; s++) {
        while (g.runs.run?.pending) g.runs.choose(0);
        const r = g.runs.fight({ record: false });
        if (r.ended) rep = r.endReport;
      }
      if (!rep) rep = g.runs.end('abandon');
      scores.push(rep.score);
      if (rep.success) wins++;
      gold += rep.rewards.gold || 0;
      crystals += rep.rewards.crystals || 0;
    }
    scores.sort((a, b) => a - b);
    console.log(`${mode.padEnd(10)} score médian ${scores[Math.floor(scores.length / 2)]} [${scores[0]}–${scores[scores.length - 1]}]  réussites ${wins}/${N}  or/run ${Math.round(gold / N)}  cristaux/run ${Math.round(crystals / N)}`);
  }
}
