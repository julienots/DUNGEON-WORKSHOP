/**
 * ÉQUIPEMENTS (données pures)
 * bases : objets de base par emplacement. `main` = statistique principale et sa valeur de base.
 * tier  : palier (1 = début). Les paliers supérieurs tombent plus profondément.
 */
export const EQUIPMENT_BASES = [
  // Armes
  { id: 'rusty_blade', name: 'Lame rouillée', slot: 'weapon', icon: '🗡️', tier: 1, main: { stat: 'attack', value: 5 } },
  { id: 'bone_club', name: 'Gourdin d’os', slot: 'weapon', icon: '🦴', tier: 1, main: { stat: 'attack', value: 6 } },
  { id: 'war_axe', name: 'Hache de guerre', slot: 'weapon', icon: '🪓', tier: 2, main: { stat: 'attack', value: 9 } },
  { id: 'cursed_staff', name: 'Bâton maudit', slot: 'weapon', icon: '🪄', tier: 2, main: { stat: 'attack', value: 8 }, sub: { stat: 'crit', value: 0.03 } },
  { id: 'obsidian_sword', name: 'Épée d’obsidienne', slot: 'weapon', icon: '⚔️', tier: 3, main: { stat: 'attack', value: 13 } },
  { id: 'demon_trident', name: 'Trident démoniaque', slot: 'weapon', icon: '🔱', tier: 4, main: { stat: 'attack', value: 18 } },
  // Armures
  { id: 'leather_rags', name: 'Haillons de cuir', slot: 'armor', icon: '🥋', tier: 1, main: { stat: 'hp', value: 30 } },
  { id: 'bone_plate', name: 'Plastron d’os', slot: 'armor', icon: '🦺', tier: 2, main: { stat: 'hp', value: 48 }, sub: { stat: 'defense', value: 2 } },
  { id: 'iron_armor', name: 'Armure de fer', slot: 'armor', icon: '🛡️', tier: 3, main: { stat: 'hp', value: 70 } },
  { id: 'dragon_scale', name: 'Cotte d’écailles', slot: 'armor', icon: '🐲', tier: 4, main: { stat: 'hp', value: 100 } },
  // Casques
  { id: 'dented_helm', name: 'Casque cabossé', slot: 'helmet', icon: '⛑️', tier: 1, main: { stat: 'defense', value: 3 } },
  { id: 'horned_helm', name: 'Heaume à cornes', slot: 'helmet', icon: '🪖', tier: 2, main: { stat: 'defense', value: 5 } },
  { id: 'skull_mask', name: 'Masque de crâne', slot: 'helmet', icon: '💀', tier: 3, main: { stat: 'defense', value: 7 }, sub: { stat: 'attack', value: 2 } },
  { id: 'crown_of_thorns', name: 'Couronne d’épines', slot: 'helmet', icon: '👑', tier: 4, main: { stat: 'defense', value: 10 } },
  // Anneaux
  { id: 'copper_ring', name: 'Anneau de cuivre', slot: 'ring', icon: '💍', tier: 1, main: { stat: 'speed', value: 1 } },
  { id: 'eye_ring', name: 'Anneau de l’œil', slot: 'ring', icon: '🧿', tier: 2, main: { stat: 'crit', value: 0.04 } },
  { id: 'blood_ring', name: 'Anneau de sang', slot: 'ring', icon: '⭕', tier: 3, main: { stat: 'lifesteal', value: 0.05 } },
  { id: 'void_ring', name: 'Anneau du vide', slot: 'ring', icon: '⚫', tier: 4, main: { stat: 'speed', value: 3 } },
  // Artefacts (tombent rarement ; les uniques viennent des boss)
  { id: 'cracked_orb', name: 'Orbe fêlé', slot: 'artifact', icon: '🔮', tier: 2, main: { stat: 'attackPct', value: 0.05 } },
  { id: 'idol', name: 'Idole maudite', slot: 'artifact', icon: '🗿', tier: 3, main: { stat: 'hpPct', value: 0.06 } },
  { id: 'hourglass', name: 'Sablier brisé', slot: 'artifact', icon: '⏳', tier: 4, main: { stat: 'speed', value: 3 } },
];

/** Artefacts uniques (récompenses de boss). */
export const UNIQUE_ARTIFACTS = {
  blood_chalice: { id: 'blood_chalice', name: 'Calice de sang', slot: 'artifact', icon: '🍷', rarity: 'mythic', main: { stat: 'attackPct', value: 0.25 }, effect: 'lifesteal', unique: true },
  crown_of_the_dead: { id: 'crown_of_the_dead', name: 'Couronne des morts', slot: 'artifact', icon: '👑', rarity: 'mythic', main: { stat: 'hpPct', value: 0.35 }, effect: 'thorns', unique: true },
  heart_of_stone: { id: 'heart_of_stone', name: 'Cœur de Pierre', slot: 'artifact', icon: '🪨', rarity: 'legendary', main: { stat: 'hpPct', value: 0.2 }, effect: 'stoneskin', unique: true },
  archmage_tome: { id: 'archmage_tome', name: 'Grimoire de l’Archimage', slot: 'artifact', icon: '📖', rarity: 'legendary', main: { stat: 'attackPct', value: 0.2 }, effect: 'spellbook', unique: true },
  hydra_fang: { id: 'hydra_fang', name: 'Croc de l’Hydre', slot: 'artifact', icon: '🦷', rarity: 'legendary', main: { stat: 'attackPct', value: 0.15 }, effect: 'venom', unique: true },
  dragon_heart: { id: 'dragon_heart', name: 'Cœur de Dragon', slot: 'artifact', icon: '❤️‍🔥', rarity: 'mythic', main: { stat: 'attackPct', value: 0.3 }, effect: 'inferno', unique: true },
  demon_crown: { id: 'demon_crown', name: 'Couronne du Roi Démon', slot: 'artifact', icon: '👿', rarity: 'mythic', main: { stat: 'attackPct', value: 0.25 }, effect: 'tyrant', unique: true },
  frozen_tear: { id: 'frozen_tear', name: 'Larme Gelée', slot: 'artifact', icon: '💧', rarity: 'mythic', main: { stat: 'hpPct', value: 0.3 }, effect: 'frost', unique: true },
  abyss_eye: { id: 'abyss_eye', name: 'Œil de l’Abîme', slot: 'artifact', icon: '👁️', rarity: 'ancient', main: { stat: 'attackPct', value: 0.4 }, effect: 'abyss', unique: true },
  dragon_egg_shell: { id: 'dragon_egg_shell', name: 'Coquille de l’Œuf Ancien', slot: 'artifact', icon: '🥚', rarity: 'legendary', main: { stat: 'hpPct', value: 0.18 }, effect: 'stoneskin', unique: true },
};

/** Statistiques secondaires possibles (affixes). value = valeur de base par affixe. */
export const AFFIXES = [
  { stat: 'attack', value: 3, name: 'Attaque' },
  { stat: 'hp', value: 16, name: 'PV' },
  { stat: 'defense', value: 2, name: 'Défense' },
  { stat: 'speed', value: 1, name: 'Vitesse' },
  { stat: 'crit', value: 0.02, name: 'Critique' },
  { stat: 'attackPct', value: 0.03, name: 'Attaque %' },
  { stat: 'hpPct', value: 0.04, name: 'PV %' },
];

/** Effets spéciaux (rareté épique et +). Interprétés comme des mods de passif par CombatSystem. */
export const EQUIP_EFFECTS = {
  lifesteal: { name: 'Vol de vie', desc: 'Vole 8% des dégâts infligés.', mods: { lifesteal: 0.08 } },
  thorns: { name: 'Épines', desc: 'Renvoie 15% des dégâts reçus.', mods: { thorns: 0.15 } },
  burning: { name: 'Ardent', desc: 'Les attaques brûlent (25%).', mods: { onHit: { status: 'burn', chance: 0.25, duration: 4, power: 0.2 } } },
  freezing: { name: 'Glacial', desc: 'Les attaques ralentissent (30%).', mods: { onHit: { status: 'slow', chance: 0.3, duration: 3 } } },
  venom: { name: 'Venin', desc: 'Les attaques empoisonnent (30%).', mods: { onHit: { status: 'poison', chance: 0.3, duration: 5, power: 0.25 } } },
  swift: { name: 'Vif', desc: 'Commence le combat en premier.', mods: { firstStrike: true } },
  regen: { name: 'Régénérant', desc: 'Régénère 1% PV/s.', mods: { regen: 0.01 } },
  executioner: { name: 'Bourreau', desc: '+15% critique, +25% dégâts critiques.', mods: { crit: 0.15, critDmg: 0.25 } },
  stoneskin: { name: 'Peau de pierre', desc: 'Réduit les dégâts subis de 15%.', mods: { damageReduction: 0.15 } },
  spellbook: { name: 'Savoir interdit', desc: '+25% dégâts critiques, +10% critique.', mods: { crit: 0.1, critDmg: 0.25 } },
  inferno: { name: 'Brasier', desc: 'Brûle à l’impact (60%), +10% dégâts.', mods: { onHit: { status: 'burn', chance: 0.6, duration: 5, power: 0.3 }, damageBonus: 0.1 } },
  tyrant: { name: 'Tyran', desc: 'Alliés : +10% attaque.', mods: { auraAtk: 0.1 } },
  frost: { name: 'Hiver éternel', desc: 'Gèle à l’impact (15%).', mods: { onHit: { status: 'freeze', chance: 0.15, duration: 1.2 } } },
  abyss: { name: 'Abîme', desc: 'Corrompt à l’impact (40%), revient une fois.', mods: { onHit: { status: 'corruption', chance: 0.4, duration: 5, power: 0.25 }, undying: 0.3 } },
};

export const EQUIP_RARITY = {
  common: { statMult: 1, affixes: 0, maxLevel: 5, effectChance: 0 },
  rare: { statMult: 1.5, affixes: 1, maxLevel: 10, effectChance: 0 },
  epic: { statMult: 2.2, affixes: 2, maxLevel: 15, effectChance: 0.6 },
  legendary: { statMult: 3.2, affixes: 3, maxLevel: 20, effectChance: 1 },
  mythic: { statMult: 4.6, affixes: 4, maxLevel: 25, effectChance: 1 },
  ancient: { statMult: 6.5, affixes: 4, maxLevel: 30, effectChance: 1 },
};

/** Probabilités de rareté des objets trouvés selon l'étage. */
export function dropRarityWeights(floor) {
  const f = Math.max(1, floor);
  return [
    ['common', Math.max(10, 70 - f * 2)],
    ['rare', 25 + f * 0.8],
    ['epic', 4 + f * 0.6],
    ['legendary', f >= 5 ? 0.6 + f * 0.12 : 0],
    ['mythic', f >= 15 ? 0.1 + f * 0.03 : 0],
    ['ancient', f >= 40 ? 0.02 + f * 0.005 : 0],
  ];
}

export const STAT_NAMES = {
  attack: 'Attaque', hp: 'PV', defense: 'Défense', speed: 'Vitesse', crit: 'Critique',
  lifesteal: 'Vol de vie', attackPct: 'Attaque', hpPct: 'PV',
};

export function isPctStat(stat) {
  return stat === 'crit' || stat === 'lifesteal' || stat === 'attackPct' || stat === 'hpPct';
}
