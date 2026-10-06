import { h, clear } from './dom.js';
import { ctx, sfx } from './context.js';
import { Button, IconButton } from './Button.js';
import { Tabs } from './Card.js';
import { RoomCard } from './RoomCard.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { BUILDABLE_ROOMS, ROOMS, ROOM_CATEGORIES } from '../data/rooms.js';
import { TRAP_LIST } from '../data/traps.js';
import { SPEEDS } from '../utils/constants.js';
import { formatTime } from '../utils/format.js';
import { openCellPanel } from './screens/CellPanel.js';
import { showFloors, showBossResult } from './screens/FloorsScreen.js';
import { showEvent } from './screens/EventScreen.js';

/** Interface de l'écran du donjon : bandeau de raid, boutons latéraux, construction. */
export class DungeonHUD {
  constructor(host) {
    this.host = host;
    this.el = null;
    this.buildTab = 'rooms';
    this.preview = null;
  }

  mount() {
    if (this.el) return;
    const g = ctx.game;
    this.side = {
      modes: IconButton('🎮', { title: 'Modes de jeu', onClick: () => ctx.router.go('Modes'), cls: 'modes-btn' }),
      mastery: IconButton('🧠', { title: 'Maîtrise', onClick: () => ctx.router.go('Mastery') }),
      missions: IconButton('📜', { title: 'Missions', onClick: () => ctx.router.go('Missions') }),
      shop: IconButton('🛒', { title: 'Boutique', onClick: () => ctx.router.go('Shop') }),
      achievements: IconButton('🏆', { title: 'Succès', onClick: () => ctx.router.go('Achievements') }),
      adventurers: IconButton('⚔️', { title: 'Aventuriers', onClick: () => ctx.router.go('Adventurers') }),
      bosses: IconButton('👑', { title: 'Étages & gardiens', onClick: () => showFloors() }),
      event: IconButton(g.events.current()?.icon || '🎉', { title: 'Événement', onClick: () => showEvent(), cls: 'event-btn' }),
      prestige: IconButton('✨', { title: 'Ascension', onClick: () => ctx.router.go('Prestige') }),
    };
    for (const [k, b] of Object.entries(this.side)) b.dataset.hud = k;
    // Rangée d'accès rapide sous la barre du haut : laisse toute la largeur à la grille
    this.row = h('div.hud-side.hud-row', this.side.modes, this.side.mastery, this.side.missions, this.side.shop, this.side.achievements, this.side.adventurers, this.side.bosses, this.side.event, this.side.prestige);

    this.raidInfo = h('div.raid-info');
    this.speedBtn = h('button.hud-btn.speed-btn', { type: 'button', onclick: () => this.cycleSpeed() }, '');
    this.watchBtn = h('button.hud-btn.watch-btn.hidden', { type: 'button', onclick: () => this.watch() }, '👁️', h('span', 'Regarder'));
    this.buildBtn = h('button.hud-btn.build-btn', { type: 'button', id: 'btn-build', onclick: () => this.toggleBuild() }, '🔨', h('span', 'Construire'));
    this.strip = h('div.raid-strip', this.raidInfo, h('div.strip-actions', this.watchBtn, this.speedBtn, this.buildBtn));
    // Zoom de la grille (V2)
    const zb = (label, dir, title) => h('button.zoom-btn', { type: 'button', title, 'aria-label': title, onclick: (e) => { e.stopPropagation(); sfx('click'); g.bus.emit('hud:zoom', dir); } }, label);
    this.zoomReset = zb('⤢', 0, 'Vue d’ensemble');
    this.zoomReset.classList.add('hidden');
    this.zoomCtl = h('div.zoom-ctl', zb('＋', 1, 'Zoomer'), zb('－', -1, 'Dézoomer'), this.zoomReset);
    g.bus.on('dungeonZoom', (z) => this.zoomReset.classList.toggle('hidden', z <= 1.001));
    this.el = h('div.dungeon-hud', this.row, this.zoomCtl, this.strip);
    this.host.appendChild(this.el);
    this.updateSpeed();
    this.timer = setInterval(() => this.updateRaid(), 250);
    g.bus.on('dungeonMode', (mode) => {
      if (mode === 'view' && this.building) this.exitBuild(false);
    });
    g.bus.on('eventChanged', () => {
      this.side.event.firstChild.textContent = g.events.current()?.icon || '🎉';
    });
    this.updateBadges();
  }

  setVisible(v) {
    if (!this.el) return;
    this.el.classList.toggle('hidden', !v);
    if (!v) this.exitBuild(false);
  }

  scene() {
    const s = ctx.phaser.scene.getScene('Dungeon');
    return s && s.sys && s.sys.isActive() ? s : null;
  }

  // ------------------------------------------------------------------ bandeau de raid
  cycleSpeed() {
    const s = ctx.game.state.settings;
    const i = SPEEDS.indexOf(s.speed || 1);
    s.speed = SPEEDS[(i + 1) % SPEEDS.length];
    ctx.game.requestSave();
    this.updateSpeed();
  }

  updateSpeed() {
    this.speedBtn.innerHTML = `<span>⏩</span><span>${ctx.game.state.settings.speed || 1}x</span>`;
  }

  updateRaid() {
    const sc = this.scene();
    if (!sc || !this.el || this.el.classList.contains('hidden')) return;
    const info = sc.raidInfo();
    const key = JSON.stringify([info.active, info.name, info.combat, info.ended, info.outcome, info.heroes?.map((x) => [x.alive, Math.round(x.ratio * 20)]), info.active ? 0 : Math.ceil(info.nextIn)]);
    this.watchBtn.classList.toggle('hidden', !(info.active && info.combat));
    this.currentInfo = info;
    if (key === this.lastKey) return;
    this.lastKey = key;
    clear(this.raidInfo);
    if (!info.active) {
      if (!info.canRaid) {
        this.raidInfo.append(h('div.raid-title.warn', '⚠️ Le coffre doit être relié à l’entrée'));
      } else {
        this.raidInfo.append(
          h('div.raid-title', '🕯️ Le donjon est calme…'),
          h('div.raid-sub', `Prochain groupe dans ${formatTime(info.nextIn)}`),
        );
      }
      return;
    }
    const alive = info.heroes.filter((x) => x.alive).length;
    const status = info.ended ? (info.outcome === 'looted' ? '💰 Coffre pillé' : info.outcome === 'retreat' ? '🏃 Retraite' : '🏆 Anéantis') : info.combat ? '⚔️ Combat !' : '🚶 Exploration';
    this.raidInfo.append(
      h('div.raid-title', h('span', `${info.name}`), h('span.raid-lvl', `niv. ${info.level}`)),
      h('div.raid-heroes', info.heroes.map((x) => h(`div.raid-hero${x.alive ? '' : '.dead'}`,
        h('img', { src: SpriteFactory.url(x.sprite), alt: '' }),
        h('div.mini-hp', h('div', { style: { width: `${Math.max(0, x.ratio) * 100}%` } })),
      )), h('span.raid-status', `${status} · ${alive}/${info.heroes.length}`)),
    );
  }

  watch() {
    const sc = this.scene();
    if (!sc || !sc.raid) return;
    sfx('open');
    ctx.router.openBattle({ mode: 'raid', floor: sc.fi, index: sc.raid.idx - 1 });
  }

  // ------------------------------------------------------------------ badges
  updateBadges() {
    if (!this.side) return;
    const g = ctx.game;
    const setBadge = (btn, n) => {
      let b = btn.querySelector('.badge');
      if (!b) {
        b = h('span.badge');
        btn.appendChild(b);
      }
      b.textContent = n > 9 ? '9+' : String(n);
      b.classList.toggle('hidden', !n);
    };
    setBadge(this.side.missions, g.missions.claimableCount());
    setBadge(this.side.mastery, g.progression.availablePoints());
    const daily = g.runs.isUnlocked('challenge') && !g.runs.dailyChallenge().done ? 1 : 0;
    setBadge(this.side.modes, g.runs.run ? 1 : daily);
    this.side.modes.classList.toggle('locked', !g.runs.isUnlocked('survival'));
    setBadge(this.side.achievements, g.achievements.claimableCount());
    setBadge(this.side.shop, (Date.now() >= g.shop.freeChestReadyAt() ? 1 : 0) + g.collection.totalChests());
    const bossReady = g.bosses.floorBosses().filter((b) => !b.defeated || b.repeatAvailable).length + (g.bosses.eventBoss()?.available ? 1 : 0);
    setBadge(this.side.bosses, bossReady + (g.dungeon.nextFloorInfo().ok ? 1 : 0));
    setBadge(this.side.event, g.bosses.eventBoss()?.available ? 1 : 0);
    const canAscend = g.prestige.canAscend().ok;
    this.side.prestige.classList.toggle('locked', !canAscend && g.state.prestige.count === 0);
    setBadge(this.side.prestige, canAscend ? 1 : 0);
  }

  // ------------------------------------------------------------------ construction
  toggleBuild() {
    if (this.building) this.exitBuild(true);
    else this.enterBuild();
  }

  enterBuild() {
    this.building = true;
    this.buildBtn.classList.add('active');
    this.buildBtn.lastChild.textContent = 'Terminer';
    this.renderPalette();
  }

  exitBuild(emit = true) {
    if (!this.building) return;
    this.building = false;
    this.selection = null;
    this.buildBtn?.classList.remove('active');
    if (this.buildBtn) this.buildBtn.lastChild.textContent = 'Construire';
    if (ctx.ui.sheet?.el === this.paletteEl) ctx.ui.closeSheet();
    if (emit) ctx.game.bus.emit('hud:cancelMode');
  }

  renderPalette() {
    const g = ctx.game;
    const fi = g.viewFloor;
    const body = h('div.palette');
    const tabs = Tabs([
      ...Object.entries(ROOM_CATEGORIES).map(([id, c]) => ({ id, icon: c.icon, label: c.name })),
      { id: 'expand', icon: '📐', label: 'Agrandir' },
    ], this.buildTab, (id) => {
      this.buildTab = id;
      this.selection = null;
      this.preview = null;
      g.bus.emit('hud:build', null);
      this.renderPalette();
    });
    body.appendChild(tabs);
    const hint = h('div.palette-hint');
    body.appendChild(hint);
    if (this.preview) body.appendChild(this.renderPreview());
    const grid = h('div.palette-grid');
    body.appendChild(grid);
    if (ROOM_CATEGORIES[this.buildTab] && this.buildTab !== 'traps') {
      hint.textContent = this.selection
        ? 'Touchez une case : aperçu des synergies (⭐), puis touchez à nouveau pour construire.'
        : `${ROOM_CATEGORIES[this.buildTab].icon} ${ROOM_CATEGORIES[this.buildTab].name} — choisissez une salle.`;
      const rooms = BUILDABLE_ROOMS.filter((r) => r.category === this.buildTab).sort((a, b) => (g.dungeon.isRoomUnlocked(b.id) ? 1 : 0) - (g.dungeon.isRoomUnlocked(a.id) ? 1 : 0));
      if (!rooms.length) grid.appendChild(h('div.muted.small', 'Aucune salle dans cette catégorie pour l’instant.'));
      for (const r of rooms) {
        const unlocked = g.dungeon.isRoomUnlocked(r.id);
        grid.appendChild(RoomCard({
          id: r.id, name: r.name, icon: r.icon, texture: `floor_${r.id}`, cost: g.dungeon.buildCost(fi, r.id),
          locked: !unlocked, lockText: g.dungeon.unlockText(r.id), selected: this.selection?.id === r.id,
          info: r.capacity ? `👹 ${r.capacity}` : '',
          onClick: () => {
            if (!unlocked) {
              sfx('error');
              ctx.ui.toasts.show(`${r.name} : ${g.dungeon.unlockText(r.id)}`, { icon: '🔒' });
              return;
            }
            sfx('click');
            this.selection = { type: 'room', id: r.id };
            this.preview = null;
            g.bus.emit('hud:build', this.selection);
            this.renderPalette();
            ctx.ui.toasts.show(r.desc, { icon: r.icon, duration: 2200 });
          },
        }));
      }
    } else if (this.buildTab === 'traps') {
      hint.textContent = this.selection ? 'Touchez une salle orange pour installer le piège.' : 'Choisissez un piège. Combinez les éléments pour créer des synergies !';
      for (const t of TRAP_LIST) {
        const unlocked = g.traps.isUnlocked(t.id);
        grid.appendChild(RoomCard({
          id: t.id, name: t.name, icon: t.icon, texture: `trap_${t.id}`, cost: g.traps.placeCost(fi, t.id),
          locked: !unlocked, lockText: g.traps.unlockText(t.id), selected: this.selection?.id === t.id,
          onClick: () => {
            if (!unlocked) {
              sfx('error');
              ctx.ui.toasts.show(`${t.name} : ${g.traps.unlockText(t.id)}`, { icon: '🔒' });
              return;
            }
            sfx('click');
            this.selection = { type: 'trap', id: t.id };
            g.bus.emit('hud:build', this.selection);
            this.renderPalette();
            ctx.ui.toasts.show(t.desc, { icon: t.icon, duration: 2000 });
          },
        }));
      }
    } else {
      const f = g.dungeon.floor(fi);
      const d = g.dungeon.def(fi);
      hint.textContent = `Taille actuelle : ${f.cols} × ${f.rows} (max ${d.maxCols} × ${d.maxRows})`;
      for (const [dir, label, icon] of [['right', 'Ajouter une colonne', '➡️'], ['down', 'Creuser plus profond (ligne)', '⬇️']]) {
        const c = g.dungeon.canExpand(fi, dir);
        grid.appendChild(h('div.expand-row',
          h('span.expand-icon', icon),
          h('span.expand-label', label),
          c.ok || c.cost ? Button('Agrandir', {
            variant: c.ok ? 'primary' : 'secondary', small: true, cost: c.cost || g.dungeon.expandCost(fi, dir), disabled: !c.ok,
            onClick: () => {
              const r = g.dungeon.expand(fi, dir);
              if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
              else ctx.ui.toasts.show('Étage agrandi !', { icon: '📐', type: 'success' });
              this.renderPalette();
            },
          }) : h('span.muted', c.reason),
        ));
      }
    }
    body.appendChild(h('div.row.end', Button('Terminer', { variant: 'ghost', small: true, onClick: () => this.exitBuild(true) })));
    if (ctx.ui.sheet?.el === this.paletteEl && this.paletteEl) {
      clear(this.paletteEl);
      this.paletteEl.append(h('div.sheet-grip', { onclick: () => this.exitBuild(true) }), body);
    } else {
      this.paletteEl = ctx.ui.openSheet(body, { cls: 'sheet-palette', onClose: () => { if (this.building) this.exitBuild(true); } });
    }
    if (!this.refreshHook) {
      this.refreshHook = () => {
        if (this.building) this.renderPalette();
      };
      ctx.game.bus.on('resources', () => {
        if (this.building && !this.paletteRefreshQueued) {
          this.paletteRefreshQueued = true;
          setTimeout(() => {
            this.paletteRefreshQueued = false;
            if (this.building) this.renderPalette();
          }, 400);
        }
      });
      ctx.game.bus.on('dungeonChanged', this.refreshHook);
    }
  }

  /** Aperçu avant construction (appelé par la scène au premier toucher). */
  showPreview(fi, x, y, roomId) {
    this.preview = { fi, x, y, roomId };
    if (this.building) this.renderPalette();
  }

  clearPreview() {
    if (!this.preview) return;
    this.preview = null;
    if (this.building) this.renderPalette();
  }

  renderPreview() {
    const g = ctx.game;
    const { fi, x, y, roomId } = this.preview;
    const rd = ROOMS[roomId];
    const check = g.dungeon.canBuild(fi, x, y, roomId);
    const syns = g.dungeon.previewSynergies(fi, x, y, roomId);
    return h('div.build-preview',
      h('div.build-preview-head', h('b', `${rd.icon} ${rd.name}`), h('span.small.muted', ` · case ${x + 1},${y + 1}`)),
      syns.length
        ? h('div.syn-list', syns.map((s) => h('div.syn-chip', { title: s.syn.desc }, h('span', s.syn.icon), h('span', s.syn.name), h('small', s.x === x && s.y === y ? '' : ` → ${ROOMS[g.dungeon.cell(fi, s.x, s.y)?.room]?.name || ''}`))))
        : h('div.small.muted', 'Aucune synergie ici. Les ⭐ indiquent les meilleures cases.'),
      h('div.row.gap',
        Button('Construire', { variant: check.ok ? 'primary' : 'secondary', small: true, cost: check.cost || g.dungeon.buildCost(fi, roomId), disabled: !check.ok, onClick: () => this.scene()?.confirmBuild(x, y) }),
        Button('Annuler', { small: true, variant: 'ghost', onClick: () => { this.clearPreview(); this.scene()?.applyModeHighlights(); } }),
      ),
      check.ok ? null : h('div.small.bad', check.reason),
    );
  }

  // ------------------------------------------------------------------ cases
  openCell(fi, x, y) {
    if (this.building) return;
    openCellPanel(fi, x, y);
  }

  openDig(fi, x, y) {
    if (this.building) return;
    const g = ctx.game;
    const body = h('div.dig',
      h('div.sheet-title', '⛏️ Creuser une nouvelle salle'),
      h('div.palette-grid', BUILDABLE_ROOMS.filter((r) => g.dungeon.isRoomUnlocked(r.id)).map((r) => {
        const check = g.dungeon.canBuild(fi, x, y, r.id);
        return RoomCard({
          id: r.id, name: r.name, icon: r.icon, texture: `floor_${r.id}`, cost: g.dungeon.buildCost(fi, r.id),
          locked: !check.ok && check.reason !== 'Ressources insuffisantes', lockText: check.reason,
          info: r.capacity ? `👹 ${r.capacity}` : '',
          onClick: () => {
            const res = g.dungeon.build(fi, x, y, r.id);
            if (!res.ok) {
              sfx('error');
              ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
              return;
            }
            ctx.ui.closeSheet();
            ctx.ui.toasts.show(`${r.name} construite !`, { icon: r.icon, type: 'success' });
            const sc = this.scene();
            if (sc) {
              sc.fx.buildPuff(sc.cellCenter(x, y), sc.T);
              sc.clearSelection();
            }
          },
        });
      })),
      h('div.muted.small.center', `${BUILDABLE_ROOMS.length - BUILDABLE_ROOMS.filter((r) => g.dungeon.isRoomUnlocked(r.id)).length} salles à débloquer par la Recherche.`),
    );
    ctx.ui.openSheet(body, { onClose: () => this.scene()?.clearSelection() });
  }

  showBossResult(result, onClose) {
    showBossResult(result, onClose);
  }
}

