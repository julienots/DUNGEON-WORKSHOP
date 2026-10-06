/**
 * BIOMES (V2) — chaque étage appartient à un biome qui change ses mécaniques.
 *  element     élément favorisé : +20% de dégâts de cet élément (des deux côtés),
 *              et AFFINITÉ : les monstres de cet élément ont +10% PV/attaque sur l'étage
 *  theme       palette visuelle de base (voir THEMES dans data/floors.js)
 *  tint        couleur d'ambiance superposée au donjon
 *  particles   particules d'ambiance (DungeonScene)
 *  unlockFloor premier étage atteint requis pour choisir ce biome
 *  rules       effets interprétés par BiomeSystem :
 *    onCombat      statuts appliqués aux aventuriers au début de chaque combat
 *    healMult      multiplicateur des soins (des deux côtés)
 *    spdMult       multiplicateur de vitesse { A, B }
 *    skillCooldown réduction de recharge des compétences (des deux côtés)
 *    trapBoost     { element, power } bonus des pièges de cet élément
 *    monsterMods   { element: mods } mods supplémentaires des monstres de cet élément
 *    random        un effet tiré au sort à chaque raid (Dimension corrompue)
 *  production  multiplicateurs de production par ressource
 *  rewards     multiplicateurs des butins de raid par ressource
 *  music       piste musicale du biome
 */
export const BIOMES = {
  forest: {
    name: 'Forêt', icon: '🌲', element: 'nature', theme: 'cave', tint: 0x4fc36a, particles: 'leaves', unlockFloor: 1, music: 'biome_forest',
    desc: 'Nature et poison : les monstres de Nature régénèrent, le bois nourrit la production.',
    rules: { monsterMods: { nature: { regen: 0.01 } } }, production: { stone: 1.1 }, rewards: {},
  },
  swamp: {
    name: 'Marais toxique', icon: '🧪', element: 'poison', theme: 'crypt', tint: 0x8fe04a, particles: 'spores', unlockFloor: 3, music: 'biome_swamp',
    desc: 'Brume toxique : les aventuriers arrivent empoisonnés, les pièges de poison sont renforcés.',
    rules: { onCombat: [{ id: 'poison', chance: 0.5, duration: 5, power: 0.12 }], trapBoost: { element: 'poison', power: 0.25 } }, production: {}, rewards: { essence: 1.15 },
  },
  desert: {
    name: 'Désert', icon: '🏜️', element: 'light', theme: 'fortress', tint: 0xffd27a, particles: 'sand', unlockFloor: 5, music: 'biome_desert',
    desc: 'Chaleur écrasante : tous les soins sont réduits de 30 %, la pierre abonde.',
    rules: { healMult: 0.7 }, production: { stone: 1.3 }, rewards: { stone: 1.25, gold: 1.05 },
  },
  glacier: {
    name: 'Glacier', icon: '❄️', element: 'ice', theme: 'fortress', tint: 0x9fe6ff, particles: 'snow', unlockFloor: 7, music: 'biome_glacier',
    desc: 'Froid mordant : les aventuriers sont ralentis de 15 % (vos monstres de 5 %).',
    rules: { spdMult: { A: 0.95, B: 0.85 }, monsterMods: { ice: { damageReduction: 0.05 } } }, production: {}, rewards: { metal: 1.15 },
  },
  volcano: {
    name: 'Volcan', icon: '🌋', element: 'fire', theme: 'citadel', tint: 0xff6a2b, particles: 'embers', unlockFloor: 9, music: 'biome_volcano',
    desc: 'Lave et feu : dégâts de feu accrus, le métal abonde.',
    rules: { trapBoost: { element: 'fire', power: 0.2 } }, production: { metal: 1.3 }, rewards: { metal: 1.3 },
  },
  necropolis: {
    name: 'Nécropole', icon: '☠️', element: 'shadow', theme: 'crypt', tint: 0x9b6bff, particles: 'wisps', unlockFloor: 12, music: 'biome_necropolis',
    desc: 'Mort et ombre : les monstres d’ombre reviennent d’entre les morts (25 % PV).',
    rules: { monsterMods: { shadow: { undying: 0.25 } } }, production: {}, rewards: { darkEssence: 1.25 },
  },
  astral: {
    name: 'Dimension astrale', icon: '🌌', element: 'arcane', theme: 'dimensional', tint: 0x7a8aff, particles: 'stars', unlockFloor: 16, music: 'biome_astral',
    desc: 'Magie pure : toutes les compétences se rechargent 15 % plus vite.',
    rules: { skillCooldown: -0.15 }, production: { essence: 1.25 }, rewards: { essence: 1.2, crystals: 1.2 },
  },
  corrupted: {
    name: 'Dimension corrompue', icon: '🌀', element: 'shadow', theme: 'demonic', tint: 0xff5ce1, particles: 'glitch', unlockFloor: 20, music: 'biome_corrupted',
    desc: 'Expérimental : une anomalie aléatoire à chaque raid, récompenses dimensionnelles.',
    rules: { random: true }, production: { darkEssence: 1.2 }, rewards: { darkEssence: 1.3, gold: 1.1 },
  },
};

export const BIOME_IDS = Object.keys(BIOMES);

/** Anomalies de la Dimension corrompue (une par raid). */
export const CORRUPTED_ANOMALIES = [
  { id: 'haste', name: 'Distorsion temporelle', icon: '⏩', rules: { spdMult: { A: 1.2, B: 1.2 } } },
  { id: 'frail', name: 'Chair fragile', icon: '💔', rules: { onCombat: [{ id: 'defDown', chance: 1, duration: 8 }] } },
  { id: 'nullheal', name: 'Vide absolu', icon: '🕳️', rules: { healMult: 0 } },
  { id: 'arcane', name: 'Surcharge arcanique', icon: '🌀', rules: { skillCooldown: -0.3 } },
  { id: 'blind', name: 'Brouillard du néant', icon: '🌫️', rules: { onCombat: [{ id: 'blind', chance: 0.7, duration: 5, power: 0.3 }] } },
];

/** Coût du changement de biome d'un étage. */
export function biomeChangeCost(floorNumber) {
  return { crystals: 50 + floorNumber * 10, dimensionalFragments: floorNumber >= 10 ? 1 : 0 };
}

/** Biome attribué par défaut à un étage (cycle déterministe parmi les biomes débloqués). */
export function defaultBiomeForFloor(number) {
  const open = BIOME_IDS.filter((id) => BIOMES[id].unlockFloor <= number);
  return open[(number - 1) % open.length];
}
