/**
 * ÉCONOMIE CENTRALISÉE
 * --------------------
 * Toutes les valeurs d'équilibrage du jeu sont ici (et dans balance.js pour le combat).
 * Les scènes et systèmes ne doivent jamais contenir de nombres "magiques" d'économie.
 */
export const ECONOMY = {
  resources: {
    gold: { name: 'Or', icon: 'gold', startingAmount: 500 },
    stone: { name: 'Pierre', icon: 'stone', startingAmount: 120 },
    metal: { name: 'Métal', icon: 'metal', startingAmount: 20 },
    crystals: { name: 'Cristaux', icon: 'crystals', startingAmount: 60 },
    essence: { name: 'Essence', icon: 'essence', startingAmount: 15 },
    darkEssence: { name: 'Essence obscure', icon: 'darkEssence', startingAmount: 0 },
    legendaryEssence: { name: 'Essence légendaire', icon: 'legendaryEssence', startingAmount: 0 },
    dimensionalFragments: { name: 'Fragments dimensionnels', icon: 'dimensionalFragments', startingAmount: 0 },
  },

  /** Ce à quoi sert chaque ressource (affiché dans l'aide). */
  resourceUsage: {
    gold: 'Construction, améliorations, invocations, recherche.',
    stone: 'Creuser et construire des salles, agrandir les étages.',
    metal: 'Pièges, équipements et salles avancées.',
    crystals: 'Invocations rares, accélérations et boutique.',
    essence: 'Niveaux et évolutions des monstres, recherche.',
    darkEssence: 'Évolutions légendaires, salles dimensionnelles, étages profonds.',
    legendaryEssence: 'Mutations, coffres légendaires et skins. Conservée après l’Ascension.',
    dimensionalFragments: 'Modes spéciaux, portails et prestige avancé. Conservés après l’Ascension.',
  },

  raid: {
    /** Secondes entre deux groupes d'aventuriers sur un même étage. */
    baseInterval: 30,
    minInterval: 12,
    /** Durée de déplacement d'une case à l'autre (secondes de simulation). */
    walkStepTime: 0.75,
    /** Temps max d'un combat avant retraite des aventuriers. */
    maxCombatTime: 60,
    /** Pourcentage du coffre volé quand un groupe atteint le coffre. */
    lootStealRatio: 0.08,
    lootStealMax: 0.25,
    /** Menace: progression dynamique de la difficulté par étage. */
    threatPerWin: 1,
    threatPerLoss: -3,
    threatLevelFactor: 1,
    /** Nombre de raids d'avance pré-simulés pour un étage hors écran. */
    historySize: 30,
  },

  rewards: {
    /** Butin par aventurier vaincu (multiplié par la croissance de niveau). */
    bounty: { gold: 20, stone: 5, metal: 1.4, essence: 0.5 },
    bountyGrowth: 1.115,
    /** Chances par aventurier vaincu. */
    equipmentDropChance: 0.035,
    crystalDropChance: 0.015,
    darkEssenceFromFloor: 4,
    darkEssenceChance: 0.1,
    /** XP de monstre par aventurier vaincu (partagée entre participants). */
    monsterXpPerKill: 6,
    monsterXpGrowth: 1.08,
    /** L'XP diminue quand un monstre dépasse nettement le niveau des aventuriers. */
    xpLevelGapFree: 3,
    xpLevelGapPenalty: 0.12,
    /** XP du Maître du donjon */
    masterXpPerKill: 3,
    /** Bonus quand tout le groupe est anéanti. */
    wipeBonus: 0.25,
  },

  master: {
    xpBase: 60,
    xpGrowth: 1.22,
    goldBonusPerLevel: 0.01,
  },

  treasury: {
    baseCapacity: 3000,
    capacityGrowth: 1.32,
    baseIncomePerMin: 18,
    incomeGrowth: 1.17,
    upgradeCost: { gold: 350, stone: 60, metal: 10 },
    upgradeGrowth: 1.42,
    maxLevel: 200,
    /** Paliers de bonus (le niveau débloque le bonus). */
    milestones: [
      { level: 3, desc: '+10% d’or des raids', mods: { goldGain: 0.1 } },
      { level: 5, desc: '+1h de progression hors ligne', mods: { offlineHours: 1 } },
      { level: 8, desc: '+10% de matériaux', mods: { materialGain: 0.1 } },
      { level: 10, desc: '+15% d’or des raids', mods: { goldGain: 0.15 } },
      { level: 15, desc: '+2h de progression hors ligne', mods: { offlineHours: 2 } },
      { level: 20, desc: '+5% de chance d’objets', mods: { dropChance: 0.05 } },
      { level: 25, desc: '+25% d’or des raids', mods: { goldGain: 0.25 } },
      { level: 35, desc: '+20% d’essence', mods: { essenceGain: 0.2 } },
      { level: 50, desc: '+50% d’or des raids', mods: { goldGain: 0.5 } },
      { level: 75, desc: '+3h de progression hors ligne', mods: { offlineHours: 3 } },
      { level: 100, desc: '+100% d’or, coffre légendaire', mods: { goldGain: 1 } },
    ],
  },

  rooms: {
    upgradeGrowth: 1.16,
    sellRefund: 0.5,
    moveCostGold: 25,
  },

  floors: {
    /** Coût de déblocage d'un nouvel étage n (n >= 2). */
    unlockBaseCost: { gold: 4000, stone: 400, metal: 60 },
    /** Croissance linéaire supplémentaire par étage (en plus de l'échelle économique de l'étage). */
    unlockGrowth: 0.2,
    darkEssenceFromFloor: 6,
    /** Coût d'agrandissement (ligne ou colonne). */
    expandBaseCost: { gold: 400, stone: 200 },
    expandGrowth: 1.7,
    /** Nombre minimum de raids repoussés sur l'étage précédent pour débloquer le suivant. */
    raidsToUnlockNext: 8,
    /** Étages déjà conquis lors d'une partie précédente (≤ meilleur étage) : part des raids exigés. */
    reconquestRaidShare: 0.25,
  },

  monsters: {
    levelUpCost: { gold: 45, essence: 3 },
    levelUpGrowth: 1.13,
    xpToLevel: 40,
    xpGrowth: 1.17,
    evolveCostMult: 1,
    maxRosterBase: 30,
    releaseRefund: { essence: 3 },
  },

  traps: {
    upgradeGrowth: 1.3,
    sellRefund: 0.5,
  },

  equipment: {
    upgradeBaseCost: { gold: 120, metal: 6 },
    upgradeGrowth: 1.28,
    fuseCount: 3,
    fuseCost: { gold: 500, essence: 5 },
    fuseCostGrowth: 3,
    recycleBase: { metal: 4, essence: 1 },
    recycleRarityMult: 2.6,
    maxInventory: 150,
  },

  research: {
    rushCrystalsPerMinute: 0.5,
    rushMinCrystals: 2,
  },

  offline: {
    baseCapHours: 8,
    maxCapHours: 24,
    minSecondsForReport: 60,
    /** Efficacité de la simulation hors ligne (évite de rendre le hors-ligne plus rentable). */
    efficiency: 0.85,
    sampleRaids: 6,
    maxItemsFound: 12,
  },

  shop: {
    summons: {
      basic: { name: 'Portail mineur', cost: { gold: 900 }, costGrowth: 1.06, maxGrowthSteps: 60, pool: 'basic' },
      advanced: { name: 'Portail ancien', cost: { crystals: 120 }, pool: 'advanced' },
      advanced10: { name: 'Portail ancien ×10', cost: { crystals: 1080 }, pool: 'advanced', count: 10 },
      dark: { name: 'Portail du Néant', cost: { darkEssence: 60, crystals: 200 }, pool: 'dark' },
    },
    equipmentChest: { name: 'Coffre d’armurerie', cost: { gold: 1500, metal: 40 }, costGrowth: 1.04 },
    freeChestCooldownHours: 4,
    exchanges: [
      { id: 'crystals_to_gold', name: 'Lingots d’or', give: { crystals: 20 }, get: { gold: 5000 }, scaleWithFloor: true },
      { id: 'crystals_to_essence', name: 'Fiole d’essence', give: { crystals: 25 }, get: { essence: 60 }, scaleWithFloor: true },
      { id: 'gold_to_stone', name: 'Carrière', give: { gold: 1500 }, get: { stone: 500 }, scaleWithFloor: true },
      { id: 'gold_to_metal', name: 'Fonderie', give: { gold: 2500 }, get: { metal: 120 }, scaleWithFloor: true },
      { id: 'essence_to_dark', name: 'Distillation obscure', give: { essence: 400, crystals: 30 }, get: { darkEssence: 15 }, minFloor: 5 },
    ],
  },

  prestige: {
    minFloor: 10,
    /** Essence du Maître = floor(base * (maxFloor - minFloor + 1)^exp * (1 + log10(totalGold)/goldLogDiv)) */
    base: 10,
    exponent: 1.45,
    goldLogDiv: 12,
  },

  autosaveSeconds: 20,
};

/** Paliers de progression du donjon (thèmes / noms). */
export const DUNGEON_TIERS = [
  { minFloor: 1, name: 'Petite grotte', theme: 'cave' },
  { minFloor: 5, name: 'Donjon', theme: 'crypt' },
  { minFloor: 10, name: 'Forteresse', theme: 'fortress' },
  { minFloor: 20, name: 'Citadelle souterraine', theme: 'citadel' },
  { minFloor: 35, name: 'Royaume démoniaque', theme: 'demonic' },
  { minFloor: 50, name: 'Donjon dimensionnel', theme: 'dimensional' },
  { minFloor: 100, name: 'Donjon infini', theme: 'infinite' },
];
