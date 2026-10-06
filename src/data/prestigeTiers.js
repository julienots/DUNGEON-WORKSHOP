/**
 * PRESTIGE 2.0 — paliers au-delà de l'Ascension.
 *  Ascension → Renaissance → Transcendance → Maître dimensionnel
 * Chaque palier réinitialise davantage, mais donne des bonus PERMANENTS plus forts.
 *  requires  conditions d'accès
 *  resets    ce que le palier réinitialise en plus de l'Ascension
 *  perTier   bonus permanents par palier obtenu (clés de ModifierSystem)
 *  unlocks   mécaniques débloquées au N-ième passage
 */
export const PRESTIGE_TIERS = {
  rebirth: {
    name: 'Renaissance', icon: '🔥', color: '#ff9c4a', currency: 'Braises de renaissance', currencyIcon: '🔥',
    requires: { ascensions: 3, floor: 15 },
    desc: 'Un nouveau départ plus puissant : l’Essence du Maître et les améliorations d’Ascension sont réinitialisées.',
    resets: ['ascensionUpgrades', 'masterEssence'],
    perTier: { goldGain: 0.25, materialGain: 0.25, essenceGain: 0.25, monsterHp: 0.1, monsterAtk: 0.1 },
  },
  transcendence: {
    name: 'Transcendance', icon: '🌠', color: '#b56cff', currency: 'Éclats transcendants', currencyIcon: '🌠',
    requires: { rebirths: 3, floor: 30 },
    desc: 'Dépasse les limites du donjon : débloque des mécaniques avancées. Les Renaissances sont réinitialisées.',
    resets: ['ascensionUpgrades', 'masterEssence', 'rebirthUpgrades'],
    perTier: { goldGain: 0.5, essenceGain: 0.5, xpGain: 0.25, monsterHp: 0.2, monsterAtk: 0.2, trapDamage: 0.2 },
    unlocks: [
      { at: 1, id: 'mutation_slot', desc: '4e emplacement de mutation' },
      { at: 2, id: 'team_slot', desc: '+1 monstre dans les équipes des modes de jeu' },
      { at: 3, id: 'evolve_discount', desc: '-25 % sur le coût des évolutions' },
    ],
  },
  dimensional: {
    name: 'Maître dimensionnel', icon: '🌌', color: '#3cf2d0', currency: 'Rangs dimensionnels', currencyIcon: '🌌',
    requires: { transcendences: 3, infinite: 100 },
    desc: 'Contenu endgame : chaque rang rend votre maîtrise des dimensions plus absolue.',
    resets: ['ascensionUpgrades', 'masterEssence', 'rebirthUpgrades', 'transcendenceUpgrades'],
    perTier: { goldGain: 1, essenceGain: 1, darkGain: 0.5, crystalGain: 0.25, monsterHp: 0.35, monsterAtk: 0.35, bossDamage: 0.25 },
    unlocks: [{ at: 1, id: 'dimensional_cosmetics', desc: 'Skin Doré et Trône d’obsidienne' }],
  },
};

export const TIER_IDS = Object.keys(PRESTIGE_TIERS);

/** Améliorations achetées avec la monnaie de chaque palier. */
export const TIER_UPGRADES = {
  rebirth: [
    { id: 'rb_start', name: 'Départ fulgurant', icon: '🚀', max: 5, cost: (l) => 1 + l, desc: 'Ressources de départ ×2 par niveau après chaque Ascension.', effects: [{ mod: 'startingResources', value: 1 }] },
    { id: 'rb_essence', name: 'Flamme intérieure', icon: '🔥', max: 10, cost: (l) => 1 + l, desc: '+20 % d’Essence du Maître gagnée par niveau.', effects: [{ mod: 'masterEssenceGain', value: 0.2 }] },
    { id: 'rb_monsters', name: 'Sang renouvelé', icon: '❤️', max: 10, cost: (l) => 1 + Math.floor(l / 2), desc: '+8 % PV et attaque des monstres par niveau.', effects: [{ mod: 'monsterHp', value: 0.08 }, { mod: 'monsterAtk', value: 0.08 }] },
    { id: 'rb_research', name: 'Savoir ancestral', icon: '📚', max: 5, cost: (l) => 2 + l, desc: '-10 % de durée de recherche par niveau.', effects: [{ mod: 'researchSpeed', value: 0.1 }] },
  ],
  transcendence: [
    { id: 'tr_power', name: 'Puissance transcendante', icon: '🌠', max: 10, cost: (l) => 1 + l, desc: '+15 % de dégâts des monstres et pièges par niveau.', effects: [{ mod: 'monsterAtk', value: 0.15 }, { mod: 'trapDamage', value: 0.15 }] },
    { id: 'tr_wealth', name: 'Richesse infinie', icon: '💰', max: 10, cost: (l) => 1 + l, desc: '+30 % de tous les gains par niveau.', effects: [{ mod: 'goldGain', value: 0.3 }, { mod: 'materialGain', value: 0.3 }, { mod: 'essenceGain', value: 0.3 }] },
    { id: 'tr_offline', name: 'Absence éternelle', icon: '🌙', max: 3, cost: (l) => 2 + l * 2, desc: '+2 h de progression hors ligne par niveau.', effects: [{ mod: 'offlineHours', value: 2 }] },
  ],
};

/** Monnaie gagnée en franchissant un palier. */
export function tierGain(tier, state) {
  const p = state.prestige;
  const t = p.tiers || {};
  if (tier === 'rebirth') {
    const since = Math.max(0, (p.totalMasterEssence || 0) - (t.rebirth?.essenceMark || 0));
    return Math.max(1, Math.floor(Math.sqrt(since / 50)));
  }
  if (tier === 'transcendence') return Math.max(1, (t.rebirth?.count || 0) + Math.floor((state.stats.maxFloor || 1) / 20));
  return 1;
}
