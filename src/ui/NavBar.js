import { h } from './dom.js';
import { sfx } from './context.js';

/** Barre de navigation principale (5 onglets). */
export const NAV_TABS = [
  { id: 'Dungeon', icon: '🏰', label: 'DONJON' },
  { id: 'Monsters', icon: '👹', label: 'MONSTRES' },
  { id: 'Research', icon: '🧪', label: 'RECHERCHE' },
  { id: 'Treasury', icon: '💰', label: 'TRÉSOR' },
  { id: 'Codex', icon: '📖', label: 'CODEX' },
];

export class NavBar {
  constructor(host, onSelect) {
    this.el = h('nav.navbar');
    this.buttons = {};
    this.badges = {};
    for (const t of NAV_TABS) {
      const badge = h('span.badge.hidden', '');
      const btn = h('button.nav-btn', { type: 'button', dataset: { tab: t.id }, onclick: () => { sfx('click'); onSelect(t.id); } },
        h('span.nav-icon', t.icon), h('span.nav-label', t.label), badge);
      this.buttons[t.id] = btn;
      this.badges[t.id] = badge;
      this.el.appendChild(btn);
    }
    host.appendChild(this.el);
  }

  setActive(id) {
    for (const [k, b] of Object.entries(this.buttons)) b.classList.toggle('active', k === id);
  }

  setBadge(id, n) {
    const b = this.badges[id];
    if (!b) return;
    b.textContent = n > 9 ? '9+' : String(n);
    b.classList.toggle('hidden', !n);
  }

  highlight(id, on) {
    this.buttons[id]?.classList.toggle('hint', on);
  }
}
