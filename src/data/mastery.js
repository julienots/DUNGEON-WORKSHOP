/**
 * ARBRES DE MAÎTRISE (V2)
 * Le Maître gagne 1 point de maîtrise par niveau (à partir du niveau 2).
 * Chaque arbre est une chaîne : un nœud se débloque quand le précédent a au moins 1 niveau.
 * Les effets utilisent les clés de ModifierSystem (MOD_KEYS) : aucun système n'a besoin d'être modifié.
 * cost : points par niveau.
 */
export const MASTERY_TREES = {
  monsters: {
    short: 'Monstres', name: 'Maîtrise des monstres', icon: '👹', color: '#ff7a5a',
    nodes: [
      { id: 'mm_vigor', name: 'Chair robuste', icon: '❤️', max: 5, cost: 1, desc: '+3% PV des monstres', effects: [{ mod: 'monsterHp', value: 0.03 }] },
      { id: 'mm_fury', name: 'Griffes aiguisées', icon: '⚔️', max: 5, cost: 1, desc: '+3% attaque des monstres', effects: [{ mod: 'monsterAtk', value: 0.03 }] },
      { id: 'mm_drill', name: 'Entraînement', icon: '📈', max: 5, cost: 1, desc: '+6% XP des monstres', effects: [{ mod: 'xpGain', value: 0.06 }] },
      { id: 'mm_hide', name: 'Peau d’acier', icon: '🛡️', max: 5, cost: 2, desc: '+4% défense des monstres', effects: [{ mod: 'monsterDef', value: 0.04 }] },
      { id: 'mm_roster', name: 'Grande ménagerie', icon: '🏟️', max: 3, cost: 2, desc: '+3 places dans la collection', effects: [{ mod: 'rosterSize', value: 3 }] },
      { id: 'mm_apex', name: 'Prédateur ultime', icon: '🎯', max: 5, cost: 3, desc: '+1% critique', effects: [{ mod: 'critChance', value: 0.01 }] },
    ],
  },
  dungeon: {
    short: 'Donjon', name: 'Maîtrise du donjon', icon: '🏰', color: '#ffb52e',
    nodes: [
      { id: 'md_mason', name: 'Maçon', icon: '🧱', max: 5, cost: 1, desc: '-3% coût des salles', effects: [{ mod: 'roomCost', value: -0.03 }] },
      { id: 'md_digger', name: 'Excavation', icon: '⛏️', max: 5, cost: 1, desc: '-4% coût d’agrandissement', effects: [{ mod: 'expandCost', value: -0.04 }] },
      { id: 'md_lure', name: 'Réputation', icon: '📯', max: 5, cost: 1, desc: '+3% fréquence des raids', effects: [{ mod: 'raidRate', value: 0.03 }] },
      { id: 'md_depths', name: 'Profondeurs', icon: '🕳️', max: 5, cost: 2, desc: '-4% coût des étages', effects: [{ mod: 'floorCost', value: -0.04 }] },
      { id: 'md_production', name: 'Ateliers', icon: '⚙️', max: 5, cost: 2, desc: '+5% production des salles', effects: [{ mod: 'productionGain', value: 0.05 }] },
      { id: 'md_halls', name: 'Grandes salles', icon: '🏛️', max: 1, cost: 5, desc: '+1 place par salle de monstres', effects: [{ mod: 'roomCapacity', value: 1 }] },
    ],
  },
  traps: {
    short: 'Pièges', name: 'Maîtrise des pièges', icon: '🧨', color: '#ff4f6d',
    nodes: [
      { id: 'mt_damage', name: 'Lames affûtées', icon: '🔪', max: 5, cost: 1, desc: '+5% dégâts des pièges', effects: [{ mod: 'trapDamage', value: 0.05 }] },
      { id: 'mt_reload', name: 'Mécanismes huilés', icon: '🔧', max: 5, cost: 1, desc: '-3% recharge des pièges', effects: [{ mod: 'trapCooldown', value: -0.03 }] },
      { id: 'mt_effect', name: 'Toxines', icon: '☠️', max: 5, cost: 1, desc: '+3% chance d’effet des pièges', effects: [{ mod: 'trapEffectChance', value: 0.03 }] },
      { id: 'mt_synergy', name: 'Ingénierie', icon: '🔗', max: 5, cost: 2, desc: '+6% puissance des synergies', effects: [{ mod: 'synergyPower', value: 0.06 }] },
      { id: 'mt_master', name: 'Piégeur légendaire', icon: '🧨', max: 5, cost: 3, desc: '+8% dégâts des pièges', effects: [{ mod: 'trapDamage', value: 0.08 }] },
    ],
  },
  economy: {
    short: 'Économie', name: 'Maîtrise économique', icon: '💰', color: '#ffd84a',
    nodes: [
      { id: 'me_gold', name: 'Collecteur', icon: '🪙', max: 5, cost: 1, desc: '+4% or', effects: [{ mod: 'goldGain', value: 0.04 }] },
      { id: 'me_mats', name: 'Carrière', icon: '🪨', max: 5, cost: 1, desc: '+4% pierre et métal', effects: [{ mod: 'materialGain', value: 0.04 }] },
      { id: 'me_offline', name: 'Gérant fiable', icon: '🌙', max: 4, cost: 2, desc: '+1 h de progression hors ligne', effects: [{ mod: 'offlineHours', value: 1 }] },
      { id: 'me_vault', name: 'Coffres renforcés', icon: '🏦', max: 5, cost: 1, desc: '+10% capacité de la trésorerie', effects: [{ mod: 'treasuryCapacity', value: 0.1 }] },
      { id: 'me_thrift', name: 'Négociateur', icon: '💸', max: 5, cost: 3, desc: '-2% de tous les coûts', effects: [{ mod: 'globalCost', value: -0.02 }] },
    ],
  },
  magic: {
    short: 'Magie', name: 'Maîtrise magique', icon: '🌀', color: '#b56cff',
    nodes: [
      { id: 'ma_essence', name: 'Distillation', icon: '🔥', max: 5, cost: 1, desc: '+5% essence', effects: [{ mod: 'essenceGain', value: 0.05 }] },
      { id: 'ma_elements', name: 'Affinités', icon: '🌈', max: 5, cost: 1, desc: '+4% avantage élémentaire', effects: [{ mod: 'elementPower', value: 0.04 }] },
      { id: 'ma_focus', name: 'Concentration', icon: '⏱️', max: 5, cost: 2, desc: '-2% recharge des compétences', effects: [{ mod: 'skillCooldown', value: -0.02 }] },
      { id: 'ma_dark', name: 'Pacte obscur', icon: '🌑', max: 5, cost: 2, desc: '+6% essence obscure', effects: [{ mod: 'darkGain', value: 0.06 }] },
      { id: 'ma_slayer', name: 'Tueur de titans', icon: '👑', max: 5, cost: 3, desc: '+6% dégâts contre les boss', effects: [{ mod: 'bossDamage', value: 0.06 }] },
    ],
  },
};

export const MASTERY_NODES = Object.fromEntries(
  Object.entries(MASTERY_TREES).flatMap(([tree, t]) => t.nodes.map((n, i) => [n.id, { ...n, tree, index: i }])),
);

/** Points de maîtrise gagnés au niveau `level` du Maître. */
export const masteryPointsForLevel = (level) => Math.max(0, level - 1);

/** Coût (en cristaux) d'une réinitialisation des points. */
export const MASTERY_RESPEC_COST = 150;

/** Récompense de passage de niveau du Maître. */
export function masterLevelReward(level) {
  const r = { crystals: 5 + Math.floor(level / 2) };
  if (level % 5 === 0) r.legendaryEssence = 1 + Math.floor(level / 25);
  if (level % 10 === 0) r.dimensionalFragments = 1;
  return r;
}
