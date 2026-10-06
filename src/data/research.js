/**
 * ARBRE TECHNOLOGIQUE (données pures)
 * cost        coût du niveau 1, multiplié par costGrowth^(niveau-1)
 * time        durée (s) du niveau 1, multipliée par timeGrowth^(niveau-1)
 * requires    [{ id, level }]
 * effects     [{ mod, value }] — valeur PAR NIVEAU, agrégée par ModifierSystem
 * unlocks     texte descriptif des déblocages (les salles/pièges référencent la recherche)
 * minFloor    étage requis
 */
export const RESEARCH_CATEGORIES = {
  architecture: { name: 'Architecture', icon: '🏰', color: '#c6a35a' },
  monsters: { name: 'Monstres', icon: '👹', color: '#ff6a6a' },
  traps: { name: 'Pièges', icon: '🧨', color: '#ff9c4a' },
  economy: { name: 'Économie', icon: '💰', color: '#ffcc33' },
  magic: { name: 'Magie', icon: '🌀', color: '#b56cff' },
};

export const RESEARCH = [
  // ===== Architecture =====
  { id: 'arch_reinforced', cat: 'architecture', name: 'Murs renforcés', icon: '🧱', desc: '+4% de défense des monstres par niveau.', maxLevel: 25, cost: { gold: 300, stone: 80 }, costGrowth: 1.45, time: 30, timeGrowth: 1.3, effects: [{ mod: 'monsterDef', value: 0.04 }] },
  { id: 'arch_elemental_rooms', cat: 'architecture', name: 'Salles élémentaires', icon: '🔥', desc: 'Débloque la Salle de lave, la Salle gelée et la Chambre toxique.', maxLevel: 1, cost: { gold: 800, stone: 200, essence: 10 }, time: 60, requires: [{ id: 'arch_reinforced', level: 1 }], unlocks: ['lava', 'frozen', 'toxic'] },
  { id: 'arch_expansion', cat: 'architecture', name: 'Excavation', icon: '⛏️', desc: 'Réduit le coût d’agrandissement des étages de 8% par niveau.', maxLevel: 5, cost: { gold: 1200, stone: 400 }, costGrowth: 2, time: 120, timeGrowth: 1.6, requires: [{ id: 'arch_reinforced', level: 2 }], effects: [{ mod: 'expandCost', value: -0.08 }] },
  { id: 'arch_capacity', cat: 'architecture', name: 'Salles spacieuses', icon: '📐', desc: '+1 monstre dans les salles de combat (niv. 1) puis dans toutes les salles (niv. 2).', maxLevel: 2, cost: { gold: 6000, stone: 1500, metal: 200 }, costGrowth: 6, time: 600, timeGrowth: 4, requires: [{ id: 'arch_expansion', level: 1 }], effects: [{ mod: 'roomCapacity', value: 1 }] },
  { id: 'arch_crypt', cat: 'architecture', name: 'Cryptes', icon: '⚰️', desc: 'Débloque la Crypte.', maxLevel: 1, cost: { gold: 3000, stone: 600, essence: 40 }, time: 240, requires: [{ id: 'arch_elemental_rooms', level: 1 }], unlocks: ['crypt'], minFloor: 2 },
  { id: 'arch_grove', cat: 'architecture', name: 'Bosquets souterrains', icon: '🌿', desc: 'Débloque le Bosquet souterrain.', maxLevel: 1, cost: { gold: 3000, stone: 600, essence: 40 }, time: 240, requires: [{ id: 'arch_elemental_rooms', level: 1 }], unlocks: ['grove'], minFloor: 2 },
  { id: 'arch_storm', cat: 'architecture', name: 'Salles des tempêtes', icon: '⚡', desc: 'Débloque la Salle des tempêtes.', maxLevel: 1, cost: { gold: 6000, stone: 900, metal: 150 }, time: 420, requires: [{ id: 'arch_crypt', level: 1 }], unlocks: ['storm'], minFloor: 3 },
  { id: 'arch_sanctum', cat: 'architecture', name: 'Sanctuaire profané', icon: '✨', desc: 'Débloque le Sanctuaire profané.', maxLevel: 1, cost: { gold: 9000, stone: 1200, crystals: 30 }, time: 600, requires: [{ id: 'arch_grove', level: 1 }], unlocks: ['sanctum'], minFloor: 4 },
  { id: 'arch_lair', cat: 'architecture', name: 'Antre du gardien', icon: '👑', desc: 'Débloque l’Antre où placer les boss vaincus.', maxLevel: 1, cost: { gold: 15000, stone: 2500, metal: 300 }, time: 900, requires: [{ id: 'arch_capacity', level: 1 }], unlocks: ['lair'], minFloor: 5 },
  { id: 'arch_deep_floors', cat: 'architecture', name: 'Fondations profondes', icon: '🏗️', desc: '-10% du coût des nouveaux étages par niveau.', maxLevel: 5, cost: { gold: 5000, stone: 2000 }, costGrowth: 3, time: 600, timeGrowth: 2, requires: [{ id: 'arch_expansion', level: 2 }], effects: [{ mod: 'floorCost', value: -0.1 }] },
  { id: 'arch_room_mastery', cat: 'architecture', name: 'Maçonnerie experte', icon: '🏛️', desc: '-5% du coût des salles et améliorations par niveau.', maxLevel: 8, cost: { gold: 2500, stone: 900 }, costGrowth: 2.1, time: 300, timeGrowth: 1.7, requires: [{ id: 'arch_reinforced', level: 5 }], effects: [{ mod: 'roomCost', value: -0.05 }] },

  // ===== Monstres =====
  { id: 'mon_vitality', cat: 'monsters', name: 'Vitalité', icon: '❤️', desc: '+5% de PV des monstres par niveau.', maxLevel: 30, cost: { gold: 250, essence: 5 }, costGrowth: 1.42, time: 30, timeGrowth: 1.28, effects: [{ mod: 'monsterHp', value: 0.05 }] },
  { id: 'mon_strength', cat: 'monsters', name: 'Force brute', icon: '💪', desc: '+5% d’attaque des monstres par niveau.', maxLevel: 30, cost: { gold: 250, essence: 5 }, costGrowth: 1.42, time: 30, timeGrowth: 1.28, effects: [{ mod: 'monsterAtk', value: 0.05 }] },
  { id: 'mon_agility', cat: 'monsters', name: 'Agilité', icon: '💨', desc: '+2% de vitesse des monstres par niveau.', maxLevel: 15, cost: { gold: 1500, essence: 20 }, costGrowth: 1.7, time: 180, timeGrowth: 1.4, requires: [{ id: 'mon_strength', level: 3 }], effects: [{ mod: 'monsterSpd', value: 0.02 }] },
  { id: 'mon_training', cat: 'monsters', name: 'Entraînement', icon: '📚', desc: '+10% d’XP des monstres par niveau.', maxLevel: 20, cost: { gold: 600, essence: 10 }, costGrowth: 1.5, time: 90, timeGrowth: 1.35, requires: [{ id: 'mon_vitality', level: 2 }], effects: [{ mod: 'xpGain', value: 0.1 }] },
  { id: 'mon_species', cat: 'monsters', name: 'Nouvelles espèces', icon: '🥚', desc: 'Ajoute des monstres rares au Portail mineur.', maxLevel: 3, cost: { gold: 4000, essence: 80 }, costGrowth: 4, time: 600, timeGrowth: 3, requires: [{ id: 'mon_training', level: 2 }], effects: [{ mod: 'summonQuality', value: 1 }] },
  { id: 'mon_evolution', cat: 'monsters', name: 'Biologie évolutive', icon: '🧬', desc: '-8% du coût des évolutions par niveau.', maxLevel: 5, cost: { gold: 5000, essence: 120 }, costGrowth: 2.5, time: 600, timeGrowth: 1.8, requires: [{ id: 'mon_training', level: 3 }], effects: [{ mod: 'evolveCost', value: -0.08 }] },
  { id: 'mon_level_cap', cat: 'monsters', name: 'Potentiel caché', icon: '⭐', desc: '+5 niveaux maximum pour tous les monstres par niveau.', maxLevel: 4, cost: { gold: 20000, essence: 400, darkEssence: 10 }, costGrowth: 4, time: 1800, timeGrowth: 2, requires: [{ id: 'mon_evolution', level: 2 }], effects: [{ mod: 'levelCap', value: 5 }], minFloor: 5 },
  { id: 'mon_critical', cat: 'monsters', name: 'Instinct prédateur', icon: '🎯', desc: '+2% de coup critique par niveau.', maxLevel: 10, cost: { gold: 3000, essence: 50 }, costGrowth: 1.8, time: 300, timeGrowth: 1.5, requires: [{ id: 'mon_agility', level: 2 }], effects: [{ mod: 'critChance', value: 0.02 }] },
  { id: 'mon_cheap_training', cat: 'monsters', name: 'Pédagogie', icon: '🎓', desc: '-5% du coût des niveaux de monstres.', maxLevel: 8, cost: { gold: 2000, essence: 30 }, costGrowth: 2, time: 240, timeGrowth: 1.6, requires: [{ id: 'mon_training', level: 1 }], effects: [{ mod: 'levelCost', value: -0.05 }] },
  { id: 'mon_roster', cat: 'monsters', name: 'Grand bestiaire', icon: '📕', desc: '+10 places de monstres par niveau.', maxLevel: 10, cost: { gold: 3000, stone: 500 }, costGrowth: 2, time: 300, timeGrowth: 1.5, requires: [{ id: 'mon_vitality', level: 1 }], effects: [{ mod: 'rosterSize', value: 10 }] },

  // ===== Pièges =====
  { id: 'trap_damage', cat: 'traps', name: 'Mécanismes affûtés', icon: '⚙️', desc: '+8% de dégâts des pièges par niveau.', maxLevel: 30, cost: { gold: 300, metal: 15 }, costGrowth: 1.42, time: 40, timeGrowth: 1.28, effects: [{ mod: 'trapDamage', value: 0.08 }] },
  { id: 'trap_cooldown', cat: 'traps', name: 'Ressorts rapides', icon: '⏱️', desc: '-4% de temps de recharge des pièges par niveau.', maxLevel: 10, cost: { gold: 1200, metal: 60 }, costGrowth: 1.8, time: 180, timeGrowth: 1.5, requires: [{ id: 'trap_damage', level: 2 }], effects: [{ mod: 'trapCooldown', value: -0.04 }] },
  { id: 'trap_elemental', cat: 'traps', name: 'Pièges élémentaires', icon: '🔥', desc: 'Débloque les pièges de feu, de glace et de poison.', maxLevel: 1, cost: { gold: 900, metal: 40 }, time: 90, requires: [{ id: 'trap_damage', level: 1 }] },
  { id: 'trap_heavy', cat: 'traps', name: 'Ingénierie lourde', icon: '🪨', desc: 'Débloque le Rocher roulant.', maxLevel: 1, cost: { gold: 2500, metal: 100, stone: 500 }, time: 240, requires: [{ id: 'trap_elemental', level: 1 }] },
  { id: 'trap_storm', cat: 'traps', name: 'Runes de foudre', icon: '⚡', desc: 'Débloque la Rune de foudre.', maxLevel: 1, cost: { gold: 5000, metal: 200, essence: 40 }, time: 420, requires: [{ id: 'trap_heavy', level: 1 }], minFloor: 2 },
  { id: 'trap_arcane', cat: 'traps', name: 'Glyphes magiques', icon: '🌀', desc: 'Débloque le Glyphe magique.', maxLevel: 1, cost: { gold: 9000, metal: 250, crystals: 20 }, time: 600, requires: [{ id: 'trap_storm', level: 1 }], minFloor: 3 },
  { id: 'trap_shadow', cat: 'traps', name: 'Ombres rampantes', icon: '🌑', desc: 'Débloque le piège d’Ombres rampantes.', maxLevel: 1, cost: { gold: 14000, metal: 300, darkEssence: 10 }, time: 900, requires: [{ id: 'trap_arcane', level: 1 }], minFloor: 5 },
  { id: 'trap_nature', cat: 'traps', name: 'Racines vivantes', icon: '🌿', desc: 'Débloque les Racines étrangleuses.', maxLevel: 1, cost: { gold: 1500, metal: 60, essence: 20 }, time: 150, requires: [{ id: 'trap_elemental', level: 1 }] },
  { id: 'trap_blades', cat: 'traps', name: 'Mécanique rotative', icon: '⚙️', desc: 'Débloque les Lames tournoyantes.', maxLevel: 1, cost: { gold: 2000, metal: 120 }, time: 200, requires: [{ id: 'trap_damage', level: 3 }] },
  { id: 'trap_explosive', cat: 'traps', name: 'Poudre noire', icon: '💣', desc: 'Débloque la Mine explosive.', maxLevel: 1, cost: { gold: 7000, metal: 250, stone: 800 }, time: 540, requires: [{ id: 'trap_heavy', level: 1 }], minFloor: 3 },
  { id: 'trap_holy', cat: 'traps', name: 'Sceaux sacrés', icon: '✨', desc: 'Débloque le Sceau sacré.', maxLevel: 1, cost: { gold: 12000, metal: 260, crystals: 25 }, time: 780, requires: [{ id: 'trap_arcane', level: 1 }], minFloor: 4 },
  { id: 'trap_synergy', cat: 'traps', name: 'Alchimie des pièges', icon: '⚗️', desc: '+15% d’efficacité des synergies par niveau.', maxLevel: 10, cost: { gold: 4000, metal: 150, essence: 30 }, costGrowth: 1.9, time: 400, timeGrowth: 1.5, requires: [{ id: 'trap_elemental', level: 1 }], effects: [{ mod: 'synergyPower', value: 0.15 }] },
  { id: 'trap_effects', cat: 'traps', name: 'Toxines concentrées', icon: '🧪', desc: '+10% de chance d’effet des pièges par niveau.', maxLevel: 5, cost: { gold: 3000, metal: 120 }, costGrowth: 2, time: 300, timeGrowth: 1.6, requires: [{ id: 'trap_cooldown', level: 1 }], effects: [{ mod: 'trapEffectChance', value: 0.1 }] },

  // ===== Économie =====
  { id: 'eco_income', cat: 'economy', name: 'Collecte organisée', icon: '🪙', desc: '+8% d’or par niveau.', maxLevel: 40, cost: { gold: 200 }, costGrowth: 1.4, time: 25, timeGrowth: 1.26, effects: [{ mod: 'goldGain', value: 0.08 }] },
  { id: 'eco_materials', cat: 'economy', name: 'Récupération', icon: '🧱', desc: '+8% de pierre et métal par niveau.', maxLevel: 30, cost: { gold: 400, stone: 50 }, costGrowth: 1.42, time: 40, timeGrowth: 1.28, requires: [{ id: 'eco_income', level: 1 }], effects: [{ mod: 'materialGain', value: 0.08 }] },
  { id: 'eco_essence', cat: 'economy', name: 'Extraction d’âmes', icon: '🔥', desc: '+8% d’essence par niveau.', maxLevel: 30, cost: { gold: 600, essence: 10 }, costGrowth: 1.45, time: 60, timeGrowth: 1.3, requires: [{ id: 'eco_income', level: 2 }], effects: [{ mod: 'essenceGain', value: 0.08 }] },
  { id: 'eco_mining', cat: 'economy', name: 'Exploitation minière', icon: '⛏️', desc: 'Débloque la Mine.', maxLevel: 1, cost: { gold: 1500, stone: 300 }, time: 120, requires: [{ id: 'eco_materials', level: 1 }] },
  { id: 'eco_forge', cat: 'economy', name: 'Métallurgie', icon: '🔨', desc: 'Débloque la Forge.', maxLevel: 1, cost: { gold: 4000, stone: 600, metal: 100 }, time: 300, requires: [{ id: 'eco_mining', level: 1 }], minFloor: 2 },
  { id: 'eco_offline', cat: 'economy', name: 'Gestion à distance', icon: '🌙', desc: '+1h de progression hors ligne par niveau.', maxLevel: 8, cost: { gold: 2000, essence: 20 }, costGrowth: 2.2, time: 300, timeGrowth: 1.6, requires: [{ id: 'eco_income', level: 3 }], effects: [{ mod: 'offlineHours', value: 1 }] },
  { id: 'eco_raid_rate', cat: 'economy', name: 'Réputation', icon: '📯', desc: 'Les aventuriers arrivent 5% plus souvent par niveau.', maxLevel: 10, cost: { gold: 3000, stone: 400 }, costGrowth: 2, time: 360, timeGrowth: 1.6, requires: [{ id: 'eco_income', level: 4 }], effects: [{ mod: 'raidRate', value: 0.05 }] },
  { id: 'eco_loot', cat: 'economy', name: 'Fouille des corps', icon: '🎒', desc: '+10% de chance de trouver des objets par niveau.', maxLevel: 15, cost: { gold: 1500, metal: 50 }, costGrowth: 1.7, time: 180, timeGrowth: 1.45, requires: [{ id: 'eco_materials', level: 2 }], effects: [{ mod: 'dropChance', value: 0.1 }] },
  { id: 'eco_treasury', cat: 'economy', name: 'Coffres blindés', icon: '🏦', desc: '+15% de capacité du trésor et -5% d’or volé par niveau.', maxLevel: 10, cost: { gold: 2500, metal: 80 }, costGrowth: 1.9, time: 240, timeGrowth: 1.5, requires: [{ id: 'eco_income', level: 2 }], effects: [{ mod: 'treasuryCapacity', value: 0.15 }, { mod: 'theftReduction', value: 0.05 }] },
  { id: 'eco_production', cat: 'economy', name: 'Contremaîtres', icon: '👷', desc: '+15% de production des salles par niveau.', maxLevel: 20, cost: { gold: 1800, stone: 300 }, costGrowth: 1.6, time: 200, timeGrowth: 1.4, requires: [{ id: 'eco_mining', level: 1 }], effects: [{ mod: 'productionGain', value: 0.15 }] },

  // ===== Magie =====
  { id: 'magic_research_speed', cat: 'magic', name: 'Bibliothèque interdite', icon: '📖', desc: '-6% de durée de recherche par niveau.', maxLevel: 10, cost: { gold: 2000, essence: 30 }, costGrowth: 1.9, time: 240, timeGrowth: 1.5, effects: [{ mod: 'researchSpeed', value: 0.06 }] },
  { id: 'magic_second_slot', cat: 'magic', name: 'Second laboratoire', icon: '🔬', desc: 'Permet deux recherches simultanées.', maxLevel: 1, cost: { gold: 15000, essence: 200, crystals: 50 }, time: 1800, requires: [{ id: 'magic_research_speed', level: 3 }], effects: [{ mod: 'researchSlots', value: 1 }], minFloor: 3 },
  { id: 'magic_elements', cat: 'magic', name: 'Maîtrise élémentaire', icon: '🌈', desc: '+10% de dégâts élémentaires avantageux par niveau.', maxLevel: 10, cost: { gold: 3000, essence: 50 }, costGrowth: 1.8, time: 300, timeGrowth: 1.5, effects: [{ mod: 'elementPower', value: 0.1 }] },
  { id: 'magic_skills', cat: 'magic', name: 'Capacités spéciales', icon: '✴️', desc: '-4% de recharge des compétences des monstres par niveau.', maxLevel: 10, cost: { gold: 4000, essence: 60 }, costGrowth: 1.9, time: 400, timeGrowth: 1.5, requires: [{ id: 'magic_elements', level: 2 }], effects: [{ mod: 'skillCooldown', value: -0.04 }] },
  { id: 'magic_rare_monsters', cat: 'magic', name: 'Appel des anciens', icon: '🐲', desc: 'Augmente les chances de monstres rares aux portails.', maxLevel: 5, cost: { gold: 8000, essence: 150, crystals: 20 }, costGrowth: 2.5, time: 900, timeGrowth: 1.8, requires: [{ id: 'magic_elements', level: 3 }], effects: [{ mod: 'summonLuck', value: 0.15 }], minFloor: 3 },
  { id: 'magic_dimensional', cat: 'magic', name: 'Portails dimensionnels', icon: '🌀', desc: 'Débloque la Salle dimensionnelle et le Portail du Néant.', maxLevel: 1, cost: { gold: 50000, essence: 800, darkEssence: 30 }, time: 3600, requires: [{ id: 'magic_rare_monsters', level: 2 }, { id: 'arch_crypt', level: 1 }], unlocks: ['dimensional'], minFloor: 8 },
  { id: 'magic_dark_harvest', cat: 'magic', name: 'Moisson obscure', icon: '🌑', desc: '+10% d’essence obscure par niveau.', maxLevel: 15, cost: { gold: 20000, darkEssence: 15 }, costGrowth: 1.8, time: 900, timeGrowth: 1.5, requires: [{ id: 'magic_dimensional', level: 1 }], effects: [{ mod: 'darkGain', value: 0.1 }] },
  { id: 'magic_boss_slayer', cat: 'magic', name: 'Rituel du tueur de boss', icon: '⚔️', desc: '+8% de dégâts contre les boss par niveau.', maxLevel: 10, cost: { gold: 10000, essence: 200 }, costGrowth: 2, time: 900, timeGrowth: 1.5, requires: [{ id: 'magic_skills', level: 2 }], effects: [{ mod: 'bossDamage', value: 0.08 }], minFloor: 4 },
];

export const RESEARCH_MAP = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
