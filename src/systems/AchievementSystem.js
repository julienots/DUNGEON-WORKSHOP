import { ACHIEVEMENTS } from '../data/achievements.js';

/** Succès : progression, déblocage et réclamation des récompenses. */
export class AchievementSystem {
  constructor(game) {
    this.game = game;
    this.notified = new Set();
  }

  list() {
    const claimed = this.game.state.achievements.claimed;
    return ACHIEVEMENTS.map((a) => {
      const value = this.game.stats.get(a.stat);
      return { def: a, value: Math.min(value, a.target), target: a.target, done: value >= a.target, claimed: !!claimed[a.id] };
    });
  }

  /** Vérifie les nouveaux succès débloqués (appelé quand une statistique change). */
  check() {
    for (const a of this.list()) {
      if (a.done && !a.claimed && !this.notified.has(a.def.id)) {
        this.notified.add(a.def.id);
        this.game.bus.emit('achievementUnlocked', a.def);
      }
    }
  }

  claim(id) {
    const a = this.list().find((x) => x.def.id === id);
    if (!a || !a.done || a.claimed) return { ok: false };
    this.game.state.achievements.claimed[id] = Date.now();
    this.game.economy.add(a.def.reward);
    this.game.bus.emit('achievementsChanged');
    this.game.bus.emit('sfx', 'reward');
    this.game.requestSave();
    return { ok: true, reward: a.def.reward };
  }

  claimableCount() {
    return this.list().filter((a) => a.done && !a.claimed).length;
  }

  /** Marque comme déjà notifiés les succès débloqués avant le chargement (pas de spam au démarrage). */
  primeNotified() {
    for (const a of this.list()) if (a.done) this.notified.add(a.def.id);
  }
}
