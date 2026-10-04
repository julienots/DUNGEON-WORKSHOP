/**
 * ÉQUILIBRAGE DU COMBAT
 * Toutes les constantes de formule de combat sont ici.
 */
export const BALANCE = {
  combat: {
    tick: 0.1, // secondes de simulation par pas
    gaugeRate: 7, // vitesse de remplissage de jauge par point de vitesse
    gaugeMax: 100,
    baseCrit: 0.05,
    baseCritDamage: 1.6,
    defenseConstant: 90,
    defensePerLevel: 6,
    variance: 0.1,
    statusTick: 1, // secondes
    tauntWeightTank: 3,
    elementStrong: 1.5,
    elementSame: 0.8,
    maxEvents: 4000,
  },

  /** Croissance des statistiques par niveau : stat = base * (1 + linear*(L-1)) * expo^(L-1) */
  growth: {
    monster: { linear: 0.09, expo: 1.012 },
    adventurer: { linear: 0.09, expo: 1.014 },
    boss: { linear: 0.1, expo: 1.016 },
    trap: { linear: 0.14, expo: 1.01 },
  },

  rarityStatMult: {
    common: 1,
    rare: 1.3,
    epic: 1.7,
    legendary: 2.25,
    mythic: 3,
    ancient: 4,
  },

  rarityMaxLevel: {
    common: 25,
    rare: 40,
    epic: 60,
    legendary: 80,
    mythic: 100,
    ancient: 120,
  },

  /** Rôle -> modèle de statistiques (base commune niveau 1). */
  roleTemplates: {
    tank: { hp: 150, atk: 14, def: 16, spd: 9 },
    bruiser: { hp: 120, atk: 20, def: 11, spd: 11 },
    dps: { hp: 90, atk: 24, def: 7, spd: 13 },
    fast: { hp: 75, atk: 18, def: 6, spd: 18 },
    caster: { hp: 80, atk: 26, def: 6, spd: 11 },
    support: { hp: 95, atk: 14, def: 9, spd: 12 },
  },

  /** Adversaires: niveau de base par étage */
  floorLevel: { base: 1, perFloor: 4.5, maxThreatBase: 10, maxThreatPerFloor: 2 },

  partySize: [
    { minFloor: 1, sizes: [2, 2, 3] },
    { minFloor: 2, sizes: [2, 3, 3] },
    { minFloor: 4, sizes: [3, 3, 4] },
    { minFloor: 8, sizes: [3, 4, 4] },
    { minFloor: 15, sizes: [4, 4, 5] },
    { minFloor: 30, sizes: [4, 5, 5] },
  ],

  /** Multiplicateur global des statistiques des aventuriers (réglage de difficulté). */
  adventurerStatMult: 0.85,
  /** Sous ce ratio de menace, les groupes ont un membre de moins (montée en difficulté douce). */
  lowThreatRatio: 0.2,

  eliteChance: 0.06,
  eliteStatMult: 1.6,
  eliteRewardMult: 3,

  /** Bonus de salle par niveau (paliers selon le cahier des charges : niv.10 = +50%, niv.50 = +300%) */
  roomLevelBonus(level) {
    if (level <= 10) return 0.05 * level;
    if (level <= 50) return 0.5 + (level - 10) * 0.0625;
    return 3 + (level - 50) * 0.04;
  },
};

export function levelMult(kind, level) {
  const g = BALANCE.growth[kind];
  const l = Math.max(1, level) - 1;
  return (1 + g.linear * l) * Math.pow(g.expo, l);
}
