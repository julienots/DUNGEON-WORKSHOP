import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { ctx, sfx } from './context.js';
import { formatShort, formatNumber } from '../utils/format.js';
import { ECONOMY } from '../config/economy.js';
import { RESOURCE_KEYS } from '../utils/constants.js';

/** Barre de ressources du haut (🪙 💎 🔥 + détail au toucher). */
export class ResourceBar {
  constructor(host, { onFloors, onSettings }) {
    this.host = host;
    this.values = {};
    this.el = h('div.topbar');
    this.main = h('div.res-main', { onclick: () => this.toggleDetail() });
    for (const k of ['gold', 'crystals', 'essence']) {
      const val = h('b.res-val', '0');
      this.values[k] = val;
      this.main.appendChild(h(`div.res-chip.res-${k}`, h('span.res-ico', { html: icon(k) }), val));
    }
    this.floorBtn = h('button.floor-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); sfx('click'); onFloors(); } }, '');
    this.settingsBtn = h('button.icon-btn.settings-btn', { type: 'button', 'aria-label': 'Paramètres', onclick: (e) => { e.stopPropagation(); sfx('click'); onSettings(); } }, '⚙️');
    this.detail = h('div.res-detail.hidden');
    this.el.append(this.floorBtn, this.main, this.settingsBtn);
    host.append(this.el, this.detail);
    this.pending = false;
    ctx.game.bus.on('resources', () => this.schedule());
    ctx.game.bus.on('viewFloorChanged', () => this.schedule());
    ctx.game.bus.on('floorsChanged', () => this.schedule());
    this.update();
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.update();
    });
  }

  update() {
    const r = ctx.game.state.resources;
    for (const [k, el] of Object.entries(this.values)) {
      const txt = formatShort(r[k] || 0);
      if (el.textContent !== txt) {
        el.textContent = txt;
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
    }
    const fi = ctx.game.viewFloor;
    this.floorBtn.innerHTML = `<span class="floor-num">${fi + 1}</span><span class="floor-lbl">ÉTAGE ▾</span>`;
    if (!this.detail.classList.contains('hidden')) this.renderDetail();
  }

  toggleDetail() {
    sfx('click');
    this.detail.classList.toggle('hidden');
    if (!this.detail.classList.contains('hidden')) this.renderDetail();
  }

  renderDetail() {
    clear(this.detail);
    const r = ctx.game.state.resources;
    const prod = ctx.game.dungeon.productionPerMin();
    for (const k of RESOURCE_KEYS) {
      const p = prod[k] ? `+${formatShort(prod[k])}/min` : '';
      this.detail.appendChild(h('div.res-row',
        h('span.res-ico', { html: icon(k) }),
        h('div.res-row-text', h('div', h('b', ECONOMY.resources[k].name), ' ', h('span.res-amount', formatNumber(r[k] || 0)), p ? h('span.res-prod', p) : null), h('div.res-use', ECONOMY.resourceUsage[k])),
      ));
    }
    const me = ctx.game.state.prestige.masterEssence;
    if (ctx.game.state.prestige.count > 0 || me > 0) {
      this.detail.appendChild(h('div.res-row', h('span.res-ico', { html: icon('masterEssence') }), h('div.res-row-text', h('div', h('b', 'Essence du Maître'), ' ', formatNumber(me)), h('div.res-use', 'Améliorations permanentes d’Ascension.'))));
    }
    this.detail.appendChild(h('div.res-close', { onclick: () => this.toggleDetail() }, 'Fermer ▲'));
  }
}
