import { ECONOMY } from '../config/economy.js';
import { floorDef } from '../data/floors.js';
import { RNG } from '../utils/rng.js';
import { xpLevelFactor } from './RaidSystem.js';

const O = ECONOMY.offline;

/**
 * Progression hors ligne : le donjon continue de fonctionner quand le jeu est fermé.
 * Les raids sont estimés à partir d'un échantillon de raids réellement simulés (même moteur de combat),
 * puis extrapolés. Le temps est plafonné (8h de base, améliorable) pour éviter les abus.
 */
export class OfflineSystem {
  constructor(game) {
    this.game = game;
  }

  capHours() {
    const m = this.game.mods.get();
    return Math.min(O.maxCapHours, O.baseCapHours + (m.offlineHours || 0));
  }

  /**
   * Calcule et applique la progression hors ligne entre `since` et `now`.
   * Retourne un rapport (ou null si l'absence est trop courte).
   */
  run(since, now = Date.now()) {
    const g = this.game;
    let elapsed = (now - since) / 1000;
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      // Horloge modifiée vers le passé : aucun gain.
      return { suspicious: true, seconds: 0 };
    }
    const capSec = this.capHours() * 3600;
    const seconds = Math.min(elapsed, capSec);
    // Les recherches finissent selon leur date de fin réelle
    const researchDone = g.research.update(now, true);
    const treasury = g.treasury.simulateOffline(seconds);
    if (Object.keys(treasury.production).length) g.economy.add(treasury.production);
    if (seconds < O.minSecondsForReport) return null;

    const report = {
      seconds, elapsed, capped: elapsed > capSec, capHours: this.capHours(),
      raids: 0, defeated: 0, succeeded: 0, kills: 0,
      rewards: { gold: 0, stone: 0, metal: 0, essence: 0, crystals: 0, darkEssence: 0 },
      items: [], monstersXp: 0, levelUps: 0, researchDone, vault: treasury.vault, production: treasury.production, stolen: 0,
    };
    const xpByMonster = {};
    let losses = 0;

    for (let fi = 0; fi < g.state.floors.length; fi++) {
      if (!g.raids.canRaid(fi)) continue;
      const n = Math.floor(seconds / g.raids.interval(fi));
      if (n <= 0) continue;
      // Beaucoup d'étages : moins d'échantillons par étage (temps de calcul borné)
      const samples = Math.min(n, g.state.floors.length > 30 ? Math.max(2, Math.floor(O.sampleRaids / 2)) : O.sampleRaids);
      const scale = (n / samples) * O.efficiency;
      const floor = g.dungeon.floor(fi);
      let wins = 0;
      const killsByClass = {};
      const agg = { kills: 0, elite: 0, traps: 0, syn: 0, crits: 0, masterXp: 0, itemSeeds: [] };
      for (let i = 0; i < samples; i++) {
        const res = g.raids.simulate(fi, { record: false, seed: (now + fi * 7919 + i * 104729) >>> 0 });
        if (res.outcome !== 'looted') wins++;
        for (const [k, v] of Object.entries(res.rewards)) report.rewards[k] += v * scale;
        agg.kills += res.kills;
        agg.elite += res.eliteKills;
        agg.traps += res.battleStats.trapTriggers;
        agg.syn += res.battleStats.synergyTriggers;
        agg.crits += res.battleStats.crits;
        agg.masterXp += res.masterXp;
        agg.itemSeeds.push(...res.itemSeeds);
        for (const [c, k] of Object.entries(res.killsByClass)) killsByClass[c] = (killsByClass[c] || 0) + k;
        for (const uid of res.participants) {
          const m = g.monsters.get(uid);
          xpByMonster[uid] = (xpByMonster[uid] || 0) + res.xpEach * (res.xpBonus?.[uid] || 1) * scale * (m ? xpLevelFactor(m.level, res.party.level) : 1);
        }
      }
      const raidsWon = Math.round(wins * (n / samples));
      const raidsLost = n - raidsWon;
      losses += raidsLost;
      report.raids += n;
      report.defeated += raidsWon;
      report.succeeded += raidsLost;
      const kills = Math.round(agg.kills * scale);
      report.kills += kills;
      // Statistiques
      g.stats.add('raidsTotal', n);
      g.stats.add('raidsDefended', raidsWon);
      const br = (g.state.stats.biomeRaids = g.state.stats.biomeRaids || {});
      br[g.biomes.id(fi)] = (br[g.biomes.id(fi)] || 0) + raidsWon;
      g.stats.add('raidsLost', raidsLost);
      g.stats.add('adventurersKilled', kills);
      g.state.lifetime.adventurersKilled += kills;
      g.stats.add('eliteKilled', Math.round(agg.elite * scale));
      g.stats.add('trapTriggers', Math.round(agg.traps * scale));
      g.stats.add('synergyTriggers', Math.round(agg.syn * scale));
      g.stats.add('critHits', Math.round(agg.crits * scale));
      for (const [c, k] of Object.entries(killsByClass)) g.stats.add(`kill_${c}`, Math.round(k * scale));
      g.master.addXp(agg.masterXp * scale);
      floor.raidsDefended += raidsWon;
      floor.raidsLost += raidsLost;
      const def = floorDef(fi + 1);
      floor.threat = Math.max(0, Math.min(def.maxThreat, floor.threat + raidsWon * ECONOMY.raid.threatPerWin + raidsLost * ECONOMY.raid.threatPerLoss));
      // Objets trouvés : on rejoue les graines échantillonnées
      const expectedItems = Math.round(agg.itemSeeds.length * scale);
      const rng = new RNG((now ^ (fi * 31337)) >>> 0);
      for (let i = 0; i < expectedItems && report.items.length < O.maxItemsFound; i++) {
        const seed = agg.itemSeeds.length ? agg.itemSeeds[i % agg.itemSeeds.length] ^ rng.int(1, 1e9) : rng.int(1, 1e9);
        const it = g.equipment.add(g.equipment.generate(new RNG(seed >>> 0), { ilvl: fi + 1 }), { silent: true });
        if (it) report.items.push(it);
      }
    }

    for (const k of Object.keys(report.rewards)) report.rewards[k] = Math.floor(report.rewards[k]);
    g.economy.add(report.rewards);

    for (const [uid, xp] of Object.entries(xpByMonster)) {
      const m = g.monsters.get(uid);
      if (!m) continue;
      report.monstersXp++;
      report.levelUps += g.monsters.addXp(m, Math.round(xp));
    }
    // Salles d'entraînement (V2)
    report.levelUps += g.dungeon.trainTick(seconds * O.efficiency);

    if (losses > 0) {
      const t = g.state.treasury;
      const theft = ECONOMY.raid.lootStealRatio * (1 - (g.mods.get().theftReduction || 0));
      const ratio = Math.min(0.5, 1 - Math.pow(1 - theft, losses));
      report.stolen = Math.floor(t.vault * ratio);
      t.vault -= report.stolen;
    }
    g.stats.add('offlineReturns', 1);
    g.bus.emit('equipmentChanged');
    g.bus.emit('monstersChanged');
    return report;
  }
}
