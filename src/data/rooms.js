/**
 * SALLES (données pures)
 * ---------------------
 * capacity     nombre de monstres placables
 * trapSlots    nombre de pièges (0 ou 1)
 * buildable    peut être construite depuis le menu de construction
 * maxPerFloor  limite par étage
 * elementBonus { element, hp, atk } bonus de base pour les monstres de cet élément
 * levelStat    statistique boostée par niveau de salle (cf. BALANCE.roomLevelBonus)
 * rewardBonus  bonus de récompense des raids par salle (cumulatif)
 * production   ressources produites par minute (niveau 1, croissance x1.15/niveau)
 * onCombat     statuts appliqués aux aventuriers au début d'un combat dans la salle
 * rules        contraintes de placement : notAdjacent: [roomIds]
 * unlock       { research: id } | { floor: n }   (absent = dès le début)
 * milestones   [{ level, desc, capacity?, perk? }]
 * category     catégorie du menu de construction (voir ROOM_CATEGORIES)
 * maxTotal     limite pour tout le donjon (tous étages)
 * trainingXp   XP passive par minute pour les monstres placés (fraction de l'XP du niveau suivant)
 * danger       niveaux ajoutés aux aventuriers de l'étage (salles à risque)
 * globalMods   bonus globaux (clés de ModifierSystem), +4%/niveau de salle
 * runReward    bonus de récompenses des modes de jeu
 * Les synergies entre salles voisines sont décrites dans data/roomSynergies.js.
 */

/** Catégories du menu de construction (V2). */
export const ROOM_CATEGORIES = {
  rooms: { name: 'Salles', icon: '🏰' },
  traps: { name: 'Pièges', icon: '🧨' },
  monsters: { name: 'Monstres', icon: '👹' },
  economy: { name: 'Économie', icon: '💰' },
  research: { name: 'Recherche', icon: '🧪' },
  magic: { name: 'Magie', icon: '✨' },
  defense: { name: 'Défense', icon: '🛡️' },
};
export const ROOMS = {
  entrance: {
    id: 'entrance', name: 'Entrée', icon: '🚪', desc: 'Point d’arrivée des aventuriers.',
    capacity: 0, trapSlots: 1, buildable: false, special: true, maxLevel: 1, cost: {},
    tile: { floor: '#4a3f36', accent: '#c08a4a' },
  },
  core: {
    id: 'core', name: 'Coffre du donjon', icon: '💰', desc: 'L’objectif des aventuriers. S’ils l’atteignent, ils pillent votre trésor.',
    capacity: 1, trapSlots: 0, buildable: false, special: true, maxLevel: 1, cost: {},
    tile: { floor: '#4a3a2a', accent: '#ffcc33' },
  },
  basic: {
    category: 'rooms',
    id: 'basic', name: 'Salle basique', icon: '🪨', desc: 'Une simple caverne. Point de départ de tout donjon.',
    capacity: 1, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 60, stone: 25 }, levelStat: 'def',
    production: { stone: 3 },
    tile: { floor: '#4f463d', accent: '#7a6a5a' },
    milestones: [{ level: 25, desc: '+1 monstre', capacity: 1 }],
  },
  combat: {
    category: 'defense',
    id: 'combat', name: 'Salle de combat', icon: '⚔️', desc: 'Les monstres y affrontent les aventuriers. +PV par niveau.',
    capacity: 3, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 180, stone: 60 }, levelStat: 'hp',
    tile: { floor: '#4a3a3a', accent: '#c0392b' },
    milestones: [
      { level: 10, desc: '+50% PV' },
      { level: 25, desc: '+1 monstre', capacity: 1 },
      { level: 50, desc: '+300% PV' },
      { level: 100, desc: 'Débloque une évolution spéciale (Empereur Gobelin)', perk: 'special_evolution' },
    ],
  },
  lava: {
    category: 'rooms',
    id: 'lava', name: 'Salle de lave', icon: '🔥', desc: 'Bonus aux monstres de feu. Brûle les aventuriers.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 700, stone: 150, metal: 25 }, levelStat: 'atk',
    elementBonus: { element: 'fire', hp: 0.15, atk: 0.25 },
    onCombat: [{ id: 'burn', chance: 0.5, duration: 4, power: 0.15 }],
    roomElement: 'fire',
    rules: { notAdjacent: ['frozen'] },
    unlock: { research: 'arch_elemental_rooms' },
    tile: { floor: '#3a1f18', accent: '#ff6a2b' },
  },
  frozen: {
    category: 'rooms',
    id: 'frozen', name: 'Salle gelée', icon: '❄️', desc: 'Bonus aux monstres de glace. Ralentit les aventuriers.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 700, stone: 150, metal: 25 }, levelStat: 'def',
    elementBonus: { element: 'ice', hp: 0.25, atk: 0.15 },
    onCombat: [{ id: 'slow', chance: 0.6, duration: 5 }],
    roomElement: 'ice',
    rules: { notAdjacent: ['lava'] },
    unlock: { research: 'arch_elemental_rooms' },
    tile: { floor: '#2a3f52', accent: '#9fe6ff' },
  },
  toxic: {
    category: 'rooms',
    id: 'toxic', name: 'Chambre toxique', icon: '☠️', desc: 'Empoisonne les aventuriers. Bonus aux monstres de poison.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 650, stone: 140, metal: 20 }, levelStat: 'atk',
    elementBonus: { element: 'poison', hp: 0.2, atk: 0.2 },
    onCombat: [{ id: 'poison', chance: 0.8, duration: 6, power: 0.12 }],
    roomElement: 'poison',
    unlock: { research: 'arch_elemental_rooms' },
    tile: { floor: '#24331f', accent: '#8fe04a' },
  },
  treasure: {
    category: 'economy',
    id: 'treasure', name: 'Chambre au trésor', icon: '💎', desc: 'Augmente les récompenses de chaque raid repoussé.',
    capacity: 1, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 2,
    cost: { gold: 450, stone: 100 }, rewardBonus: 0.12, rewardPerLevel: 0.03,
    tile: { floor: '#3f3424', accent: '#ffcc33' },
  },
  lab: {
    category: 'research',
    id: 'lab', name: 'Laboratoire', icon: '🧪', desc: 'Permet les évolutions et produit de l’essence. Réduit le coût des niveaux de monstres.',
    capacity: 0, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 1,
    cost: { gold: 1200, stone: 220, metal: 60 },
    production: { essence: 1.2 },
    perk: 'evolution',
    unlock: { floor: 1 },
    tile: { floor: '#2a2f3f', accent: '#3cf2d0' },
  },
  crypt: {
    category: 'rooms',
    id: 'crypt', name: 'Crypte', icon: '⚰️', desc: 'Bonus aux monstres d’ombre. Affaiblit les aventuriers.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 900, stone: 200, metal: 30 }, levelStat: 'hp',
    elementBonus: { element: 'shadow', hp: 0.2, atk: 0.2 },
    onCombat: [{ id: 'atkDown', chance: 0.5, duration: 5 }],
    roomElement: 'shadow',
    unlock: { research: 'arch_crypt' },
    tile: { floor: '#251f2e', accent: '#9b6bff' },
  },
  storm: {
    category: 'rooms',
    id: 'storm', name: 'Salle des tempêtes', icon: '⚡', desc: 'Bonus aux monstres de foudre. Électrocute les aventuriers.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 1000, stone: 200, metal: 50 }, levelStat: 'atk',
    elementBonus: { element: 'lightning', hp: 0.15, atk: 0.3 },
    onCombat: [{ id: 'shock', chance: 0.6, duration: 5, power: 0.15 }],
    roomElement: 'lightning',
    unlock: { research: 'arch_storm' },
    tile: { floor: '#1f2a3f', accent: '#ffe14d' },
  },
  grove: {
    category: 'rooms',
    id: 'grove', name: 'Bosquet souterrain', icon: '🌿', desc: 'Bonus aux monstres de nature. Régénère les monstres.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 900, stone: 180, metal: 20 }, levelStat: 'hp',
    elementBonus: { element: 'nature', hp: 0.3, atk: 0.1 },
    allyStatuses: [{ id: 'regen', duration: 8, power: 0.02 }],
    roomElement: 'nature',
    unlock: { research: 'arch_grove' },
    tile: { floor: '#1f2f22', accent: '#4fc36a' },
  },
  sanctum: {
    category: 'magic',
    id: 'sanctum', name: 'Sanctuaire profané', icon: '✨', desc: 'Bonus aux monstres de lumière et soins accrus.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 1400, stone: 260, metal: 60, crystals: 10 }, levelStat: 'hp',
    elementBonus: { element: 'light', hp: 0.25, atk: 0.2 },
    allyStatuses: [{ id: 'shield', duration: 6, power: 0.1 }],
    roomElement: 'light',
    unlock: { research: 'arch_sanctum' },
    tile: { floor: '#3a3524', accent: '#fff3b0' },
  },
  mine: {
    category: 'economy',
    id: 'mine', name: 'Mine', icon: '⛏️', desc: 'Produit de la pierre et du métal.',
    capacity: 0, trapSlots: 1, buildable: true, maxLevel: 100,
    cost: { gold: 500, stone: 80 },
    production: { stone: 12, metal: 3 },
    unlock: { research: 'eco_mining' },
    tile: { floor: '#3a3530', accent: '#c0a080' },
  },
  forge: {
    category: 'economy',
    id: 'forge', name: 'Forge', icon: '🔨', desc: 'Produit du métal. Réduit le coût d’amélioration des équipements.',
    capacity: 0, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 1,
    cost: { gold: 1500, stone: 300, metal: 80 },
    production: { metal: 4 },
    perk: 'forge',
    unlock: { research: 'eco_forge' },
    tile: { floor: '#3a2a22', accent: '#ff9c4a' },
  },
  dimensional: {
    category: 'magic',
    id: 'dimensional', name: 'Salle dimensionnelle', icon: '🌀', desc: 'Contenu avancé : bonus arcanique, corruption, produit de l’essence obscure.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 1,
    cost: { gold: 25000, stone: 2000, metal: 400, darkEssence: 40 }, levelStat: 'atk',
    elementBonus: { element: 'arcane', hp: 0.3, atk: 0.3 },
    onCombat: [{ id: 'corruption', chance: 0.7, duration: 6, power: 0.15 }],
    production: { darkEssence: 0.08 },
    roomElement: 'arcane',
    unlock: { research: 'magic_dimensional' },
    tile: { floor: '#1f1530', accent: '#ff5ce1' },
  },
  lair: {
    category: 'defense',
    id: 'lair', name: 'Antre du gardien', icon: '👑', desc: 'Accueille un boss vaincu comme gardien de l’étage.',
    capacity: 1, guardianOnly: true, trapSlots: 0, buildable: true, maxLevel: 100, maxPerFloor: 1,
    cost: { gold: 5000, stone: 800, metal: 150 }, levelStat: 'hp',
    unlock: { research: 'arch_lair' },
    tile: { floor: '#2a1a1a', accent: '#ffb52e' },
  },
  training: {
    category: 'monsters',
    id: 'training', name: 'Salle d’entraînement', icon: '🏋️', desc: 'Les monstres placés ici gagnent de l’XP en permanence, même hors ligne.',
    capacity: 2, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 2,
    cost: { gold: 800, stone: 160, metal: 30 }, levelStat: 'atk',
    trainingXp: 0.02,
    unlock: { floor: 2 },
    tile: { floor: '#3a2f26', accent: '#ffb060' },
    milestones: [{ level: 25, desc: '+1 monstre', capacity: 1 }],
  },
  mutation: {
    category: 'monsters',
    id: 'mutation', name: 'Salle de mutation', icon: '🧬', desc: 'Permet de muter les monstres (essence légendaire) et de relancer leurs traits.',
    capacity: 0, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 1,
    cost: { gold: 3000, stone: 400, metal: 120, crystals: 30 },
    perk: 'mutation',
    unlock: { floor: 3 },
    tile: { floor: '#1f2f2a', accent: '#7affc0' },
  },
  arena: {
    category: 'defense',
    id: 'arena', name: 'Arène des boss', icon: '🏟️', desc: 'Permet d’affronter les boss d’événement chaque jour. +20% de récompenses des boss.',
    capacity: 2, trapSlots: 0, buildable: true, maxLevel: 100, maxTotal: 1,
    cost: { gold: 6000, stone: 900, metal: 200, crystals: 40 }, levelStat: 'hp',
    perk: 'arena',
    unlock: { floor: 5 },
    tile: { floor: '#3a2a1a', accent: '#ffd84a' },
  },
  cursed: {
    category: 'economy',
    id: 'cursed', name: 'Chambre maudite', icon: '🕯️', desc: 'Produit énormément de ressources… mais attire des aventuriers plus forts (+3 niveaux).',
    capacity: 1, trapSlots: 1, buildable: true, maxLevel: 100, maxPerFloor: 2,
    cost: { gold: 2500, stone: 350, metal: 60, darkEssence: 5 }, levelStat: 'atk',
    production: { gold: 45, essence: 1.5 }, rewardBonus: 0.15, rewardPerLevel: 0.01, danger: 3,
    onCombat: [{ id: 'atkDown', chance: 0.3, duration: 4 }],
    unlock: { floor: 4 },
    tile: { floor: '#2a1420', accent: '#ff4f6d' },
  },
  portal: {
    category: 'magic',
    id: 'portal', name: 'Salle des portails', icon: '🌌', desc: 'Relie le donjon aux autres dimensions : +10% de récompenses des modes de jeu, produit des fragments dimensionnels.',
    capacity: 0, trapSlots: 1, buildable: true, maxLevel: 100, maxTotal: 1,
    cost: { gold: 12000, stone: 1500, metal: 300, darkEssence: 20 },
    production: { dimensionalFragments: 0.004 }, runReward: 0.1, perk: 'portal',
    unlock: { floor: 6 },
    tile: { floor: '#140f2a', accent: '#7a8aff' },
  },
  master: {
    category: 'magic',
    id: 'master', name: 'Salle du maître', icon: '🎓', desc: 'Le siège de votre pouvoir : bonus globaux à tout le donjon (+4% par niveau).',
    capacity: 1, trapSlots: 0, buildable: true, maxLevel: 100, maxTotal: 1,
    cost: { gold: 30000, stone: 3000, metal: 600, darkEssence: 30, crystals: 80 }, levelStat: 'hp',
    globalMods: { monsterHp: 0.05, monsterAtk: 0.05, productionGain: 0.08, goldGain: 0.05 },
    unlock: { floor: 8 },
    tile: { floor: '#2a2214', accent: '#ffe08a' },
  },
};

export const ROOM_LIST = Object.values(ROOMS);
export const BUILDABLE_ROOMS = ROOM_LIST.filter((r) => r.buildable);
