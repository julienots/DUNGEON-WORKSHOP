import { MASTERY_TREES, MASTERY_NODES, masteryPointsForLevel, MASTERY_RESPEC_COST, masterLevelReward } from '../data/mastery.js';

/**
 * PROGRESSION DU MAÎTRE (V2) : récompenses de niveau et arbres de maîtrise.
 * Les points dépensés sont stockés dans `player.mastery` ({ nodeId: niveau }) ; les points disponibles
 * se déduisent du niveau (aucune désynchronisation possible). Les effets passent par ModifierSystem.
 */
export class ProgressionSystem {
  constructor(game) {
    this.game = game;
    game.bus.on('masterLevelUp', () => this.grantLevelRewards());
  }

  get p() {
    return this.game.state.player;
  }

  totalPoints() {
    return masteryPointsForLevel(this.p.level);
  }

  spentPoints() {
    let n = 0;
    for (const [id, lvl] of Object.entries(this.p.mastery || {})) n += (MASTERY_NODES[id]?.cost || 0) * lvl;
    return n;
  }

  availablePoints() {
    return Math.max(0, this.totalPoints() - this.spentPoints());
  }

  level(id) {
    return this.p.mastery?.[id] || 0;
  }

  canUpgrade(id) {
    const node = MASTERY_NODES[id];
    if (!node) return { ok: false, reason: 'Nœud inconnu' };
    if (this.level(id) >= node.max) return { ok: false, reason: 'Niveau maximum' };
    if (node.index > 0) {
      const prev = MASTERY_TREES[node.tree].nodes[node.index - 1];
      if (this.level(prev.id) < 1) return { ok: false, reason: `Requiert ${prev.name}` };
    }
    if (this.availablePoints() < node.cost) return { ok: false, reason: 'Points de maîtrise insuffisants' };
    return { ok: true };
  }

  upgrade(id) {
    const check = this.canUpgrade(id);
    if (!check.ok) return check;
    this.p.mastery[id] = this.level(id) + 1;
    this.game.mods.invalidate();
    this.game.bus.emit('masteryChanged');
    this.game.bus.emit('sfx', 'upgrade');
    this.game.requestSave(true);
    return { ok: true };
  }

  respec() {
    if (!this.spentPoints()) return { ok: false, reason: 'Aucun point dépensé' };
    const cost = { crystals: MASTERY_RESPEC_COST };
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: `${MASTERY_RESPEC_COST} cristaux requis` };
    this.game.economy.spend(cost);
    this.p.mastery = {};
    this.game.mods.invalidate();
    this.game.bus.emit('masteryChanged');
    this.game.requestSave(true);
    return { ok: true };
  }

  /** Effets agrégés (lus par ModifierSystem). */
  effects() {
    const out = [];
    for (const [id, lvl] of Object.entries(this.p.mastery || {})) {
      const n = MASTERY_NODES[id];
      if (!n || !lvl) continue;
      for (const e of n.effects) out.push({ mod: e.mod, value: e.value * lvl });
    }
    return out;
  }

  /** Verse les récompenses de chaque niveau atteint et pas encore récompensé. */
  grantLevelRewards() {
    const p = this.p;
    if (!Number.isFinite(p.rewardedLevel)) p.rewardedLevel = p.level;
    const total = {};
    for (let l = p.rewardedLevel + 1; l <= p.level; l++) {
      for (const [k, v] of Object.entries(masterLevelReward(l))) total[k] = (total[k] || 0) + v;
    }
    p.rewardedLevel = Math.max(p.rewardedLevel, p.level);
    if (Object.keys(total).length) {
      this.game.economy.add(total, false);
      this.game.bus.emit('masterRewards', { level: p.level, rewards: total });
    }
    return total;
  }
}
