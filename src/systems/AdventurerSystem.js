import { ADVENTURERS, ADVENTURER_LIST, PARTY_TEMPLATES, HERO_NAMES, GROUP_NAMES } from '../data/adventurers.js';
import { PASSIVES } from '../data/passives.js';
import { BALANCE, levelMult } from '../config/balance.js';
import { floorDef, depthMult } from '../data/floors.js';
import { ECONOMY } from '../config/economy.js';

/** Génération des groupes d'aventuriers selon l'étage, la menace et l'événement en cours. */
export class AdventurerSystem {
  constructor(game) {
    this.game = game;
  }

  partyLevel(floorNumber, threat) {
    const d = floorDef(floorNumber);
    return Math.max(1, Math.round(d.level + threat * ECONOMY.raid.threatLevelFactor));
  }

  partySize(floorNumber, rng, threat = 0) {
    let sizes = BALANCE.partySize[0].sizes;
    for (const p of BALANCE.partySize) if (floorNumber >= p.minFloor) sizes = p.sizes;
    const low = threat < floorDef(floorNumber).maxThreat * BALANCE.lowThreatRatio;
    return Math.max(1, rng.pick(sizes) - (low ? 1 : 0));
  }

  classWeights(floorNumber) {
    const ev = this.game?.events?.current();
    const boost = ev?.adventurers || {};
    return ADVENTURER_LIST.filter((a) => floorNumber >= a.minFloor).map((a) => ({ cls: a, weight: a.weight * (boost[a.id] || 1) }));
  }

  /**
   * @returns {{ name, level, members: unitDef[] }}
   */
  generateParty(floorNumber, threat, rng) {
    const level = this.partyLevel(floorNumber, threat);
    const size = this.partySize(floorNumber, rng, threat);
    const template = rng.pick(PARTY_TEMPLATES[size]);
    const weights = this.classWeights(floorNumber);
    const members = [];
    template.forEach((role, i) => {
      const pool = weights.filter((w) => w.cls.role === role);
      const cls = (pool.length ? rng.weighted(pool) : rng.weighted(weights)).cls;
      const lvl = Math.max(1, level + rng.int(-1, 1));
      const elite = rng.chance(BALANCE.eliteChance * (1 + floorNumber * 0.02));
      members.push(this.makeHero(cls.id, lvl, elite, `h${i}`, rng, depthMult(floorNumber)));
    });
    return { name: rng.pick(GROUP_NAMES), level, members };
  }

  makeHero(classId, level, elite, id, rng, depth = 1) {
    const c = ADVENTURERS[classId];
    const lm = levelMult('adventurer', level);
    const em = (elite ? BALANCE.eliteStatMult : 1) * BALANCE.adventurerStatMult * depth;
    let element = c.element;
    if (classId === 'mage' && rng) element = rng.pick(['fire', 'ice', 'lightning', 'arcane']);
    const name = elite && rng ? `${rng.pick(HERO_NAMES)} ${c.name === 'Chasseur de monstres' ? 'le Chasseur' : 'le ' + c.name}` : c.name;
    return {
      id, side: 'B', name, family: 'hero', heroClass: classId, element, level, elite, role: c.role,
      hp: Math.round(c.hp * lm * em), atk: Math.round(c.attack * lm * em), def: Math.round(c.defense * lm * em),
      spd: +(c.speed * (1 + (level - 1) * 0.004) * (elite ? 1.1 : 1)).toFixed(1),
      basic: c.basic, skills: c.skills, mods: { ...(PASSIVES[c.passive]?.mods || {}) }, sprite: `hero_${classId}${elite ? '_elite' : ''}`,
      rarity: elite ? 'epic' : 'common',
    };
  }
}
