import { PRESTIGE_TIERS, TIER_IDS, TIER_UPGRADES, tierGain } from '../data/prestigeTiers.js';

export function createTiersState() {
  return {
    rebirth: { count: 0, points: 0, upgrades: {}, essenceMark: 0 },
    transcendence: { count: 0, points: 0, upgrades: {} },
    dimensional: { count: 0 },
  };
}

/**
 * PRESTIGE 2.0 : Renaissance → Transcendance → Maître dimensionnel.
 * Chaque palier effectue une Ascension complète + réinitialise les paliers inférieurs,
 * et accorde des bonus permanents (ModifierSystem) et une monnaie dédiée.
 */
export class PrestigeTierSystem {
  constructor(game) {
    this.game = game;
  }

  get t() {
    const p = this.game.state.prestige;
    if (!p.tiers) p.tiers = createTiersState();
    return p.tiers;
  }

  count(tier) {
    return this.t[tier]?.count || 0;
  }

  /** Mécanique débloquée par la Transcendance / le rang dimensionnel. */
  hasUnlock(id) {
    for (const tier of TIER_IDS) {
      for (const u of PRESTIGE_TIERS[tier].unlocks || []) if (u.id === id && this.count(tier) >= u.at) return true;
    }
    return false;
  }

  requirements(tier) {
    const r = PRESTIGE_TIERS[tier].requires;
    const s = this.game.state;
    const out = [];
    if (r.ascensions) out.push({ label: `${r.ascensions} Ascensions`, ok: s.prestige.count >= r.ascensions, cur: s.prestige.count });
    if (r.rebirths) out.push({ label: `${r.rebirths} Renaissances`, ok: this.count('rebirth') >= r.rebirths, cur: this.count('rebirth') });
    if (r.transcendences) out.push({ label: `${r.transcendences} Transcendances`, ok: this.count('transcendence') >= r.transcendences, cur: this.count('transcendence') });
    if (r.floor) out.push({ label: `Atteindre l’étage ${r.floor} (partie en cours)`, ok: s.floors.length >= r.floor, cur: s.floors.length });
    if (r.infinite) out.push({ label: `Étage ${r.infinite} du mode Infini`, ok: (s.modes?.infinite?.best || 0) >= r.infinite, cur: s.modes?.infinite?.best || 0 });
    return out;
  }

  canPerform(tier) {
    if (!PRESTIGE_TIERS[tier]) return { ok: false, reason: 'Palier inconnu' };
    const miss = this.requirements(tier).find((r) => !r.ok);
    if (miss) return { ok: false, reason: miss.label };
    return { ok: true, gain: tierGain(tier, this.game.state) };
  }

  perform(tier) {
    const check = this.canPerform(tier);
    if (!check.ok) return check;
    const g = this.game;
    const p = g.state.prestige;
    const def = PRESTIGE_TIERS[tier];
    // Réinitialisations propres au palier
    for (const r of def.resets) {
      if (r === 'ascensionUpgrades') p.upgrades = {};
      if (r === 'masterEssence') p.masterEssence = 0;
      if (r === 'rebirthUpgrades') this.t.rebirth = { ...this.t.rebirth, points: 0, upgrades: {} };
      if (r === 'transcendenceUpgrades') this.t.transcendence = { ...this.t.transcendence, points: 0, upgrades: {} };
    }
    const st = this.t[tier];
    st.count = (st.count || 0) + 1;
    if ('points' in st) st.points += check.gain;
    if (tier === 'rebirth') st.essenceMark = p.totalMasterEssence || 0;
    p.runGold = 0;
    g.stats.add(`${tier}Count`, 1);
    // Récompenses de passage
    if (tier === 'transcendence') g.collection.addChest('mythic');
    if (tier === 'dimensional') {
      g.collection.addChest('ancient');
      g.state.collection.skins.golden = true;
      g.state.collection.decorations.throne = (g.state.collection.decorations.throne || 0) + 1;
    }
    g.prestige.resetRun();
    g.mods.invalidate();
    g.bus.emit('prestigeTier', { tier, count: st.count, gain: check.gain });
    g.bus.emit('prestigeChanged');
    g.bus.emit('floorsChanged');
    g.bus.emit('dungeonChanged', 0);
    g.bus.emit('monstersChanged');
    g.bus.emit('resources');
    g.bus.emit('sfx', 'ascend');
    g.requestSave(true);
    return { ok: true, gain: check.gain };
  }

  // ------------------------------------------------------------------ améliorations des paliers
  upgradeLevel(tier, id) {
    return this.t[tier]?.upgrades?.[id] || 0;
  }

  upgradeCost(tier, id) {
    const u = TIER_UPGRADES[tier]?.find((x) => x.id === id);
    return u ? u.cost(this.upgradeLevel(tier, id)) : Infinity;
  }

  buy(tier, id) {
    const u = TIER_UPGRADES[tier]?.find((x) => x.id === id);
    if (!u) return { ok: false, reason: 'Amélioration inconnue' };
    const lvl = this.upgradeLevel(tier, id);
    if (lvl >= u.max) return { ok: false, reason: 'Niveau maximum' };
    const cost = u.cost(lvl);
    const st = this.t[tier];
    if (st.points < cost) return { ok: false, reason: `${PRESTIGE_TIERS[tier].currency} insuffisantes` };
    st.points -= cost;
    st.upgrades[id] = lvl + 1;
    this.game.mods.invalidate();
    this.game.bus.emit('prestigeChanged');
    this.game.requestSave(true);
    return { ok: true };
  }

  /** Effets agrégés (lus par ModifierSystem). */
  effects() {
    const out = [];
    for (const tier of TIER_IDS) {
      const n = this.count(tier);
      if (n) for (const [mod, v] of Object.entries(PRESTIGE_TIERS[tier].perTier)) out.push({ mod, value: v * n });
      for (const u of TIER_UPGRADES[tier] || []) {
        const lvl = this.upgradeLevel(tier, u.id);
        if (lvl) for (const e of u.effects) out.push({ mod: e.mod, value: e.value * lvl });
      }
    }
    return out;
  }
}
