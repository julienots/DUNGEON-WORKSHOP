/**
 * SYNERGIES ENTRE SALLES (V2)
 * ---------------------------
 * Une synergie s'applique à la salle `room` lorsqu'une salle `with` est voisine (4 directions),
 * ou lorsque la condition `trap` (élément du piège installé dans la salle) est remplie.
 *  room / with : id de salle, ou un tag : '@monster' (toute salle qui accueille des monstres),
 *                '@elemental' (salle élémentaire), '@any' (n'importe quelle salle)
 *  trap        : élément du piège posé dans la salle elle-même ('poison', 'fire'…, 'any')
 *  effect :
 *    prod       +% production de la salle
 *    hp/atk/def +% statistiques des monstres de la salle
 *    xp         +% XP des monstres de la salle
 *    reward     +% récompenses des raids (étage)
 *    trapPower  +% dégâts du piège de la salle
 *    mods       mods de combat des monstres de la salle (voir data/passives.js)
 *    element    { element, hp, atk } bonus réservé aux monstres de cet élément
 *    onCombat   statuts appliqués aux aventuriers en entrant dans la salle
 * Ajouter une synergie = ajouter une ligne ici, rien d'autre.
 */
export const ROOM_SYNERGIES = [
  // ---- Production
  { id: 'lava_forge', name: 'Forge volcanique', icon: '🔥🔨', room: 'forge', with: 'lava', effect: { prod: 0.2 }, desc: 'Forge à côté d’une salle de lave : +20% production.' },
  { id: 'mine_forge', name: 'Filon direct', icon: '⛏️🔨', room: 'forge', with: 'mine', effect: { prod: 0.15 }, desc: 'Forge à côté d’une mine : +15% production.' },
  { id: 'mine_mine', name: 'Réseau de galeries', icon: '⛏️⛏️', room: 'mine', with: 'mine', effect: { prod: 0.1 }, desc: 'Mines voisines : +10% production chacune.' },
  { id: 'storm_mine', name: 'Foreuse électrique', icon: '⚡⛏️', room: 'mine', with: 'storm', effect: { prod: 0.2 }, desc: 'Mine à côté d’une salle des tempêtes : +20% production.' },
  { id: 'grove_lab', name: 'Herboristerie', icon: '🌿🧪', room: 'lab', with: 'grove', effect: { prod: 0.25 }, desc: 'Laboratoire à côté d’un bosquet : +25% d’essence.' },
  { id: 'dim_lab', name: 'Recherche interdite', icon: '🌀🧪', room: 'lab', with: 'dimensional', effect: { prod: 0.3 }, desc: 'Laboratoire à côté d’une salle dimensionnelle : +30% d’essence.' },
  { id: 'cursed_treasure', name: 'Trésor maudit', icon: '🕯️💎', room: 'cursed', with: 'treasure', effect: { prod: 0.25, reward: 0.05 }, desc: 'Chambre maudite à côté d’un trésor : +25% production, +5% récompenses.' },
  { id: 'portal_dim', name: 'Convergence', icon: '🌌🌀', room: 'portal', with: 'dimensional', effect: { prod: 0.5 }, desc: 'Portails à côté d’une salle dimensionnelle : +50% de fragments.' },
  // ---- Monstres
  { id: 'lab_monsters', name: 'Expériences', icon: '🧪👹', room: '@monster', with: 'lab', effect: { xp: 0.15 }, desc: 'Salle de monstres à côté d’un laboratoire : +15% XP.' },
  { id: 'training_lab', name: 'Programme intensif', icon: '🏋️🧪', room: 'training', with: 'lab', effect: { xp: 0.25 }, desc: 'Entraînement à côté d’un laboratoire : +25% XP.' },
  { id: 'training_combat', name: 'Vétérans', icon: '🏋️⚔️', room: 'combat', with: 'training', effect: { atk: 0.1 }, desc: 'Salle de combat à côté d’une salle d’entraînement : +10% attaque.' },
  { id: 'barracks', name: 'Caserne', icon: '⚔️⚔️', room: 'combat', with: 'combat', effect: { def: 0.08 }, desc: 'Salles de combat voisines : +8% défense.' },
  { id: 'lair_aura', name: 'Présence du gardien', icon: '👑⚔️', room: '@monster', with: 'lair', effect: { atk: 0.1 }, desc: 'À côté de l’antre du gardien : +10% attaque.' },
  { id: 'master_aura', name: 'Regard du maître', icon: '🎓👹', room: '@monster', with: 'master', effect: { hp: 0.1, atk: 0.05 }, desc: 'À côté de la salle du maître : +10% PV, +5% attaque.' },
  { id: 'arena_combat', name: 'Gladiateurs', icon: '🏟️⚔️', room: 'combat', with: 'arena', effect: { atk: 0.08, mods: { crit: 0.05 } }, desc: 'Salle de combat à côté de l’arène : +8% attaque, +5% critique.' },
  { id: 'grove_grove', name: 'Forêt profonde', icon: '🌿🌿', room: 'grove', with: 'grove', effect: { hp: 0.1 }, desc: 'Bosquets voisins : +10% PV.' },
  { id: 'crypt_toxic', name: 'Décomposition', icon: '⚰️☠️', room: 'crypt', with: 'toxic', effect: { atk: 0.15 }, desc: 'Crypte à côté d’une chambre toxique : +15% attaque.' },
  { id: 'twilight', name: 'Crépuscule', icon: '✨⚰️', room: 'sanctum', with: 'crypt', effect: { mods: { crit: 0.08 } }, desc: 'Sanctuaire à côté d’une crypte : +8% critique (et inversement).' },
  { id: 'twilight_b', name: 'Crépuscule', icon: '⚰️✨', room: 'crypt', with: 'sanctum', effect: { mods: { crit: 0.08 } }, desc: 'Crypte à côté d’un sanctuaire : +8% critique.' },
  { id: 'arcane_dim', name: 'Résonance arcanique', icon: '🌀✨', room: 'dimensional', with: null, effect: { element: { element: 'arcane', hp: 0.1, atk: 0.15 }, mods: { critDmg: 0.25 } }, desc: 'Monstres arcaniques en salle dimensionnelle : +15% attaque, +25% dégâts critiques.' },
  // ---- Contrôle des aventuriers
  { id: 'frozen_storm', name: 'Tempête gelée', icon: '❄️⚡', room: 'storm', with: 'frozen', effect: { onCombat: [{ id: 'slow', chance: 0.35, duration: 4 }] }, desc: 'Tempêtes à côté du gel : les aventuriers sont aussi ralentis.' },
  { id: 'storm_frozen', name: 'Tempête gelée', icon: '⚡❄️', room: 'frozen', with: 'storm', effect: { onCombat: [{ id: 'shock', chance: 0.35, duration: 4, power: 0.12 }] }, desc: 'Gel à côté des tempêtes : les aventuriers sont aussi électrocutés.' },
  { id: 'toxic_lava', name: 'Vapeurs ardentes', icon: '☠️🔥', room: 'toxic', with: 'lava', effect: { onCombat: [{ id: 'burn', chance: 0.35, duration: 4, power: 0.12 }] }, desc: 'Chambre toxique à côté de la lave : le poison brûle.' },
  // ---- Récompenses
  { id: 'treasure_core', name: 'Salle des coffres', icon: '💎💰', room: 'treasure', with: 'core', effect: { reward: 0.1 }, desc: 'Trésor à côté du coffre du donjon : +10% récompenses.' },
  { id: 'vault', name: 'Chambre forte', icon: '💎💎', room: 'treasure', with: 'treasure', effect: { reward: 0.05 }, desc: 'Trésors voisins : +5% récompenses chacun.' },
  // ---- Salles + pièges
  { id: 'toxic_gas', name: 'Nuage toxique', icon: '☠️🧨', room: 'toxic', trap: 'poison', effect: { trapPower: 0.3 }, desc: 'Chambre toxique + piège poison : +30% efficacité du piège.' },
  { id: 'lava_flames', name: 'Fournaise', icon: '🔥🧨', room: 'lava', trap: 'fire', effect: { trapPower: 0.25 }, desc: 'Salle de lave + jet de flammes : +25% dégâts du piège.' },
  { id: 'frozen_ice', name: 'Blizzard', icon: '❄️🧨', room: 'frozen', trap: 'ice', effect: { trapPower: 0.25 }, desc: 'Salle gelée + piège de glace : +25% dégâts du piège.' },
  { id: 'storm_rune', name: 'Surtension', icon: '⚡🧨', room: 'storm', trap: 'lightning', effect: { trapPower: 0.25 }, desc: 'Salle des tempêtes + rune de foudre : +25% dégâts du piège.' },
  { id: 'crypt_shadow', name: 'Nuit éternelle', icon: '⚰️🧨', room: 'crypt', trap: 'shadow', effect: { trapPower: 0.25 }, desc: 'Crypte + ombres rampantes : +25% dégâts du piège.' },
  { id: 'dim_glyph', name: 'Glyphe amplifié', icon: '🌀🧨', room: 'dimensional', trap: 'arcane', effect: { trapPower: 0.3 }, desc: 'Salle dimensionnelle + glyphe magique : +30% dégâts du piège.' },
  { id: 'welcome', name: 'Comité d’accueil', icon: '🚪🧨', room: 'entrance', trap: 'any', effect: { trapPower: 0.2 }, desc: 'Piège à l’entrée : +20% dégâts.' },
];

export const ROOM_SYNERGY_MAP = Object.fromEntries(ROOM_SYNERGIES.map((s) => [s.id, s]));
