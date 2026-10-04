import { WEEKLY_EVENTS, SPECIAL_EVENTS, WEEKEND_BONUS } from '../data/events.js';
import { isoWeek, weekKey, nextMonday, dayKey } from '../utils/helpers.js';

function inRange(date, from, to) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const a = from.month * 100 + from.day;
  const b = to.month * 100 + to.day;
  return a <= b ? md >= a && md <= b : md >= a || md <= b;
}

/** Événements basés uniquement sur l'horloge locale (aucun serveur). */
export class EventSystem {
  constructor(game) {
    this.game = game;
    this.cacheKey = null;
    this.cacheVal = null;
  }

  current(now = new Date()) {
    const key = dayKey(now);
    if (this.cacheKey === key) return this.cacheVal;
    let ev = null;
    for (const s of SPECIAL_EVENTS) {
      if (inRange(now, s.from, s.to)) {
        const end = new Date(now.getFullYear(), s.to.month - 1, s.to.day, 23, 59, 59);
        if (end < now) end.setFullYear(end.getFullYear() + 1);
        ev = { ...s, periodKey: `${now.getFullYear()}`, endsAt: end.getTime() };
        break;
      }
    }
    if (!ev) {
      const { week } = isoWeek(now);
      const w = WEEKLY_EVENTS[week % WEEKLY_EVENTS.length];
      ev = { ...w, periodKey: weekKey(now), endsAt: nextMonday(now.getTime()) };
    }
    this.cacheKey = key;
    this.cacheVal = ev;
    return ev;
  }

  isWeekend(now = new Date()) {
    const d = now.getDay();
    return d === 0 || d === 6;
  }

  /** Sources de modificateurs actives (pour ModifierSystem). */
  activeModifiers(now = new Date()) {
    const out = [];
    const ev = this.current(now);
    if (ev) out.push(ev);
    if (this.isWeekend(now)) out.push(WEEKEND_BONUS);
    return out;
  }

  /** Le boss d'événement peut être affronté une fois par jour (récompense). */
  eventBossAvailable(now = new Date()) {
    const ev = this.current(now);
    if (!ev?.boss) return false;
    return this.game.state.bosses.eventLast[ev.boss] !== dayKey(now);
  }

  /** Invalide le cache au changement de jour. */
  update(now = new Date()) {
    const key = dayKey(now);
    if (this.cacheKey && this.cacheKey !== key) {
      this.cacheKey = null;
      this.game.mods.invalidate();
      this.game.missions.refresh(now);
      this.game.bus.emit('eventChanged');
    }
  }
}
