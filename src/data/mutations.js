/**
 * MUTATIONS (V2) — modifications rares et permanentes d'un monstre, à plusieurs niveaux (1 à 3).
 * Obtenues dans la Salle de mutation (essence légendaire) ou dans certains coffres.
 *  weight : rareté du tirage (les mutations « extrêmement rares » ont un poids très faible)
 *  stats  : +% par niveau (hp, atk, def, spd)
 *  mods   : mods de combat par niveau (additionnés), voir data/passives.js
 *           resist { element: fraction } réduit les dégâts reçus de cet élément
 *           trueSight réduit l'esquive des cibles
 */
export const MUTATIONS = {
  lava_blood: { name: 'Sang de lave', icon: '🔥', rarity: 'rare', weight: 10, desc: 'Résistance au feu, attaques brûlantes.', mods: { resist: { fire: 0.15 }, damageBonus: 0.03 } },
  frost_heart: { name: 'Cœur de givre', icon: '❄️', rarity: 'rare', weight: 10, desc: 'Résistance à la glace, défense accrue.', mods: { resist: { ice: 0.15 } }, stats: { def: 0.04 } },
  storm_veins: { name: 'Veines d’orage', icon: '⚡', rarity: 'rare', weight: 9, desc: 'Résistance à la foudre, vitesse accrue.', mods: { resist: { lightning: 0.15 } }, stats: { spd: 0.04 } },
  abyssal_sight: { name: 'Vision abyssale', icon: '👁️', rarity: 'epic', weight: 6, desc: 'Perce les ombres : ignore une partie de l’esquive, +critique.', mods: { trueSight: 0.25, crit: 0.03 } },
  reinforced_bones: { name: 'Ossature renforcée', icon: '🦴', rarity: 'common', weight: 14, desc: '+défense.', stats: { def: 0.1 } },
  corruption: { name: 'Corruption', icon: '🌑', rarity: 'epic', weight: 6, desc: 'Compétences d’ombre : les attaques corrompent les aventuriers.', mods: { onHit: { status: 'corruption', chance: 0.25, duration: 5, power: 0.15 }, resist: { shadow: 0.1 } } },
  titan_muscles: { name: 'Muscles de titan', icon: '💪', rarity: 'common', weight: 14, desc: '+attaque.', stats: { atk: 0.08 } },
  giant_growth: { name: 'Croissance géante', icon: '🦣', rarity: 'common', weight: 12, desc: '+PV.', stats: { hp: 0.12 } },
  quick_reflexes: { name: 'Réflexes éclair', icon: '💨', rarity: 'rare', weight: 9, desc: '+vitesse, +esquive.', stats: { spd: 0.05 }, mods: { dodge: 0.03 } },
  venom_glands: { name: 'Glandes à venin', icon: '🧪', rarity: 'rare', weight: 9, desc: 'Les attaques empoisonnent.', mods: { onHit: { status: 'poison', chance: 0.2, duration: 4, power: 0.15 }, resist: { poison: 0.1 } } },
  mirror_scales: { name: 'Écailles miroir', icon: '🪞', rarity: 'epic', weight: 5, desc: 'Renvoie une partie des dégâts.', mods: { thorns: 0.08, resist: { arcane: 0.1 } } },
  blood_hunger: { name: 'Soif de sang', icon: '🩸', rarity: 'epic', weight: 5, desc: 'Vol de vie.', mods: { lifesteal: 0.05 } },
  holy_aura: { name: 'Aura sacrée', icon: '✨', rarity: 'epic', weight: 4, desc: 'Résistance à la lumière, alliés +PV.', mods: { resist: { light: 0.15 }, auraHp: 0.03 } },
  phoenix_feather: { name: 'Plume de phénix', icon: '🪶', rarity: 'legendary', weight: 1.5, desc: 'Renaît une fois de ses cendres.', mods: { undying: 0.15 } },
  void_touched: { name: 'Touché par le Néant', icon: '🕳️', rarity: 'mythic', weight: 0.5, desc: 'Extrêmement rare : dégâts et vol de vie du Néant.', mods: { damageBonus: 0.08, lifesteal: 0.04 }, stats: { atk: 0.05 } },
  ancient_dna: { name: 'ADN ancestral', icon: '🧬', rarity: 'ancient', weight: 0.15, desc: 'Extrêmement rare : héritage des premiers monstres, toutes statistiques.', stats: { hp: 0.1, atk: 0.1, def: 0.1, spd: 0.04 } },
};

export const MUTATION_IDS = Object.keys(MUTATIONS);
export const MUTATION_MAX_LEVEL = 3;
export const MAX_MUTATIONS = 3;

/** Coût d'une mutation selon le nombre de mutations/niveaux déjà possédés. */
export function mutationCost(totalLevels) {
  return { legendaryEssence: 3 + totalLevels * 2, essence: 150 * (totalLevels + 1) };
}

/** Coût de la relance des traits. */
export const TRAIT_REROLL_COST = { legendaryEssence: 2, crystals: 40 };

/** Effets agrégés des mutations d'un monstre ([{ id, level }]). */
export function mutationEffects(list = []) {
  const stats = { hp: 0, atk: 0, def: 0, spd: 0 };
  const mods = [];
  for (const mu of list) {
    const d = MUTATIONS[mu.id];
    if (!d) continue;
    const lv = mu.level || 1;
    if (d.stats) for (const [k, v] of Object.entries(d.stats)) stats[k] += v * lv;
    if (d.mods) mods.push(scaleMods(d.mods, lv));
  }
  return { stats, mods };
}

function scaleMods(m, lv) {
  const out = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'onHit') out.onHit = { ...v, chance: Math.min(0.9, v.chance * (1 + 0.5 * (lv - 1))) };
    else if (k === 'resist') out.resist = Object.fromEntries(Object.entries(v).map(([e, x]) => [e, x * lv]));
    else if (typeof v === 'number') out[k] = k === 'undying' ? v * lv : v * lv;
    else out[k] = v;
  }
  return out;
}
