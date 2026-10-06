/**
 * SAISONS HORS LIGNE (V2) — aucune connexion requise : la saison en cours est calculée
 * à partir de la date locale (cycles de SEASON_DAYS jours, les saisons tournent en boucle).
 * Ajouter une saison = ajouter une entrée dans SEASONS.
 *  biome     décor mis en avant (fond de l'écran de saison)
 *  featured  familles de monstres plus fréquentes aux portails pendant la saison
 *  boss      boss de saison (affrontable via l'Arène et l'événement)
 *  missions  défis de saison (progression = statistique gagnée depuis le début de la saison)
 *  track     paliers de récompenses (XP de saison)
 */
export const SEASON_DAYS = 28;
/** Point de départ des cycles (lundi 5 janvier 2026, heure locale). */
export const SEASON_EPOCH = new Date(2026, 0, 5).getTime();

/** XP de saison gagnée par unité de statistique. */
export const SEASON_XP = { raidsDefended: 0.1, runStages: 6, bossesDefeated: 30, missionsClaimed: 25, chestsOpened: 10, mutationsGained: 15 };

const track = (theme) => [
  { xp: 100, reward: { crystals: 50 } },
  { xp: 250, reward: { chest: 'rare' } },
  { xp: 450, reward: { legendaryEssence: 3 } },
  { xp: 700, reward: { crystals: 100 } },
  { xp: 1000, reward: { chest: 'epic' } },
  { xp: 1400, reward: { decoration: theme.decoration } },
  { xp: 1900, reward: { legendaryEssence: 6, dimensionalFragments: 1 } },
  { xp: 2500, reward: { chest: 'epic' } },
  { xp: 3200, reward: { skin: theme.skin } },
  { xp: 4000, reward: { crystals: 250, legendaryEssence: 8 } },
  { xp: 5000, reward: { chest: 'legendary' } },
  { xp: 6500, reward: { dimensionalFragments: 3 } },
  { xp: 8500, reward: { chest: 'mythic' } },
];

const missions = (extra) => [
  { id: 'raids', name: 'Repousser 5 000 raids', icon: '🛡️', stat: 'raidsDefended', target: 5000, xp: 300 },
  { id: 'runs', name: 'Franchir 60 étapes en modes de jeu', icon: '🎮', stat: 'runStages', target: 60, xp: 300 },
  { id: 'bosses', name: 'Vaincre 10 boss', icon: '👑', stat: 'bossesDefeated', target: 10, xp: 300 },
  { id: 'chests', name: 'Ouvrir 10 coffres', icon: '🎁', stat: 'chestsOpened', target: 10, xp: 200 },
  extra,
];

export const SEASONS = [
  {
    id: 'ember', name: 'Saison des Braises', icon: '🔥', biome: 'volcano', featured: ['demon', 'imp', 'dragon', 'orc'], boss: 'event_elder_wyrm',
    desc: 'Les volcans s’éveillent. Les créatures de feu affluent vers votre donjon.',
    track: track({ decoration: 'brazier', skin: 'lava' }),
    missions: missions({ id: 'kills', name: 'Vaincre 3 000 aventuriers', icon: '⚔️', stat: 'adventurersKilled', target: 3000, xp: 400 }),
  },
  {
    id: 'frost', name: 'Saison du Givre', icon: '❄️', biome: 'glacier', featured: ['slime', 'troll', 'bat', 'elemental'], boss: 'ice_queen',
    desc: 'Un hiver sans fin recouvre les profondeurs.',
    track: track({ decoration: 'crystals', skin: 'ice' }),
    missions: missions({ id: 'levels', name: 'Gagner 200 niveaux de monstres', icon: '📈', stat: 'monsterLevelUps', target: 200, xp: 400 }),
  },
  {
    id: 'blight', name: 'Saison de la Peste', icon: '☠️', biome: 'swamp', featured: ['spider', 'mushroom', 'skeleton', 'ghost'], boss: 'event_lich_king',
    desc: 'Les marais débordent ; les morts ne restent pas couchés.',
    track: track({ decoration: 'skulls', skin: 'toxic' }),
    missions: missions({ id: 'traps', name: 'Déclencher 2 000 pièges', icon: '🧨', stat: 'trapTriggers', target: 2000, xp: 400 }),
  },
  {
    id: 'stars', name: 'Saison des Étoiles', icon: '🌌', biome: 'astral', featured: ['sorcerer', 'eye', 'wisp', 'mimic'], boss: 'event_golden_mimic',
    desc: 'Les portails s’ouvrent sur la Dimension astrale.',
    track: track({ decoration: 'runes', skin: 'astral' }),
    missions: missions({ id: 'mutations', name: 'Obtenir 5 mutations', icon: '🧬', stat: 'mutationsGained', target: 5, xp: 400 }),
  },
];
