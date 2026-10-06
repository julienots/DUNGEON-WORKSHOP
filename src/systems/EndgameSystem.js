import { ENDGAME_GOALS } from '../data/endgame.js';
import { BIOME_IDS } from '../data/biomes.js';

/** Objectifs endgame (V2) : progression calculée à partir de l'état du jeu, récompense unique. */
export class EndgameSystem {
  constructor(game) {
    this.game = game;
  }

  get claimed() {
    const s = this.game.state;
    if (!s.endgame) s.endgame = { claimed: {}, title: null };
    return s.endgame.claimed;
  }

  progress(goal) {
    const g = this.game;
    const s = g.state;
    const ratio = (cat) => {
      const c = g.codex.count(cat);
      return { value: c.found, target: c.total };
    };
    switch (goal.kind) {
      case 'infinite':
        return { value: s.modes?.infinite?.best || 0, target: goal.target };
      case 'species':
        return ratio('monsters');
      case 'bosses':
        return ratio('bosses');
      case 'mutations':
        return ratio('mutations');
      case 'rooms':
        return ratio('rooms');
      case 'biomes': {
        // « Terminer » un biome : 100 raids repoussés sur un étage de ce biome
        const per = s.stats.biomeRaids || {};
        return { value: BIOME_IDS.filter((b) => (per[b] || 0) >= 100).length, target: BIOME_IDS.length };
      }
      case 'ascensions':
        return { value: s.prestige.count || 0, target: goal.target };
      case 'dimensional':
        return { value: s.prestige.tiers?.dimensional?.count || 0, target: 1 };
      default:
        return { value: 0, target: 1 };
    }
  }

  list() {
    return ENDGAME_GOALS.map((goal) => {
      const p = this.progress(goal);
      return { ...goal, ...p, done: p.value >= p.target, claimed: !!this.claimed[goal.id] };
    });
  }

  claim(id) {
    const goal = this.list().find((x) => x.id === id);
    if (!goal) return { ok: false, reason: 'Objectif inconnu' };
    if (goal.claimed) return { ok: false, reason: 'Déjà réclamé' };
    if (!goal.done) return { ok: false, reason: 'Objectif non atteint' };
    this.claimed[id] = true;
    this.game.state.endgame.title = goal.title;
    this.game.seasons.grant(goal.reward);
    this.game.bus.emit('endgameChanged');
    this.game.bus.emit('resources');
    this.game.requestSave(true);
    return { ok: true };
  }

  claimableCount() {
    return this.list().filter((g) => g.done && !g.claimed).length;
  }
}
