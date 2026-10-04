/**
 * MISSIONS (données pures)
 * stat      compteur suivi dans state.stats (progression = valeur actuelle - valeur au début de la mission)
 * target    objectif (multiplié par l'échelle d'étage si scale: true)
 * reward    récompense ; les montants marqués scale sont multipliés aussi
 *           monster: 'basic' | 'advanced' | id d'espèce
 *           equipment: rareté
 */
export const DAILY_MISSIONS = [
  { id: 'd_kill', name: 'Vaincre {n} aventuriers', icon: '⚔️', stat: 'adventurersKilled', target: 20, scale: true, reward: { gold: 1500, crystals: 10 } },
  { id: 'd_defend', name: 'Repousser {n} raids', icon: '🛡️', stat: 'raidsDefended', target: 10, reward: { essence: 25, crystals: 10 } },
  { id: 'd_gold', name: 'Gagner {n} or', icon: '🪙', stat: 'goldEarned', target: 5000, scale: true, reward: { crystals: 15, stone: 300 } },
  { id: 'd_upgrade', name: 'Améliorer {n} fois', icon: '⬆️', stat: 'upgrades', target: 3, reward: { gold: 1200, essence: 15 } },
  { id: 'd_level', name: 'Monter {n} niveaux de monstres', icon: '📈', stat: 'monsterLevelUps', target: 5, reward: { essence: 30, crystals: 5 } },
  { id: 'd_build', name: 'Construire {n} salle', icon: '🏗️', stat: 'roomsBuilt', target: 1, reward: { stone: 400, gold: 800 } },
  { id: 'd_traps', name: 'Déclencher {n} pièges', icon: '🧨', stat: 'trapTriggers', target: 30, scale: true, reward: { metal: 80, crystals: 5 } },
  { id: 'd_research', name: 'Terminer {n} recherche', icon: '🧪', stat: 'researchCompleted', target: 1, reward: { gold: 1500, crystals: 10 } },
  { id: 'd_collect', name: 'Récolter le trésor {n} fois', icon: '💰', stat: 'treasuryCollects', target: 3, reward: { gold: 1000, crystals: 5 } },
  { id: 'd_watch', name: 'Regarder {n} combat', icon: '👁️', stat: 'battlesWatched', target: 1, reward: { crystals: 10 } },
  { id: 'd_summon', name: 'Invoquer {n} monstre', icon: '🌀', stat: 'monstersSummoned', target: 1, reward: { essence: 20, crystals: 5 } },
  { id: 'd_crits', name: 'Réussir {n} coups critiques', icon: '💥', stat: 'critHits', target: 40, scale: true, reward: { gold: 1500, essence: 10 } },
];

export const WEEKLY_MISSIONS = [
  { id: 'w_kill', name: 'Vaincre {n} aventuriers', icon: '⚔️', stat: 'adventurersKilled', target: 300, scale: true, reward: { crystals: 80, equipment: 'epic' } },
  { id: 'w_defend', name: 'Repousser {n} raids', icon: '🛡️', stat: 'raidsDefended', target: 120, reward: { crystals: 60, essence: 150 } },
  { id: 'w_gold', name: 'Gagner {n} or', icon: '🪙', stat: 'goldEarned', target: 100000, scale: true, reward: { crystals: 80, monster: 'advanced' } },
  { id: 'w_upgrade', name: 'Améliorer {n} fois', icon: '⬆️', stat: 'upgrades', target: 40, reward: { crystals: 60, darkEssence: 5 } },
  { id: 'w_elite', name: 'Vaincre {n} héros d’élite', icon: '🌟', stat: 'eliteKilled', target: 10, reward: { crystals: 70, equipment: 'rare' } },
  { id: 'w_synergy', name: 'Déclencher {n} synergies', icon: '⚗️', stat: 'synergyTriggers', target: 50, reward: { crystals: 60, metal: 500 } },
  { id: 'w_items', name: 'Trouver {n} objets', icon: '🎁', stat: 'itemsFound', target: 15, reward: { crystals: 50, essence: 100 } },
  { id: 'w_research', name: 'Terminer {n} recherches', icon: '🧪', stat: 'researchCompleted', target: 8, reward: { crystals: 70, essence: 120 } },
];

/** Missions permanentes : chaînes d'objectifs croissants. */
export const PERMANENT_CHAINS = [
  { id: 'p_kill', name: 'Fléau des héros', icon: '💀', stat: 'adventurersKilled', targets: [10, 50, 200, 500, 1500, 5000, 15000, 50000, 150000], reward: (i) => ({ crystals: 20 + i * 15, gold: 1000 * Math.pow(3, i) }) },
  { id: 'p_rooms', name: 'Architecte', icon: '🏗️', stat: 'roomsBuilt', targets: [3, 8, 15, 30, 60, 100, 200], reward: (i) => ({ crystals: 15 + i * 10, stone: 500 * Math.pow(2.5, i) }) },
  { id: 'p_floor', name: 'Plus profond', icon: '⬇️', stat: 'maxFloor', absolute: true, targets: [2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100], reward: (i) => ({ crystals: 40 + i * 25, darkEssence: i >= 3 ? 10 * i : 0, monster: i === 1 ? 'advanced' : undefined }) },
  { id: 'p_collection', name: 'Collectionneur', icon: '📖', stat: 'speciesDiscovered', absolute: true, targets: [3, 6, 10, 15, 25, 40, 60, 80], reward: (i) => ({ crystals: 30 + i * 20, essence: 50 * (i + 1) }) },
  { id: 'p_boss', name: 'Tueur de boss', icon: '👑', stat: 'bossesDefeated', targets: [1, 3, 5, 10, 25, 50, 100], reward: (i) => ({ crystals: 80 + i * 40, darkEssence: 20 * (i + 1) }) },
  { id: 'p_evolve', name: 'Évolution', icon: '🧬', stat: 'evolutions', targets: [1, 3, 8, 15, 30, 60], reward: (i) => ({ crystals: 40 + i * 20, essence: 100 * (i + 1) }) },
  { id: 'p_gold', name: 'Fortune du Maître', icon: '🪙', stat: 'goldEarned', targets: [10000, 100000, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11], reward: (i) => ({ crystals: 25 + i * 20, gold: 0 }) },
  { id: 'p_traps', name: 'Ingénieur sadique', icon: '🧨', stat: 'trapTriggers', targets: [25, 200, 1000, 5000, 20000, 100000], reward: (i) => ({ crystals: 20 + i * 15, metal: 200 * Math.pow(2.5, i) }) },
];
