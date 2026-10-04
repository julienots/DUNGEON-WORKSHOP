import { ECONOMY } from '../config/economy.js';

/** Niveau du Maître du donjon (le joueur). */
export class MasterSystem {
  constructor(game) {
    this.game = game;
  }

  xpToNext(level = this.game.state.player.level) {
    return Math.round(ECONOMY.master.xpBase * Math.pow(ECONOMY.master.xpGrowth, level - 1));
  }

  addXp(amount) {
    const p = this.game.state.player;
    p.xp += Math.max(0, Math.round(amount));
    let ups = 0;
    while (p.xp >= this.xpToNext(p.level) && p.level < 999) {
      p.xp -= this.xpToNext(p.level);
      p.level++;
      ups++;
    }
    if (ups) {
      this.game.mods.invalidate();
      this.game.stats.emitChange('masterLevel');
      this.game.bus.emit('masterLevelUp', p.level);
      this.game.bus.emit('sfx', 'levelup');
    }
    return ups;
  }
}
