/**
 * PIÈGES (données pures)
 * damage    dégâts de base (niveau 1), croissance BALANCE.growth.trap
 * cooldown  secondes entre deux déclenchements
 * range     nombre de cibles (99 = tout le groupe)
 * effect    statut appliqué { id, chance, duration, power }
 * element   élément des dégâts (utilisé pour les synergies)
 */
export const TRAPS = {
  spikes: {
    id: 'spikes', name: 'Piques', icon: '📌', element: 'neutral', desc: 'Des pointes jaillissent du sol.',
    damage: 22, cooldown: 4, range: 1, effect: { id: 'bleed', chance: 0.4, duration: 4, power: 0.2 },
    cost: { gold: 150, stone: 30, metal: 10 }, maxLevel: 100, fx: 'spikes',
  },
  arrows: {
    id: 'arrows', name: 'Flèches', icon: '🏹', element: 'neutral', desc: 'Des meurtrières tirent une volée de flèches.',
    damage: 14, cooldown: 3.5, range: 2, effect: null,
    cost: { gold: 220, stone: 20, metal: 20 }, maxLevel: 100, fx: 'arrows',
  },
  fire: {
    id: 'fire', name: 'Jet de flammes', icon: '🔥', element: 'fire', desc: 'Brûle tout le groupe.',
    damage: 16, cooldown: 6, range: 99, effect: { id: 'burn', chance: 0.7, duration: 4, power: 0.25 },
    cost: { gold: 450, stone: 40, metal: 35 }, maxLevel: 100, fx: 'flames', unlock: { research: 'trap_elemental' },
  },
  ice: {
    id: 'ice', name: 'Piège de glace', icon: '🧊', element: 'ice', desc: 'Gèle et ralentit.',
    damage: 14, cooldown: 6, range: 2, effect: { id: 'freeze', chance: 0.45, duration: 1.5 },
    cost: { gold: 450, stone: 40, metal: 35 }, maxLevel: 100, fx: 'frost', unlock: { research: 'trap_elemental' },
  },
  poison: {
    id: 'poison', name: 'Gaz toxique', icon: '☠️', element: 'poison', desc: 'Empoisonne tout le groupe.',
    damage: 8, cooldown: 7, range: 99, effect: { id: 'poison', chance: 1, duration: 6, power: 0.25 },
    cost: { gold: 400, stone: 40, metal: 25 }, maxLevel: 100, fx: 'gas', unlock: { research: 'trap_elemental' },
  },
  boulder: {
    id: 'boulder', name: 'Rocher roulant', icon: '🪨', element: 'neutral', desc: 'Écrase et étourdit.',
    damage: 40, cooldown: 10, range: 99, effect: { id: 'stun', chance: 0.4, duration: 1.2 },
    cost: { gold: 700, stone: 200, metal: 30 }, maxLevel: 100, fx: 'boulder', unlock: { research: 'trap_heavy' },
  },
  lightning: {
    id: 'lightning', name: 'Rune de foudre', icon: '⚡', element: 'lightning', desc: 'Électrocute plusieurs cibles.',
    damage: 26, cooldown: 5, range: 3, effect: { id: 'shock', chance: 0.6, duration: 4, power: 0.2 },
    cost: { gold: 900, stone: 60, metal: 70 }, maxLevel: 100, fx: 'zap', unlock: { research: 'trap_storm' },
  },
  arcane: {
    id: 'arcane', name: 'Glyphe magique', icon: '🌀', element: 'arcane', desc: 'Corrompt et affaiblit les défenses.',
    damage: 20, cooldown: 7, range: 99, effect: { id: 'defDown', chance: 0.7, duration: 5 },
    cost: { gold: 1500, stone: 80, metal: 60, crystals: 10 }, maxLevel: 100, fx: 'glyph', unlock: { research: 'trap_arcane' },
  },
  shadow: {
    id: 'shadow', name: 'Ombres rampantes', icon: '🌑', element: 'shadow', desc: 'Aveugle le groupe.',
    damage: 18, cooldown: 7, range: 99, effect: { id: 'blind', chance: 0.6, duration: 3, power: 0.35 },
    cost: { gold: 1200, stone: 80, metal: 50, darkEssence: 5 }, maxLevel: 100, fx: 'shadow', unlock: { research: 'trap_shadow' },
  },
};

export const TRAP_LIST = Object.values(TRAPS);

/**
 * SYNERGIES DE PIÈGES
 * Une synergie s'active quand un piège d'élément `a` se trouve dans une salle (ou adjacent à une salle/piège)
 * d'élément `b`. Les deux sens sont testés.
 * bonus.damage   multiplicateur de dégâts supplémentaire
 * bonus.effects  statuts supplémentaires appliqués
 */
export const TRAP_SYNERGIES = [
  {
    id: 'burning_poison', name: 'Poison brûlant', icon: '🔥☠️', a: 'fire', b: 'poison',
    desc: 'Lave + poison : le poison s’enflamme.',
    bonus: { damage: 0.3, effects: [{ id: 'burn', chance: 0.8, duration: 4, power: 0.3 }, { id: 'poison', chance: 0.8, duration: 5, power: 0.2 }] },
  },
  {
    id: 'frozen_storm', name: 'Zone électrique gelée', icon: '❄️⚡', a: 'ice', b: 'lightning',
    desc: 'Glace + foudre : électrocute et gèle.',
    bonus: { damage: 0.35, effects: [{ id: 'freeze', chance: 0.4, duration: 1.5 }, { id: 'shock', chance: 0.8, duration: 4, power: 0.25 }] },
  },
  {
    id: 'arcane_corruption', name: 'Corruption magique', icon: '🌀☠️', a: 'arcane', b: 'poison',
    desc: 'Magie + poison : corrompt les aventuriers.',
    bonus: { damage: 0.3, effects: [{ id: 'corruption', chance: 1, duration: 6, power: 0.3 }] },
  },
  {
    id: 'steam_burst', name: 'Vapeur brûlante', icon: '🔥❄️', a: 'fire', b: 'ice',
    desc: 'Feu + glace : la vapeur aveugle.',
    bonus: { damage: 0.25, effects: [{ id: 'blind', chance: 0.7, duration: 3, power: 0.4 }] },
  },
  {
    id: 'thunder_spikes', name: 'Piques conductrices', icon: '📌⚡', a: 'neutral', b: 'lightning', trapA: 'spikes',
    desc: 'Piques + foudre : étourdissement.',
    bonus: { damage: 0.3, effects: [{ id: 'stun', chance: 0.4, duration: 1.2 }] },
  },
  {
    id: 'avalanche', name: 'Avalanche', icon: '🪨❄️', a: 'neutral', b: 'ice', trapA: 'boulder',
    desc: 'Rocher + glace : avalanche dévastatrice.',
    bonus: { damage: 0.6, effects: [{ id: 'freeze', chance: 0.4, duration: 1.5 }] },
  },
  {
    id: 'shadow_fire', name: 'Flammes noires', icon: '🌑🔥', a: 'shadow', b: 'fire',
    desc: 'Ombre + feu : brûlure et affaiblissement.',
    bonus: { damage: 0.35, effects: [{ id: 'burn', chance: 0.8, duration: 5, power: 0.3 }, { id: 'atkDown', chance: 0.6, duration: 4 }] },
  },
  {
    id: 'toxic_bloom', name: 'Floraison toxique', icon: '🌿☠️', a: 'poison', b: 'nature',
    desc: 'Poison + nature : spores mortelles.',
    bonus: { damage: 0.3, effects: [{ id: 'poison', chance: 1, duration: 6, power: 0.35 }] },
  },
];
