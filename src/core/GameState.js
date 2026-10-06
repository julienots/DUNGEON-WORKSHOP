import { ECONOMY } from '../config/economy.js';
import { SAVE_VERSION, RESOURCE_KEYS } from '../utils/constants.js';
import { cellKey } from '../utils/helpers.js';
import { floorDef } from '../data/floors.js';
import { defaultBiomeForFloor } from '../data/biomes.js';
import { createModesState } from '../systems/RunSystem.js';
import { createCollectionState } from '../systems/CollectionSystem.js';
import { createTiersState } from '../systems/PrestigeTierSystem.js';

/** Crée un étage vierge (numéro à partir de 1). */
export function createFloorState(number, extraSize = 0) {
  const def = floorDef(number);
  const cols = Math.min(def.maxCols, def.startCols + extraSize);
  const rows = Math.min(def.maxRows, def.startRows + extraSize);
  const ex = Math.floor((cols - 1) / 2);
  const cells = {};
  cells[cellKey(ex, 0)] = { room: 'entrance', level: 1, trap: null };
  if (number === 1) {
    cells[cellKey(ex, 1)] = { room: 'basic', level: 1, trap: null };
    cells[cellKey(ex, 2)] = { room: 'core', level: 1, trap: null };
  } else {
    cells[cellKey(ex, 1)] = { room: 'core', level: 1, trap: null };
  }
  return {
    number,
    cols,
    rows,
    cells,
    threat: 0,
    raidsDefended: 0,
    raidsLost: 0,
    lastRaidAt: 0,
    biome: defaultBiomeForFloor(number),
    decor: {},
  };
}

export function createStats() {
  return {
    adventurersKilled: 0, raidsDefended: 0, raidsLost: 0, raidsTotal: 0,
    goldEarned: 0, stoneEarned: 0, metalEarned: 0, essenceEarned: 0, crystalsEarned: 0, darkEssenceEarned: 0,
    legendaryEssenceEarned: 0, dimensionalFragmentsEarned: 0, mutationsGained: 0,
    roomsBuilt: 0, upgrades: 0, roomUpgrades: 0, trapUpgrades: 0, trapsPlaced: 0, trapTriggers: 0, synergyTriggers: 0,
    monstersSummoned: 0, monsterLevelUps: 0, evolutions: 0, bossesDefeated: 0, eventBossKills: 0,
    itemsFound: 0, itemsUpgraded: 0, itemsFused: 0, itemsRecycled: 0, legendaryItems: 0,
    researchCompleted: 0, treasuryCollects: 0, treasuryUpgrades: 0, floorsUnlocked: 0,
    eliteKilled: 0, critHits: 0, offlineReturns: 0, chestsOpened: 0, ascensions: 0, battlesWatched: 0,
    maxFloor: 1, monstersOwnedTotal: 0,
    runsStarted: 0, runsPlayed: 0, runsWon: 0, runStages: 0, rebirthCount: 0, transcendenceCount: 0, dimensionalCount: 0,
    kill_warrior: 0, kill_archer: 0, kill_mage: 0, kill_paladin: 0, kill_healer: 0, kill_assassin: 0, kill_hunter: 0,
  };
}

/** Nouvelle partie. `startMult` multiplie les ressources de départ (prestige Héritage). */
export function createNewState(now = Date.now(), startMult = 1) {
  const resources = {};
  for (const k of RESOURCE_KEYS) resources[k] = Math.round(ECONOMY.resources[k].startingAmount * startMult);
  const floor1 = createFloorState(1);
  const ex = Math.floor((floor1.cols - 1) / 2);
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSaveTimestamp: now,
    player: { name: 'Maître', level: 1, xp: 0, uidCounter: 1, tutorialStep: 0, tutorialDone: false, playTime: 0, mastery: {}, rewardedLevel: 1 },
    resources,
    floors: [floor1],
    currentFloor: 0,
    monsters: [
      {
        uid: 'm1', speciesId: 'goblin', level: 1, xp: 0, equipment: {}, location: { floor: 0, x: ex, y: 1 }, favorite: false, obtainedAt: now,
        traits: ['sturdy', 'berserker'], mutations: [], skin: 'classic',
      },
    ],
    equipment: [],
    research: { levels: {}, active: [] },
    treasury: { level: 1, vault: 0 },
    missions: { dailyKey: '', daily: [], weeklyKey: '', weekly: [], chains: {}, eventKey: '', event: [] },
    achievements: { claimed: {} },
    prestige: { count: 0, masterEssence: 0, totalMasterEssence: 0, upgrades: {}, runGold: 0, bestFloor: 1, tiers: createTiersState() },
    codex: {
      monsters: { goblin: true }, bosses: {}, rooms: { entrance: true, core: true, basic: true }, traps: {}, equipment: {}, adventurers: {},
      mutations: {}, biomes: {}, lore: {}, traits: {},
    },
    stats: createStats(),
    lifetime: { goldEarned: 0, adventurersKilled: 0 },
    bosses: { defeated: {}, lastRepeat: {}, eventLast: {}, arenaLast: {} },
    shop: { lastFreeChest: 0, basicSummons: 0, equipChests: 0 },
    settings: { music: true, sfx: true, musicVolume: 0.5, sfxVolume: 0.8, quality: 'high', vibration: true, speed: 1, notifications: true, performanceMode: false },
    meta: {},
    modes: createModesState(),
    collection: createCollectionState(),
    log: [],
    uidSeq: 2,
  };
}
