/**
 * Effets de statut génériques interprétés par CombatSystem.
 * kind:
 *  - dot   : dégâts périodiques (power = fraction de l'attaque de la source par seconde)
 *  - hot   : soin périodique (power = fraction des PV max par seconde)
 *  - stun  : la cible ne peut pas agir
 *  - stat  : modifie une statistique (stat, mult)
 *  - shield: absorbe des dégâts (power = fraction des PV max)
 *  - miss  : chance de rater ses attaques (power)
 *  - vuln  : dégâts subis augmentés (power)
 */
export const STATUSES = {
  burn: { name: 'Brûlure', icon: '🔥', color: '#ff7a2b', kind: 'dot', element: 'fire', maxStacks: 1 },
  poison: { name: 'Poison', icon: '☠️', color: '#8fe04a', kind: 'dot', element: 'poison', maxStacks: 5 },
  bleed: { name: 'Saignement', icon: '🩸', color: '#d9304a', kind: 'dot', element: 'neutral', maxStacks: 3 },
  corruption: { name: 'Corruption', icon: '🌀', color: '#ff5ce1', kind: 'dot', element: 'arcane', maxStacks: 3, alsoVuln: 0.15 },
  freeze: { name: 'Gel', icon: '🧊', color: '#9fe6ff', kind: 'stun' },
  stun: { name: 'Étourdi', icon: '💫', color: '#ffe14d', kind: 'stun' },
  slow: { name: 'Ralenti', icon: '🐌', color: '#7fb6ff', kind: 'stat', stat: 'spd', mult: 0.6 },
  haste: { name: 'Hâte', icon: '💨', color: '#b6fff0', kind: 'stat', stat: 'spd', mult: 1.4 },
  atkUp: { name: 'Fureur', icon: '⚔️', color: '#ff9c4a', kind: 'stat', stat: 'atk', mult: 1.35 },
  atkDown: { name: 'Affaibli', icon: '🔻', color: '#a08060', kind: 'stat', stat: 'atk', mult: 0.7 },
  defUp: { name: 'Protection', icon: '🛡️', color: '#8fb0ff', kind: 'stat', stat: 'def', mult: 1.5 },
  defDown: { name: 'Brise-armure', icon: '💔', color: '#ff6b8a', kind: 'stat', stat: 'def', mult: 0.6 },
  regen: { name: 'Régénération', icon: '💚', color: '#6bff8a', kind: 'hot' },
  shield: { name: 'Bouclier', icon: '🔰', color: '#8fe8ff', kind: 'shield' },
  blind: { name: 'Aveuglé', icon: '🌫️', color: '#c0c0c0', kind: 'miss' },
  shock: { name: 'Électrocuté', icon: '⚡', color: '#ffe14d', kind: 'vuln' },
  mark: { name: 'Marqué', icon: '🎯', color: '#ff4040', kind: 'vuln' },
};
