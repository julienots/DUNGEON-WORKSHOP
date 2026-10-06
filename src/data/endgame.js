/**
 * OBJECTIFS ENDGAME (V2) — défis extrêmement longs, avec titre et grosse récompense.
 *  kind : type de progression calculée par EndgameSystem
 */
export const ENDGAME_GOALS = [
  { id: 'eg_inf100', name: 'Les cent profondeurs', icon: '♾️', kind: 'infinite', target: 100, reward: { chest: 'legendary', dimensionalFragments: 5 }, title: 'Plongeur des abysses' },
  { id: 'eg_inf500', name: 'Le gouffre', icon: '🕳️', kind: 'infinite', target: 500, reward: { chest: 'mythic', dimensionalFragments: 15 }, title: 'Seigneur du gouffre' },
  { id: 'eg_inf1000', name: 'Étage 1000', icon: '🌌', kind: 'infinite', target: 1000, reward: { chest: 'ancient', dimensionalFragments: 40 }, title: 'Celui qui vit sous le monde' },
  { id: 'eg_species', name: 'Bestiaire complet', icon: '👹', kind: 'species', target: 1, reward: { chest: 'ancient', legendaryEssence: 50 }, title: 'Grand Dresseur' },
  { id: 'eg_bosses', name: 'Tous les boss', icon: '👑', kind: 'bosses', target: 1, reward: { chest: 'mythic', legendaryEssence: 30 }, title: 'Tueur de légendes' },
  { id: 'eg_mutations', name: 'Toutes les mutations', icon: '🧬', kind: 'mutations', target: 1, reward: { chest: 'mythic', legendaryEssence: 30 }, title: 'Généticien du chaos' },
  { id: 'eg_biomes', name: 'Conquérant des biomes', icon: '🌍', kind: 'biomes', target: 1, reward: { chest: 'legendary', dimensionalFragments: 10 }, title: 'Arpenteur des mondes' },
  { id: 'eg_rooms', name: 'Architecte absolu', icon: '🏰', kind: 'rooms', target: 1, reward: { chest: 'legendary', crystals: 1000 }, title: 'Architecte absolu' },
  { id: 'eg_asc10', name: '10 Ascensions', icon: '✨', kind: 'ascensions', target: 10, reward: { chest: 'legendary', legendaryEssence: 20 }, title: 'Éternel' },
  { id: 'eg_asc25', name: '25 Ascensions', icon: '🌟', kind: 'ascensions', target: 25, reward: { chest: 'mythic', legendaryEssence: 40 }, title: 'Immortel' },
  { id: 'eg_asc50', name: '50 Ascensions', icon: '💫', kind: 'ascensions', target: 50, reward: { chest: 'ancient', legendaryEssence: 80 }, title: 'Hors du temps' },
  { id: 'eg_dim', name: 'Maître dimensionnel', icon: '🌀', kind: 'dimensional', target: 1, reward: { chest: 'ancient', dimensionalFragments: 50 }, title: 'Maître dimensionnel' },
];
