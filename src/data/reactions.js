/**
 * RÉACTIONS ÉLÉMENTAIRES (V2)
 * ---------------------------
 * Une unité touchée par un élément garde une « aura » de cet élément quelques secondes.
 * Si un AUTRE élément la touche pendant ce temps et que la paire est listée ici, une réaction se déclenche :
 * l'aura est consommée et l'effet s'applique (affiché avec une animation spéciale).
 *  burst    dégâts immédiats = attaque de la source × burst
 *  splash   fraction du burst infligée aux autres ennemis
 *  statuses statuts appliqués à la cible (ou à tous les ennemis si spread)
 */
export const REACTIONS = {
  'fire+poison': { name: 'Poison brûlant', icon: '🔥☠️', color: '#ff9a2b', burst: 0.6, statuses: [{ id: 'burn', duration: 4, power: 0.25 }, { id: 'poison', duration: 5, power: 0.2 }] },
  'ice+lightning': { name: 'Tempête gelée', icon: '❄️⚡', color: '#9fe6ff', burst: 0.5, statuses: [{ id: 'freeze', duration: 1.5 }, { id: 'shock', duration: 4, power: 0.2 }] },
  'light+shadow': { name: 'Explosion dimensionnelle', icon: '💥', color: '#ff5ce1', burst: 1.2, splash: 0.4 },
  'fire+ice': { name: 'Vaporisation', icon: '♨️', color: '#ffd0a0', burst: 0.9 },
  'lightning+poison': { name: 'Toxine électrique', icon: '⚡☠️', color: '#c6ff4a', burst: 0.3, statuses: [{ id: 'poison', duration: 4, power: 0.15 }], spread: true },
  'nature+poison': { name: 'Pourriture', icon: '🍄', color: '#8fbf4a', burst: 0.3, statuses: [{ id: 'defDown', duration: 5 }] },
  'arcane+fire': { name: 'Surcharge arcanique', icon: '🌀🔥', color: '#ff7ad0', burst: 0.8, statuses: [{ id: 'corruption', duration: 4, power: 0.15 }] },
  'poison+shadow': { name: 'Peste noire', icon: '🦠', color: '#7a5aa3', burst: 0.4, statuses: [{ id: 'mark', duration: 5, power: 0.2 }] },
  'lightning+nature': { name: 'Croissance électrique', icon: '🌩️🌿', color: '#bfff8a', burst: 0.5, statuses: [{ id: 'stun', duration: 1 }] },
  'arcane+ice': { name: 'Prisme gelé', icon: '🔷', color: '#9ab8ff', burst: 0.6, statuses: [{ id: 'slow', duration: 4 }] },
  'fire+nature': { name: 'Incendie', icon: '🌲🔥', color: '#ff6a2b', burst: 0.4, statuses: [{ id: 'burn', duration: 5, power: 0.2 }], spread: true },
  'light+poison': { name: 'Purification', icon: '✨☠️', color: '#fffab0', burst: 0.7 },
};

/** Durée de l'aura élémentaire (secondes). */
export const AURA_DURATION = 4;
/** Délai minimal entre deux réactions sur la même cible. */
export const REACTION_COOLDOWN = 1.5;
/** Paliers de combo (coups consécutifs d'un camp sans pause de plus de COMBO_WINDOW s). */
export const COMBO_WINDOW = 2;
export const COMBO_TIERS = [
  { hits: 5, bonus: 0.05, name: 'Combo' },
  { hits: 10, bonus: 0.1, name: 'Super combo' },
  { hits: 20, bonus: 0.15, name: 'Méga combo' },
  { hits: 35, bonus: 0.2, name: 'Combo infernal' },
];

export function reactionKey(a, b) {
  return [a, b].sort().join('+');
}
