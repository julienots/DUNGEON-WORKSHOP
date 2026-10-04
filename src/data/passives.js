/**
 * PASSIFS (données pures). Chaque passif est un sac de modificateurs lus par CombatSystem.
 *  regen           PV max régénérés par seconde
 *  thorns          fraction des dégâts reçus renvoyée
 *  lifesteal       fraction des dégâts infligés rendue en PV
 *  crit / critDmg  bonus de critique
 *  dodge           chance d'esquive
 *  firstStrike     commence avec la jauge pleine
 *  undying         revient une fois avec cette fraction de PV
 *  packAtk         +attaque par allié de la même famille
 *  enrage          +attaque sous 40% PV
 *  damageReduction réduction des dégâts subis
 *  onHit           { status, chance, duration, power } appliqué par l'attaque de base
 *  splash          fraction des dégâts de base infligée à un second ennemi
 *  auraAtk/auraHp  bonus aux alliés au début du combat
 *  healBoost       soins augmentés
 *  bonusVs         { rarity|role: mult }
 */
export const PASSIVES = {
  none: { name: '—', desc: 'Aucun passif.', mods: {} },
  pack_tactics: { name: 'Tactique de meute', desc: '+8% d’attaque par allié de la même famille.', mods: { packAtk: 0.08 } },
  bone_armor: { name: 'Armure d’os', desc: 'Réduit les dégâts subis de 12%.', mods: { damageReduction: 0.12 } },
  undead: { name: 'Mort-vivant', desc: 'Revient une fois à 30% PV.', mods: { undying: 0.3 } },
  gelatinous: { name: 'Gélatineux', desc: 'Régénère 1,5% PV/s.', mods: { regen: 0.015 } },
  acidic: { name: 'Corps acide', desc: 'Les attaques empoisonnent (35%).', mods: { onHit: { status: 'poison', chance: 0.35, duration: 4, power: 0.2 } } },
  molten: { name: 'Corps en fusion', desc: 'Les attaques brûlent (35%).', mods: { onHit: { status: 'burn', chance: 0.35, duration: 4, power: 0.2 } } },
  frozen_core: { name: 'Cœur gelé', desc: 'Les attaques ralentissent (40%).', mods: { onHit: { status: 'slow', chance: 0.4, duration: 3 } } },
  evasive: { name: 'Insaisissable', desc: '18% d’esquive.', mods: { dodge: 0.18 } },
  vampiric: { name: 'Vampirique', desc: 'Vole 15% des dégâts infligés.', mods: { lifesteal: 0.15 } },
  berserker: { name: 'Berserker', desc: '+40% d’attaque sous 40% PV.', mods: { enrage: 0.4 } },
  thick_hide: { name: 'Cuir épais', desc: 'Réduit les dégâts de 15%, régénère 1%/s.', mods: { damageReduction: 0.15, regen: 0.01 } },
  stone_body: { name: 'Corps de pierre', desc: 'Réduit les dégâts de 25%.', mods: { damageReduction: 0.25 } },
  spiked: { name: 'Hérissé', desc: 'Renvoie 25% des dégâts reçus.', mods: { thorns: 0.25 } },
  ambush: { name: 'Embuscade', desc: 'Agit en premier.', mods: { firstStrike: true, crit: 0.1 } },
  arcane_mind: { name: 'Esprit arcanique', desc: '+15% critique, +30% dégâts critiques.', mods: { crit: 0.15, critDmg: 0.3 } },
  warlord: { name: 'Seigneur de guerre', desc: 'Alliés : +15% d’attaque.', mods: { auraAtk: 0.15 } },
  guardian: { name: 'Gardien', desc: 'Alliés : +15% PV.', mods: { auraHp: 0.15 } },
  hellborn: { name: 'Né des enfers', desc: 'Brûlure à l’impact (50%), +10% dégâts.', mods: { onHit: { status: 'burn', chance: 0.5, duration: 4, power: 0.25 }, damageBonus: 0.1 } },
  draconic: { name: 'Sang draconique', desc: 'Réduit les dégâts de 15%, +15% critique.', mods: { damageReduction: 0.15, crit: 0.15 } },
  venomous: { name: 'Venimeux', desc: 'Les attaques empoisonnent (50%).', mods: { onHit: { status: 'poison', chance: 0.5, duration: 5, power: 0.25 } } },
  ethereal: { name: 'Éthéré', desc: '25% d’esquive.', mods: { dodge: 0.25 } },
  greedy: { name: 'Avide', desc: '+20% d’or sur les aventuriers vaincus.', mods: { goldBonus: 0.2, crit: 0.1 } },
  storm_charged: { name: 'Chargé', desc: 'Les attaques électrocutent (40%).', mods: { onHit: { status: 'shock', chance: 0.4, duration: 3, power: 0.2 } } },
  mycelium: { name: 'Mycélium', desc: 'Régénère 1%/s, alliés +10% PV.', mods: { regen: 0.01, auraHp: 0.1 } },
  all_seeing: { name: 'Omniscient', desc: '+20% critique, ignore 20% d’armure.', mods: { crit: 0.2, pierce: 0.2 } },
  radiant: { name: 'Radieux', desc: 'Soins +30%, régénère 1%/s.', mods: { healBoost: 0.3, regen: 0.01 } },
  splash_attack: { name: 'Frappe large', desc: 'Les attaques touchent un second ennemi (40%).', mods: { splash: 0.4 } },
  royal_aura: { name: 'Aura royale', desc: 'Alliés : +12% attaque et PV.', mods: { auraAtk: 0.12, auraHp: 0.12 } },
  cosmic: { name: 'Cosmique', desc: 'Régénère 2%/s, réduit les dégâts de 15%.', mods: { regen: 0.02, damageReduction: 0.15 } },
  primordial: { name: 'Primordial', desc: 'Réduit les dégâts de 20%, +20% dégâts, revient une fois.', mods: { damageReduction: 0.2, damageBonus: 0.2, undying: 0.5 } },

  // Aventuriers
  hero_tough: { name: 'Endurci', desc: 'Réduit les dégâts de 10%.', mods: { damageReduction: 0.1 } },
  hero_precise: { name: 'Précis', desc: '+15% critique.', mods: { crit: 0.15 } },
  hero_arcane: { name: 'Érudit', desc: '+10% dégâts.', mods: { damageBonus: 0.1 } },
  hero_holy: { name: 'Foi', desc: 'Soins +25%.', mods: { healBoost: 0.25 } },
  hero_shadow: { name: 'Ombre', desc: '20% d’esquive.', mods: { dodge: 0.2, crit: 0.1 } },
  hero_slayer: { name: 'Tueur de monstres', desc: '+40% contre les monstres épiques et plus.', mods: { bonusVs: { epic: 0.4, legendary: 0.4, mythic: 0.4, ancient: 0.4 } } },

  // Boss
  boss_colossus: { name: 'Colosse', desc: 'Réduit les dégâts de 30%.', mods: { damageReduction: 0.3 } },
  boss_archmage: { name: 'Maître des arcanes', desc: '+25% critique.', mods: { crit: 0.25, critDmg: 0.3 } },
  boss_hydra: { name: 'Têtes multiples', desc: 'Régénère 1,5%/s.', mods: { regen: 0.015 } },
  boss_dragon: { name: 'Écailles anciennes', desc: 'Réduit les dégâts de 25%.', mods: { damageReduction: 0.25, crit: 0.1 } },
  boss_demon: { name: 'Seigneur infernal', desc: '+30% dégâts, brûlure à l’impact.', mods: { damageBonus: 0.3, onHit: { status: 'burn', chance: 0.5, duration: 4, power: 0.3 } } },
  boss_ice: { name: 'Cœur d’hiver', desc: 'Ralentit à l’impact, réduit les dégâts de 20%.', mods: { damageReduction: 0.2, onHit: { status: 'slow', chance: 0.6, duration: 3 } } },
  boss_abyss: { name: 'Insondable', desc: 'Réduit les dégâts de 25%, régénère 1%/s.', mods: { damageReduction: 0.25, regen: 0.01 } },
};
