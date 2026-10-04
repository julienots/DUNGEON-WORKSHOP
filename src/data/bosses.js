/**
 * BOSS (données pures)
 * Les boss gardent l'accès aux étages profonds. Le joueur les affronte avec une équipe de monstres.
 * phases : déclenchées quand les PV passent sous `hpBelow` (fraction).
 *   statMult   multiplicateurs appliqués aux stats du boss
 *   addSkills  compétences ajoutées
 *   summon     [{ name, family, element, count, hp, atk, def, spd, basic, skills, palette }] (stats en fraction du boss)
 *   heal       fraction des PV max rendue
 * rewards.first : récompense de la première victoire ; rewards.repeat : victoires suivantes (1/jour)
 * guardian  : espèce de monstre obtenue (placable dans l'Antre du gardien)
 */
export const BOSSES = {
  colossal_golem: {
    id: 'colossal_golem', name: 'Golem colossal', icon: '🗿', family: 'boss_golem', element: 'nature', floor: 5,
    hp: 1600, attack: 34, defense: 30, speed: 7, levelOffset: 2,
    basic: 'basic_smash', skills: ['boss_colossal_slam', 'boss_rockfall'], passive: 'boss_colossus',
    palette: { body: '#8a8070', dark: '#3a352d', light: '#c6bca8', accent: '#4fd1ff', eye: '#4fd1ff' },
    desc: 'Une montagne qui a appris à marcher. Garde l’accès aux profondeurs.',
    phases: [
      { hpBelow: 0.6, name: 'Fissures', msg: 'Le golem se fissure… et se renforce !', statMult: { def: 1.3 }, addSkills: ['boss_stone_skin'] },
      { hpBelow: 0.3, name: 'Avalanche', msg: 'Des rochers animés se détachent !', statMult: { atk: 1.3, spd: 1.2 }, summon: [{ name: 'Roc animé', family: 'golem', element: 'nature', count: 2, hp: 0.12, atk: 0.5, def: 0.6, spd: 1.2, basic: 'basic_smash', palette: { body: '#7a7468', dark: '#3a362f', light: '#a8a294', accent: '#4fd1ff', eye: '#4fd1ff' } }] },
    ],
    rewards: {
      first: { crystals: 150, essence: 120, metal: 300, artifact: 'heart_of_stone' },
      repeat: { crystals: 25, essence: 40, metal: 100 },
    },
    guardian: 'guardian_colossus',
  },
  archmage: {
    id: 'archmage', name: 'Archimage', icon: '🧙', family: 'boss_archmage', element: 'arcane', floor: 10,
    hp: 1500, attack: 46, defense: 20, speed: 12, levelOffset: 2,
    basic: 'basic_bolt', skills: ['boss_arcane_storm', 'arcane_missile'], passive: 'boss_archmage',
    palette: { body: '#3a2a8a', dark: '#140a3a', light: '#7a6ae0', accent: '#ffcc33', eye: '#3cf2d0' },
    desc: 'Le plus grand mage du royaume est venu vous défier… et ne compte pas repartir.',
    phases: [
      { hpBelow: 0.65, name: 'Distorsion', msg: 'L’Archimage arrête le temps !', addSkills: ['boss_time_stop', 'boss_mirror'] },
      { hpBelow: 0.3, name: 'Surcharge arcanique', msg: 'L’Archimage invoque ses familiers !', statMult: { atk: 1.4 }, summon: [{ name: 'Familier arcanique', family: 'wisp', element: 'arcane', count: 2, hp: 0.08, atk: 0.45, def: 0.4, spd: 1.4, basic: 'basic_bolt', skills: ['arcane_missile'], palette: { body: '#ff9cf0', dark: '#8a2a7a', light: '#ffffff', accent: '#3cf2d0', eye: '#2a0a2a' } }] },
    ],
    rewards: {
      first: { crystals: 250, essence: 300, darkEssence: 30, artifact: 'archmage_tome' },
      repeat: { crystals: 35, essence: 80, darkEssence: 5 },
    },
    guardian: 'guardian_archmage',
  },
  swamp_hydra: {
    id: 'swamp_hydra', name: 'Hydre des marais', icon: '🐍', family: 'boss_hydra', element: 'poison', floor: 15,
    hp: 2200, attack: 44, defense: 24, speed: 10, levelOffset: 2,
    basic: 'basic_bite', skills: ['boss_hydra_bite', 'brood'], passive: 'boss_hydra',
    palette: { body: '#3a7a3a', dark: '#163a16', light: '#7ac06a', accent: '#c6e05a', eye: '#ffe14d' },
    desc: 'Coupez une tête, deux repoussent. Coupez-en deux…',
    phases: [
      { hpBelow: 0.6, name: 'Repousse', msg: 'Deux nouvelles têtes repoussent !', addSkills: ['boss_regrow'], statMult: { atk: 1.2 } },
      { hpBelow: 0.25, name: 'Frénésie', msg: 'L’Hydre entre en frénésie !', statMult: { spd: 1.5, atk: 1.2 } },
    ],
    rewards: {
      first: { crystals: 300, essence: 500, darkEssence: 50, artifact: 'hydra_fang' },
      repeat: { crystals: 40, essence: 120, darkEssence: 8 },
    },
    guardian: 'guardian_hydra',
  },
  ancient_dragon: {
    id: 'ancient_dragon', name: 'Dragon ancien', icon: '🐉', family: 'boss_dragon', element: 'fire', floor: 20,
    hp: 2600, attack: 56, defense: 30, speed: 11, levelOffset: 3,
    basic: 'basic_bite', skills: ['dragon_breath', 'tail_sweep'], passive: 'boss_dragon',
    palette: { body: '#b0281a', dark: '#4a0a05', light: '#ff6a3a', accent: '#ffcc33', eye: '#ffe14d' },
    desc: 'Le plus vieux dragon du monde dort sous votre donjon. Il vient de se réveiller.',
    phases: [
      { hpBelow: 0.7, name: 'Envol', msg: 'Le dragon prend son envol !', statMult: { spd: 1.3 }, addSkills: ['dragon_roar'] },
      { hpBelow: 0.35, name: 'Fureur ancestrale', msg: 'Une pluie de météores s’abat !', statMult: { atk: 1.5 }, addSkills: ['boss_meteor'] },
    ],
    rewards: {
      first: { crystals: 400, essence: 800, darkEssence: 100, artifact: 'dragon_heart', species: 'whelp' },
      repeat: { crystals: 50, essence: 200, darkEssence: 15 },
    },
    guardian: 'guardian_dragon',
  },
  demon_king: {
    id: 'demon_king', name: 'Roi démon', icon: '👹', family: 'boss_demon', element: 'fire', floor: 30,
    hp: 3000, attack: 62, defense: 32, speed: 12, levelOffset: 3,
    basic: 'basic_claw', skills: ['hellfire', 'boss_demon_chains'], passive: 'boss_demon',
    palette: { body: '#8a0a1a', dark: '#2a0206', light: '#d03a4a', accent: '#ffcc33', eye: '#ffe14d' },
    desc: 'Il réclame votre donjon comme nouvelle province des enfers.',
    phases: [
      { hpBelow: 0.65, name: 'Légion', msg: 'Le Roi démon appelle sa légion !', addSkills: ['boss_hell_army'], summon: [{ name: 'Diablotin infernal', family: 'imp', element: 'fire', count: 2, hp: 0.07, atk: 0.4, def: 0.4, spd: 1.5, basic: 'basic_claw', skills: ['imp_fire'], palette: { body: '#d0452b', dark: '#6a1a0f', light: '#ff8a6a', accent: '#2a0a05', eye: '#ffe14d' } }] },
      { hpBelow: 0.3, name: 'Forme véritable', msg: 'Le Roi démon révèle sa forme véritable !', statMult: { atk: 1.5, def: 1.3 }, addSkills: ['boss_meteor'] },
    ],
    rewards: {
      first: { crystals: 500, essence: 1500, darkEssence: 200, artifact: 'demon_crown' },
      repeat: { crystals: 60, essence: 300, darkEssence: 25 },
    },
    guardian: 'guardian_demon',
  },
  ice_queen: {
    id: 'ice_queen', name: 'Reine des Glaces', icon: '❄️', family: 'boss_icequeen', element: 'ice', floor: 40,
    hp: 2800, attack: 64, defense: 34, speed: 13, levelOffset: 3,
    basic: 'basic_bolt', skills: ['blizzard', 'boss_glacial_prison'], passive: 'boss_ice',
    palette: { body: '#bfe6ff', dark: '#3a6a9a', light: '#ffffff', accent: '#4fd1ff', eye: '#ffffff' },
    desc: 'Son royaume gelé s’étend sous le vôtre.',
    phases: [
      { hpBelow: 0.6, name: 'Hiver éternel', msg: 'Le froid devient insoutenable !', statMult: { def: 1.4 }, addSkills: ['frost_breath'] },
      { hpBelow: 0.25, name: 'Cœur brisé', msg: 'La Reine libère sa fureur glaciale !', statMult: { atk: 1.6, spd: 1.2 } },
    ],
    rewards: {
      first: { crystals: 600, essence: 2500, darkEssence: 300, artifact: 'frozen_tear' },
      repeat: { crystals: 70, essence: 450, darkEssence: 35 },
    },
    guardian: 'guardian_icequeen',
  },
  abyssal_entity: {
    id: 'abyssal_entity', name: 'Entité abyssale', icon: '👁️', family: 'boss_abyss', element: 'shadow', floor: 50,
    hp: 3600, attack: 72, defense: 36, speed: 12, levelOffset: 4,
    basic: 'basic_bolt', skills: ['boss_tentacles', 'abyss_gaze'], passive: 'boss_abyss',
    palette: { body: '#1a0a2a', dark: '#05020a', light: '#5a2a8a', accent: '#3cf2d0', eye: '#ff5ce1' },
    desc: 'Une chose sans nom qui remonte des profondeurs dimensionnelles.',
    phases: [
      { hpBelow: 0.66, name: 'Éveil', msg: 'L’Entité ouvre tous ses yeux !', statMult: { atk: 1.3 }, addSkills: ['gaze'] },
      { hpBelow: 0.33, name: 'Effondrement', msg: 'La réalité s’effondre !', statMult: { atk: 1.5, spd: 1.3 }, addSkills: ['boss_void_collapse'], summon: [{ name: 'Rejeton du vide', family: 'eye', element: 'shadow', count: 2, hp: 0.07, atk: 0.4, def: 0.4, spd: 1.3, basic: 'basic_bolt', palette: { body: '#2a1a3a', dark: '#0a0510', light: '#6a4a8a', accent: '#3cf2d0', eye: '#ff5ce1' } }] },
    ],
    rewards: {
      first: { crystals: 1000, essence: 5000, darkEssence: 600, artifact: 'abyss_eye' },
      repeat: { crystals: 100, essence: 800, darkEssence: 60 },
    },
    guardian: 'guardian_abyss',
  },

  // Boss d'événement
  event_elder_wyrm: {
    id: 'event_elder_wyrm', name: 'Wyrm Écarlate', icon: '🔥', family: 'boss_dragon', element: 'fire', event: true,
    hp: 1300, attack: 34, defense: 20, speed: 12, levelOffset: 0,
    basic: 'basic_bite', skills: ['dragon_breath', 'tail_sweep', 'dragon_roar'], passive: 'boss_dragon',
    palette: { body: '#ff4a1a', dark: '#6a1005', light: '#ffa36a', accent: '#ffe14d', eye: '#ffffff' },
    desc: 'Boss de la Semaine du Dragon. S’adapte à votre progression.',
    phases: [{ hpBelow: 0.5, name: 'Embrasement', msg: 'Le Wyrm s’embrase !', statMult: { atk: 1.4 }, addSkills: ['boss_meteor'] }],
    rewards: { first: { crystals: 200, artifact: 'dragon_egg_shell', species: 'whelp' }, repeat: { crystals: 60, essence: 150 } },
  },
  event_lich_king: {
    id: 'event_lich_king', name: 'Roi-Liche', icon: '💀', family: 'boss_archmage', element: 'shadow', event: true,
    hp: 1250, attack: 34, defense: 18, speed: 11, levelOffset: 0,
    basic: 'basic_bolt', skills: ['lich_nova', 'shadow_bolt'], passive: 'boss_archmage',
    palette: { body: '#2a2a3a', dark: '#0a0a14', light: '#6a6a8a', accent: '#8fe04a', eye: '#8fe04a' },
    desc: 'Boss de la Nuit des Morts. S’adapte à votre progression.',
    phases: [{ hpBelow: 0.5, name: 'Armée des morts', msg: 'Les morts se relèvent !', summon: [{ name: 'Squelette ancien', family: 'skeleton', element: 'shadow', count: 3, hp: 0.08, atk: 0.4, def: 0.5, spd: 1, basic: 'basic_melee', palette: { body: '#d8d0b8', dark: '#7a7260', light: '#ffffff', accent: '#3a3f55', eye: '#8fe04a' } }] }],
    rewards: { first: { crystals: 200, species: 'skeleton_knight' }, repeat: { crystals: 60, darkEssence: 10 } },
  },
  event_golden_mimic: {
    id: 'event_golden_mimic', name: 'Mimique Doré', icon: '🪙', family: 'mimic', element: 'arcane', event: true,
    hp: 1200, attack: 30, defense: 22, speed: 12, levelOffset: 0,
    basic: 'basic_bite', skills: ['mimic_chomp', 'gold_spray'], passive: 'greedy',
    palette: { body: '#d0a02b', dark: '#6a4a10', light: '#ffe08a', accent: '#ffffff', eye: '#ff2d2d' },
    desc: 'Boss du Festival de l’Or. Une montagne de pièces… avec des dents.',
    phases: [{ hpBelow: 0.4, name: 'Avidité', msg: 'Le Mimique devient fou d’avidité !', statMult: { atk: 1.5, spd: 1.3 } }],
    rewards: { first: { crystals: 200, species: 'mimic' }, repeat: { crystals: 50, gold: 50000 } },
  },
};

export const BOSS_LIST = Object.values(BOSSES).filter((b) => !b.event);

/** Boss gardant l'étage `floor` (le boss bloque l'accès à floor+1). */
export function bossForFloor(floor) {
  const direct = BOSS_LIST.find((b) => b.floor === floor);
  if (direct) return { boss: direct, tier: 0 };
  // Au-delà de 50 : boss éveillés tous les 10 étages, en rotation.
  if (floor > 50 && floor % 10 === 0) {
    const idx = (floor / 10 - 6) % BOSS_LIST.length;
    const tier = Math.floor((floor - 60) / (10 * BOSS_LIST.length)) + 1;
    return { boss: BOSS_LIST[idx], tier };
  }
  return null;
}
