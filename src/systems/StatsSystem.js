/** Compteurs de statistiques (servent aux missions et aux succès). */
export class StatsSystem {
  constructor(game) {
    this.game = game;
  }

  get s() {
    return this.game.state.stats;
  }

  add(key, n = 1) {
    if (!n) return;
    this.s[key] = (this.s[key] || 0) + n;
    this.game.bus.emit('stat', key, this.s[key]);
  }

  emitChange(key) {
    this.game.bus.emit('stat', key, this.get(key));
  }

  /** Valeur d'un compteur ou d'une valeur dérivée. */
  get(key) {
    const g = this.game;
    switch (key) {
      case 'masterLevel':
        return g.state.player.level;
      case 'maxFloor':
        return Math.max(this.s.maxFloor || 1, g.state.floors.length);
      case 'maxMonsterLevel':
        return g.state.monsters.reduce((m, x) => Math.max(m, x.level), 0);
      case 'speciesDiscovered':
        return g.codex.count('monsters').found;
      case 'speciesDiscoveredPct': {
        const c = g.codex.count('monsters');
        return Math.floor((c.found / c.total) * 100);
      }
      case 'legendaryOwned':
        return g.state.monsters.filter((m) => ['legendary', 'mythic', 'ancient'].includes(g.monsters.species(m).rarity)).length;
      case 'mythicOwned':
        return g.state.monsters.filter((m) => ['mythic', 'ancient'].includes(g.monsters.species(m).rarity)).length;
      case 'ancientOwned':
        return g.state.monsters.filter((m) => g.monsters.species(m).rarity === 'ancient').length;
      case 'ascensions':
        return g.state.prestige.count;
      default:
        return this.s[key] || 0;
    }
  }
}
