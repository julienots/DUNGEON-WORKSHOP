/**
 * MODES DE JEU (V2)
 * -----------------
 * `classic` est le donjon idle historique. Tous les autres modes sont des « runs » : une suite
 * d'étapes (combats) jouées avec une équipe, gérées par RunSystem. Ajouter un mode = ajouter une
 * entrée ici (+ éventuellement un générateur d'étape dans RunSystem.stageFor).
 *
 *  unlockFloor : étage maximum atteint requis (meilleur étage, toutes Ascensions confondues)
 *  team        : 'roster' (vos monstres) | 'random' (équipe tirée au sort) | 'draft' (choix parmi 3)
 *  teamSize    : nombre de monstres engagés
 *  stages      : nombre d'étapes (null = sans fin)
 *  heal        : fraction de PV rendue entre deux étapes
 *  bossEvery   : un boss toutes les N étapes
 *  events      : chance d'un événement aléatoire entre deux étapes
 *  modifiers   : modificateurs de partie autorisés
 *  leaderboard : classement local
 *  music       : piste jouée pendant le mode
 */
export const MODES = {
  classic: {
    name: 'Donjon classique', icon: '🏰', kind: 'classic', unlockFloor: 1, color: '#ffb52e',
    desc: 'Le mode principal : construisez, recrutez et défendez votre donjon contre les aventuriers.',
  },
  survival: {
    name: 'Survie', icon: '🛡️', kind: 'run', unlockFloor: 2, color: '#ff6a4a', music: 'mode_survival',
    team: 'roster', teamSize: 5, stages: null, heal: 0.2, bossEvery: 10, events: 0, modifiers: true, leaderboard: true,
    scoreLabel: 'Vagues', desc: 'Des vagues d’aventuriers de plus en plus fortes. Tenez le plus longtemps possible.',
  },
  challenge: {
    name: 'Challenges', icon: '🎯', kind: 'run', unlockFloor: 3, color: '#4fc3ff', music: 'mode_challenge',
    team: 'roster', teamSize: 5, stages: 8, heal: 0.3, bossEvery: 8, events: 0, modifiers: false, leaderboard: false,
    scoreLabel: 'Étapes', desc: 'Huit combats avec une règle spéciale. Grosse récompense à la première réussite.',
  },
  random: {
    name: 'Donjon aléatoire', icon: '🎲', kind: 'run', unlockFloor: 4, color: '#b56cff', music: 'mode_random',
    team: 'random', teamSize: 4, stages: 8, heal: 0.25, bossEvery: 8, events: 0.35, modifiers: true, leaderboard: false,
    scoreLabel: 'Étapes', desc: 'Biome, équipe, adversaires, événements et boss tirés au sort. Chaque partie est unique.',
  },
  roguelite: {
    name: 'Roguelite', icon: '🗝️', kind: 'run', unlockFloor: 5, color: '#3cf2d0', music: 'mode_roguelite',
    team: 'draft', teamSize: 3, maxTeam: 6, stages: 15, heal: 0.15, bossEvery: 5, events: 0.3, modifiers: true, leaderboard: true,
    scoreLabel: 'Étapes', desc: 'Commencez avec 3 monstres, choisissez des bonus après chaque victoire. Les Âmes gagnées restent.',
  },
  cursed: {
    name: 'Donjon maudit', icon: '💀', kind: 'run', unlockFloor: 6, color: '#ff4f6d', music: 'mode_cursed',
    team: 'roster', teamSize: 5, stages: 10, heal: 0.25, bossEvery: 5, events: 0, modifiers: false, leaderboard: true,
    scoreLabel: 'Risque', desc: 'Choisissez votre malédiction : plus le risque est grand, plus le butin l’est aussi.',
  },
  bossRush: {
    name: 'Boss Rush', icon: '👑', kind: 'run', unlockFloor: 7, color: '#ffd84a', music: 'boss',
    team: 'roster', teamSize: 5, stages: null, heal: 0.5, bossEvery: 1, events: 0, modifiers: true, leaderboard: true,
    scoreLabel: 'Boss vaincus', desc: 'Les boss s’enchaînent, chaque fois plus puissants. Récompenses exclusives.',
  },
  infinite: {
    name: 'Infini', icon: '♾️', kind: 'run', unlockFloor: 8, color: '#7affe6', music: 'mode_infinite',
    team: 'roster', teamSize: 5, stages: null, heal: 0.15, bossEvery: 10, events: 0, modifiers: false, leaderboard: true,
    scoreLabel: 'Étage', desc: 'Un donjon sans fond : 10, 50, 100, 500, 1000 étages… Reprise au dernier palier atteint.',
  },
};

export const MODE_IDS = Object.keys(MODES);
export const RUN_MODE_IDS = MODE_IDS.filter((id) => MODES[id].kind === 'run');

/**
 * MODIFICATEURS DE PARTIE — sélectionnables avant une run (modes avec `modifiers: true`).
 *  reward      : bonus de récompenses (additif)
 *  enemy       : multiplicateurs des adversaires { power, spd, size, elite }
 *  ally        : multiplicateurs de l'équipe { hp, atk, spd }
 *  rules       : règles spéciales { healMult, element, maxTeam, bossEvery }
 */
export const RUN_MODIFIERS = {
  greed: { name: 'Avidité', icon: '💰', reward: 0.5, enemy: { power: 0.3 }, desc: '+50% récompenses, ennemis +30%.' },
  fire_only: { name: 'Pyromanes', icon: '🔥', reward: 0.4, rules: { element: 'fire' }, desc: 'Monstres de Feu uniquement. +40% récompenses.' },
  shadow_only: { name: 'Ténèbres', icon: '🌑', reward: 0.4, rules: { element: 'shadow' }, desc: 'Monstres d’Ombre uniquement. +40% récompenses.' },
  no_heal: { name: 'Sans soins', icon: '🚫', reward: 0.35, rules: { healMult: 0, betweenHeal: 0 }, desc: 'Aucun soin, ni en combat ni entre les étapes. +35%.' },
  fast_enemies: { name: 'Ennemis rapides', icon: '💨', reward: 0.25, enemy: { spd: 0.3 }, desc: 'Ennemis +30% vitesse. +25% récompenses.' },
  elites: { name: 'Élite', icon: '⭐', reward: 0.35, enemy: { elite: true }, desc: 'Tous les ennemis sont des élites. +35%.' },
  swarm: { name: 'Nuée', icon: '🐜', reward: 0.3, enemy: { size: 1 }, desc: 'Un aventurier de plus par groupe. +30%.' },
  extra_bosses: { name: 'Boss supplémentaires', icon: '👹', reward: 0.4, rules: { bossEvery: 3 }, desc: 'Un boss toutes les 3 étapes. +40%.' },
  glass_cannon: { name: 'Canon de verre', icon: '🗡️', reward: 0.15, ally: { atk: 0.3, hp: -0.3 }, desc: 'Équipe +30% attaque, -30% PV. +15%.' },
  small_team: { name: 'Commando', icon: '🎖️', reward: 0.4, rules: { maxTeam: 3 }, desc: '3 monstres maximum. +40% récompenses.' },
  rare_loot: { name: 'Butin rare', icon: '✨', reward: -0.3, rareReward: 1, desc: 'Moins d’or et de cristaux, mais monnaies rares doublées.' },
};

/**
 * CHALLENGES — règles fixes, 8 étapes. Première réussite : `first`, ensuite `repeat`.
 */
export const CHALLENGES = {
  volcano: {
    name: 'Volcan', icon: '🌋', biome: 'volcano', desc: 'Tous les dégâts de Feu sont augmentés de 60 %. Les aventuriers sont des mages de feu.',
    sideMods: { A: { elementDamage: { fire: 0.6 } }, B: { elementDamage: { fire: 0.6 } } }, enemy: { element: 'fire' },
    first: { crystals: 300, legendaryEssence: 3 }, repeat: { crystals: 60 },
  },
  glacier: {
    name: 'Glace', icon: '❄️', biome: 'glacier', desc: 'Le froid ralentit vos monstres de 25 %.',
    ally: { spd: -0.25 }, first: { crystals: 300, legendaryEssence: 3 }, repeat: { crystals: 60 },
  },
  permadeath: {
    name: 'Permadeath', icon: '⚰️', biome: 'necropolis', desc: 'Un monstre tombé ne revient pas avant la fin du challenge. Aucun soin entre les étapes.',
    rules: { permadeath: true, betweenHeal: 0.4 }, first: { crystals: 400, legendaryEssence: 5 }, repeat: { crystals: 80 },
  },
  wealth: {
    name: 'Richesse', icon: '💰', biome: 'desert', desc: 'Récompenses ×3, mais les aventuriers sont extrêmement puissants (+120 %).',
    enemy: { power: 1.2 }, rewardMult: 3, first: { crystals: 500, legendaryEssence: 6, dimensionalFragments: 2 }, repeat: { crystals: 120, legendaryEssence: 1 },
  },
  drought: {
    name: 'Sécheresse', icon: '🏜️', biome: 'desert', desc: 'Aucun soin pendant les combats.',
    rules: { healMult: 0 }, first: { crystals: 300, legendaryEssence: 3 }, repeat: { crystals: 60 },
  },
  horde: {
    name: 'Horde', icon: '🐜', biome: 'forest', desc: 'Les groupes comptent deux aventuriers de plus, mais plus faibles.',
    enemy: { size: 2, power: -0.25 }, first: { crystals: 300, legendaryEssence: 3 }, repeat: { crystals: 60 },
  },
  shadows: {
    name: 'Royaume des ombres', icon: '🌑', biome: 'necropolis', desc: 'Monstres d’Ombre uniquement. L’ombre inflige +40 % de dégâts.',
    rules: { element: 'shadow' }, sideMods: { A: { elementDamage: { shadow: 0.4 } }, B: {} }, first: { crystals: 350, legendaryEssence: 4 }, repeat: { crystals: 70 },
  },
  titans: {
    name: 'Titans', icon: '🗿', biome: 'astral', desc: 'Un boss à chaque étape paire. Récompenses ×2.',
    rules: { bossEvery: 2 }, rewardMult: 2, first: { crystals: 450, legendaryEssence: 5, dimensionalFragments: 1 }, repeat: { crystals: 100 },
  },
};

/** Niveaux de malédiction du Donjon maudit. */
export const CURSE_LEVELS = [
  { level: 1, name: 'Murmure', reward: 0.5, enemy: 0.4 },
  { level: 2, name: 'Malédiction', reward: 1, enemy: 0.8 },
  { level: 3, name: 'Fléau', reward: 1.6, enemy: 1.3 },
  { level: 4, name: 'Damnation', reward: 2.4, enemy: 1.9 },
  { level: 5, name: 'Apocalypse', reward: 3.5, enemy: 2.7 },
];

/** Bonus de Roguelite proposés après chaque victoire (3 au choix). */
export const RUN_BOONS = {
  vigor: { name: 'Vigueur', icon: '❤️', weight: 10, desc: 'Équipe : +15% PV.', team: { hp: 0.15 } },
  fury: { name: 'Furie', icon: '⚔️', weight: 10, desc: 'Équipe : +15% attaque.', team: { atk: 0.15 } },
  bulwark: { name: 'Rempart', icon: '🛡️', weight: 8, desc: 'Équipe : +20% défense.', team: { def: 0.2 } },
  haste: { name: 'Hâte', icon: '💨', weight: 8, desc: 'Équipe : +10% vitesse.', team: { spd: 0.1 } },
  keen: { name: 'Œil vif', icon: '🎯', weight: 7, desc: 'Équipe : +8% critique.', mods: { crit: 0.08 } },
  leech: { name: 'Sangsue', icon: '🩸', weight: 6, desc: 'Équipe : vol de vie 8%.', mods: { lifesteal: 0.08 } },
  thorns: { name: 'Ronces', icon: '🌵', weight: 6, desc: 'Équipe : renvoie 12% des dégâts.', mods: { thorns: 0.12 } },
  renewal: { name: 'Renouveau', icon: '💚', weight: 6, desc: 'Équipe : régénère 1% PV/s.', mods: { regen: 0.01 } },
  ambush: { name: 'Embuscade', icon: '🗡️', weight: 4, desc: 'Équipe : agit en premier.', mods: { firstStrike: true } },
  rest: { name: 'Repos', icon: '🛏️', weight: 9, desc: 'Soigne toute l’équipe de 60% et relève les monstres tombés.', heal: 0.6, revive: true },
  recruit: { name: 'Recrue', icon: '🆕', weight: 7, desc: 'Un nouveau monstre rejoint l’équipe.', recruit: true },
  mutation: { name: 'Mutation instable', icon: '🧬', weight: 5, desc: 'Un monstre au hasard : +35% attaque et PV pour la run.', mutate: { hp: 0.35, atk: 0.35 } },
  training: { name: 'Entraînement', icon: '📈', weight: 7, desc: 'Équipe : +3 niveaux.', levels: 3 },
  loot: { name: 'Butin', icon: '💎', weight: 6, desc: '+40% récompenses de fin de run.', reward: 0.4 },
};

/** Améliorations permanentes du Roguelite (payées en Âmes). */
export const ROGUELITE_META = [
  { id: 'rm_hp', name: 'Âmes robustes', icon: '❤️', max: 10, cost: (l) => 5 + l * 5, desc: '+5% PV au départ par niveau.', team: { hp: 0.05 } },
  { id: 'rm_atk', name: 'Âmes féroces', icon: '⚔️', max: 10, cost: (l) => 5 + l * 5, desc: '+5% attaque au départ par niveau.', team: { atk: 0.05 } },
  { id: 'rm_level', name: 'Vétérans', icon: '📈', max: 10, cost: (l) => 8 + l * 6, desc: '+1 niveau de départ par niveau.', levels: 1 },
  { id: 'rm_choice', name: 'Clairvoyance', icon: '🔮', max: 1, cost: () => 40, desc: 'Un 4e bonus proposé après chaque victoire.', choices: 1 },
  { id: 'rm_draft', name: 'Recruteur', icon: '🆕', max: 2, cost: (l) => 25 + l * 25, desc: 'Monstres de départ de meilleure rareté.', draftRarity: 1 },
  { id: 'rm_souls', name: 'Moisson', icon: '👻', max: 5, cost: (l) => 15 + l * 15, desc: '+20% Âmes gagnées par niveau.', souls: 0.2 },
];

/**
 * ÉVÉNEMENTS ALÉATOIRES DE RUN — un choix entre deux étapes.
 * Chaque option : { label, desc, effect } — effets interprétés par RunSystem.applyEventEffect.
 */
export const RUN_EVENTS = {
  merchant: {
    name: 'Marchand mystérieux', icon: '👤', text: 'Un marchand encapuchonné propose ses services.',
    options: [
      { label: 'Acheter (−30% butin)', desc: 'Un bonus au choix, payé avec le butin accumulé.', effect: { rewardPenalty: 0.3, boon: true } },
      { label: 'Ignorer', desc: 'Passer son chemin.', effect: {} },
    ],
  },
  wizard: {
    name: 'Sorcier en détresse', icon: '🧙', text: 'Un sorcier blessé demande votre aide.',
    options: [
      { label: 'Aider', desc: 'Il soigne l’équipe de 40% et bénit vos monstres (+10% attaque).', effect: { heal: 0.4, team: { atk: 0.1 } } },
      { label: 'Refuser', desc: 'Rien ne se passe.', effect: {} },
    ],
  },
  rift: {
    name: 'Faille dimensionnelle', icon: '🌀', text: 'Une faille crépite devant vous.',
    options: [
      { label: 'Entrer', desc: 'Prochain combat : ennemis +60%, récompenses de run +60% et fragments dimensionnels.', effect: { nextEnemy: 0.6, reward: 0.6, fragments: 2 } },
      { label: 'Contourner', desc: 'Trop risqué.', effect: {} },
    ],
  },
  shrine: {
    name: 'Autel ancien', icon: '⛩️', text: 'Un autel pulse d’une énergie oubliée.',
    options: [
      { label: 'Prier', desc: 'Soigne toute l’équipe de 50%.', effect: { heal: 0.5 } },
      { label: 'Sacrifier', desc: '−20% PV, mais +20% attaque pour la run.', effect: { damage: 0.2, team: { atk: 0.2 } } },
    ],
  },
  chest: {
    name: 'Coffre suspect', icon: '🧰', text: 'Un coffre trône au milieu de la salle. Trop beau pour être vrai ?',
    options: [
      { label: 'Ouvrir', desc: '60% : +50% butin. 40% : c’est un mimique (−30% PV).', effect: { gamble: { chance: 0.6, win: { reward: 0.5 }, lose: { damage: 0.3 } } } },
      { label: 'Laisser', desc: 'La prudence paie parfois.', effect: {} },
    ],
  },
  stray: {
    name: 'Monstre errant', icon: '🐾', text: 'Un monstre égaré observe votre équipe.',
    options: [
      { label: 'Recruter', desc: 'Il rejoint l’équipe (si une place est libre).', effect: { recruit: true } },
      { label: 'Chasser', desc: '+15% butin.', effect: { reward: 0.15 } },
    ],
  },
};
