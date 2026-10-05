/**
 * TRAITS (V2) — rendent chaque monstre unique.
 * Chaque monstre reçoit 2 traits à sa création (tirage pondéré par `weight`).
 * stats  : multiplicateurs additifs (hp, atk, def, spd) — 0.15 = +15%
 * mods   : mods de combat (même format que les passifs, voir data/passives.js)
 * xpMult / goldBonus : bonus hors combat
 * Les traits se relancent dans la Salle de mutation.
 */
export const TRAITS = {
  berserker: { name: 'Berserker', icon: '🗡️', rarity: 'common', weight: 10, desc: '+15% attaque, -5% défense.', stats: { atk: 0.15, def: -0.05 } },
  defender: { name: 'Défenseur', icon: '🛡️', rarity: 'common', weight: 10, desc: '+20% défense.', stats: { def: 0.2 } },
  swift: { name: 'Rapide', icon: '⚡', rarity: 'common', weight: 10, desc: '+12% vitesse.', stats: { spd: 0.12 } },
  poisoned: { name: 'Empoisonné', icon: '☠️', rarity: 'common', weight: 8, desc: 'Les attaques empoisonnent (25%).', mods: { onHit: { status: 'poison', chance: 0.25, duration: 4, power: 0.2 } } },
  sturdy: { name: 'Robuste', icon: '💪', rarity: 'common', weight: 10, desc: '+15% PV.', stats: { hp: 0.15 } },
  nimble: { name: 'Vif-argent', icon: '💨', rarity: 'common', weight: 8, desc: '8% d’esquive.', mods: { dodge: 0.08 } },
  lazy: { name: 'Paresseux', icon: '😴', rarity: 'common', weight: 6, desc: '+20% PV, -8% vitesse.', stats: { hp: 0.2, spd: -0.08 } },
  glutton: { name: 'Glouton', icon: '🍖', rarity: 'common', weight: 7, desc: '+20% XP gagnée.', xpMult: 0.2 },
  bloodthirsty: { name: 'Sanguinaire', icon: '🩸', rarity: 'rare', weight: 5, desc: 'Vole 6% des dégâts.', mods: { lifesteal: 0.06 } },
  brutal: { name: 'Brutal', icon: '🔨', rarity: 'rare', weight: 5, desc: '+25% dégâts critiques.', mods: { critDmg: 0.25 } },
  precise: { name: 'Précis', icon: '🎯', rarity: 'rare', weight: 5, desc: '+8% de critique.', mods: { crit: 0.08 } },
  regenerating: { name: 'Régénérant', icon: '💚', rarity: 'rare', weight: 5, desc: 'Régénère 1% PV/s.', mods: { regen: 0.01 } },
  thorny: { name: 'Épineux', icon: '🌵', rarity: 'rare', weight: 5, desc: 'Renvoie 10% des dégâts.', mods: { thorns: 0.1 } },
  stubborn: { name: 'Têtu', icon: '🪨', rarity: 'rare', weight: 5, desc: 'Réduit les dégâts subis de 6%.', mods: { damageReduction: 0.06 } },
  lucky: { name: 'Chanceux', icon: '🍀', rarity: 'rare', weight: 5, desc: '+10% d’or sur les aventuriers vaincus.', mods: { goldBonus: 0.1 } },
  wrathful: { name: 'Colérique', icon: '😡', rarity: 'rare', weight: 4, desc: '+25% attaque sous 40% PV.', mods: { enrage: 0.25 } },
  unstable: { name: 'Instable', icon: '🌀', rarity: 'epic', weight: 3, desc: '+25% attaque, -10% PV.', stats: { atk: 0.25, hp: -0.1 } },
  leader: { name: 'Meneur', icon: '📯', rarity: 'epic', weight: 2, desc: 'Alliés : +6% attaque.', mods: { auraAtk: 0.06 } },
  ancestral: { name: 'Ancestral', icon: '🏺', rarity: 'legendary', weight: 1, desc: '+8% à toutes les statistiques.', stats: { hp: 0.08, atk: 0.08, def: 0.08, spd: 0.04 } },
  chosen: { name: 'Élu du Maître', icon: '👑', rarity: 'mythic', weight: 0.3, desc: '+15% à toutes les statistiques.', stats: { hp: 0.15, atk: 0.15, def: 0.15, spd: 0.08 } },
};

export const TRAIT_IDS = Object.keys(TRAITS);
export const TRAITS_PER_MONSTER = 2;

/** Tire `count` traits distincts (pondérés) avec un RNG déterministe. */
export function rollTraits(rng, count = TRAITS_PER_MONSTER) {
  const pool = TRAIT_IDS.map((id) => [id, TRAITS[id].weight]);
  const out = [];
  while (out.length < count && pool.length) {
    const id = rng.weighted(pool);
    out.push(id);
    pool.splice(pool.findIndex((p) => p[0] === id), 1);
  }
  return out;
}

/** Agrège les effets des traits d'un monstre. */
export function traitEffects(traitIds = []) {
  const stats = { hp: 0, atk: 0, def: 0, spd: 0 };
  const mods = [];
  let xpMult = 0;
  for (const id of traitIds) {
    const t = TRAITS[id];
    if (!t) continue;
    if (t.stats) for (const [k, v] of Object.entries(t.stats)) stats[k] += v;
    if (t.mods) mods.push(t.mods);
    xpMult += t.xpMult || 0;
  }
  return { stats, mods, xpMult };
}
