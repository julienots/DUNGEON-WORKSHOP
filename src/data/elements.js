/**
 * Éléments et table d'avantages.
 * `strong` : liste des éléments contre lesquels cet élément inflige des dégâts accrus.
 * Modifier ce tableau suffit à rééquilibrer les affinités.
 */
export const ELEMENTS = {
  neutral: { name: 'Neutre', icon: '⚪', color: '#c9c3b6', hex: 0xc9c3b6, strong: [] },
  fire: { name: 'Feu', icon: '🔥', color: '#ff6a2b', hex: 0xff6a2b, strong: ['ice', 'nature'] },
  ice: { name: 'Glace', icon: '❄️', color: '#7fd6ff', hex: 0x7fd6ff, strong: ['lightning', 'shadow'] },
  lightning: { name: 'Foudre', icon: '⚡', color: '#ffe14d', hex: 0xffe14d, strong: ['arcane', 'poison'] },
  poison: { name: 'Poison', icon: '☠️', color: '#8fe04a', hex: 0x8fe04a, strong: ['nature', 'light'] },
  shadow: { name: 'Ombre', icon: '🌑', color: '#9b6bff', hex: 0x9b6bff, strong: ['light', 'arcane'] },
  light: { name: 'Lumière', icon: '✨', color: '#fff3b0', hex: 0xfff3b0, strong: ['shadow', 'poison'] },
  nature: { name: 'Nature', icon: '🌿', color: '#4fc36a', hex: 0x4fc36a, strong: ['lightning', 'shadow'] },
  arcane: { name: 'Arcane', icon: '🌀', color: '#ff5ce1', hex: 0xff5ce1, strong: ['fire', 'ice'] },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS).filter((e) => e !== 'neutral');
