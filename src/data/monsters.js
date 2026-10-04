import { BALANCE } from '../config/balance.js';

/**
 * MONSTRES (données pures)
 * ------------------------
 * Ajouter un monstre = ajouter une entrée via `species({...})`. Aucun système n'a besoin d'être modifié.
 *
 * family   archétype graphique (voir gfx/SpriteFactory)
 * role     modèle de stats (config/balance.js -> roleTemplates)
 * stage    stade d'évolution (1 = forme de base)
 * pool     où il peut être invoqué : basic | advanced | dark | none
 * evolutions [{ to, level, extra? }]  (plusieurs entrées = branches d'évolution)
 * palette  couleurs du sprite procédural
 */

/** Règles d'évolution par rareté cible. */
export const EVOLUTION_RULES = {
  rare: { level: 15, cost: { gold: 1500, essence: 40 } },
  epic: { level: 30, cost: { gold: 12000, essence: 160, metal: 60 } },
  legendary: { level: 45, cost: { gold: 90000, essence: 600, darkEssence: 25 } },
  mythic: { level: 60, cost: { gold: 600000, essence: 2000, darkEssence: 120 } },
  ancient: { level: 80, cost: { gold: 4000000, essence: 7000, darkEssence: 500, crystals: 200 } },
};

const STAGE_BONUS = 0.12;

function species(def) {
  const tpl = BALANCE.roleTemplates[def.role];
  const r = BALANCE.rarityStatMult[def.rarity];
  const s = 1 + STAGE_BONUS * ((def.stage || 1) - 1);
  const mod = def.statMods || {};
  const base = {
    hp: Math.round(tpl.hp * r * s * (mod.hp || 1)),
    attack: Math.round(tpl.atk * r * s * (mod.atk || 1)),
    defense: Math.round(tpl.def * r * s * (mod.def || 1)),
    speed: Math.round(tpl.spd * (1 + (r - 1) * 0.15) * (mod.spd || 1)),
  };
  return {
    stage: 1,
    pool: 'none',
    evolutions: [],
    size: 1,
    passive: 'none',
    basic: 'basic_melee',
    ...def,
    ...base,
    ...(def.stats || {}),
  };
}

const P = {
  goblin: { body: '#5fae45', dark: '#2f6a22', light: '#9be07a', accent: '#8a5a2b', eye: '#ffe14d' },
  goblinWar: { body: '#4f9a3a', dark: '#245a1a', light: '#8bd06a', accent: '#9aa4b2', eye: '#ff4d4d' },
  goblinChief: { body: '#3f8a35', dark: '#1d4d16', light: '#7cc65e', accent: '#c0392b', eye: '#ffb52e' },
  goblinKing: { body: '#3a8c4a', dark: '#174a20', light: '#7ad08c', accent: '#ffcc33', eye: '#ffffff' },
  goblinEmp: { body: '#2e7d6a', dark: '#0f3d33', light: '#6fd6bd', accent: '#ff4f6d', eye: '#ffffff' },
  shaman: { body: '#6aa84f', dark: '#33661f', light: '#a6dd85', accent: '#7b4fd6', eye: '#3cf2d0' },
  shamanHigh: { body: '#5a9a5f', dark: '#2a5a30', light: '#99d69c', accent: '#b56cff', eye: '#3cf2d0' },
  prophet: { body: '#4f8f8a', dark: '#1f4a47', light: '#8fd6cf', accent: '#ff5ce1', eye: '#ffffff' },
  skeleton: { body: '#e8e2cf', dark: '#8f8873', light: '#ffffff', accent: '#6d6250', eye: '#4fd1ff' },
  skelWar: { body: '#ded6bf', dark: '#867d66', light: '#ffffff', accent: '#8a94a6', eye: '#ff4d4d' },
  skelKnight: { body: '#d2cab2', dark: '#7a7158', light: '#f5f0e0', accent: '#3a3f55', eye: '#b56cff' },
  lich: { body: '#c7c0e0', dark: '#5e5480', light: '#efeaff', accent: '#4a2a7a', eye: '#3cf2d0' },
  skelArcher: { body: '#e3dcc8', dark: '#8a836e', light: '#ffffff', accent: '#6b4a2b', eye: '#8fe04a' },
  specArcher: { body: '#b9d7ff', dark: '#4b6a99', light: '#e8f3ff', accent: '#2b3a6b', eye: '#ffffff' },
  slime: { body: '#5fd06a', dark: '#2a8a3a', light: '#b5ffb0', accent: '#2a8a3a', eye: '#10301a' },
  slimeGiant: { body: '#45c0a0', dark: '#1d7a62', light: '#a5ffe6', accent: '#1d7a62', eye: '#0f2e26' },
  slimeRoyal: { body: '#a35cff', dark: '#5a2a9a', light: '#dcb8ff', accent: '#ffcc33', eye: '#24103f' },
  slimeCosmic: { body: '#3b2a8a', dark: '#140d3a', light: '#8f7aff', accent: '#ff5ce1', eye: '#ffffff' },
  slimeMagma: { body: '#ff7a2b', dark: '#a33a0f', light: '#ffd27a', accent: '#5a1a05', eye: '#2e0c00' },
  slimeVolc: { body: '#e8452b', dark: '#7a160a', light: '#ffb35a', accent: '#2a0a05', eye: '#ffe14d' },
  slimeFrost: { body: '#7fd6ff', dark: '#2a7aa3', light: '#e0f7ff', accent: '#2a7aa3', eye: '#0f2e40' },
  slimeGlacier: { body: '#5ab0ff', dark: '#1d5a9a', light: '#d6ecff', accent: '#ffffff', eye: '#0a1f3a' },
  bat: { body: '#6a4a8a', dark: '#33204a', light: '#9b7abf', accent: '#d68a9a', eye: '#ff4d4d' },
  batVamp: { body: '#7a2a3a', dark: '#3a0f18', light: '#b55a6a', accent: '#ffcc99', eye: '#ffe14d' },
  batLord: { body: '#4a1a2a', dark: '#1f0610', light: '#8a3a4a', accent: '#ff4f6d', eye: '#ff4f6d' },
  batStorm: { body: '#3a6aa3', dark: '#16305a', light: '#7fb0ff', accent: '#ffe14d', eye: '#ffe14d' },
  batTempest: { body: '#2a4a8a', dark: '#0f1f45', light: '#6f9cff', accent: '#ffffff', eye: '#fffa9a' },
  orc: { body: '#7a9a4a', dark: '#3d5220', light: '#b0d07a', accent: '#8a5a2b', eye: '#ff4d4d' },
  orcBers: { body: '#8a8a3a', dark: '#4a4a15', light: '#c6c67a', accent: '#c0392b', eye: '#ff2d2d' },
  orcChief: { body: '#6a7a3a', dark: '#323d15', light: '#a6b56a', accent: '#5a5a6a', eye: '#ffb52e' },
  orcLord: { body: '#5a6a35', dark: '#262e10', light: '#98a865', accent: '#ffcc33', eye: '#ff4f6d' },
  troll: { body: '#6a8a7a', dark: '#2e4a3d', light: '#a3c6b5', accent: '#6b4a2b', eye: '#ffe14d' },
  trollCave: { body: '#5a7a8a', dark: '#22404d', light: '#9ab9c6', accent: '#4a3a2b', eye: '#ff9c4a' },
  trollAnc: { body: '#4a6a5a', dark: '#1a3328', light: '#8ab09d', accent: '#c6a35a', eye: '#3cf2d0' },
  trollIce: { body: '#a6d6e8', dark: '#4a8aa3', light: '#e8f8ff', accent: '#2a5a7a', eye: '#4fd1ff' },
  golem: { body: '#8a8478', dark: '#4a463e', light: '#bdb7aa', accent: '#4fd1ff', eye: '#4fd1ff' },
  golemIron: { body: '#7a8494', dark: '#3a404d', light: '#b5bfcc', accent: '#ff9c4a', eye: '#ff9c4a' },
  golemRune: { body: '#5a5f7a', dark: '#2a2d40', light: '#9a9fbf', accent: '#3cf2d0', eye: '#3cf2d0' },
  golemTitan: { body: '#c6a35a', dark: '#6a5220', light: '#f0dca0', accent: '#ff5ce1', eye: '#ffffff' },
  golemLava: { body: '#3a2a26', dark: '#1a100e', light: '#6a524a', accent: '#ff6a2b', eye: '#ffcc33' },
  vampire: { body: '#e6d6d6', dark: '#2a1a2a', light: '#ffffff', accent: '#9a1a2a', eye: '#ff2d2d' },
  vampCount: { body: '#dcd0e0', dark: '#1f1030', light: '#ffffff', accent: '#6a1a8a', eye: '#ff2d2d' },
  vampAnc: { body: '#c8c0d6', dark: '#10081f', light: '#f0ecff', accent: '#ffcc33', eye: '#ff4f6d' },
  sorcerer: { body: '#3a4a9a', dark: '#1a204d', light: '#7a8ae0', accent: '#ffcc33', eye: '#4fd1ff' },
  darkMage: { body: '#3a2a5a', dark: '#140a26', light: '#7a5aa3', accent: '#9b6bff', eye: '#b56cff' },
  necro: { body: '#2a2a35', dark: '#0a0a10', light: '#5a5a6a', accent: '#8fe04a', eye: '#8fe04a' },
  pyro: { body: '#9a2a1a', dark: '#4a0f08', light: '#e06a4a', accent: '#ffcc33', eye: '#ffcc33' },
  flameLord: { body: '#c0391a', dark: '#5a1005', light: '#ff8a4a', accent: '#ffe14d', eye: '#ffffff' },
  cryo: { body: '#2a6a9a', dark: '#0f2e4d', light: '#7ab9e8', accent: '#e0f7ff', eye: '#e0f7ff' },
  imp: { body: '#d0452b', dark: '#6a1a0f', light: '#ff8a6a', accent: '#2a0a05', eye: '#ffe14d' },
  demon: { body: '#a3201a', dark: '#4a0805', light: '#e0604a', accent: '#1a0a0a', eye: '#ffcc33' },
  archdemon: { body: '#7a101a', dark: '#2e0306', light: '#c0404a', accent: '#ff6a2b', eye: '#ffe14d' },
  demonPrince: { body: '#4a0a2a', dark: '#1a0310', light: '#9a2a5a', accent: '#ffcc33', eye: '#ff4f6d' },
  whelp: { body: '#d0602b', dark: '#6a2a0f', light: '#ffa36a', accent: '#ffe0a0', eye: '#ffe14d' },
  dragon: { body: '#c0301a', dark: '#5a1005', light: '#ff7a4a', accent: '#ffd27a', eye: '#ffe14d' },
  dragonAnc: { body: '#8a1a10', dark: '#3a0605', light: '#d05a3a', accent: '#ffcc33', eye: '#ffffff' },
  dragonPrim: { body: '#2a1a10', dark: '#0f0805', light: '#6a4a2a', accent: '#ff6a2b', eye: '#ffe14d' },
  wyvernFrost: { body: '#6ab0d6', dark: '#24506a', light: '#c0e6ff', accent: '#ffffff', eye: '#4fd1ff' },
  dragonIce: { body: '#4a8ac0', dark: '#163a5a', light: '#a6d6ff', accent: '#e0f7ff', eye: '#ffffff' },
  dragonShadow: { body: '#3a2a4a', dark: '#120a1a', light: '#6a5a8a', accent: '#9b6bff', eye: '#b56cff' },
  dragonVoid: { body: '#1a1028', dark: '#05020a', light: '#4a3a6a', accent: '#ff5ce1', eye: '#3cf2d0' },
  spider: { body: '#3a3a3a', dark: '#141414', light: '#6a6a6a', accent: '#8fe04a', eye: '#ff4d4d' },
  spiderGiant: { body: '#4a2a1a', dark: '#1a0a05', light: '#7a5a3a', accent: '#ff9c4a', eye: '#ff2d2d' },
  spiderQueen: { body: '#2a1a3a', dark: '#0a0510', light: '#5a3a7a', accent: '#8fe04a', eye: '#8fe04a' },
  ghost: { body: '#b9d0e8', dark: '#5a7090', light: '#ffffff', accent: '#3a4a6a', eye: '#1a2030' },
  banshee: { body: '#c0b0e8', dark: '#5a4a90', light: '#f0e8ff', accent: '#3a2a6a', eye: '#ff4f6d' },
  reaper: { body: '#2a2a3a', dark: '#0a0a14', light: '#5a5a7a', accent: '#c0c6d0', eye: '#3cf2d0' },
  mimic: { body: '#8a5a2b', dark: '#4a2a10', light: '#c08a4a', accent: '#ffcc33', eye: '#ff4d4d' },
  mimicGrand: { body: '#6a3a1a', dark: '#2e1505', light: '#a3653a', accent: '#c0c6d0', eye: '#ff2d2d' },
  mimicRoyal: { body: '#5a2a5a', dark: '#200a20', light: '#9a5a9a', accent: '#ffcc33', eye: '#ffe14d' },
  elemStorm: { body: '#4a8aff', dark: '#1a3a8a', light: '#b0d6ff', accent: '#ffe14d', eye: '#ffffff' },
  elemTempest: { body: '#6a5aff', dark: '#2a1a8a', light: '#c0b6ff', accent: '#fffa9a', eye: '#ffffff' },
  mushroom: { body: '#c0392b', dark: '#6a1a10', light: '#ff7a6a', accent: '#f0e6d0', eye: '#2a1a10' },
  myconid: { body: '#8a4ac0', dark: '#40205a', light: '#c08aff', accent: '#e6dcc8', eye: '#ffe14d' },
  myconidKing: { body: '#4ac08a', dark: '#1a5a3a', light: '#9affcc', accent: '#ffcc33', eye: '#ffffff' },
  eye: { body: '#a35a8a', dark: '#4a1a3a', light: '#e09ac0', accent: '#ffffff', eye: '#3cf2d0' },
  eyeTyrant: { body: '#7a2a5a', dark: '#2e0a20', light: '#c06a9a', accent: '#ffcc33', eye: '#ff2d2d' },
  eyeAbyss: { body: '#1a0a2a', dark: '#05020a', light: '#4a2a6a', accent: '#3cf2d0', eye: '#ff5ce1' },
  wisp: { body: '#fff3b0', dark: '#c0a040', light: '#ffffff', accent: '#ffe14d', eye: '#6a5a20' },
  lantern: { body: '#b0e6ff', dark: '#4a8ab0', light: '#ffffff', accent: '#ffe14d', eye: '#20405a' },
  seraph: { body: '#f0e6c8', dark: '#6a5a3a', light: '#ffffff', accent: '#2a2a3a', eye: '#ffcc33' },
};

export const MONSTERS = [
  // ===== Gobelins =====
  species({ id: 'goblin', name: 'Gobelin', family: 'goblin', rarity: 'common', element: 'nature', role: 'bruiser', skills: ['goblin_stab'], passive: 'pack_tactics', palette: P.goblin, pool: 'basic', desc: 'Petit, vicieux et toujours en bande.', evolutions: [{ to: 'goblin_warrior' }, { to: 'goblin_shaman' }] }),
  species({ id: 'goblin_warrior', name: 'Gobelin Guerrier', family: 'goblin', stage: 2, rarity: 'rare', element: 'nature', role: 'bruiser', skills: ['goblin_stab', 'orc_cleave'], passive: 'pack_tactics', palette: P.goblinWar, gear: 'sword', desc: 'Un gobelin qui a trouvé une vraie épée.', evolutions: [{ to: 'goblin_chief' }] }),
  species({ id: 'goblin_chief', name: 'Chef Gobelin', family: 'goblin', stage: 3, rarity: 'epic', element: 'nature', role: 'bruiser', skills: ['goblin_stab', 'goblin_rally'], passive: 'warlord', palette: P.goblinChief, gear: 'axe', size: 1.1, desc: 'Ses cris galvanisent toute la horde.', evolutions: [{ to: 'goblin_king' }] }),
  species({ id: 'goblin_king', name: 'Roi Gobelin', family: 'goblin', stage: 4, rarity: 'legendary', element: 'nature', role: 'bruiser', skills: ['royal_decree', 'orc_cleave', 'goblin_stab'], passive: 'royal_aura', palette: P.goblinKing, gear: 'crown', size: 1.2, desc: 'Souverain incontesté des tunnels.', evolutions: [{ to: 'goblin_emperor', extra: { roomLevel: { room: 'combat', level: 100 } } }] }),
  species({ id: 'goblin_emperor', name: 'Empereur Gobelin', family: 'goblin', stage: 5, rarity: 'mythic', element: 'nature', role: 'bruiser', skills: ['royal_decree', 'war_stomp', 'goblin_stab'], passive: 'royal_aura', palette: P.goblinEmp, gear: 'crown', size: 1.3, desc: 'Évolution spéciale : née d’une salle de combat de niveau 100.' }),
  species({ id: 'goblin_shaman', name: 'Gobelin Shaman', family: 'goblin', stage: 2, rarity: 'rare', element: 'arcane', role: 'support', basic: 'basic_bolt', skills: ['goblin_hex', 'goblin_totem'], passive: 'pack_tactics', palette: P.shaman, gear: 'staff', desc: 'Murmure aux esprits de la roche.', evolutions: [{ to: 'goblin_high_shaman' }] }),
  species({ id: 'goblin_high_shaman', name: 'Grand Shaman', family: 'goblin', stage: 3, rarity: 'epic', element: 'arcane', role: 'support', basic: 'basic_bolt', skills: ['goblin_hex', 'goblin_totem', 'arcane_missile'], passive: 'arcane_mind', palette: P.shamanHigh, gear: 'staff', size: 1.1, desc: 'Ses totems soignent toute la tribu.', evolutions: [{ to: 'goblin_prophet' }] }),
  species({ id: 'goblin_prophet', name: 'Prophète Gobelin', family: 'goblin', stage: 4, rarity: 'legendary', element: 'arcane', role: 'support', basic: 'basic_bolt', skills: ['bloom', 'arcane_missile', 'goblin_hex'], passive: 'radiant', palette: P.prophet, gear: 'staff', size: 1.2, desc: 'Il a vu la fin des héros dans ses visions.' }),

  // ===== Squelettes =====
  species({ id: 'skeleton', name: 'Squelette', family: 'skeleton', rarity: 'common', element: 'shadow', role: 'tank', skills: ['bone_wall'], passive: 'bone_armor', palette: P.skeleton, pool: 'basic', desc: 'Ne connaît ni la peur ni la fatigue.', evolutions: [{ to: 'skeleton_warrior' }, { to: 'skeleton_archer' }] }),
  species({ id: 'skeleton_warrior', name: 'Squelette Guerrier', family: 'skeleton', stage: 2, rarity: 'rare', element: 'shadow', role: 'tank', skills: ['bone_wall', 'death_strike'], passive: 'bone_armor', palette: P.skelWar, gear: 'sword', desc: 'Un vétéran d’une guerre oubliée.', evolutions: [{ to: 'skeleton_knight' }] }),
  species({ id: 'skeleton_knight', name: 'Chevalier Squelette', family: 'skeleton', stage: 3, rarity: 'epic', element: 'shadow', role: 'tank', skills: ['bone_wall', 'death_strike'], passive: 'undead', palette: P.skelKnight, gear: 'helmet', size: 1.1, desc: 'Son serment le lie au donjon pour l’éternité.', evolutions: [{ to: 'lich_lord' }] }),
  species({ id: 'lich_lord', name: 'Seigneur Liche', family: 'skeleton', stage: 4, rarity: 'legendary', element: 'shadow', role: 'caster', basic: 'basic_bolt', skills: ['lich_nova', 'raise_dead', 'shadow_bolt'], passive: 'undead', palette: P.lich, gear: 'crown', size: 1.2, desc: 'A troqué la mort contre le savoir interdit.' }),
  species({ id: 'skeleton_archer', name: 'Squelette Archer', family: 'skeleton', stage: 2, rarity: 'rare', element: 'shadow', role: 'dps', basic: 'basic_arrow', skills: ['bone_throw'], passive: 'bone_armor', palette: P.skelArcher, gear: 'bow', desc: 'Ses orbites vides ne ratent jamais leur cible.', evolutions: [{ to: 'spectral_archer' }] }),
  species({ id: 'spectral_archer', name: 'Archer Spectral', family: 'skeleton', stage: 3, rarity: 'epic', element: 'shadow', role: 'dps', basic: 'basic_arrow', skills: ['spectral_volley', 'bone_throw'], passive: 'ethereal', palette: P.specArcher, gear: 'bow', size: 1.1, desc: 'Ses flèches traversent les boucliers.' }),

  // ===== Slimes =====
  species({ id: 'slime', name: 'Slime', family: 'slime', rarity: 'common', element: 'poison', role: 'tank', basic: 'basic_slime', skills: ['slime_engulf'], passive: 'gelatinous', palette: P.slime, pool: 'basic', desc: 'Gluant, increvable, adorable.', evolutions: [{ to: 'slime_giant' }, { to: 'slime_magma' }, { to: 'slime_frost' }] }),
  species({ id: 'slime_giant', name: 'Slime Géant', family: 'slime', stage: 2, rarity: 'rare', element: 'poison', role: 'tank', basic: 'basic_slime', skills: ['slime_engulf', 'slime_split'], passive: 'gelatinous', palette: P.slimeGiant, size: 1.15, desc: 'Il a mangé trois aventuriers. Et leurs armures.', evolutions: [{ to: 'slime_royal' }] }),
  species({ id: 'slime_royal', name: 'Slime Royal', family: 'slime', stage: 3, rarity: 'epic', element: 'poison', role: 'tank', basic: 'basic_slime', skills: ['slime_engulf', 'slime_split', 'slime_quake'], passive: 'acidic', palette: P.slimeRoyal, gear: 'crown', size: 1.25, desc: 'Porte une couronne trouvée dans son estomac.', evolutions: [{ to: 'slime_cosmic' }] }),
  species({ id: 'slime_cosmic', name: 'Slime Cosmique', family: 'slime', stage: 4, rarity: 'mythic', element: 'arcane', role: 'tank', basic: 'basic_slime', skills: ['cosmic_rift', 'slime_split', 'slime_quake'], passive: 'cosmic', palette: P.slimeCosmic, gear: 'stars', size: 1.35, desc: 'Une galaxie entière tremble en lui.' }),
  species({ id: 'slime_magma', name: 'Slime de Magma', family: 'slime', stage: 2, rarity: 'rare', element: 'fire', role: 'bruiser', basic: 'basic_slime', skills: ['magma_spit'], passive: 'molten', palette: P.slimeMagma, desc: 'Ne pas toucher. Vraiment.', evolutions: [{ to: 'slime_volcanic' }] }),
  species({ id: 'slime_volcanic', name: 'Slime Volcanique', family: 'slime', stage: 3, rarity: 'epic', element: 'fire', role: 'bruiser', basic: 'basic_slime', skills: ['magma_spit', 'lava_fist'], passive: 'molten', palette: P.slimeVolc, size: 1.2, desc: 'Un petit volcan qui rebondit.' }),
  species({ id: 'slime_frost', name: 'Slime Givré', family: 'slime', stage: 2, rarity: 'rare', element: 'ice', role: 'tank', basic: 'basic_slime', skills: ['frost_spit'], passive: 'frozen_core', palette: P.slimeFrost, desc: 'Une gelée à la menthe… mortelle.', evolutions: [{ to: 'slime_glacier' }] }),
  species({ id: 'slime_glacier', name: 'Slime Glaciaire', family: 'slime', stage: 3, rarity: 'epic', element: 'ice', role: 'tank', basic: 'basic_slime', skills: ['frost_spit', 'glacial_slam'], passive: 'frozen_core', palette: P.slimeGlacier, size: 1.2, desc: 'Un iceberg vivant.' }),

  // ===== Chauves-souris =====
  species({ id: 'bat', name: 'Chauve-souris', family: 'bat', rarity: 'common', element: 'shadow', role: 'fast', basic: 'basic_bite', skills: ['bat_drain'], passive: 'evasive', palette: P.bat, pool: 'basic', desc: 'Rapide et insaisissable.', evolutions: [{ to: 'vampire_bat' }, { to: 'storm_bat' }] }),
  species({ id: 'vampire_bat', name: 'Chauve-souris Vampire', family: 'bat', stage: 2, rarity: 'rare', element: 'shadow', role: 'fast', basic: 'basic_bite', skills: ['bat_drain', 'bat_screech'], passive: 'vampiric', palette: P.batVamp, desc: 'Se nourrit du sang des héros.', evolutions: [{ to: 'swarm_lord' }] }),
  species({ id: 'swarm_lord', name: 'Seigneur des Nuées', family: 'bat', stage: 3, rarity: 'epic', element: 'shadow', role: 'fast', basic: 'basic_bite', skills: ['bat_swarm', 'bat_drain', 'bat_screech'], passive: 'vampiric', palette: P.batLord, size: 1.2, desc: 'Mille ailes obéissent à son cri.' }),
  species({ id: 'storm_bat', name: 'Chauve-souris Foudroyante', family: 'bat', stage: 2, rarity: 'rare', element: 'lightning', role: 'fast', basic: 'basic_bite', skills: ['thunder_dive'], passive: 'storm_charged', palette: P.batStorm, desc: 'Crépite à chaque battement d’ailes.', evolutions: [{ to: 'tempest_wing' }] }),
  species({ id: 'tempest_wing', name: 'Tempête Ailée', family: 'bat', stage: 3, rarity: 'epic', element: 'lightning', role: 'fast', basic: 'basic_bite', skills: ['storm_wings', 'thunder_dive'], passive: 'storm_charged', palette: P.batTempest, size: 1.2, desc: 'L’orage fait chauve-souris.' }),

  // ===== Orcs =====
  species({ id: 'orc', name: 'Orc', family: 'orc', rarity: 'common', element: 'fire', role: 'bruiser', basic: 'basic_smash', skills: ['orc_cleave'], passive: 'berserker', palette: P.orc, pool: 'basic', statMods: { hp: 1.1 }, desc: 'Brutal, fier et toujours affamé.', evolutions: [{ to: 'orc_berserker' }, { to: 'orc_warchief' }] }),
  species({ id: 'orc_berserker', name: 'Orc Berserker', family: 'orc', stage: 2, rarity: 'rare', element: 'fire', role: 'dps', basic: 'basic_smash', skills: ['orc_cleave', 'orc_rage'], passive: 'berserker', palette: P.orcBers, gear: 'axe', desc: 'Plus il saigne, plus il frappe.', evolutions: [{ to: 'orc_lord' }] }),
  species({ id: 'orc_warchief', name: 'Chef de Guerre Orc', family: 'orc', stage: 2, rarity: 'rare', element: 'fire', role: 'tank', basic: 'basic_smash', skills: ['war_stomp', 'orc_rage'], passive: 'warlord', palette: P.orcChief, gear: 'helmet', desc: 'Commande par la force.', evolutions: [{ to: 'orc_lord' }] }),
  species({ id: 'orc_lord', name: 'Seigneur Orc', family: 'orc', stage: 3, rarity: 'epic', element: 'fire', role: 'bruiser', basic: 'basic_smash', skills: ['war_stomp', 'orc_cleave', 'orc_rage'], passive: 'warlord', palette: P.orcLord, gear: 'crown', size: 1.2, desc: 'Les montagnes tremblent sous ses pas.' }),

  // ===== Trolls =====
  species({ id: 'troll', name: 'Troll', family: 'troll', rarity: 'rare', element: 'nature', role: 'tank', basic: 'basic_smash', skills: ['troll_smash', 'troll_regen'], passive: 'thick_hide', palette: P.troll, pool: 'advanced', size: 1.1, desc: 'Ses blessures se referment à vue d’œil.', evolutions: [{ to: 'cave_troll' }, { to: 'ice_troll' }] }),
  species({ id: 'cave_troll', name: 'Troll des Cavernes', family: 'troll', stage: 2, rarity: 'epic', element: 'nature', role: 'tank', basic: 'basic_smash', skills: ['troll_smash', 'troll_regen', 'war_stomp'], passive: 'thick_hide', palette: P.trollCave, size: 1.2, desc: 'N’a jamais vu la lumière du jour.', evolutions: [{ to: 'ancestral_troll' }] }),
  species({ id: 'ancestral_troll', name: 'Troll Ancestral', family: 'troll', stage: 3, rarity: 'legendary', element: 'nature', role: 'tank', basic: 'basic_smash', skills: ['troll_smash', 'troll_regen', 'golem_quake'], passive: 'thick_hide', palette: P.trollAnc, gear: 'stars', size: 1.3, desc: 'Plus vieux que le donjon lui-même.' }),
  species({ id: 'ice_troll', name: 'Troll des Glaces', family: 'troll', stage: 2, rarity: 'epic', element: 'ice', role: 'tank', basic: 'basic_smash', skills: ['glacial_slam', 'troll_regen'], passive: 'frozen_core', palette: P.trollIce, size: 1.2, desc: 'Son souffle givre les torches.' }),

  // ===== Golems =====
  species({ id: 'golem', name: 'Golem de Pierre', family: 'golem', rarity: 'rare', element: 'nature', role: 'tank', basic: 'basic_smash', skills: ['golem_guard'], passive: 'stone_body', palette: P.golem, pool: 'advanced', statMods: { spd: 0.85 }, size: 1.1, desc: 'Un mur qui marche.', evolutions: [{ to: 'iron_golem' }, { to: 'lava_golem' }] }),
  species({ id: 'iron_golem', name: 'Golem de Fer', family: 'golem', stage: 2, rarity: 'epic', element: 'neutral', role: 'tank', basic: 'basic_smash', skills: ['golem_guard', 'golem_quake'], passive: 'stone_body', palette: P.golemIron, statMods: { spd: 0.85 }, size: 1.2, desc: 'Forgé dans les profondeurs.', evolutions: [{ to: 'runic_golem' }] }),
  species({ id: 'runic_golem', name: 'Golem Runique', family: 'golem', stage: 3, rarity: 'legendary', element: 'arcane', role: 'tank', basic: 'basic_smash', skills: ['golem_guard', 'rune_beam', 'golem_quake'], passive: 'spiked', palette: P.golemRune, statMods: { spd: 0.85 }, size: 1.25, desc: 'Des runes anciennes pulsent sur sa carapace.', evolutions: [{ to: 'titan_golem' }] }),
  species({ id: 'titan_golem', name: 'Golem Titan', family: 'golem', stage: 4, rarity: 'mythic', element: 'arcane', role: 'tank', basic: 'basic_smash', skills: ['golem_guard', 'rune_beam', 'boss_rockfall'], passive: 'stone_body', palette: P.golemTitan, statMods: { spd: 0.85 }, size: 1.4, desc: 'Un colosse capable de porter un étage entier.' }),
  species({ id: 'lava_golem', name: 'Golem de Lave', family: 'golem', stage: 2, rarity: 'epic', element: 'fire', role: 'bruiser', basic: 'basic_smash', skills: ['lava_fist', 'golem_guard'], passive: 'molten', palette: P.golemLava, size: 1.2, desc: 'De la roche en fusion qui a décidé de se battre.' }),

  // ===== Vampires =====
  species({ id: 'vampire', name: 'Vampire', family: 'vampire', rarity: 'epic', element: 'shadow', role: 'dps', skills: ['vampire_bite', 'bat_swarm'], passive: 'vampiric', palette: P.vampire, pool: 'advanced', desc: 'Élégant, cruel et éternellement assoiffé.', evolutions: [{ to: 'vampire_count' }] }),
  species({ id: 'vampire_count', name: 'Comte Vampire', family: 'vampire', stage: 2, rarity: 'legendary', element: 'shadow', role: 'dps', skills: ['vampire_bite', 'blood_moon', 'bat_swarm'], passive: 'vampiric', palette: P.vampCount, gear: 'cape', size: 1.1, desc: 'Ses bals sont donnés dans le sang.', evolutions: [{ to: 'ancient_vampire' }] }),
  species({ id: 'ancient_vampire', name: 'Vampire Ancien', family: 'vampire', stage: 3, rarity: 'mythic', element: 'shadow', role: 'dps', skills: ['vampire_bite', 'blood_moon', 'shadow_bolt'], passive: 'undead', palette: P.vampAnc, gear: 'crown', size: 1.2, desc: 'Il a connu le premier soleil.' }),

  // ===== Sorciers =====
  species({ id: 'sorcerer', name: 'Sorcier', family: 'sorcerer', rarity: 'rare', element: 'arcane', role: 'caster', basic: 'basic_bolt', skills: ['arcane_missile'], passive: 'arcane_mind', palette: P.sorcerer, pool: 'advanced', desc: 'Il a choisi le côté obscur… pour la paie.', evolutions: [{ to: 'dark_mage' }, { to: 'pyromancer' }, { to: 'cryomancer' }] }),
  species({ id: 'dark_mage', name: 'Mage Noir', family: 'sorcerer', stage: 2, rarity: 'epic', element: 'shadow', role: 'caster', basic: 'basic_bolt', skills: ['shadow_bolt', 'arcane_missile'], passive: 'arcane_mind', palette: P.darkMage, desc: 'Les ombres murmurent ses incantations.', evolutions: [{ to: 'necromancer' }] }),
  species({ id: 'necromancer', name: 'Nécromancien', family: 'sorcerer', stage: 3, rarity: 'legendary', element: 'shadow', role: 'caster', basic: 'basic_bolt', skills: ['lich_nova', 'raise_dead', 'shadow_bolt'], passive: 'undead', palette: P.necro, gear: 'skull', size: 1.1, desc: 'La mort n’est qu’un outil.' }),
  species({ id: 'pyromancer', name: 'Pyromancien', family: 'sorcerer', stage: 2, rarity: 'epic', element: 'fire', role: 'caster', basic: 'basic_bolt', skills: ['fireball', 'imp_fire'], passive: 'molten', palette: P.pyro, desc: 'Sent toujours un peu le roussi.', evolutions: [{ to: 'flame_lord' }] }),
  species({ id: 'flame_lord', name: 'Seigneur des Flammes', family: 'sorcerer', stage: 3, rarity: 'legendary', element: 'fire', role: 'caster', basic: 'basic_bolt', skills: ['inferno', 'fireball'], passive: 'hellborn', palette: P.flameLord, gear: 'crown', size: 1.1, desc: 'Un brasier doué de raison.' }),
  species({ id: 'cryomancer', name: 'Cryomancien', family: 'sorcerer', stage: 2, rarity: 'epic', element: 'ice', role: 'caster', basic: 'basic_bolt', skills: ['blizzard', 'frost_spit'], passive: 'frozen_core', palette: P.cryo, desc: 'Son cœur est aussi froid que ses sorts.' }),

  // ===== Démons =====
  species({ id: 'imp', name: 'Diablotin', family: 'imp', rarity: 'common', element: 'fire', role: 'fast', basic: 'basic_claw', skills: ['imp_fire'], passive: 'evasive', palette: P.imp, pool: 'basic', desc: 'Petit démon farceur et pyromane.', evolutions: [{ to: 'demon' }] }),
  species({ id: 'demon', name: 'Démon', family: 'demon', stage: 2, rarity: 'epic', element: 'fire', role: 'bruiser', basic: 'basic_claw', skills: ['demon_claw', 'imp_fire'], passive: 'hellborn', palette: P.demon, pool: 'advanced', size: 1.1, desc: 'Échappé des enfers, recruté par vos soins.', evolutions: [{ to: 'archdemon' }] }),
  species({ id: 'archdemon', name: 'Archidémon', family: 'demon', stage: 3, rarity: 'legendary', element: 'fire', role: 'bruiser', basic: 'basic_claw', skills: ['hellfire', 'demon_claw', 'demon_pact'], passive: 'hellborn', palette: P.archdemon, size: 1.25, desc: 'Ses ailes obscurcissent les salles.', evolutions: [{ to: 'demon_prince' }] }),
  species({ id: 'demon_prince', name: 'Prince Démon', family: 'demon', stage: 4, rarity: 'mythic', element: 'shadow', role: 'bruiser', basic: 'basic_claw', skills: ['hellfire', 'boss_demon_chains', 'demon_pact'], passive: 'boss_demon', palette: P.demonPrince, gear: 'crown', size: 1.35, desc: 'Héritier du trône infernal.' }),

  // ===== Dragons =====
  species({ id: 'whelp', name: 'Dragonnet', family: 'dragon', rarity: 'epic', element: 'fire', role: 'dps', basic: 'basic_bite', skills: ['dragon_breath'], passive: 'draconic', palette: P.whelp, pool: 'advanced', size: 0.9, desc: 'Petit mais déjà très chaud.', evolutions: [{ to: 'dragon' }, { to: 'frost_wyvern' }, { to: 'shadow_dragon' }] }),
  species({ id: 'dragon', name: 'Dragon', family: 'dragon', stage: 2, rarity: 'legendary', element: 'fire', role: 'dps', basic: 'basic_bite', skills: ['dragon_breath', 'tail_sweep'], passive: 'draconic', palette: P.dragon, size: 1.25, desc: 'Le gardien ultime de tout trésor.', evolutions: [{ to: 'ancestral_dragon' }] }),
  species({ id: 'ancestral_dragon', name: 'Dragon Ancestral', family: 'dragon', stage: 3, rarity: 'mythic', element: 'fire', role: 'dps', basic: 'basic_bite', skills: ['dragon_breath', 'tail_sweep', 'dragon_roar'], passive: 'draconic', palette: P.dragonAnc, gear: 'stars', size: 1.4, desc: 'Ses écailles ont la couleur des volcans éteints.', evolutions: [{ to: 'primordial_dragon' }] }),
  species({ id: 'primordial_dragon', name: 'Dragon Primordial', family: 'dragon', stage: 4, rarity: 'ancient', element: 'fire', role: 'dps', basic: 'basic_bite', skills: ['boss_meteor', 'dragon_breath', 'dragon_roar'], passive: 'primordial', palette: P.dragonPrim, gear: 'stars', size: 1.5, desc: 'Né avant le monde, il le brûlera après.' }),
  species({ id: 'frost_wyvern', name: 'Wyverne de Givre', family: 'dragon', stage: 2, rarity: 'legendary', element: 'ice', role: 'fast', basic: 'basic_bite', skills: ['frost_breath', 'tail_sweep'], passive: 'frozen_core', palette: P.wyvernFrost, size: 1.2, desc: 'Fend l’air glacé des profondeurs.', evolutions: [{ to: 'ice_dragon' }] }),
  species({ id: 'ice_dragon', name: 'Dragon des Glaces', family: 'dragon', stage: 3, rarity: 'mythic', element: 'ice', role: 'dps', basic: 'basic_bite', skills: ['frost_breath', 'boss_glacial_prison', 'tail_sweep'], passive: 'draconic', palette: P.dragonIce, size: 1.4, desc: 'L’hiver éternel a des ailes.' }),
  species({ id: 'shadow_dragon', name: 'Dragon d’Ombre', family: 'dragon', stage: 2, rarity: 'legendary', element: 'shadow', role: 'dps', basic: 'basic_bite', skills: ['void_breath', 'tail_sweep'], passive: 'draconic', palette: P.dragonShadow, size: 1.25, desc: 'Une ombre qui dévore la lumière.', evolutions: [{ to: 'void_dragon' }] }),
  species({ id: 'void_dragon', name: 'Dragon du Néant', family: 'dragon', stage: 3, rarity: 'ancient', element: 'shadow', role: 'dps', basic: 'basic_bite', skills: ['void_breath', 'boss_void_collapse', 'dragon_roar'], passive: 'primordial', palette: P.dragonVoid, gear: 'stars', size: 1.5, desc: 'Là où il passe, il ne reste rien.' }),

  // ===== Araignées =====
  species({ id: 'spider', name: 'Araignée', family: 'spider', rarity: 'common', element: 'poison', role: 'fast', basic: 'basic_bite', skills: ['web_shot'], passive: 'venomous', palette: P.spider, pool: 'basic', desc: 'Tisse ses toiles entre les pièges.', evolutions: [{ to: 'giant_spider' }] }),
  species({ id: 'giant_spider', name: 'Araignée Géante', family: 'spider', stage: 2, rarity: 'rare', element: 'poison', role: 'dps', basic: 'basic_bite', skills: ['venom_bite', 'web_shot'], passive: 'venomous', palette: P.spiderGiant, size: 1.15, desc: 'Grande comme un cheval. Et plus rapide.', evolutions: [{ to: 'spider_queen' }] }),
  species({ id: 'spider_queen', name: 'Reine Araignée', family: 'spider', stage: 3, rarity: 'epic', element: 'poison', role: 'dps', basic: 'basic_bite', skills: ['brood', 'venom_bite', 'web_shot'], passive: 'venomous', palette: P.spiderQueen, gear: 'crown', size: 1.25, desc: 'Mère de mille venins.' }),

  // ===== Spectres =====
  species({ id: 'ghost', name: 'Spectre', family: 'ghost', rarity: 'rare', element: 'shadow', role: 'fast', basic: 'basic_bolt', skills: ['wail'], passive: 'ethereal', palette: P.ghost, pool: 'advanced', desc: 'Hante les couloirs depuis des siècles.', evolutions: [{ to: 'banshee' }] }),
  species({ id: 'banshee', name: 'Banshee', family: 'ghost', stage: 2, rarity: 'epic', element: 'shadow', role: 'caster', basic: 'basic_bolt', skills: ['wail', 'phase'], passive: 'ethereal', palette: P.banshee, desc: 'Son cri annonce la mort.', evolutions: [{ to: 'reaper' }] }),
  species({ id: 'reaper', name: 'Faucheur', family: 'ghost', stage: 3, rarity: 'legendary', element: 'shadow', role: 'dps', basic: 'basic_melee', skills: ['soul_reap', 'wail', 'phase'], passive: 'ethereal', palette: P.reaper, gear: 'scythe', size: 1.2, desc: 'Personne ne lui échappe.' }),

  // ===== Mimiques =====
  species({ id: 'mimic', name: 'Mimique', family: 'mimic', rarity: 'rare', element: 'arcane', role: 'bruiser', basic: 'basic_bite', skills: ['mimic_chomp'], passive: 'greedy', palette: P.mimic, pool: 'advanced', desc: 'Ce coffre a des dents.', evolutions: [{ to: 'grand_mimic' }] }),
  species({ id: 'grand_mimic', name: 'Grand Mimique', family: 'mimic', stage: 2, rarity: 'epic', element: 'arcane', role: 'bruiser', basic: 'basic_bite', skills: ['mimic_chomp', 'gold_spray'], passive: 'greedy', palette: P.mimicGrand, size: 1.15, desc: 'Un coffre-fort affamé.', evolutions: [{ to: 'royal_mimic' }] }),
  species({ id: 'royal_mimic', name: 'Mimique Royal', family: 'mimic', stage: 3, rarity: 'legendary', element: 'arcane', role: 'bruiser', basic: 'basic_bite', skills: ['mimic_chomp', 'gold_spray', 'goblin_hex'], passive: 'greedy', palette: P.mimicRoyal, gear: 'crown', size: 1.25, desc: 'Le plus grand trésor… et le plus mordant.' }),

  // ===== Élémentaires =====
  species({ id: 'storm_elemental', name: 'Élémentaire de Foudre', family: 'elemental', rarity: 'epic', element: 'lightning', role: 'caster', basic: 'basic_bolt', skills: ['static_field'], passive: 'storm_charged', palette: P.elemStorm, pool: 'advanced', desc: 'De l’orage en bouteille.', evolutions: [{ to: 'tempest_lord' }] }),
  species({ id: 'tempest_lord', name: 'Seigneur Tempête', family: 'elemental', stage: 2, rarity: 'legendary', element: 'lightning', role: 'caster', basic: 'basic_bolt', skills: ['thunderstorm', 'static_field'], passive: 'storm_charged', palette: P.elemTempest, gear: 'stars', size: 1.2, desc: 'Commande la foudre souterraine.' }),

  // ===== Champignons =====
  species({ id: 'mushroom', name: 'Champignon', family: 'mushroom', rarity: 'common', element: 'nature', role: 'support', basic: 'basic_slime', skills: ['spore_cloud'], passive: 'mycelium', palette: P.mushroom, pool: 'basic', desc: 'Ne pas manger.', evolutions: [{ to: 'myconid' }] }),
  species({ id: 'myconid', name: 'Myconide', family: 'mushroom', stage: 2, rarity: 'rare', element: 'nature', role: 'support', basic: 'basic_slime', skills: ['spore_cloud', 'bloom'], passive: 'mycelium', palette: P.myconid, size: 1.1, desc: 'Un réseau de spores pensant.', evolutions: [{ to: 'myconid_king' }] }),
  species({ id: 'myconid_king', name: 'Roi Myconide', family: 'mushroom', stage: 3, rarity: 'epic', element: 'nature', role: 'support', basic: 'basic_slime', skills: ['bloom', 'root_bind', 'spore_cloud'], passive: 'mycelium', palette: P.myconidKing, gear: 'crown', size: 1.2, desc: 'Le donjon entier est son royaume souterrain.' }),

  // ===== Yeux =====
  species({ id: 'beholder', name: 'Œil Flottant', family: 'eye', rarity: 'legendary', element: 'arcane', role: 'caster', basic: 'basic_bolt', skills: ['eye_beam', 'gaze'], passive: 'all_seeing', palette: P.eye, pool: 'dark', desc: 'Il voit tout. Surtout vos points faibles.', evolutions: [{ to: 'eye_tyrant' }] }),
  species({ id: 'eye_tyrant', name: 'Tyran Oculaire', family: 'eye', stage: 2, rarity: 'mythic', element: 'arcane', role: 'caster', basic: 'basic_bolt', skills: ['eye_beam', 'gaze', 'arcane_missile'], passive: 'all_seeing', palette: P.eyeTyrant, size: 1.25, desc: 'Une tyrannie du regard.', evolutions: [{ to: 'abyssal_eye' }] }),
  species({ id: 'abyssal_eye', name: 'Œil Abyssal', family: 'eye', stage: 3, rarity: 'ancient', element: 'shadow', role: 'caster', basic: 'basic_bolt', skills: ['abyss_gaze', 'eye_beam', 'gaze'], passive: 'boss_abyss', palette: P.eyeAbyss, gear: 'stars', size: 1.4, desc: 'Le regard qui contemple l’abîme… est l’abîme.' }),

  // ===== Lumière =====
  species({ id: 'wisp', name: 'Feu Follet', family: 'wisp', rarity: 'common', element: 'light', role: 'support', basic: 'basic_bolt', skills: ['wisp_light'], passive: 'radiant', palette: P.wisp, pool: 'basic', desc: 'Une lueur qui égare les aventuriers.', evolutions: [{ to: 'spectral_lantern' }] }),
  species({ id: 'spectral_lantern', name: 'Lanterne Spectrale', family: 'wisp', stage: 2, rarity: 'rare', element: 'light', role: 'support', basic: 'basic_bolt', skills: ['wisp_light', 'holy_ray'], passive: 'radiant', palette: P.lantern, desc: 'Guide les âmes perdues… vers vos pièges.', evolutions: [{ to: 'fallen_seraph' }] }),
  species({ id: 'fallen_seraph', name: 'Séraphin Déchu', family: 'seraph', stage: 3, rarity: 'legendary', element: 'light', role: 'caster', basic: 'basic_bolt', skills: ['fallen_wrath', 'wisp_light', 'holy_ray'], passive: 'radiant', palette: P.seraph, size: 1.25, desc: 'Banni des cieux, accueilli dans votre donjon.' }),

  // ===== Gardiens (boss vaincus, placables dans l'Antre du gardien) =====
  species({ id: 'guardian_colossus', name: 'Colosse Gardien', family: 'boss_golem', rarity: 'legendary', element: 'nature', role: 'tank', guardian: true, basic: 'basic_smash', skills: ['boss_colossal_slam', 'boss_rockfall', 'golem_guard'], passive: 'boss_colossus', palette: { body: '#8a8070', dark: '#3a352d', light: '#c6bca8', accent: '#4fd1ff', eye: '#4fd1ff' }, statMods: { hp: 1.5 }, size: 1.4, desc: 'Le Golem colossal veille désormais sur votre donjon.' }),
  species({ id: 'guardian_archmage', name: 'Archimage Asservi', family: 'boss_archmage', rarity: 'legendary', element: 'arcane', role: 'caster', guardian: true, basic: 'basic_bolt', skills: ['boss_arcane_storm', 'boss_time_stop', 'arcane_missile'], passive: 'boss_archmage', palette: { body: '#3a2a8a', dark: '#140a3a', light: '#7a6ae0', accent: '#ffcc33', eye: '#3cf2d0' }, statMods: { hp: 1.3 }, size: 1.3, desc: 'Lié par un pacte, il sert désormais le Maître.' }),
  species({ id: 'guardian_hydra', name: 'Hydre Domptée', family: 'boss_hydra', rarity: 'mythic', element: 'poison', role: 'bruiser', guardian: true, basic: 'basic_bite', skills: ['boss_hydra_bite', 'boss_regrow', 'brood'], passive: 'boss_hydra', palette: { body: '#3a7a3a', dark: '#163a16', light: '#7ac06a', accent: '#c6e05a', eye: '#ffe14d' }, statMods: { hp: 1.3 }, size: 1.4, desc: 'Chaque tête garde une salle.' }),
  species({ id: 'guardian_dragon', name: 'Dragon Gardien', family: 'boss_dragon', rarity: 'mythic', element: 'fire', role: 'dps', guardian: true, basic: 'basic_bite', skills: ['dragon_breath', 'boss_meteor', 'dragon_roar'], passive: 'boss_dragon', palette: { body: '#b0281a', dark: '#4a0a05', light: '#ff6a3a', accent: '#ffcc33', eye: '#ffe14d' }, statMods: { hp: 1.4 }, size: 1.5, desc: 'Le Dragon ancien couve désormais VOTRE trésor.' }),
  species({ id: 'guardian_demon', name: 'Roi Démon Lié', family: 'boss_demon', rarity: 'mythic', element: 'fire', role: 'bruiser', guardian: true, basic: 'basic_claw', skills: ['hellfire', 'boss_demon_chains', 'boss_hell_army'], passive: 'boss_demon', palette: { body: '#8a0a1a', dark: '#2a0206', light: '#d03a4a', accent: '#ffcc33', eye: '#ffe14d' }, statMods: { hp: 1.4 }, size: 1.5, desc: 'Même les rois s’agenouillent devant le Maître.' }),
  species({ id: 'guardian_icequeen', name: 'Reine de l’Hiver', family: 'boss_icequeen', rarity: 'mythic', element: 'ice', role: 'caster', guardian: true, basic: 'basic_bolt', skills: ['blizzard', 'boss_glacial_prison', 'frost_breath'], passive: 'boss_ice', palette: { body: '#bfe6ff', dark: '#3a6a9a', light: '#ffffff', accent: '#4fd1ff', eye: '#ffffff' }, statMods: { hp: 1.4 }, size: 1.4, desc: 'Elle a gelé son cœur pour vous servir.' }),
  species({ id: 'guardian_abyss', name: 'Rejeton Abyssal', family: 'boss_abyss', rarity: 'ancient', element: 'shadow', role: 'caster', guardian: true, basic: 'basic_bolt', skills: ['boss_tentacles', 'abyss_gaze', 'boss_void_collapse'], passive: 'boss_abyss', palette: { body: '#1a0a2a', dark: '#05020a', light: '#5a2a8a', accent: '#3cf2d0', eye: '#ff5ce1' }, statMods: { hp: 1.4 }, size: 1.5, desc: 'Un fragment de l’Entité, lié à votre volonté.' }),
];

export const MONSTER_MAP = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));

export function getSpecies(id) {
  return MONSTER_MAP[id];
}

/** Espèces dont une autre espèce évolue (forme précédente). */
export function getPreEvolution(id) {
  return MONSTERS.find((m) => m.evolutions.some((e) => e.to === id));
}

/** Familles de monstres (pour les recherches "nouvelles espèces"). */
export const MONSTER_FAMILIES = [...new Set(MONSTERS.map((m) => m.family))];
