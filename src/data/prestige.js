/**
 * ASCENSION (prestige)
 * Améliorations permanentes achetées avec l'Essence du Maître.
 * cost(level) = baseCost * growth^level
 */
export const PRESTIGE_UPGRADES = [
  { id: 'pr_wealth', name: 'Avarice éternelle', icon: '🪙', desc: '+5% de revenus par niveau.', maxLevel: 100, baseCost: 1, growth: 1.25, effects: [{ mod: 'goldGain', value: 0.05 }, { mod: 'materialGain', value: 0.05 }] },
  { id: 'pr_wisdom', name: 'Sagesse ancestrale', icon: '📚', desc: '+5% d’XP par niveau.', maxLevel: 100, baseCost: 1, growth: 1.25, effects: [{ mod: 'xpGain', value: 0.05 }] },
  { id: 'pr_fury', name: 'Fureur du Maître', icon: '⚔️', desc: '+10% de dégâts des monstres et pièges par niveau.', maxLevel: 100, baseCost: 2, growth: 1.3, effects: [{ mod: 'monsterAtk', value: 0.1 }, { mod: 'trapDamage', value: 0.1 }] },
  { id: 'pr_resilience', name: 'Chair éternelle', icon: '❤️', desc: '+10% de PV des monstres par niveau.', maxLevel: 100, baseCost: 2, growth: 1.3, effects: [{ mod: 'monsterHp', value: 0.1 }] },
  { id: 'pr_thrift', name: 'Économie infernale', icon: '💸', desc: '-3% de tous les coûts par niveau (max -45%).', maxLevel: 15, baseCost: 3, growth: 1.5, effects: [{ mod: 'globalCost', value: -0.03 }] },
  { id: 'pr_heritage', name: 'Héritage', icon: '🎁', desc: 'Commence chaque Ascension avec plus de ressources (×2 par niveau).', maxLevel: 10, baseCost: 2, growth: 1.8, effects: [{ mod: 'startingResources', value: 1 }] },
  { id: 'pr_essence', name: 'Distillation d’âmes', icon: '🔥', desc: '+10% d’essence et d’essence obscure par niveau.', maxLevel: 50, baseCost: 2, growth: 1.3, effects: [{ mod: 'essenceGain', value: 0.1 }, { mod: 'darkGain', value: 0.1 }] },
  { id: 'pr_patience', name: 'Patience infinie', icon: '🌙', desc: '+2h de progression hors ligne par niveau.', maxLevel: 6, baseCost: 4, growth: 1.8, effects: [{ mod: 'offlineHours', value: 2 }] },
  { id: 'pr_species', name: 'Lignées oubliées', icon: '🐲', desc: 'Niv. 1 : monstres mythiques aux portails. Niv. 3 : monstres anciens.', maxLevel: 3, baseCost: 10, growth: 2.5, effects: [{ mod: 'summonTier', value: 1 }] },
  { id: 'pr_floors', name: 'Abysses', icon: '🕳️', desc: '-15% du coût des nouveaux étages et les étages commencent plus grands.', maxLevel: 5, baseCost: 5, growth: 2, effects: [{ mod: 'floorCost', value: -0.15 }, { mod: 'floorSize', value: 1 }] },
  { id: 'pr_research', name: 'Mémoire du savoir', icon: '🧪', desc: '-10% de durée de recherche par niveau.', maxLevel: 8, baseCost: 3, growth: 1.6, effects: [{ mod: 'researchSpeed', value: 0.1 }] },
  { id: 'pr_crystals', name: 'Veine de cristal', icon: '💎', desc: '+10% de cristaux gagnés par niveau.', maxLevel: 20, baseCost: 4, growth: 1.4, effects: [{ mod: 'crystalGain', value: 0.1 }] },
];

/** Titres d'Ascension */
export const ASCENSION_TITLES = [
  { count: 0, title: 'Maître novice' },
  { count: 1, title: 'Maître éveillé' },
  { count: 3, title: 'Seigneur des profondeurs' },
  { count: 5, title: 'Archimaître' },
  { count: 10, title: 'Souverain abyssal' },
  { count: 20, title: 'Dieu du donjon' },
];
