import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { cellKey } from '../src/utils/helpers.js';

export function newGame(storage = new MemoryStorage()) {
  const g = new Game({ storage });
  g.newGame(Date.now());
  return g;
}

export function addRoom(g, fi, x, y, room, level = 1, trap = null) {
  g.state.floors[fi].cells[cellKey(x, y)] = { room, level, trap };
}

export function rich(g, amount = 1e9) {
  for (const k of Object.keys(g.state.resources)) g.state.resources[k] = amount;
}
