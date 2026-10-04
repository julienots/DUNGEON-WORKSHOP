/**
 * Outil d'équilibrage : simule des raids sur des scénarios types et affiche les taux de victoire.
 * Usage : npm run balance
 */
import { Game } from '../src/core/Game.js';
import { cellKey } from '../src/utils/helpers.js';

function scenario(name, setup, threats = [0, 3, 6, 10, 14]) {
  const g = new Game();
  g.newGame();
  setup(g);
  const out = [];
  for (const th of threats) {
    for (let fi = 0; fi < g.state.floors.length; fi++) g.state.floors[fi].threat = th;
    const fi = g.state.floors.length - 1;
    let wins = 0;
    let gold = 0;
    let dur = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const r = g.raids.simulate(fi, { seed: i * 7 + th, record: false });
      if (r.outcome !== 'looted') wins++;
      gold += r.rewards.gold || 0;
      dur += r.duration;
    }
    out.push(`th${th}: ${Math.round((wins / N) * 100)}% win, ${Math.round(gold / N)} or/raid, ${(dur / N).toFixed(1)}s`);
  }
  console.log(name.padEnd(42), out.join(' | '));
}

const place = (g, species, fi, x, y, level = 1) => {
  const m = species === 'first' ? g.state.monsters[0] : g.monsters.create(species);
  m.level = level;
  m.location = { floor: fi, x, y };
  return m;
};
const room = (g, fi, x, y, id, level = 1, trap = null) => {
  g.state.floors[fi].cells[cellKey(x, y)] = { room: id, level, trap };
};

scenario('Départ : gobelin seul', () => {});
scenario('Gobelin + Squelette en salle combat', (g) => {
  room(g, 0, 2, 1, 'combat');
  place(g, 'skeleton', 0, 2, 1);
});
scenario('3 monstres niv.5 + piège', (g) => {
  g.state.monsters[0].level = 5;
  room(g, 0, 2, 1, 'combat', 3, { id: 'spikes', level: 3 });
  place(g, 'skeleton', 0, 2, 1, 5);
  place(g, 'slime', 0, 2, 1, 5);
});
scenario('Étage 2 : 5 monstres niv.12', (g) => {
  g.state.floors.push(JSON.parse(JSON.stringify(g.state.floors[0])));
  g.state.floors[1].number = 2;
  room(g, 1, 2, 1, 'combat', 5, { id: 'spikes', level: 6 });
  room(g, 1, 0, 1, 'combat', 5, { id: 'arrows', level: 6 });
  for (const [sp, x] of [['goblin', 2], ['skeleton', 2], ['orc', 2], ['slime', 0], ['bat', 0]]) place(g, sp, 1, x, 1, 12);
});
scenario('Étage 5 : 7 monstres rares niv.25', (g) => {
  for (let i = 1; i < 5; i++) {
    g.state.floors.push(JSON.parse(JSON.stringify(g.state.floors[0])));
    g.state.floors[i].number = i + 1;
  }
  room(g, 4, 2, 1, 'combat', 12, { id: 'fire', level: 12 });
  room(g, 4, 0, 1, 'combat', 12, { id: 'poison', level: 12 });
  room(g, 4, 1, 3, 'lava', 10, { id: 'spikes', level: 12 });
  for (const [sp, x, y] of [['goblin_warrior', 2, 1], ['skeleton_warrior', 2, 1], ['orc_berserker', 2, 1], ['troll', 0, 1], ['slime_giant', 0, 1], ['slime_magma', 1, 3], ['golem', 1, 1]]) place(g, sp, 4, x, y, 25);
});
