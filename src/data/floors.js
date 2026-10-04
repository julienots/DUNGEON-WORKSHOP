import { DUNGEON_TIERS } from '../config/economy.js';
import { BALANCE } from '../config/balance.js';
import { bossForFloor } from './bosses.js';

/** Thèmes visuels des étages. */
export const THEMES = {
  cave: { name: 'Grotte', rock: '#5a4a3c', rockDark: '#2e241c', rockLight: '#7a6650', bg: '#140e0a', fog: '#3a2a1a', light: 0xffb060, ambient: '#ffb060' },
  crypt: { name: 'Crypte', rock: '#4a4652', rockDark: '#221f28', rockLight: '#6a6676', bg: '#0e0c12', fog: '#2a2236', light: 0x9fd0ff, ambient: '#9fd0ff' },
  fortress: { name: 'Forteresse', rock: '#4c5664', rockDark: '#20262e', rockLight: '#6c7888', bg: '#0b0e12', fog: '#1f2a36', light: 0xffd080, ambient: '#ffd080' },
  citadel: { name: 'Citadelle', rock: '#5a3430', rockDark: '#2a1210', rockLight: '#7a4a42', bg: '#140806', fog: '#3a1410', light: 0xff6a2b, ambient: '#ff8a4a' },
  demonic: { name: 'Royaume démoniaque', rock: '#4a1a24', rockDark: '#1f060c', rockLight: '#6a2a36', bg: '#100306', fog: '#3a0a14', light: 0xff3a3a, ambient: '#ff4a4a' },
  dimensional: { name: 'Dimension', rock: '#2e2450', rockDark: '#120c26', rockLight: '#4a3a78', bg: '#07051a', fog: '#1a1040', light: 0xff5ce1, ambient: '#d07aff' },
  infinite: { name: 'Infini', rock: '#1e1e28', rockDark: '#08080c', rockLight: '#3a3a4c', bg: '#030306', fog: '#141420', light: 0x3cf2d0, ambient: '#7affe6' },
};

export function tierForFloor(floor) {
  let tier = DUNGEON_TIERS[0];
  for (const t of DUNGEON_TIERS) if (floor >= t.minFloor) tier = t;
  return tier;
}

const SIZE_TABLE = [
  { minFloor: 1, start: [4, 5], max: [5, 7] },
  { minFloor: 2, start: [4, 5], max: [6, 8] },
  { minFloor: 5, start: [5, 6], max: [6, 9] },
  { minFloor: 10, start: [5, 6], max: [7, 9] },
  { minFloor: 20, start: [6, 7], max: [7, 10] },
];

/** Définition calculée d'un étage (numéro à partir de 1). */
export function floorDef(floor) {
  const tier = tierForFloor(floor);
  let size = SIZE_TABLE[0];
  for (const s of SIZE_TABLE) if (floor >= s.minFloor) size = s;
  const fl = BALANCE.floorLevel;
  return {
    number: floor,
    tierName: tier.name,
    theme: tier.theme,
    name: `Étage ${floor}`,
    startCols: size.start[0],
    startRows: size.start[1],
    maxCols: size.max[0],
    maxRows: size.max[1],
    level: Math.round(fl.base + (floor - 1) * fl.perFloor),
    maxThreat: fl.maxThreatBase + floor * fl.maxThreatPerFloor,
    boss: bossForFloor(floor),
  };
}
