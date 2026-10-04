/**
 * AVENTURIERS (données pures)
 * role: tank | dps | support  (utilisé pour composer les groupes)
 * minFloor: étage à partir duquel la classe apparaît
 * loot: multiplicateurs de butin spécifiques à la classe
 */
export const ADVENTURERS = {
  warrior: {
    id: 'warrior', name: 'Guerrier', icon: '⚔️', role: 'tank', element: 'neutral',
    hp: 150, attack: 17, defense: 14, speed: 10,
    basic: 'basic_melee', skills: ['hero_taunt', 'hero_cleave'], passive: 'hero_tough',
    palette: { body: '#b03a2e', light: '#e06a5a', dark: '#5a1510', skin: '#f0c8a0', metal: '#aab4c2', hair: '#5a3a1a' },
    gear: 'sword_shield', minFloor: 1, loot: { metal: 1.6 }, weight: 10,
    desc: 'Solide et têtu. Encaisse les coups pour son groupe.',
  },
  archer: {
    id: 'archer', name: 'Archer', icon: '🏹', role: 'dps', element: 'nature',
    hp: 90, attack: 23, defense: 7, speed: 14,
    basic: 'basic_arrow', skills: ['hero_volley', 'hero_aimed'], passive: 'hero_precise',
    palette: { body: '#3f8a3a', light: '#7cc66a', dark: '#1d4a18', skin: '#e8c09a', metal: '#8a6a3a', hair: '#c08a3a' },
    gear: 'bow', minFloor: 1, loot: { gold: 1.1 }, weight: 10,
    desc: 'Tire de loin, vise juste.',
  },
  mage: {
    id: 'mage', name: 'Mage', icon: '🧙', role: 'dps', element: 'arcane',
    hp: 80, attack: 27, defense: 6, speed: 11,
    basic: 'basic_bolt', skills: ['hero_fireball', 'hero_frost', 'hero_chain'], passive: 'hero_arcane',
    palette: { body: '#3a4ab0', light: '#7a8ae8', dark: '#1a205a', skin: '#f0d0b0', metal: '#ffcc33', hair: '#d0d0d0' },
    gear: 'staff', minFloor: 1, loot: { essence: 2 }, weight: 9,
    desc: 'Lance des sorts dévastateurs sur vos monstres.',
  },
  paladin: {
    id: 'paladin', name: 'Paladin', icon: '🛡️', role: 'tank', element: 'light',
    hp: 165, attack: 15, defense: 17, speed: 9,
    basic: 'basic_melee', skills: ['hero_smite', 'hero_lay_hands', 'hero_blessing'], passive: 'hero_holy',
    palette: { body: '#e0d0a0', light: '#fff5d0', dark: '#8a7a4a', skin: '#f0c8a0', metal: '#ffd84a', hair: '#e0c060' },
    gear: 'hammer_shield', minFloor: 2, loot: { metal: 1.8, gold: 1.2 }, weight: 7,
    desc: 'Champion de la lumière, très résistant.',
  },
  healer: {
    id: 'healer', name: 'Soigneur', icon: '❤️', role: 'support', element: 'light',
    hp: 85, attack: 13, defense: 8, speed: 12,
    basic: 'basic_bolt', skills: ['hero_heal', 'hero_prayer'], passive: 'hero_holy',
    palette: { body: '#f0f0f0', light: '#ffffff', dark: '#9a9aa8', skin: '#f0d0b0', metal: '#ff6a8a', hair: '#8a5a2a' },
    gear: 'staff_holy', minFloor: 1, loot: { essence: 1.5, crystals: 1.5 }, weight: 8,
    desc: 'Maintient son groupe en vie. Cible prioritaire !',
  },
  assassin: {
    id: 'assassin', name: 'Assassin', icon: '🗡️', role: 'dps', element: 'shadow',
    hp: 80, attack: 26, defense: 6, speed: 17,
    basic: 'basic_melee', skills: ['hero_backstab', 'hero_poison_blade'], passive: 'hero_shadow',
    palette: { body: '#2a2a3a', light: '#5a5a7a', dark: '#0a0a14', skin: '#d8b090', metal: '#c0c6d0', hair: '#1a1a1a' },
    gear: 'daggers', minFloor: 3, loot: { gold: 1.6 }, weight: 6,
    desc: 'Frappe vite et vise les monstres affaiblis.',
  },
  hunter: {
    id: 'hunter', name: 'Chasseur de monstres', icon: '🐉', role: 'dps', element: 'neutral',
    hp: 110, attack: 22, defense: 10, speed: 12,
    basic: 'basic_arrow', skills: ['hero_hunter_mark', 'hero_net'], passive: 'hero_slayer',
    palette: { body: '#6a4a2a', light: '#a3804a', dark: '#2e1d0d', skin: '#e0b890', metal: '#9aa4b2', hair: '#3a2a1a' },
    gear: 'crossbow', minFloor: 5, loot: { essence: 1.5, darkEssence: 2 }, weight: 4,
    desc: 'Spécialiste des créatures rares. Redoutable contre vos meilleurs monstres.',
  },
};

export const ADVENTURER_LIST = Object.values(ADVENTURERS);

/** Modèles de composition de groupe par taille. */
export const PARTY_TEMPLATES = {
  1: [['tank'], ['dps'], ['dps']],
  2: [['tank', 'dps'], ['dps', 'support'], ['dps', 'dps']],
  3: [['tank', 'dps', 'support'], ['tank', 'dps', 'dps'], ['dps', 'dps', 'support']],
  4: [['tank', 'dps', 'dps', 'support'], ['tank', 'tank', 'dps', 'support'], ['tank', 'dps', 'dps', 'dps']],
  5: [['tank', 'dps', 'dps', 'dps', 'support'], ['tank', 'tank', 'dps', 'dps', 'support'], ['tank', 'dps', 'dps', 'support', 'support']],
};

/** Noms de héros pour les élites. */
export const HERO_NAMES = [
  'Aldric', 'Brunhild', 'Cassian', 'Dahlia', 'Edwin', 'Freya', 'Gareth', 'Helga', 'Ivor', 'Jora',
  'Kael', 'Lyra', 'Magnus', 'Nyx', 'Orin', 'Perrine', 'Quentin', 'Rowena', 'Sigrid', 'Thibault',
  'Ulric', 'Vesna', 'Wilhelm', 'Ysolde', 'Zephyr',
];

export const GROUP_NAMES = [
  'Les Lames d’Argent', 'La Compagnie du Griffon', 'Les Chercheurs d’Or', 'L’Ordre de l’Aube',
  'Les Pilleurs de Tombes', 'Les Bannis du Nord', 'La Guilde des Aventuriers', 'Les Lanternes Rouges',
  'Les Fils du Tonnerre', 'La Main Noire', 'Les Cœurs Vaillants', 'Les Héritiers du Roi',
];
