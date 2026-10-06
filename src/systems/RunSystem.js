import { MODES, RUN_MODIFIERS, CHALLENGES, CURSE_LEVELS, RUN_BOONS, ROGUELITE_META, RUN_EVENTS } from '../data/modes.js';
import { MONSTERS, MONSTER_MAP } from '../data/monsters.js';
import { ADVENTURER_LIST, PARTY_TEMPLATES, GROUP_NAMES } from '../data/adventurers.js';
import { BOSSES, BOSS_LIST } from '../data/bosses.js';
import { BIOMES, BIOME_IDS } from '../data/biomes.js';
import { floorEconomyScale } from '../data/floors.js';
import { rollTraits } from '../data/traits.js';
import { makeUnit, simulateBattle } from './CombatSystem.js';
import { mergeMods } from './MonsterSystem.js';
import { RNG, hashString } from '../utils/rng.js';
import { dayKey } from '../utils/helpers.js';
import { RESOURCE_KEYS } from '../utils/constants.js';

/** Récompenses pleines pour les N premières runs terminées d'un mode chaque jour (ensuite réduites). */
export const DAILY_FULL_RUNS = 2;
export const DAILY_REDUCED_FACTOR = 0.25;
export const LEADERBOARD_SIZE = 10;

const RARITY_WEIGHTS = { common: 50, rare: 30, epic: 14, legendary: 5, mythic: 1 };

/** État persistant des modes (complété par deepDefaults pour les anciennes sauvegardes). */
export function createModesState() {
  return {
    activeRun: null,
    records: {},
    leaderboards: {},
    daily: { key: '', runs: {} },
    challenges: {},
    roguelite: { souls: 0, totalSouls: 0, meta: {} },
    infinite: { checkpoint: 0, best: 0 },
    cursed: { bestLevel: 0 },
    dailyChallenge: { key: '', done: false, best: 0 },
    runSeq: 0,
  };
}

/**
 * RUN SYSTEM
 * ----------
 * Moteur commun à tous les modes « run » (Survie, Challenges, Aléatoire, Roguelite, Maudit, Boss Rush, Infini,
 * Défi du jour). Une run = une suite d'étapes ; chaque étape est un combat simulé par CombatSystem et
 * rejoué par BattleScene. Entre deux étapes : soins partiels, bonus (Roguelite), événements aléatoires.
 * Tout l'état vit dans `state.modes.activeRun` : une run interrompue reprend après redémarrage.
 */
export class RunSystem {
  constructor(game) {
    this.game = game;
  }

  get ms() {
    return this.game.state.modes;
  }

  get run() {
    return this.ms.activeRun;
  }

  // ------------------------------------------------------------------ déblocage
  bestFloor() {
    const s = this.game.state;
    return Math.max(s.stats.maxFloor || 1, s.prestige.bestFloor || 1, s.floors.length);
  }

  isUnlocked(modeId) {
    const m = MODES[modeId];
    return !!m && this.bestFloor() >= m.unlockFloor;
  }

  modeList() {
    return Object.entries(MODES).map(([id, m]) => ({ id, ...m, unlocked: this.isUnlocked(id), record: this.ms.records[id] || null }));
  }

  /** Niveau de référence de la collection : moyenne des 5 meilleurs monstres. */
  rosterRefLevel() {
    const lv = this.game.state.monsters.map((m) => m.level).sort((a, b) => b - a).slice(0, 5);
    return Math.max(1, Math.round(lv.reduce((a, b) => a + b, 0) / Math.max(1, lv.length)));
  }

  // ------------------------------------------------------------------ défi du jour
  /** Défi du jour : généré à partir de la date locale (identique pour tous, fonctionne hors ligne). */
  dailyChallenge(date = new Date()) {
    const key = dayKey(date);
    const rng = new RNG(hashString('daily-challenge:' + key));
    const ids = Object.keys(CHALLENGES).filter((id) => !CHALLENGES[id].rules?.element);
    const challenge = rng.pick(ids);
    // Les règles d'élément sont gérées à part : jamais deux restrictions contradictoires
    const modPool = Object.keys(RUN_MODIFIERS).filter((k) => !RUN_MODIFIERS[k].rules?.element && !RUN_MODIFIERS[k].rules?.maxTeam);
    const modifiers = rng.shuffle(modPool).slice(0, 1 + rng.int(0, 1));
    // Restriction d'élément seulement parmi ceux que le joueur peut aligner (au moins 3 monstres)
    const counts = {};
    for (const m of this.game.state.monsters) {
      const el = this.game.monsters.species(m).element;
      counts[el] = (counts[el] || 0) + 1;
    }
    const playable = Object.keys(counts).filter((el) => counts[el] >= 3).sort();
    const roll = rng.next();
    const element = roll < 0.4 && playable.length ? playable[Math.floor(rng.next() * playable.length)] : null;
    const stages = 5;
    const reward = { crystals: 400 + rng.int(0, 4) * 25, legendaryEssence: 4, dimensionalFragments: 1 };
    return { key, challenge, modifiers, element, stages, reward, done: this.ms.dailyChallenge.key === key && this.ms.dailyChallenge.done };
  }

  // ------------------------------------------------------------------ règles
  /** Combine mode + challenge + malédiction + modificateurs en un seul jeu de règles. */
  buildRules(run) {
    const mode = MODES[run.mode];
    const r = {
      reward: 0, rareReward: 0, rewardMult: 1,
      enemy: { power: 0, spd: 0, size: 0, elite: false, element: null },
      ally: { hp: 0, atk: 0, spd: 0 },
      healMult: 1, betweenHeal: mode.heal, element: null,
      maxTeam: (mode.maxTeam || mode.teamSize) + (this.game.tiers?.hasUnlock('team_slot') && mode.team === 'roster' ? 1 : 0),
      bossEvery: mode.bossEvery, permadeath: false,
      sideMods: { A: {}, B: {} },
      stages: mode.stages,
    };
    const apply = (src) => {
      if (!src) return;
      r.reward += src.reward || 0;
      r.rareReward += src.rareReward || 0;
      if (src.rewardMult) r.rewardMult *= src.rewardMult;
      for (const [k, v] of Object.entries(src.enemy || {})) r.enemy[k] = typeof v === 'number' ? (r.enemy[k] || 0) + v : v;
      for (const [k, v] of Object.entries(src.ally || {})) r.ally[k] += v;
      const ru = src.rules || {};
      if (ru.healMult !== undefined) r.healMult = Math.min(r.healMult, ru.healMult);
      if (ru.betweenHeal !== undefined) r.betweenHeal = Math.min(r.betweenHeal, ru.betweenHeal);
      if (ru.element) r.element = ru.element;
      if (ru.maxTeam) r.maxTeam = Math.min(r.maxTeam, ru.maxTeam);
      if (ru.bossEvery) r.bossEvery = Math.min(r.bossEvery || 99, ru.bossEvery);
      if (ru.permadeath) r.permadeath = true;
      for (const side of ['A', 'B']) {
        for (const [k, v] of Object.entries(src.sideMods?.[side] || {})) {
          if (k === 'elementDamage') {
            r.sideMods[side].elementDamage = { ...(r.sideMods[side].elementDamage || {}) };
            for (const [el, x] of Object.entries(v)) r.sideMods[side].elementDamage[el] = (r.sideMods[side].elementDamage[el] || 0) + x;
          } else r.sideMods[side][k] = v;
        }
      }
    };
    if (run.challenge) apply(CHALLENGES[run.challenge]);
    if (run.daily) {
      r.stages = run.daily.stages;
      if (run.daily.element) r.element = run.daily.element;
    }
    if (run.curse) {
      const c = CURSE_LEVELS.find((x) => x.level === run.curse);
      apply({ reward: c.reward, enemy: { power: c.enemy } });
    }
    for (const id of run.modifiers) apply(RUN_MODIFIERS[id]);
    // Biome (Aléatoire / challenge) : l'élément du biome frappe plus fort des deux côtés
    if (run.biome && BIOMES[run.biome]) {
      const el = BIOMES[run.biome].element;
      for (const side of ['A', 'B']) {
        const ed = { ...(r.sideMods[side].elementDamage || {}) };
        ed[el] = (ed[el] || 0) + 0.2;
        r.sideMods[side].elementDamage = ed;
      }
    }
    r.sideMods.A.healMult = r.healMult;
    // Salle des portails : bonus de récompenses des modes
    r.reward += this.game.dungeon.runRewardBonus();
    return r;
  }

  rules(run = this.run) {
    return this.buildRules(run);
  }

  // ------------------------------------------------------------------ démarrage
  /**
   * @param {string} modeId
   * @param {object} opts { teamUids, modifiers, challenge, curse, daily }
   */
  canStart(modeId, opts = {}) {
    const mode = MODES[modeId];
    if (!mode || mode.kind !== 'run') return { ok: false, reason: 'Mode inconnu' };
    if (!opts.daily && !this.isUnlocked(modeId)) return { ok: false, reason: `Atteignez l’étage ${mode.unlockFloor} pour débloquer ce mode.` };
    if (this.run) return { ok: false, reason: 'Une partie est déjà en cours.' };
    if (modeId === 'challenge' && !opts.daily && !CHALLENGES[opts.challenge]) return { ok: false, reason: 'Choisissez un challenge.' };
    if (modeId === 'cursed' && !CURSE_LEVELS.some((c) => c.level === opts.curse)) return { ok: false, reason: 'Choisissez un niveau de malédiction.' };
    const mods = (opts.modifiers || []).filter((m) => RUN_MODIFIERS[m]);
    if (mods.length && !mode.modifiers && !opts.daily) return { ok: false, reason: 'Ce mode n’accepte pas de modificateurs.' };
    const probe = { mode: modeId, modifiers: mods, challenge: opts.challenge || null, curse: opts.curse || null, daily: opts.daily || null, biome: null };
    const rules = this.buildRules(probe);
    if (mode.team === 'roster') {
      const team = (opts.teamUids || []).map((u) => this.game.monsters.get(u)).filter(Boolean);
      if (!team.length) return { ok: false, reason: 'Choisissez au moins un monstre.' };
      if (team.length > rules.maxTeam) return { ok: false, reason: `${rules.maxTeam} monstres maximum.` };
      if (rules.element && team.some((m) => this.game.monsters.species(m).element !== rules.element)) {
        return { ok: false, reason: 'Un monstre ne respecte pas la règle d’élément.' };
      }
    }
    return { ok: true, rules, modifiers: mods };
  }

  start(modeId, opts = {}) {
    const check = this.canStart(modeId, opts);
    if (!check.ok) return check;
    const g = this.game;
    const mode = MODES[modeId];
    const seed = (opts.seed ?? (Date.now() ^ ((++this.ms.runSeq) * 2654435761))) >>> 0;
    const rng = new RNG(seed);
    const run = {
      id: `run${this.ms.runSeq}`, mode: modeId, seed, startedAt: Date.now(),
      stage: 0, kills: 0, bosses: 0, souls: 0,
      modifiers: check.modifiers, challenge: opts.challenge || (opts.daily ? opts.daily.challenge : null), curse: opts.curse || null,
      daily: opts.daily ? { key: opts.daily.key, stages: opts.daily.stages, element: opts.daily.element, reward: opts.daily.reward } : null,
      biome: null, team: [], buffs: { hp: 0, atk: 0, def: 0, spd: 0 }, mods: {},
      rewards: {}, rewardBonus: 0, rewardPenalty: 0, nextEnemy: 0, fragments: 0,
      refLevel: 1, startFloor: 0, pending: null, log: [], ended: false,
    };
    if (opts.daily) run.modifiers = opts.daily.modifiers.slice();
    if (modeId === 'random') run.biome = rng.pick(BIOME_IDS);
    if (run.challenge && CHALLENGES[run.challenge]?.biome) run.biome = CHALLENGES[run.challenge].biome;
    const rules = this.buildRules(run);

    if (mode.team === 'roster') {
      const team = opts.teamUids.map((u) => g.monsters.get(u)).filter(Boolean).slice(0, rules.maxTeam);
      run.team = team.map((m) => ({ key: m.uid, uid: m.uid, speciesId: m.speciesId, level: m.level, hpFrac: 1, dead: false, extra: null }));
      run.refLevel = Math.round(team.reduce((a, m) => a + m.level, 0) / team.length);
    } else if (mode.team === 'random') {
      run.refLevel = this.rosterRefLevel();
      for (let i = 0; i < Math.min(mode.teamSize, rules.maxTeam); i++) run.team.push(this.rental(rng, run, run.refLevel, rules.element));
    } else if (mode.team === 'draft') {
      const meta = this.ms.roguelite.meta;
      run.refLevel = 8 + (meta.rm_level || 0);
      for (const u of ROGUELITE_META) {
        const lvl = meta[u.id] || 0;
        if (!lvl || !u.team) continue;
        for (const [k, v] of Object.entries(u.team)) run.buffs[k] += v * lvl;
      }
      run.pending = { type: 'draft', options: this.draftOptions(rng, rules.element), picks: Math.min(mode.teamSize, rules.maxTeam) };
    }
    if (modeId === 'infinite') {
      run.startFloor = this.ms.infinite.checkpoint;
      run.refLevel = Math.max(1, run.refLevel);
    }
    this.ms.activeRun = run;
    g.stats.add('runsStarted', 1);
    this.log(run, `${mode.icon} ${mode.name} : la partie commence !`);
    g.bus.emit('runChanged');
    g.requestSave(true);
    return { ok: true, run };
  }

  /** Monstre « de location » (équipe aléatoire / draft / recrue) : n'appartient pas à la collection. */
  rental(rng, run, level, element = null, rarityBoost = 0) {
    let pool = MONSTERS.filter((s) => !s.guardian && s.rarity !== 'ancient' && (s.stage || 1) <= 2);
    if (element) pool = pool.filter((s) => s.element === element);
    const weighted = pool.map((s) => [s.id, (RARITY_WEIGHTS[s.rarity] || 1) * (s.rarity === 'common' ? 1 / (1 + rarityBoost) : 1 + rarityBoost)]);
    const speciesId = rng.weighted(weighted);
    const key = `r${run.team.length + 1}_${rng.int(1000, 9999)}`;
    return { key, uid: null, speciesId, level: Math.max(1, Math.round(level)), traits: rollTraits(rng), hpFrac: 1, dead: false, extra: null };
  }

  draftOptions(rng, element = null) {
    const boost = this.ms.roguelite.meta.rm_draft || 0;
    const out = [];
    const tmp = { team: [] };
    while (out.length < 3) {
      const r = this.rental(rng, tmp, 1, element, boost);
      if (!out.includes(r.speciesId)) out.push(r.speciesId);
      if (out.length >= 3 || out.length >= MONSTERS.length) break;
    }
    return out;
  }

  // ------------------------------------------------------------------ unités
  memberMonster(member) {
    if (member.uid) return this.game.monsters.get(member.uid);
    return { uid: member.key, speciesId: member.speciesId, level: member.level, xp: 0, equipment: {}, traits: member.traits || [], mutations: [], skin: 'classic' };
  }

  allyUnits(run, rules) {
    const out = [];
    for (const mem of run.team) {
      if (mem.dead) continue;
      const m = this.memberMonster(mem);
      if (!m) {
        mem.dead = true;
        continue;
      }
      const u = this.game.monsters.toUnit(m, null, 'run_');
      const extra = mem.extra || {};
      const hpM = Math.max(0.1, 1 + run.buffs.hp + rules.ally.hp + (extra.hp || 0));
      const atkM = Math.max(0.1, 1 + run.buffs.atk + rules.ally.atk + (extra.atk || 0));
      const defM = Math.max(0.1, 1 + run.buffs.def);
      const spdM = Math.max(0.2, 1 + run.buffs.spd + rules.ally.spd);
      u.hp = Math.round(u.hp * hpM);
      u.atk = Math.round(u.atk * atkM);
      u.def = Math.round(u.def * defM);
      u.spd = +(u.spd * spdM).toFixed(1);
      u.mods = mergeMods(u.mods, run.mods);
      u.hpCurrent = Math.max(1, Math.round(u.hp * Math.min(1, mem.hpFrac)));
      u.runKey = mem.key;
      out.push(makeUnit(u));
    }
    return out;
  }

  /** Paramètres de l'étape `idx` (0 = première étape). Déterministe pour une run donnée. */
  stageFor(run, idx, rules = this.buildRules(run)) {
    const mode = run.mode;
    const n = idx + 1;
    const isBoss = mode === 'bossRush' || (!!rules.bossEvery && n % rules.bossEvery === 0);
    let level;
    let power;
    switch (mode) {
      case 'survival':
        level = run.refLevel - 3 + idx * 0.7;
        power = Math.pow(1.04, idx);
        break;
      case 'roguelite':
        level = 4 + idx * 1.3;
        power = Math.pow(1.03, idx);
        break;
      case 'random':
        level = run.refLevel - 3 + idx * 0.6;
        power = 0.85 + idx * 0.035;
        break;
      case 'bossRush':
        level = run.refLevel + idx * 2;
        power = Math.pow(1.06, idx);
        break;
      case 'infinite': {
        const floor = run.startFloor + n;
        // Croissance rapide jusqu'à 100, puis plus douce : l'étage 1000 reste un objectif endgame atteignable
        level = 2 + 0.75 * Math.min(floor, 100) + 0.15 * Math.max(0, floor - 100);
        power = Math.pow(1.006, floor);
        break;
      }
      default:
        level = run.refLevel - 2 + idx * 0.6;
        power = 1 + idx * 0.04;
    }
    power *= 1 + rules.enemy.power + (idx === run.stage ? run.nextEnemy : 0);
    return { idx, n, isBoss, level: Math.max(1, Math.round(level)), power: Math.max(0.2, power), floor: mode === 'infinite' ? run.startFloor + n : null };
  }

  enemyUnits(run, stage, rules) {
    const g = this.game;
    const rng = new RNG(hashString(`${run.seed}:stage:${stage.idx}`));
    if (stage.isBoss) {
      let boss;
      if (run.mode === 'bossRush') {
        const all = [...BOSS_LIST, ...Object.values(BOSSES).filter((b) => b.event)];
        boss = all[stage.idx % all.length];
      } else boss = rng.pick(BOSS_LIST);
      const tier = run.mode === 'bossRush' ? Math.floor(stage.idx / (BOSS_LIST.length + 3)) : 0;
      // Boss calibré pour une équipe complète : 1 boss ≈ un groupe de 5 aventuriers
      const unit = g.bosses.bossUnit(boss, stage.level + 2, tier, 1);
      const rental = MODES[run.mode].team !== 'roster' ? 0.8 : 1;
      this.scaleUnit(unit, stage.power * BOSS_RUN_SCALE * rental, rules);
      g.codex.discover('bosses', boss.id);
      return { units: [unit], name: unit.name, boss };
    }
    let size = Math.min(6, 3 + (stage.idx >= 2 ? 1 : 0) + (stage.idx >= 5 ? 1 : 0) + (rules.enemy.size || 0));
    size = Math.max(1, size);
    const template = PARTY_TEMPLATES[Math.min(5, size)] ? rng.pick(PARTY_TEMPLATES[Math.min(5, size)]) : ['tank', 'dps', 'dps'];
    const roles = template.slice();
    while (roles.length < size) roles.push(rng.pick(['dps', 'tank', 'support']));
    const classes = ADVENTURER_LIST.filter((a) => a.minFloor <= Math.max(1, stage.level));
    const units = roles.map((role, i) => {
      const pool = classes.filter((c) => c.role === role);
      const cls = rng.pick(pool.length ? pool : classes);
      const elite = rules.enemy.elite || rng.chance(0.08 + stage.idx * 0.01);
      const def = g.adventurers.makeHero(cls.id, Math.max(1, stage.level + rng.int(-1, 1)), elite, `e${i}`, rng, 1);
      if (rules.enemy.element) def.element = rules.enemy.element;
      g.codex.discover('adventurers', cls.id);
      const u = makeUnit(def);
      this.scaleUnit(u, stage.power, rules);
      return u;
    });
    return { units, name: rng.pick(GROUP_NAMES), boss: null };
  }

  scaleUnit(u, power, rules) {
    u.maxHp = u.hp = Math.max(1, Math.round(u.maxHp * power));
    u.atk = u.baseAtk = Math.round(u.baseAtk * power);
    u.def = u.baseDef = Math.round(u.baseDef * Math.sqrt(power));
    if (rules.enemy.spd) u.spd = u.baseSpd = +(u.baseSpd * (1 + rules.enemy.spd)).toFixed(1);
  }

  /** Aperçu de la prochaine étape (pour l'écran de run). */
  preview(run = this.run) {
    if (!run) return null;
    const rules = this.buildRules(run);
    const stage = this.stageFor(run, run.stage, rules);
    return { ...stage, total: rules.stages, rules };
  }

  // ------------------------------------------------------------------ combat
  /** Joue l'étape courante. Le résultat contient la chronologie pour BattleScene. */
  fight({ record = true } = {}) {
    const g = this.game;
    const run = this.run;
    if (!run) return { ok: false, reason: 'Aucune partie en cours.' };
    if (run.pending) return { ok: false, reason: 'Un choix est en attente.' };
    const rules = this.buildRules(run);
    const stage = this.stageFor(run, run.stage, rules);
    const allies = this.allyUnits(run, rules);
    if (!allies.length) return this.end('wipe');
    const enemies = this.enemyUnits(run, stage, rules);
    const result = simulateBattle({
      rng: new RNG(hashString(`${run.seed}:fight:${run.stage}:${run.retries || 0}`)),
      sideA: allies, sideB: enemies.units, record, maxTime: stage.isBoss ? 120 : 75,
      sideMods: { A: { ...rules.sideMods.A, elementPower: g.mods.get().elementPower, skillCooldown: g.mods.get().skillCooldown, bossDamage: g.mods.get().bossDamage }, B: rules.sideMods.B },
    });
    const win = result.winner === 'A';
    run.nextEnemy = 0;

    // PV conservés pour la suite
    const byKey = new Map(result.units.filter((u) => u.side === 'A' && u.runKey).map((u) => [u.runKey, u]));
    for (const mem of run.team) {
      if (mem.dead) continue;
      const u = byKey.get(mem.key);
      if (!u) continue;
      mem.hpFrac = u.alive ? u.hp / u.maxHp : 0;
      if (!u.alive && (rules.permadeath || !win)) mem.dead = true;
    }
    const kills = result.units.filter((u) => u.side === 'B' && !u.alive && !u.summoned).length;
    run.kills += kills;
    const report = { ok: true, win, stage, enemies: { name: enemies.name, boss: enemies.boss }, result, kills, ended: false, title: this.stageTitle(run, stage, enemies) };

    if (!win) {
      report.endReport = this.end(run.mode === 'survival' || run.mode === 'infinite' || run.mode === 'bossRush' ? 'score' : 'defeat');
      report.ended = true;
      return report;
    }

    // Victoire : butin d'étape, progression
    if (stage.isBoss) run.bosses++;
    this.addStageRewards(run, stage, rules);
    run.stage++;
    g.stats.add('runStages', 1);
    // Roguelite : l'équipe (de location) progresse à chaque victoire
    if (run.mode === 'roguelite') for (const mem of run.team) if (!mem.uid) mem.level++;
    if (run.mode === 'infinite') this.onInfiniteFloor(run, stage.floor);
    if (rules.stages && run.stage >= rules.stages) {
      report.endReport = this.end('complete');
      report.ended = true;
      return report;
    }
    // Entre deux étapes : soins, morts relevés (sauf permadeath)
    for (const mem of run.team) {
      if (mem.dead && !rules.permadeath) {
        mem.dead = false;
        mem.hpFrac = 0;
      }
      if (!mem.dead) mem.hpFrac = Math.min(1, mem.hpFrac + rules.betweenHeal);
      if (!mem.dead && mem.hpFrac <= 0) mem.hpFrac = Math.max(0.15, rules.betweenHeal);
    }
    if (!run.team.some((m) => !m.dead)) {
      report.endReport = this.end('wipe');
      report.ended = true;
      return report;
    }
    this.queueBetweenStages(run);
    g.bus.emit('runChanged');
    g.requestSave(true);
    return report;
  }

  stageTitle(run, stage, enemies) {
    const mode = MODES[run.mode];
    const label = run.mode === 'infinite' ? `Étage ${stage.floor}` : run.mode === 'survival' ? `Vague ${stage.n}` : `Étape ${stage.n}`;
    return `${mode.icon} ${label} — ${enemies.boss ? `${enemies.boss.icon} ${enemies.name}` : enemies.name}`;
  }

  queueBetweenStages(run) {
    const mode = MODES[run.mode];
    const rng = new RNG(hashString(`${run.seed}:between:${run.stage}`));
    if (run.mode === 'roguelite') {
      run.pending = { type: 'boon', options: this.boonOptions(rng, run) };
      if (rng.chance(mode.events)) run.queuedEvent = rng.pick(Object.keys(RUN_EVENTS));
    } else if (mode.events && rng.chance(mode.events)) {
      run.pending = { type: 'event', id: rng.pick(Object.keys(RUN_EVENTS)) };
    }
  }

  boonOptions(rng, run) {
    const extra = this.ms.roguelite.meta.rm_choice || 0;
    const mode = MODES[run.mode];
    const pool = Object.entries(RUN_BOONS).filter(([id]) => id !== 'recruit' || run.team.length < (mode.maxTeam || 6)).map(([id, b]) => [id, b.weight]);
    const out = [];
    while (out.length < 3 + extra && pool.length) {
      const id = rng.weighted(pool);
      out.push(id);
      pool.splice(pool.findIndex((p) => p[0] === id), 1);
    }
    return out;
  }

  // ------------------------------------------------------------------ choix
  /** Résout le choix en attente (draft, bonus, événement). `index` = option choisie. */
  choose(index) {
    const run = this.run;
    if (!run?.pending) return { ok: false, reason: 'Aucun choix en attente.' };
    const p = run.pending;
    const rng = new RNG(hashString(`${run.seed}:choice:${run.stage}:${run.team.length}:${index}`));
    let msg = '';
    if (p.type === 'draft') {
      const sid = p.options[index];
      if (!sid) return { ok: false, reason: 'Choix invalide' };
      const mem = this.rental(rng, run, run.refLevel, null);
      mem.speciesId = sid;
      run.team.push(mem);
      this.game.codex.discover('monsters', sid);
      p.picks--;
      msg = `${MONSTER_MAP[sid].name} rejoint l’équipe.`;
      run.pending = p.picks > 0 ? { type: 'draft', options: this.draftOptions(rng, this.buildRules(run).element), picks: p.picks } : null;
    } else if (p.type === 'boon') {
      const id = p.options[index];
      if (!id) return { ok: false, reason: 'Choix invalide' };
      msg = this.applyBoon(run, RUN_BOONS[id], rng);
      run.pending = run.queuedEvent ? { type: 'event', id: run.queuedEvent } : null;
      run.queuedEvent = null;
    } else if (p.type === 'event') {
      const ev = RUN_EVENTS[p.id];
      const opt = ev.options[index];
      if (!opt) return { ok: false, reason: 'Choix invalide' };
      run.pending = null;
      msg = this.applyEventEffect(run, opt.effect, rng) || 'Vous poursuivez votre route.';
    }
    this.log(run, msg);
    this.game.bus.emit('runChanged');
    this.game.requestSave(true);
    return { ok: true, msg };
  }

  applyBoon(run, b, rng) {
    if (b.team) for (const [k, v] of Object.entries(b.team)) run.buffs[k] += v;
    if (b.mods) run.mods = mergeMods(run.mods, b.mods);
    if (b.heal) for (const m of run.team) {
      if (m.dead && b.revive) m.dead = false;
      if (!m.dead) m.hpFrac = Math.min(1, m.hpFrac + b.heal);
    }
    if (b.recruit) {
      const mode = MODES[run.mode];
      if (run.team.length < (mode.maxTeam || 6)) {
        const mem = this.rental(rng, run, this.avgTeamLevel(run), this.buildRules(run).element, this.ms.roguelite.meta.rm_draft || 0);
        run.team.push(mem);
        this.game.codex.discover('monsters', mem.speciesId);
        return `${b.icon} ${MONSTER_MAP[mem.speciesId].name} rejoint l’équipe !`;
      }
    }
    if (b.mutate) {
      const alive = run.team.filter((m) => !m.dead);
      const target = rng.pick(alive.length ? alive : run.team);
      target.extra = { ...(target.extra || {}) };
      for (const [k, v] of Object.entries(b.mutate)) target.extra[k] = (target.extra[k] || 0) + v;
      return `${b.icon} ${MONSTER_MAP[target.speciesId].name} mute !`;
    }
    if (b.levels) for (const m of run.team) if (!m.uid) m.level += b.levels;
    if (b.reward) run.rewardBonus += b.reward;
    return `${b.icon} ${b.name} : ${b.desc}`;
  }

  applyEventEffect(run, e, rng) {
    if (!e) return '';
    if (e.gamble) {
      const won = rng.chance(e.gamble.chance);
      this.applyEventEffect(run, won ? e.gamble.win : e.gamble.lose, rng);
      return won ? '🎉 La chance vous sourit !' : '😱 C’était un piège !';
    }
    const parts = [];
    if (e.heal) for (const m of run.team) if (!m.dead) m.hpFrac = Math.min(1, m.hpFrac + e.heal);
    if (e.damage) for (const m of run.team) if (!m.dead) m.hpFrac = Math.max(0.05, m.hpFrac - e.damage);
    if (e.team) for (const [k, v] of Object.entries(e.team)) run.buffs[k] += v;
    if (e.reward) run.rewardBonus += e.reward;
    if (e.rewardPenalty) run.rewardPenalty += e.rewardPenalty;
    if (e.nextEnemy) run.nextEnemy += e.nextEnemy;
    if (e.fragments) run.fragments += e.fragments;
    if (e.recruit) {
      const max = MODES[run.mode].maxTeam || MODES[run.mode].teamSize;
      if (run.team.length < max) {
        const mem = this.rental(rng, run, this.avgTeamLevel(run), this.buildRules(run).element);
        run.team.push(mem);
        parts.push(`${MONSTER_MAP[mem.speciesId].name} rejoint l’équipe !`);
      } else parts.push('Équipe complète : le monstre repart.');
    }
    if (e.boon) {
      run.pending = { type: 'boon', options: this.boonOptions(rng, run) };
      parts.push('Le marchand déballe ses trésors…');
    }
    return parts.join(' ');
  }

  avgTeamLevel(run) {
    return Math.round(run.team.reduce((a, m) => a + m.level, 0) / Math.max(1, run.team.length));
  }

  // ------------------------------------------------------------------ récompenses
  addStageRewards(run, stage, rules) {
    // L'or suit l'économie de l'étage atteint dans le donjon classique
    const scale = floorEconomyScale(Math.max(1, this.game.state.floors.length));
    const n = stage.n;
    const bag = run.rewards;
    const add = (k, v) => (bag[k] = (bag[k] || 0) + v);
    let mult = 1;
    if (run.mode === 'infinite') {
      // Seuls les nouveaux étages rapportent pleinement (pas de farm des premiers étages)
      mult = stage.floor > this.ms.infinite.best ? 1 : 0.2;
    }
    const depth = run.mode === 'infinite' ? stage.floor : n;
    add('gold', 300 * scale * (1 + Math.min(n, 100) * 0.1) * mult);
    add('essence', 3 * Math.sqrt(scale) * (1 + Math.min(n, 100) * 0.05) * mult);
    add('crystals', (0.5 + Math.min(depth, 300) * 0.04) * mult);
    if (stage.isBoss) {
      add('crystals', 5 * mult);
      add('legendaryEssence', mult >= 1 ? 1 : 0);
      if (mult >= 1) {
        const chest = run.mode === 'bossRush' ? (stage.n >= 9 ? 'legendary' : 'epic') : stage.n >= 20 ? 'epic' : 'rare';
        run.chests = run.chests || {};
        run.chests[chest] = (run.chests[chest] || 0) + 1;
      }
    }
    if (run.mode === 'infinite' && stage.floor % 50 === 0 && stage.floor > this.ms.infinite.best) {
      run.chests = run.chests || {};
      run.chests.legendary = (run.chests.legendary || 0) + 1;
    }
    if (run.mode === 'infinite' && stage.floor % 10 === 0 && stage.floor > this.ms.infinite.best) add('dimensionalFragments', 1 + Math.floor(stage.floor / 100));
    if (run.mode === 'bossRush' && stage.n % 3 === 0) add('dimensionalFragments', 1);
    run.souls += 1 + (stage.isBoss ? 3 : 0);
  }

  onInfiniteFloor(run, floor) {
    const inf = this.ms.infinite;
    if (floor % 10 === 0 && floor > inf.checkpoint) inf.checkpoint = floor;
  }

  score(run) {
    switch (run.mode) {
      case 'infinite':
        return run.startFloor + run.stage;
      case 'bossRush':
        return run.bosses;
      case 'cursed':
        return run.stage * (run.curse || 1);
      default:
        return run.stage;
    }
  }

  dailyFactor(modeId) {
    const d = this.ms.daily;
    const key = dayKey();
    if (d.key !== key) {
      d.key = key;
      d.runs = {};
    }
    const n = d.runs[modeId] || 0;
    d.runs[modeId] = n + 1;
    return n < DAILY_FULL_RUNS ? 1 : DAILY_REDUCED_FACTOR;
  }

  /** Termine la run et verse les récompenses. reason : complete | defeat | wipe | score | abandon */
  end(reason = 'abandon') {
    const g = this.game;
    const run = this.run;
    if (!run) return null;
    const rules = this.buildRules(run);
    const mode = MODES[run.mode];
    const success = reason === 'complete';
    const score = this.score(run);
    // Butin : défaite = 50% du butin accumulé (sauf modes « score » où l'on garde tout), abandon = 75%
    let keep = success || reason === 'score' ? 1 : reason === 'abandon' ? 0.75 : 0.5;
    if (run.stage === 0) keep = 0;
    const factor = run.daily ? 1 : this.dailyFactor(run.mode);
    const mult = keep * factor * rules.rewardMult * Math.max(0.1, 1 + rules.reward + run.rewardBonus - run.rewardPenalty);
    const rewards = {};
    for (const [k, v] of Object.entries(run.rewards)) {
      if (!RESOURCE_KEYS.includes(k)) continue;
      const rare = k === 'legendaryEssence' || k === 'dimensionalFragments';
      const rm = rare ? 1 + rules.rareReward : Math.max(0.3, 1 - rules.rareReward * 0.3);
      rewards[k] = Math.floor(v * mult * rm);
    }
    if (run.fragments) rewards.dimensionalFragments = (rewards.dimensionalFragments || 0) + Math.floor(run.fragments * keep);
    // Premières réussites
    let firstClear = false;
    if (success && run.challenge && !run.daily) {
      const c = CHALLENGES[run.challenge];
      firstClear = !this.ms.challenges[run.challenge];
      this.ms.challenges[run.challenge] = (this.ms.challenges[run.challenge] || 0) + 1;
      for (const [k, v] of Object.entries(firstClear ? c.first : c.repeat)) rewards[k] = (rewards[k] || 0) + Math.floor(v * (firstClear ? 1 : factor));
    }
    if (success && run.daily) {
      const dc = this.ms.dailyChallenge;
      if (dc.key !== run.daily.key || !dc.done) {
        firstClear = true;
        for (const [k, v] of Object.entries(run.daily.reward)) rewards[k] = (rewards[k] || 0) + v;
      }
      this.ms.dailyChallenge = { key: run.daily.key, done: true, best: Math.max(dc.key === run.daily.key ? dc.best : 0, score) };
    }
    if (run.mode === 'cursed' && success) this.ms.cursed.bestLevel = Math.max(this.ms.cursed.bestLevel, run.curse);
    if (run.mode === 'infinite') this.ms.infinite.best = Math.max(this.ms.infinite.best, score);
    let souls = 0;
    if (run.mode === 'roguelite') {
      souls = Math.floor(run.souls * (1 + 0.2 * (this.ms.roguelite.meta.rm_souls || 0)) * (success ? 1.5 : 1));
      this.ms.roguelite.souls += souls;
      this.ms.roguelite.totalSouls += souls;
    }
    for (const k of Object.keys(rewards)) if (!rewards[k]) delete rewards[k];
    g.economy.add(rewards);
    // Coffres gagnés (perdus seulement en cas de défaite/abandon sans score)
    const chests = {};
    if (keep >= 1 || reason === 'abandon') for (const [r, n] of Object.entries(run.chests || {})) if (n > 0) chests[r] = n;
    if (success && run.daily && firstClear) chests.epic = (chests.epic || 0) + 1;
    for (const [r, n] of Object.entries(chests)) g.collection.addChest(r, n);

    // XP : maître + monstres de la collection engagés
    g.master.addXp(10 * run.stage + 25 * run.bosses);
    const xp = Math.round(12 * run.stage * Math.pow(1.05, Math.min(run.stage, 40)));
    let levelUps = 0;
    for (const mem of run.team) {
      const m = mem.uid ? g.monsters.get(mem.uid) : null;
      if (m && xp > 0) levelUps += g.monsters.addXp(m, xp);
    }
    if (levelUps) g.bus.emit('monstersChanged');

    // Records et classement local
    const rec = this.ms.records[run.mode] || { best: 0, runs: 0, wins: 0, last: 0 };
    rec.runs++;
    if (success) rec.wins++;
    rec.last = score;
    const newBest = score > rec.best;
    rec.best = Math.max(rec.best, score);
    this.ms.records[run.mode] = rec;
    let rank = null;
    if (mode.leaderboard && score > 0) rank = this.addToLeaderboard(run, score);

    g.stats.add('runsPlayed', 1);
    if (success) g.stats.add('runsWon', 1);
    const report = { mode: run.mode, reason, success, score, rewards, chests, souls, firstClear, newBest, rank, stages: run.stage, kills: run.kills, bosses: run.bosses, xp, levelUps, reduced: factor < 1 };
    this.ms.activeRun = null;
    this.lastReport = report;
    g.bus.emit('runEnded', report);
    g.bus.emit('runChanged');
    g.bus.emit('resources');
    g.requestSave(true);
    return report;
  }

  abandon() {
    return this.end('abandon');
  }

  addToLeaderboard(run, score) {
    const lb = (this.ms.leaderboards[run.mode] = this.ms.leaderboards[run.mode] || []);
    const entry = {
      score, at: Date.now(), modifiers: run.modifiers.slice(), curse: run.curse || null,
      team: run.team.map((m) => m.speciesId).slice(0, 6), master: this.game.state.player.level,
    };
    lb.push(entry);
    lb.sort((a, b) => b.score - a.score || a.at - b.at);
    lb.length = Math.min(lb.length, LEADERBOARD_SIZE);
    const i = lb.indexOf(entry);
    return i >= 0 ? i + 1 : null;
  }

  // ------------------------------------------------------------------ Roguelite : méta-progression
  metaCost(id) {
    const u = ROGUELITE_META.find((x) => x.id === id);
    return u ? u.cost(this.ms.roguelite.meta[id] || 0) : Infinity;
  }

  buyMeta(id) {
    const u = ROGUELITE_META.find((x) => x.id === id);
    if (!u) return { ok: false, reason: 'Amélioration inconnue' };
    const rl = this.ms.roguelite;
    const lvl = rl.meta[id] || 0;
    if (lvl >= u.max) return { ok: false, reason: 'Niveau maximum' };
    const cost = u.cost(lvl);
    if (rl.souls < cost) return { ok: false, reason: 'Âmes insuffisantes' };
    rl.souls -= cost;
    rl.meta[id] = lvl + 1;
    this.game.bus.emit('runChanged');
    this.game.requestSave(true);
    return { ok: true };
  }

  log(run, msg) {
    if (!msg) return;
    run.log.push(msg);
    if (run.log.length > 30) run.log.shift();
  }
}

/** Un boss de run affronte une équipe entière : ses stats sont modérées par rapport aux boss de gardien. */
export const BOSS_RUN_SCALE = 0.55;
