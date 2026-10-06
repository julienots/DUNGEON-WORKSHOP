/**
 * COFFRES (V2) — commun → ancien.
 *  rolls     nombre de récompenses tirées
 *  loot      tables pondérées : resources | monster | equipment | serum | skin | decoration | fragments
 *  monster   raretés possibles des monstres
 *  equip     raretés possibles des équipements
 *  res       quantités de base (multipliées par l'économie de l'étage pour l'or/la pierre/le métal/l'essence)
 */
export const CHESTS = {
  common: {
    name: 'Coffre commun', icon: '📦', color: '#b8c0cc', rolls: 2,
    loot: { resources: 70, equipment: 20, monster: 8, decoration: 2 },
    monster: { common: 80, rare: 20 }, equip: { common: 70, rare: 30 },
    res: { gold: 400, stone: 120, crystals: 5 },
  },
  rare: {
    name: 'Coffre rare', icon: '🎁', color: '#4fa3ff', rolls: 3,
    loot: { resources: 55, equipment: 25, monster: 12, serum: 3, decoration: 3, skin: 2 },
    monster: { common: 40, rare: 50, epic: 10 }, equip: { rare: 70, epic: 30 },
    res: { gold: 1200, metal: 60, essence: 40, crystals: 15 },
  },
  epic: {
    name: 'Coffre épique', icon: '💜', color: '#b56cff', rolls: 3,
    loot: { resources: 45, equipment: 25, monster: 15, serum: 6, decoration: 5, skin: 4 },
    monster: { rare: 55, epic: 40, legendary: 5 }, equip: { epic: 75, legendary: 25 },
    res: { gold: 4000, essence: 150, crystals: 40, legendaryEssence: 1 },
  },
  legendary: {
    name: 'Coffre légendaire', icon: '🌟', color: '#ffb52e', rolls: 4,
    loot: { resources: 35, equipment: 25, monster: 18, serum: 9, decoration: 6, skin: 6, fragments: 1 },
    monster: { epic: 60, legendary: 37, mythic: 3 }, equip: { legendary: 80, mythic: 20 },
    res: { gold: 12000, essence: 500, darkEssence: 20, crystals: 100, legendaryEssence: 3 },
  },
  mythic: {
    name: 'Coffre mythique', icon: '🔴', color: '#ff4f6d', rolls: 5,
    loot: { resources: 30, equipment: 22, monster: 20, serum: 12, decoration: 6, skin: 7, fragments: 3 },
    monster: { legendary: 75, mythic: 25 }, equip: { legendary: 40, mythic: 60 },
    res: { gold: 40000, essence: 1500, darkEssence: 60, crystals: 250, legendaryEssence: 8, dimensionalFragments: 1 },
  },
  ancient: {
    name: 'Coffre ancien', icon: '🏺', color: '#3cf2d0', rolls: 6,
    loot: { resources: 25, equipment: 20, monster: 22, serum: 14, decoration: 7, skin: 8, fragments: 4 },
    monster: { legendary: 40, mythic: 50, ancient: 10 }, equip: { mythic: 70, ancient: 30 },
    res: { gold: 120000, essence: 5000, darkEssence: 200, crystals: 600, legendaryEssence: 20, dimensionalFragments: 3 },
  },
};

export const CHEST_IDS = Object.keys(CHESTS);

/** Coffres achetables en boutique. */
export const CHEST_SHOP = {
  rare: { cost: { crystals: 120 } },
  epic: { cost: { crystals: 350 } },
  legendary: { cost: { crystals: 600, legendaryEssence: 10 } },
  mythic: { cost: { legendaryEssence: 40, dimensionalFragments: 5 } },
};
