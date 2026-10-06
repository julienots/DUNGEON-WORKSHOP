import { SEASONS, SEASON_DAYS, SEASON_EPOCH, SEASON_XP } from '../data/seasons.js';
import { SKINS, DECORATIONS } from '../data/cosmetics.js';
import { CHESTS } from '../data/chests.js';

const DAY = 86400000;

export function createSeasonState() {
  return { key: '', base: {}, claimed: {}, missionsDone: {} };
}

/**
 * SAISONS HORS LIGNE (V2) : déterminées par la date locale, progression calculée à partir
 * des statistiques (fonctionne donc aussi pendant la progression hors ligne).
 */
export class SeasonSystem {
  constructor(game) {
    this.game = game;
  }

  get s() {
    return this.game.state.season;
  }

  /** Saison active à la date `now`. */
  info(now = Date.now()) {
    const days = Math.floor((now - SEASON_EPOCH) / DAY);
    const cycle = Math.floor(days / SEASON_DAYS);
    const idx = ((cycle % SEASONS.length) + SEASONS.length) % SEASONS.length;
    const start = SEASON_EPOCH + cycle * SEASON_DAYS * DAY;
    return { season: SEASONS[idx], key: `S${cycle}`, start, end: start + SEASON_DAYS * DAY, number: cycle + 1 };
  }

  /** Passage à une nouvelle saison : remise à zéro de la progression (les récompenses gagnées restent). */
  refresh(now = Date.now()) {
    const i = this.info(now);
    if (this.s.key === i.key) return false;
    const stats = this.game.state.stats;
    const base = {};
    const keys = new Set([...Object.keys(SEASON_XP), ...i.season.missions.map((m) => m.stat)]);
    for (const k of keys) base[k] = stats[k] || 0;
    this.game.state.season = { key: i.key, base, claimed: {}, missionsDone: {} };
    this.game.bus.emit('seasonChanged', i);
    return true;
  }

  delta(stat) {
    return Math.max(0, (this.game.state.stats[stat] || 0) - (this.s.base[stat] || 0));
  }

  missions() {
    const { season } = this.info();
    return season.missions.map((m) => {
      const value = Math.min(m.target, this.delta(m.stat));
      return { ...m, value, done: value >= m.target, claimed: !!this.s.missionsDone[m.id] };
    });
  }

  xp() {
    let xp = 0;
    for (const [k, w] of Object.entries(SEASON_XP)) xp += this.delta(k) * w;
    for (const m of this.missions()) if (m.claimed) xp += m.xp;
    return Math.floor(xp);
  }

  claimMission(id) {
    const m = this.missions().find((x) => x.id === id);
    if (!m || m.claimed) return { ok: false, reason: 'Déjà réclamé' };
    if (!m.done) return { ok: false, reason: 'Défi non terminé' };
    this.s.missionsDone[id] = true;
    this.game.bus.emit('seasonChanged');
    this.game.requestSave(true);
    return { ok: true };
  }

  tiers() {
    const { season } = this.info();
    const xp = this.xp();
    return season.track.map((t, i) => ({ ...t, index: i, reached: xp >= t.xp, claimed: !!this.s.claimed[i] }));
  }

  claimTier(i) {
    const t = this.tiers()[i];
    if (!t) return { ok: false, reason: 'Palier inconnu' };
    if (t.claimed) return { ok: false, reason: 'Déjà réclamé' };
    if (!t.reached) return { ok: false, reason: 'XP de saison insuffisante' };
    this.s.claimed[i] = true;
    this.grant(t.reward);
    this.game.bus.emit('seasonChanged');
    this.game.bus.emit('resources');
    this.game.requestSave(true);
    return { ok: true, reward: t.reward };
  }

  grant(reward) {
    const g = this.game;
    const res = {};
    for (const [k, v] of Object.entries(reward)) {
      if (k === 'chest') g.collection.addChest(v);
      else if (k === 'skin') {
        if (g.state.collection.skins[v]) res.legendaryEssence = (res.legendaryEssence || 0) + 5;
        else g.state.collection.skins[v] = true;
      } else if (k === 'decoration') g.state.collection.decorations[v] = (g.state.collection.decorations[v] || 0) + 1;
      else res[k] = (res[k] || 0) + v;
    }
    if (Object.keys(res).length) g.economy.add(res);
  }

  /** Familles mises en avant aux portails pendant la saison. */
  featuredFamilies() {
    return this.info().season.featured;
  }

  rewardLabel(r) {
    return Object.entries(r).map(([k, v]) => {
      if (k === 'chest') return `🎁 ${CHESTS[v]?.name || v}`;
      if (k === 'skin') return `🎨 Skin ${SKINS[v]?.name || v}`;
      if (k === 'decoration') return `🏺 ${DECORATIONS[v]?.name || v}`;
      return null;
    }).filter(Boolean).join(' · ');
  }
}
