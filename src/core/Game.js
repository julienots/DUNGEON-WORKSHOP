import { EventBus } from './EventBus.js';
import { createNewState } from './GameState.js';
import { ECONOMY } from '../config/economy.js';
import { SAVE_KEY } from '../utils/constants.js';
import { ModifierSystem } from '../systems/ModifierSystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { StatsSystem } from '../systems/StatsSystem.js';
import { MasterSystem } from '../systems/MasterSystem.js';
import { CodexSystem } from '../systems/CodexSystem.js';
import { DungeonSystem } from '../systems/DungeonSystem.js';
import { MonsterSystem } from '../systems/MonsterSystem.js';
import { EquipmentSystem } from '../systems/EquipmentSystem.js';
import { TrapSystem } from '../systems/TrapSystem.js';
import { AdventurerSystem } from '../systems/AdventurerSystem.js';
import { RaidSystem } from '../systems/RaidSystem.js';
import { ResearchSystem } from '../systems/ResearchSystem.js';
import { TreasurySystem } from '../systems/TreasurySystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { AchievementSystem } from '../systems/AchievementSystem.js';
import { PrestigeSystem } from '../systems/PrestigeSystem.js';
import { EventSystem } from '../systems/EventSystem.js';
import { BossSystem } from '../systems/BossSystem.js';
import { OfflineSystem } from '../systems/OfflineSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { TutorialSystem } from '../systems/TutorialSystem.js';
import { RunSystem } from '../systems/RunSystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { BiomeSystem } from '../systems/BiomeSystem.js';

/**
 * GAME CORE
 * ---------
 * Point central : état + bus + tous les systèmes. Totalement indépendant de Phaser et du DOM,
 * ce qui permet de tester toute la logique sous Node.
 */
export class Game {
  constructor({ storage } = {}) {
    this.bus = new EventBus();
    this.state = null;
    this.mods = new ModifierSystem(this);
    this.economy = new EconomySystem(this);
    this.stats = new StatsSystem(this);
    this.master = new MasterSystem(this);
    this.codex = new CodexSystem(this);
    this.dungeon = new DungeonSystem(this);
    this.monsters = new MonsterSystem(this);
    this.equipment = new EquipmentSystem(this);
    this.traps = new TrapSystem(this);
    this.adventurers = new AdventurerSystem(this);
    this.raids = new RaidSystem(this);
    this.research = new ResearchSystem(this);
    this.treasury = new TreasurySystem(this);
    this.shop = new ShopSystem(this);
    this.missions = new MissionSystem(this);
    this.achievements = new AchievementSystem(this);
    this.prestige = new PrestigeSystem(this);
    this.events = new EventSystem(this);
    this.bosses = new BossSystem(this);
    this.offline = new OfflineSystem(this);
    this.saves = new SaveSystem(this, storage);
    this.tutorial = new TutorialSystem(this);
    this.runs = new RunSystem(this);
    this.biomes = new BiomeSystem(this);
    this.progression = new ProgressionSystem(this);

    this.viewFloor = 0;
    this.watching = true;
    this.saveDirty = false;
    this.lastSaveAt = 0;
    this.slowTimer = 0;
    this.started = false;

    this.bus.on('stat', () => {
      this.achievementDirty = true;
    });
    // Certaines salles donnent des bonus globaux (Salle du maître)
    this.bus.on('dungeonChanged', () => {
      this.mods.cache = null;
    });
  }

  newGame(now = Date.now()) {
    this.state = createNewState(now);
    this.afterLoad();
    this.saves.save(this.state, now);
    return this.state;
  }

  /** Charge la sauvegarde ou crée une partie. Retourne { isNew, report }. */
  loadOrCreate(now = Date.now()) {
    const loaded = this.saves.load();
    if (!loaded) {
      // Une sauvegarde illisible a déjà été copiée à part par SaveSystem.load() : on peut repartir.
      this.newGame(now);
      return { isNew: true, report: null, loadInfo: this.saves.loadInfo };
    }
    this.state = loaded;
    this.afterLoad();
    const report = this.offline.run(loaded.lastSaveTimestamp, now);
    this.mods.invalidate();
    this.saves.save(this.state, now);
    this.lastSaveAt = now;
    return { isNew: false, report, loadInfo: this.saves.loadInfo };
  }

  /** Dernier recours si le chargement plante : conserve la sauvegarde brute avant de repartir de zéro. */
  recoverFromLoadFailure(err, now = Date.now()) {
    const raw = this.saves.storage.getItem(SAVE_KEY);
    const preservedKey = raw ? this.saves.preserveCorrupt(raw, now) : null;
    this.newGame(now);
    return { isNew: true, report: null, loadInfo: { error: err?.message || String(err), preservedKey, fixes: [] } };
  }

  afterLoad() {
    this.codex.syncOwned();
    this.mods.invalidate();
    this.raids.reset();
    this.viewFloor = Math.min(this.state.currentFloor || 0, this.state.floors.length - 1);
    this.missions.refresh();
    this.achievements.notified.clear();
    this.achievements.primeNotified();
    this.started = true;
    this.bus.emit('stateLoaded');
  }

  /** Remplace l'état (import de sauvegarde). */
  replaceState(state) {
    this.state = state;
    this.afterLoad();
    this.saves.save(this.state);
    this.bus.emit('floorsChanged');
    this.bus.emit('resources');
  }

  resetAll() {
    this.saves.reset();
    this.newGame();
    this.bus.emit('floorsChanged');
    this.bus.emit('resources');
  }

  requestSave(immediate = false) {
    this.saveDirty = true;
    if (immediate) this.saveNow();
  }

  saveNow(now = Date.now()) {
    if (!this.state) return false;
    this.saveDirty = false;
    this.lastSaveAt = now;
    const ok = this.saves.save(this.state, now);
    this.bus.emit('saved', ok);
    return ok;
  }

  setViewFloor(fi) {
    if (fi < 0 || fi >= this.state.floors.length || fi === this.viewFloor) return;
    this.raids.flush(this.viewFloor);
    this.viewFloor = fi;
    this.state.currentFloor = fi;
    this.bus.emit('viewFloorChanged', fi);
    this.requestSave();
  }

  /**
   * Boucle principale (appelée par la scène Core à chaque frame).
   * dt en secondes ; si l'onglet a été suspendu longtemps, on bascule sur le calcul hors ligne.
   */
  update(dt, now = Date.now()) {
    if (!this.state) return;
    if (dt > 90) {
      // Retour après une longue suspension (application en arrière-plan)
      const report = this.offline.run(now - dt * 1000, now);
      if (report && !report.suspicious) this.bus.emit('offlineReport', report);
      this.raids.reset();
      this.requestSave(true);
      return;
    }
    dt = Math.min(dt, 1);
    this.state.player.playTime += dt;
    this.treasury.update(dt);
    this.raids.update(dt, now);

    this.slowTimer += dt;
    if (this.slowTimer >= 1) {
      this.slowTimer = 0;
      this.research.update(now);
      if (this.dungeon.trainTick(1)) this.bus.emit('monstersChanged');
      this.events.update(new Date(now));
      this.tutorial.update();
      if (this.achievementDirty) {
        this.achievementDirty = false;
        this.achievements.check();
      }
    }
    const since = (now - this.lastSaveAt) / 1000;
    if ((this.saveDirty && since > 2) || since > ECONOMY.autosaveSeconds) this.saveNow(now);
  }
}
