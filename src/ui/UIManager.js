import { h, clear, append } from './dom.js';
import { ctx, sfx } from './context.js';
import { ResourceBar } from './ResourceBar.js';
import { NavBar } from './NavBar.js';
import { ModalManager } from './Modal.js';
import { Toasts } from './Toast.js';
import { Button } from './Button.js';
import { CostView } from './CostView.js';
import { installIconDefs } from './icons.js';
import { formatNumber, formatTime } from '../utils/format.js';
import { RARITY_INFO } from '../utils/constants.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { showFloors } from './screens/FloorsScreen.js';
import { DungeonHUD } from './DungeonHUD.js';

/**
 * UI MANAGER
 * Couche d'interface DOM superposée au canvas Phaser : barres, écrans, modales, notifications.
 * Le DOM est utilisé pour les menus (texte net sur tous les écrans, défilement natif tactile),
 * Phaser pour le monde du jeu (donjon, combats, effets).
 */
export class UIManager {
  constructor(root) {
    this.root = root;
    installIconDefs();
    this.screenHost = h('div.screen-host');
    this.hudHost = h('div.hud-host');
    this.sheetHost = h('div.sheet-host');
    this.modalHost = h('div.modal-host');
    this.toastHost = h('div.toast-host');
    this.topHost = h('div.top-host');
    this.navHost = h('div.nav-host');
    this.tutorialEl = h('div.tutorial.hidden');
    append(root, [this.hudHost, this.screenHost, this.topHost, this.sheetHost, this.navHost, this.tutorialEl, this.modalHost, this.toastHost]);
    this.modals = new ModalManager(this.modalHost);
    this.toasts = new Toasts(this.toastHost);
    this.currentScreen = null;
    this.hidden = true;
    root.classList.add('ui-hidden');
  }

  /** Construit les barres une fois la partie chargée. */
  init() {
    this.resourceBar = new ResourceBar(this.topHost, {
      onFloors: () => showFloors(),
      onSettings: () => ctx.router.go('Settings'),
    });
    this.nav = new NavBar(this.navHost, (id) => ctx.router.go(id));
    this.hud = new DungeonHUD(this.hudHost);
    this.bindGlobalEvents();
    setInterval(() => this.updateBadges(), 1000);
    this.updateBadges();
    this.updateTutorial();
  }

  show() {
    this.hidden = false;
    this.root.classList.remove('ui-hidden');
  }

  hide() {
    this.hidden = true;
    this.root.classList.add('ui-hidden');
  }

  /** Hauteurs (px CSS) occupées par l'interface en haut et en bas (pour cadrer le donjon). */
  insets() {
    let top = this.topHost.getBoundingClientRect().bottom || 64;
    const row = this.hud?.row;
    if (row && !this.hud.el.classList.contains('hidden')) top = Math.max(top, row.getBoundingClientRect().bottom);
    const navTop = this.navHost.getBoundingClientRect().top || window.innerHeight - 70;
    let bottom = window.innerHeight - navTop;
    // Une feuille ouverte (construction, salle) réduit la zone visible du donjon
    let sheet = 0;
    if (this.sheet?.el?.classList.contains('show')) sheet = window.innerHeight - this.sheet.el.getBoundingClientRect().top;
    return { top, bottom, sheet };
  }

  // ------------------------------------------------------------------ écrans
  openScreen(def) {
    this.closeScreen(true);
    const state = def.initState ? def.initState() : {};
    const body = h('div.screen-body.scroll');
    const back = h('button.screen-back', { type: 'button', onclick: () => { sfx('close'); ctx.router.go(def.back || 'Dungeon'); } }, '‹');
    const titleEl = h('h2.screen-title', def.icon ? h('span.screen-icon', def.icon) : null, def.title);
    const headerExtra = h('div.screen-extra');
    const el = h(`div.screen.screen-${def.id}`, h('div.screen-head', back, titleEl, headerExtra), body);
    const api = {
      state,
      body,
      el,
      headerExtra,
      refresh: () => this.renderScreen(entry),
      close: () => ctx.router.go(def.back || 'Dungeon'),
    };
    const entry = { def, el, body, api, unsubs: [], pending: false };
    for (const ev of def.events || []) {
      entry.unsubs.push(ctx.game.bus.on(ev, () => this.scheduleRender(entry)));
    }
    this.currentScreen = entry;
    this.screenHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    this.renderScreen(entry);
    if (def.tick) entry.timer = setInterval(() => def.tick(api), 1000);
    return entry;
  }

  scheduleRender(entry) {
    if (entry.pending || entry !== this.currentScreen) return;
    entry.pending = true;
    setTimeout(() => {
      entry.pending = false;
      if (entry === this.currentScreen) this.renderScreen(entry);
    }, 80);
  }

  renderScreen(entry) {
    const top = entry.body.scrollTop;
    clear(entry.body);
    try {
      const content = entry.def.render(entry.api);
      if (content) append(entry.body, [content]);
    } catch (err) {
      console.error('[UI] erreur de rendu', entry.def.id, err);
      entry.body.appendChild(h('div.empty', 'Erreur d’affichage.'));
    }
    entry.body.scrollTop = top;
  }

  closeScreen(instant = false) {
    const entry = this.currentScreen;
    if (!entry) return;
    this.currentScreen = null;
    entry.unsubs.forEach((u) => u());
    if (entry.timer) clearInterval(entry.timer);
    entry.def.destroy?.(entry.api);
    entry.el.classList.remove('show');
    entry.el.classList.add('leave');
    setTimeout(() => entry.el.remove(), instant ? 0 : 220);
  }

  // ------------------------------------------------------------------ feuilles (bottom sheets)
  openSheet(content, { cls = '', onClose = null } = {}) {
    this.closeSheet();
    const el = h(`div.sheet${cls ? '.' + cls : ''}`, h('div.sheet-grip', { onclick: () => this.closeSheet() }), content);
    this.sheet = { el, onClose };
    document.body.classList.add('sheet-open');
    this.sheetHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => ctx.game.bus.emit('sheetChanged', true), 260);
    return el;
  }

  closeSheet() {
    if (!this.sheet) return;
    const { el, onClose } = this.sheet;
    this.sheet = null;
    document.body.classList.remove('sheet-open');
    el.classList.remove('show');
    setTimeout(() => el.remove(), 220);
    onClose?.();
    ctx.game.bus.emit('sheetChanged', false);
  }

  // ------------------------------------------------------------------ notifications globales
  bindGlobalEvents() {
    const bus = ctx.game.bus;
    bus.on('achievementUnlocked', (a) => {
      this.toasts.show(`Succès débloqué : ${a.name}`, { icon: '🏆', type: 'gold' });
      sfx('reward');
    });
    bus.on('loreDiscovered', (l) => this.toasts.show(`Nouvelle page de lore : « ${l.title} »`, { icon: '📜', type: 'gold', duration: 3500 }));
    bus.on('researchDone', (r, lvl) => this.toasts.show(`Recherche terminée : ${r.name}${r.maxLevel > 1 ? ' niv. ' + lvl : ''}`, { icon: r.icon || '🧪', type: 'success' }));
    bus.on('masterLevelUp', (lvl) => this.toasts.show(`Maître du donjon niveau ${lvl} ! (+1% or)`, { icon: '⭐', type: 'gold' }));
    bus.on('codexDiscovered', (cat, id) => {
      if (cat === 'monsters' && ctx.game.started) this.toasts.show('Nouvelle espèce ajoutée au Codex !', { icon: '📖', type: 'info', duration: 1800 });
    });
    bus.on('tutorial', () => this.updateTutorial());
    bus.on('tutorialDone', (reward) => {
      this.updateTutorial();
      this.modals.open(h('div.center',
        h('div.big-emoji', '🎓'),
        h('p', 'Tutoriel terminé ! Vous connaissez les bases du métier de Maître du donjon.'),
        h('p.muted', 'Récompense :'),
        CostView(reward, { gain: true }),
        h('p.muted.small', 'Astuce : débloquez de nouveaux étages, combinez les pièges et faites évoluer vos monstres. Le donjon continue de travailler même quand le jeu est fermé.'),
      ), { title: 'Bravo, Maître !', icon: '🏆' });
    });
    bus.on('offlineReport', (r) => this.showOfflineReport(r));
    bus.on('sfx', (k) => sfx(k));
    bus.on('ascended', (gain) => {
      this.modals.open(h('div.center', h('div.big-emoji.glow', '✨'), h('p', `Vous renaissez plus puissant. +${formatNumber(gain)} Essence du Maître.`)), { title: 'Ascension !', icon: '✨' });
    });
  }

  updateBadges() {
    if (!ctx.game?.state || !this.nav) return;
    const g = ctx.game;
    this.nav.setBadge('Research', g.research.readyCount() > 0 && g.state.research.active.length < g.research.slots() ? 1 : 0);
    const evolvable = g.state.monsters.filter((m) => g.monsters.evolutionOptions(m).some((e) => e.ok)).length;
    this.nav.setBadge('Monsters', evolvable);
    const vault = g.state.treasury.vault / Math.max(1, g.treasury.capacity());
    this.nav.setBadge('Treasury', vault >= 0.9 ? 1 : 0);
    this.nav.setBadge('Codex', 0);
    this.hud?.updateBadges();
  }

  updateTutorial() {
    const step = ctx.game.tutorial.current();
    const el = this.tutorialEl;
    clear(el);
    if (this.nav) for (const id of ['Monsters', 'Research', 'Treasury']) this.nav.highlight(id, false);
    document.body.classList.toggle('tutorial-active', !!step);
    if (!step) {
      el.classList.add('hidden');
      document.body.classList.remove('tuto-build');
      return;
    }
    el.classList.remove('hidden');
    const idx = ctx.game.state.player.tutorialStep;
    append(el, [
      h('div.tuto-head', h('span.tuto-step', `${idx + 1}/7`), h('b', step.title), h('button.tuto-skip', { type: 'button', onclick: () => { sfx('click'); ctx.game.tutorial.skip(); } }, 'Passer')),
      h('div.tuto-text', step.text),
      step.manual ? Button('Commencer !', { variant: 'primary', small: true, onClick: () => ctx.game.tutorial.next() }) : null,
    ]);
    if (step.hint?.startsWith('nav:') && this.nav) {
      const map = { 'nav:monsters': 'Monsters', 'nav:research': 'Research', 'nav:treasury': 'Treasury' };
      this.nav.highlight(map[step.hint], true);
    }
    document.body.classList.toggle('tuto-build', step.hint === 'build');
  }

  // ------------------------------------------------------------------ rapport hors ligne
  showOfflineReport(r) {
    if (!r || r.suspicious) return;
    const rows = [];
    const add = (icon, text) => rows.push(h('div.report-row', h('span.report-icon', icon), h('span', text)));
    add('⏱️', `Absent ${formatTime(r.elapsed)}${r.capped ? ` (plafonné à ${r.capHours}h)` : ''}`);
    if (r.raids) {
      add('⚔️', `${formatNumber(r.raids)} groupes ont attaqué votre donjon`);
      add('💀', `${formatNumber(r.defeated)} groupes vaincus`);
      add('🏆', `${formatNumber(r.succeeded)} groupes ont réussi à progresser`);
    }
    if (r.stolen) add('🦹', `${formatNumber(r.stolen)} or volé dans le trésor`);
    if (r.items.length) add('🎁', `${r.items.length} objet${r.items.length > 1 ? 's' : ''} trouvé${r.items.length > 1 ? 's' : ''}`);
    if (r.monstersXp) add('👹', `${r.monstersXp} monstre${r.monstersXp > 1 ? 's ont' : ' a'} gagné de l’XP${r.levelUps ? ` (+${r.levelUps} niveaux)` : ''}`);
    if (r.researchDone?.length) add('🧪', `${r.researchDone.length} recherche${r.researchDone.length > 1 ? 's' : ''} terminée${r.researchDone.length > 1 ? 's' : ''}`);
    if (r.vault) add('💰', `+${formatNumber(r.vault)} or dans le coffre du trésor`);
    const gains = { ...r.rewards };
    for (const [k, v] of Object.entries(r.production || {})) gains[k] = (gains[k] || 0) + v;
    const items = h('div.report-items', r.items.slice(0, 8).map((it) => h(`span.item-chip.rarity-${it.rarity}`, { style: { '--rc': RARITY_INFO[it.rarity].color } }, ctx.game.equipment.base(it).icon)));
    this.modals.open(h('div.report',
      h('div.report-rows', rows),
      h('div.report-gains-title', 'Gains'),
      CostView(gains, { gain: true }),
      r.items.length ? items : null,
      Button('Excellent !', { variant: 'primary', block: true, sound: 'coins', onClick: () => this.modals.close() }),
    ), { title: 'Pendant votre absence…', icon: '🌙', cls: 'modal-report' });
  }

  monsterImage(speciesId) {
    return SpriteFactory.url(`mon_${speciesId}`);
  }
}
