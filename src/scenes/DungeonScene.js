import Phaser from 'phaser';
import { ctx, sfx } from '../ui/context.js';
import { ROOMS } from '../data/rooms.js';
import { ELEMENTS } from '../data/elements.js';
import { STATUSES } from '../data/statuses.js';
import { getSpecies } from '../data/monsters.js';
import { RARITY_INFO, FONT_TITLE, FONT_BODY } from '../utils/constants.js';
import { cellKey } from '../utils/helpers.js';
import { formatShort } from '../utils/format.js';
import { ECONOMY } from '../config/economy.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { FxKit } from './FxKit.js';

const HUD_STRIP = 112; // hauteur (px CSS) réservée au bandeau de raid au-dessus de la navigation
const ROCK_DEPTH = 0.2;

/**
 * DUNGEON SCENE
 * Affiche l'étage courant en 2.5D (roche en relief, salles creusées, lumières),
 * gère la construction tactile et rejoue les raids calculés par RaidSystem.
 */
export class DungeonScene extends Phaser.Scene {
  constructor() {
    super('Dungeon');
  }

  create() {
    this.g = ctx.game;
    this.S = this.registry.get('dpr') || 1;
    this.mode = 'view';
    this.buildSel = null;
    this.moveFrom = null;
    this.fi = this.g.viewFloor;
    this.monsterViews = new Map();
    this.unitViews = new Map();
    this.cellObjects = [];
    this.ambient = [];
    this.raid = null;
    this.highlights = [];

    this.cameras.main.setBackgroundColor('#0a0708');
    this.bgLayer = this.add.layer().setDepth(-100);
    this.gridLayer = this.add.layer().setDepth(0);
    this.entityLayer = this.add.layer().setDepth(1000);
    this.fxLayer = this.add.layer().setDepth(2000);
    this.overLayer = this.add.layer().setDepth(3000);

    this.fx = new FxKit(this, this.fxLayer, this.S);
    this.buildBackground();
    this.layout();
    this.buildGrid();

    const bus = this.g.bus;
    bus.on('dungeonChanged', (fi) => {
      if (fi === undefined || fi === this.fi) this.queueRebuild();
    }, this);
    bus.on('monstersChanged', () => this.queueRebuild(), this);
    bus.on('viewFloorChanged', (fi) => this.changeFloor(fi), this);
    bus.on('floorsChanged', () => this.changeFloor(this.g.viewFloor, true), this);
    bus.on('raidStart', (d) => {
      if (d.floor === this.fi) this.beginRaid(d.raid);
    }, this);
    bus.on('raidEnd', (d) => this.onRaidApplied(d), this);
    bus.on('hud:build', (sel) => this.setBuildMode(sel), this);
    bus.on('hud:move', (from) => this.setMoveMode(from), this);
    bus.on('hud:cancelMode', () => this.setMode('view'), this);
    bus.on('stateLoaded', () => this.changeFloor(this.g.viewFloor, true), this);
    bus.on('sheetChanged', () => this.refit(), this);
    bus.on('biomeChanged', (fi) => {
      if (fi === this.fi) this.changeFloor(this.fi, true);
    }, this);

    // Zoom / déplacement (V2) : pincement à deux doigts, glisser, molette, boutons du HUD
    this.zoom = 1;
    this.input.on('pointerdown', (p) => {
      this.downAt = { x: p.x, y: p.y, t: p.downTime };
      this.dragFrom = { x: p.x, y: p.y };
      this.dragging = false;
      const ps = this.activePointers();
      if (ps.length >= 2) {
        this.pinch = { d: this.pointerDist(ps), z: this.zoom };
        this.downAt = null;
      }
    });
    this.input.on('pointermove', (p) => this.onPointerMove(p));
    this.input.on('pointerup', (p) => {
      if (this.pinch && this.activePointers().length < 2) {
        this.pinch = null;
        this.downAt = null;
        return;
      }
      if (this.dragging) {
        this.dragging = false;
        this.downAt = null;
        return;
      }
      this.onPointerUp(p);
    });
    this.input.on('wheel', (p, objs, dx, dy) => this.setZoom(this.zoom * (dy > 0 ? 0.9 : 1.1), p.x, p.y));
    bus.on('hud:zoom', (dir) => {
      const { width, height } = this.scale;
      if (dir === 0) this.setZoom(1);
      else this.setZoom(this.zoom * (dir > 0 ? 1.35 : 1 / 1.35), width / 2, height / 2);
    }, this);

    this.scale.on('resize', this.onResize, this);
    this.events.on('wake', this.onWake, this);
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());

    this.ambientTimer = this.time.addEvent({ delay: 280, loop: true, callback: () => this.emitAmbient() });
    ctx.audio?.playMusic(this.g.biomes.get(this.fi).music);
    this.cameras.main.fadeIn(350, 0, 0, 0);
    // Reprendre un raid déjà en cours (retour d'un autre écran)
    this.syncRaid();
  }

  cleanup() {
    this.g.bus.offContext(this);
    this.scale.off('resize', this.onResize, this);
  }

  onWake() {
    ctx.audio?.playMusic(this.g.biomes.get(this.fi).music);
    if (this.fi !== this.g.viewFloor) this.changeFloor(this.g.viewFloor, true);
    else if (this.rebuildPending) this.rebuildNow();
    this.layoutDirty = true;
    this.syncRaid();
  }

  onResize() {
    this.layoutDirty = true;
  }

  /** Recadre la grille si la zone visible a changé (feuille ouverte/fermée). */
  refit() {
    if (!this.sys.isActive()) return;
    const prev = this.T;
    const prevY = this.y0;
    this.layout();
    if (this.T !== prev || this.y0 !== prevY) this.rebuildNow();
  }

  // ------------------------------------------------------------------ zoom & déplacement
  activePointers() {
    return this.input.manager.pointers.filter((pt) => pt.isDown);
  }

  pointerDist(ps) {
    return Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
  }

  onPointerMove(p) {
    if (!p.isDown) return;
    const ps = this.activePointers();
    if (this.pinch && ps.length >= 2) {
      const mx = (ps[0].x + ps[1].x) / 2;
      const my = (ps[0].y + ps[1].y) / 2;
      this.setZoom(this.pinch.z * (this.pointerDist(ps) / Math.max(1, this.pinch.d)), mx, my);
      return;
    }
    if (!this.dragFrom || this.zoom <= 1.001) return;
    const dx = p.x - this.dragFrom.x;
    const dy = p.y - this.dragFrom.y;
    if (!this.dragging && Math.hypot(dx, dy) < 12 * this.S) return;
    this.dragging = true;
    const cam = this.cameras.main;
    cam.scrollX -= dx / this.zoom;
    cam.scrollY -= dy / this.zoom;
    this.dragFrom = { x: p.x, y: p.y };
    this.clampCamera();
  }

  /** Zoom (1 = vue d'ensemble) en gardant le point (fx, fy) de l'écran fixe. */
  setZoom(z, fx = null, fy = null) {
    const cam = this.cameras.main;
    const nz = Phaser.Math.Clamp(z, 1, 2.6);
    if (fx !== null) {
      const before = cam.getWorldPoint(fx, fy);
      cam.setZoom(nz);
      cam.preRender();
      const after = cam.getWorldPoint(fx, fy);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
    } else cam.setZoom(nz);
    this.zoom = nz;
    if (nz <= 1.001) cam.setScroll(0, 0);
    this.clampCamera();
    this.g.bus.emit('dungeonZoom', nz);
  }

  /** La vue zoomée reste sur la grille. */
  clampCamera() {
    const cam = this.cameras.main;
    const f = this.g.dungeon.floor(this.fi);
    if (!f || this.zoom <= 1.001) {
      cam.setScroll(0, 0);
      return;
    }
    const { width: W, height: H } = this.scale;
    const hw = W / (2 * this.zoom);
    const hh = H / (2 * this.zoom);
    const gx0 = this.x0 - this.T * 0.5;
    const gx1 = this.x0 + f.cols * this.T + this.T * 0.5;
    const gy0 = this.y0 - this.T;
    const gy1 = this.y0 + f.rows * this.T + this.T * 0.5;
    const clamp = (c, a, b, mid) => (a > b ? mid : Phaser.Math.Clamp(c, a, b));
    const cx = clamp(cam.scrollX + W / 2, Math.min(gx0 + hw, W / 2), Math.max(gx1 - hw, W / 2), W / 2);
    const cy = clamp(cam.scrollY + H / 2, Math.min(gy0 + hh, H / 2), Math.max(gy1 - hh, H / 2), H / 2);
    cam.setScroll(cx - W / 2, cy - H / 2);
  }

  /** Coordonnées monde d'un point de l'écran. */
  worldPoint(p) {
    return this.cameras.main.getWorldPoint(p.x, p.y);
  }

  // ------------------------------------------------------------------ fond
  buildBackground() {
    const { width, height } = this.scale;
    const theme = this.g.dungeon.def(this.fi).theme;
    this.bgLayer.removeAll(true);
    this.vignette?.destroy();
    this.bgFar = this.add.tileSprite(0, 0, width, height, `bg_${theme}`).setOrigin(0);
    this.bgFar.tileScaleX = this.bgFar.tileScaleY = 2.2 * this.S;
    this.bgFar.setAlpha(0.9);
    this.bgNear = this.add.tileSprite(0, 0, width, height, `bg_${theme}`).setOrigin(0).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    this.bgNear.tileScaleX = this.bgNear.tileScaleY = 3.5 * this.S;
    this.vignette = this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width * 1.15, height * 1.1).setAlpha(0.75).setDepth(900);
    for (const o of [this.bgFar, this.bgNear, this.vignette]) o.setScrollFactor(0);
    this.bgLayer.add([this.bgFar, this.bgNear]);
    this.overLayer.removeAll(true);
    // Poussières flottantes
    if (this.dust) this.dust.destroy();
    if (this.g.state.settings.quality !== 'low') {
      this.dust = this.add.particles(0, 0, 'p_ember', {
        x: { min: 0, max: width }, y: { min: 0, max: height },
        lifespan: 6000, speedX: { min: -8, max: 8 }, speedY: { min: -14, max: -4 },
        scale: { start: 0.6 * this.S, end: 0.1 }, alpha: { start: 0, end: 0.7, ease: 'Sine.easeInOut' },
        tint: this.themeLight(), frequency: 220, blendMode: 'ADD',
      });
      this.dust.setScrollFactor(0);
      this.overLayer.add(this.dust);
    }
    this.buildBiomeAmbience();
  }

  /** Ambiance du biome (V2) : voile coloré + particules propres (neige, braises, spores…). */
  buildBiomeAmbience() {
    const { width, height } = this.scale;
    const b = this.g.biomes.get(this.fi);
    this.biomeTint?.destroy();
    this.biomeFx?.destroy();
    this.biomeTint = this.add.rectangle(0, 0, width, height, b.tint, 0.11).setOrigin(0).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
    this.overLayer.add(this.biomeTint);
    if (this.g.state.settings.quality === 'low' || this.g.state.settings.performanceMode) return;
    const S = this.S;
    const P = {
      snow: { y: { min: -20, max: 0 }, speedY: { min: 20, max: 55 }, speedX: { min: -15, max: 15 }, tint: [0xffffff, 0xd8f4ff], scale: { start: 0.5 * S, end: 0.3 * S }, alpha: { start: 0.9, end: 0.2 }, lifespan: 12000, frequency: 140 },
      embers: { y: height + 10, speedY: { min: -60, max: -25 }, speedX: { min: -10, max: 10 }, tint: [0xff6a2b, 0xffcc33], scale: { start: 0.6 * S, end: 0 }, alpha: { start: 0.9, end: 0 }, lifespan: 7000, frequency: 160, blendMode: 'ADD' },
      spores: { y: { min: 0, max: height }, speedY: { min: -12, max: -4 }, speedX: { min: -6, max: 6 }, tint: [0x8fe04a, 0xc6ff4a], scale: { start: 0.5 * S, end: 0.2 * S }, alpha: { start: 0, end: 0.7, ease: 'Sine.easeInOut' }, lifespan: 8000, frequency: 260, blendMode: 'ADD' },
      sand: { x: -10, y: { min: 0, max: height }, speedX: { min: 40, max: 90 }, speedY: { min: -5, max: 5 }, tint: [0xffd27a, 0xe0b060], scale: { start: 0.35 * S, end: 0.2 * S }, alpha: { start: 0.6, end: 0 }, lifespan: 9000, frequency: 120 },
      leaves: { y: -10, speedY: { min: 18, max: 40 }, speedX: { min: -25, max: 25 }, tint: [0x6bc04a, 0xa0d050, 0xc08a3a], scale: { start: 0.55 * S, end: 0.4 * S }, rotate: { min: 0, max: 360 }, alpha: { start: 0.8, end: 0.1 }, lifespan: 12000, frequency: 520 },
      wisps: { y: { min: 0, max: height }, speedY: { min: -20, max: -8 }, speedX: { min: -8, max: 8 }, tint: [0x9b6bff, 0x6ff0ff], scale: { start: 0.8 * S, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 6000, frequency: 420, blendMode: 'ADD' },
      stars: { y: { min: 0, max: height }, speedY: 0, speedX: 0, tint: [0xffffff, 0x9fb0ff, 0xff9ce1], scale: { start: 0.5 * S, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 2500, frequency: 180, blendMode: 'ADD' },
      glitch: { y: { min: 0, max: height }, speedX: { min: -120, max: 120 }, speedY: 0, tint: [0xff5ce1, 0x3cf2d0], scale: { start: 0.7 * S, end: 0.1 * S }, alpha: { start: 0.8, end: 0 }, lifespan: 900, frequency: 200, blendMode: 'ADD' },
    }[b.particles];
    if (!P) return;
    this.biomeFx = this.add.particles(0, 0, 'p_ember', { x: { min: 0, max: width }, ...P }).setScrollFactor(0);
    this.overLayer.add(this.biomeFx);
  }

  themeLight() {
    const theme = this.g.dungeon.def(this.fi).theme;
    return { cave: 0xffb060, crypt: 0x9fd0ff, fortress: 0xffd080, citadel: 0xff6a2b, demonic: 0xff3a3a, dimensional: 0xff5ce1, infinite: 0x3cf2d0 }[theme] || 0xffb060;
  }

  // ------------------------------------------------------------------ disposition
  layout() {
    const S = this.S;
    const { width: W, height: H } = this.scale;
    const ins = ctx.ui.insets();
    const f = this.g.dungeon.floor(this.fi);
    const top = (ins.top + 10) * S;
    const bottom = H - Math.max(ins.bottom + HUD_STRIP, ins.sheet + 8) * S;
    const availW = W - 2 * 14 * S;
    const availH = Math.max(100, bottom - top);
    const T = Math.floor(Math.min(availW / (f.cols + 0.5), availH / (f.rows + 0.75), 150 * S));
    this.T = T;
    this.x0 = Math.round((W - f.cols * T) / 2);
    this.y0 = Math.round(top + T * 0.4 + (availH - (f.rows + 0.75) * T) / 2);
    this.layoutDirty = false;
  }

  cellCenter(x, y) {
    return { x: this.x0 + (x + 0.5) * this.T, y: this.y0 + (y + 0.5) * this.T };
  }

  toCell(px, py) {
    const x = Math.floor((px - this.x0) / this.T);
    const y = Math.floor((py - this.y0) / this.T);
    return { x, y };
  }

  // ------------------------------------------------------------------ grille
  queueRebuild() {
    if (!this.sys.isActive()) {
      this.rebuildPending = true;
      return;
    }
    if (this.rebuildTimer) return;
    this.rebuildTimer = this.time.delayedCall(30, () => {
      this.rebuildTimer = null;
      this.rebuildNow();
    });
  }

  rebuildNow() {
    this.rebuildPending = false;
    this.endRaidVisuals(true);
    this.layout();
    this.buildGrid();
    this.clampCamera();
    this.syncRaid();
  }

  changeFloor(fi, force = false) {
    if (fi === this.fi && !force) return;
    if (fi !== this.fi) this.setZoom(1);
    this.fi = fi;
    ctx.audio?.playMusic(this.g.biomes.get(fi).music);
    this.endRaidVisuals(true);
    this.setMode('view');
    this.buildBackground();
    this.layout();
    this.buildGrid();
    this.cameras.main.flash(200, 0, 0, 0);
    this.syncRaid();
  }

  buildGrid() {
    for (const o of this.cellObjects) {
      this.tweens.killTweensOf(o);
      o.destroy();
    }
    this.cellObjects = [];
    this.ambient = [];
    for (const mv of this.monsterViews.values()) {
      this.tweens.killTweensOf([mv.spr, mv.aura].filter(Boolean));
      mv.hp?.destroy();
    }
    this.monsterViews.clear();
    this.entityLayer.removeAll(true);
    this.unitViews.clear();
    this.trapViews = {};
    this.clearHighlights();

    const f = this.g.dungeon.floor(this.fi);
    if (!f) return;
    const theme = this.g.dungeon.def(this.fi).theme;
    const T = this.T;
    const d = T * ROCK_DEPTH;
    const add = (o, depth) => {
      o.setDepth(depth);
      this.gridLayer.add(o);
      this.cellObjects.push(o);
      return o;
    };

    // Cadre : une couronne de roche autour de la grille
    for (let y = -1; y <= f.rows; y++) {
      for (let x = -1; x <= f.cols; x++) {
        const c = this.cellCenter(x, y);
        const inside = x >= 0 && y >= 0 && x < f.cols && y < f.rows;
        const cell = inside ? f.cells[cellKey(x, y)] : null;
        const v = Math.abs((x * 7 + y * 13) % 4);
        const base = (y + 1) * 10;
        if (cell) {
          const rd = ROOMS[cell.room];
          add(this.add.image(c.x, c.y, `floor_${cell.room}`).setDisplaySize(T + 1, T + 1), base);
          add(this.add.image(c.x, c.y, 'tile_shade').setDisplaySize(T + 1, T + 1).setAlpha(0.7), base + 1);
          this.decorateRoom(cell, rd, c, x, y, base, add);
        } else {
          const rock = add(this.add.image(c.x, c.y - d, `rock_${theme}_${v}`).setDisplaySize(T + 1, T + 1), base + 5);
          rock.setTint(this.rockLight(f, x, y));
          const below = y + 1 < f.rows && x >= 0 && x < f.cols && y + 1 >= 0 ? f.cells[cellKey(x, y + 1)] : null;
          if (below || (inside && y === f.rows - 1)) {
            add(this.add.image(c.x, c.y + T / 2 - d / 2, `rockfront_${theme}_${v}`).setDisplaySize(T + 1, d), base + 6);
            // ombre portée sur la salle du dessous
            if (below) add(this.add.image(c.x, c.y + T / 2 + d * 0.35, 'shadow').setDisplaySize(T * 1.1, d * 1.2).setAlpha(0.8), base + 12);
          }
        }
      }
    }
    this.placeMonsters();
    this.applyModeHighlights();
  }

  /** Éclairage : la roche proche des salles est éclairée, la roche lointaine se perd dans l'ombre. */
  rockLight(f, x, y) {
    let best = 9;
    for (const key of Object.keys(f.cells)) {
      const [cx, cy] = key.split(',').map(Number);
      best = Math.min(best, Math.max(Math.abs(cx - x), Math.abs(cy - y)));
    }
    return [0xffffff, 0xf0e4d8, 0xb4aaa0, 0x8a827a, 0x6e6862][Math.min(4, best)];
  }

  decorateRoom(cell, rd, c, x, y, base, add) {
    const T = this.T;
    const S = this.S;
    // Lumières d'ambiance
    const lights = {
      lava: [0xff6a2b, 0.45], core: [0xffcc33, 0.35], dimensional: [0xff5ce1, 0.5], toxic: [0x8fe04a, 0.3],
      frozen: [0x9fe6ff, 0.3], lab: [0x3cf2d0, 0.3], storm: [0xffe14d, 0.3], sanctum: [0xfff3b0, 0.35], entrance: [0xffb060, 0.3],
      crypt: [0x9b6bff, 0.3], forge: [0xff9c4a, 0.35], grove: [0x6bff8a, 0.22], treasure: [0xffcc33, 0.3], combat: [0xff7040, 0.3], basic: [0xffb060, 0.3],
      training: [0xffb060, 0.28], mutation: [0x7affc0, 0.4], arena: [0xffd84a, 0.3], cursed: [0xff2040, 0.45], portal: [0x7a8aff, 0.5], master: [0xffe08a, 0.4],
    };
    const l = lights[cell.room];
    if (l && this.g.state.settings.quality !== 'low') {
      const glow = add(this.add.image(c.x, c.y, 'glow').setDisplaySize(T * 1.6, T * 1.6).setTint(l[0]).setAlpha(l[1]).setBlendMode(Phaser.BlendModes.ADD), base + 3);
      this.tweens.add({ targets: glow, alpha: l[1] * 0.55, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.ambient.push({ room: cell.room, x: c.x, y: c.y });
    }
    if (cell.room === 'portal') {
      const ring = add(this.add.image(c.x, c.y - T * 0.04, 'p_ring').setDisplaySize(T * 0.5, T * 0.62).setTint(0x9fb0ff).setBlendMode(Phaser.BlendModes.ADD), base + 4);
      this.tweens.add({ targets: ring, angle: -360, duration: 5000, repeat: -1 });
    }
    if (cell.room === 'dimensional') {
      const ring = add(this.add.image(c.x, c.y, 'p_ring').setDisplaySize(T * 0.6, T * 0.6).setTint(0xff5ce1).setBlendMode(Phaser.BlendModes.ADD), base + 4);
      this.tweens.add({ targets: ring, angle: 360, duration: 4000, repeat: -1 });
    }
    // Décoration (V2, cosmétique)
    const deco = this.g.dungeon.floor(this.fi)?.decor?.[cellKey(x, y)];
    if (deco && this.textures.exists(`decor_${deco}`)) {
      add(this.add.image(c.x + T * 0.3, c.y + T * 0.24, `decor_${deco}`).setDisplaySize(T * 0.38, T * 0.38), base + 22);
    }
    // Synergies actives (V2)
    const synCount = this.g.dungeon.synergiesAt(this.fi, x, y).length;
    if (synCount) {
      const st = add(this.add.text(c.x - T / 2 + 4 * S, c.y - T / 2 + 2 * S, synCount > 1 ? `⭐${synCount}` : '⭐', {
        fontFamily: FONT_BODY, fontStyle: 'bold', fontSize: `${Math.round(T * 0.15)}px`, color: '#ffe14d', stroke: '#1b1216', strokeThickness: 3 * S,
      }).setOrigin(0, 0), base + 31);
      st.setShadow(0, 1 * S, '#000', 3 * S, true, true);
    }
    // Niveau de la salle
    if (!rd.special) {
      const lvl = add(this.add.text(c.x + T / 2 - 4 * S, c.y - T / 2 + 4 * S, `${cell.level}`, {
        fontFamily: FONT_TITLE, fontSize: `${Math.round(T * 0.16)}px`, color: '#ffe6a8', stroke: '#1b1216', strokeThickness: 4 * S, fontStyle: 'bold',
      }).setOrigin(1, 0), base + 30);
      lvl.setShadow(0, 2 * S, '#000', 4 * S, true, true);
    }
    // Piège
    if (cell.trap) {
      const tp = add(this.add.image(c.x - T * 0.3, c.y + T * 0.28, `trap_${cell.trap.id}`).setDisplaySize(T * 0.34, T * 0.34), base + 25);
      this.trapViews[cellKey(x, y)] = tp;
      const syn = this.g.traps.synergiesAt(this.fi, x, y);
      if (syn.length) {
        const ring = add(this.add.image(tp.x, tp.y, 'p_ring').setDisplaySize(T * 0.42, T * 0.42).setTint(0xb56cff).setBlendMode(Phaser.BlendModes.ADD), base + 24);
        this.tweens.add({ targets: ring, scale: ring.scale * 1.15, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
      }
    }
  }

  slotOffsets(n) {
    switch (n) {
      case 0:
        return [];
      case 1:
        return [[0.1, -0.02]];
      case 2:
        return [[-0.12, -0.08], [0.2, 0.06]];
      case 3:
        return [[-0.18, -0.12], [0.22, -0.1], [0.04, 0.14]];
      default:
        return [[-0.18, -0.16], [0.2, -0.16], [-0.18, 0.12], [0.2, 0.12]];
    }
  }

  placeMonsters() {
    const T = this.T;
    const list = this.g.state.monsters.filter((m) => m.location && m.location.floor === this.fi);
    const byCell = {};
    for (const m of list) (byCell[cellKey(m.location.x, m.location.y)] ||= []).push(m);
    for (const [key, ms] of Object.entries(byCell)) {
      const [x, y] = key.split(',').map(Number);
      const c = this.cellCenter(x, y);
      const offs = this.slotOffsets(ms.length);
      ms.forEach((m, i) => {
        const sp = getSpecies(m.speciesId);
        const o = offs[i] || [0, 0];
        const px = c.x + o[0] * T;
        const py = c.y + o[1] * T;
        const size = T * (ms.length > 2 ? 0.46 : ms.length > 1 ? 0.52 : 0.62) * Math.min(1.35, sp.size || 1);
        const depth = (y + 1) * 10 + 8 + i * 0.1;
        const shadow = this.add.image(px, py + size * 0.42, 'shadow').setDisplaySize(size * 0.8, size * 0.22).setDepth(depth);
        let aura = null;
        const rIdx = ['epic', 'legendary', 'mythic', 'ancient'].indexOf(sp.rarity);
        if (rIdx >= 0 && this.g.state.settings.quality !== 'low') {
          aura = this.add.image(px, py, 'glow').setDisplaySize(size * 1.3, size * 1.3).setTint(RARITY_INFO[sp.rarity].glow).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
          this.tweens.add({ targets: aura, alpha: 0.15, duration: 1200, yoyo: true, repeat: -1 });
        }
        const spr = this.add.image(px, py, SpriteFactory.monsterKey(sp.id, m.skin)).setDisplaySize(size, size).setDepth(depth + 0.05).setFlipX(true);
        this.entityLayer.add([shadow, ...(aura ? [aura] : []), spr]);
        const bob = this.tweens.add({ targets: spr, y: py - size * 0.04, scaleY: spr.scaleY * 0.97, duration: 700 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 400 });
        this.monsterViews.set(m.uid, { spr, shadow, aura, baseX: px, baseY: py, size, bob, cell: { x, y }, depth });
      });
    }
  }

  // ------------------------------------------------------------------ modes et surbrillances
  setMode(mode) {
    this.mode = mode;
    this.previewAt = null;
    if (mode !== 'build') this.buildSel = null;
    if (mode !== 'move') this.moveFrom = null;
    this.applyModeHighlights();
    this.g.bus.emit('dungeonMode', mode);
  }

  setBuildMode(sel) {
    this.buildSel = sel;
    this.previewAt = null;
    this.mode = sel ? 'build' : 'view';
    this.applyModeHighlights();
  }

  setMoveMode(from) {
    this.moveFrom = from;
    this.mode = 'move';
    this.applyModeHighlights();
  }

  clearHighlights() {
    for (const h of this.highlights) {
      this.tweens.killTweensOf(h);
      h.destroy();
    }
    this.highlights = [];
  }

  applyModeHighlights() {
    this.clearHighlights();
    const f = this.g.dungeon.floor(this.fi);
    if (!f) return;
    const T = this.T;
    const mark = (x, y, color, label = '+') => {
      const c = this.cellCenter(x, y);
      const r = this.add.rectangle(c.x, c.y, T - 6 * this.S, T - 6 * this.S, color, 0.22).setStrokeStyle(3 * this.S, color, 0.9).setDepth(2500);
      const t = this.add.text(c.x, c.y, label, { fontFamily: FONT_BODY, fontSize: `${Math.round(T * 0.3)}px`, color: '#ffffff', stroke: '#000', strokeThickness: 4 * this.S }).setOrigin(0.5).setDepth(2501);
      this.tweens.add({ targets: r, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
      this.highlights.push(r, t);
    };
    if (this.mode === 'build' && this.buildSel?.type === 'room') {
      for (let y = 0; y < f.rows; y++) {
        for (let x = 0; x < f.cols; x++) {
          if (f.cells[cellKey(x, y)]) continue;
          if (!this.g.dungeon.hasRoomNeighbor(this.fi, x, y)) continue;
          const ok = this.g.dungeon.canBuild(this.fi, x, y, this.buildSel.id);
          const syn = ok.ok ? this.g.dungeon.previewSynergies(this.fi, x, y, this.buildSel.id).length : 0;
          mark(x, y, ok.ok ? (syn ? 0xffd84a : 0x6bff8a) : 0xff5a5a, ok.ok ? (syn ? '⭐' : '+') : '✕');
        }
      }
      // Aperçu : salle fantôme + liens de synergie
      const pv = this.previewAt;
      if (pv && pv.id === this.buildSel.id) {
        const c = this.cellCenter(pv.x, pv.y);
        const ghost = this.add.image(c.x, c.y, `floor_${pv.id}`).setDisplaySize(T * 0.92, T * 0.92).setAlpha(0.75).setDepth(2502);
        const sel = this.add.image(c.x, c.y, 'cell_select').setDisplaySize(T, T).setTint(0xffd84a).setDepth(2503);
        this.tweens.add({ targets: [ghost, sel], alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
        this.highlights.push(ghost, sel);
        for (const s of this.g.dungeon.previewSynergies(this.fi, pv.x, pv.y, pv.id)) {
          const other = s.x === pv.x && s.y === pv.y ? s.partner : { x: s.x, y: s.y };
          if (!other) continue;
          const o = this.cellCenter(other.x, other.y);
          const line = this.add.line(0, 0, c.x, c.y, o.x, o.y, 0xffe14d, 0.9).setOrigin(0).setLineWidth(4 * this.S).setDepth(2504);
          const star = this.add.text((c.x + o.x) / 2, (c.y + o.y) / 2, '⭐', { fontSize: `${Math.round(T * 0.28)}px` }).setOrigin(0.5).setDepth(2505);
          this.tweens.add({ targets: star, scale: 1.25, duration: 450, yoyo: true, repeat: -1 });
          this.highlights.push(line, star);
        }
      }
    } else if (this.mode === 'build' && this.buildSel?.type === 'trap') {
      for (const r of this.g.dungeon.roomCells(this.fi)) {
        if (r.cell.trap || !ROOMS[r.cell.room].trapSlots) continue;
        const ok = this.g.traps.canPlace(this.fi, r.x, r.y, this.buildSel.id);
        mark(r.x, r.y, ok.ok ? 0xffb52e : 0xff5a5a, ok.ok ? '🧨' : '✕');
      }
    } else if (this.mode === 'move' && this.moveFrom) {
      const src = this.cellCenter(this.moveFrom.x, this.moveFrom.y);
      const sel = this.add.image(src.x, src.y, 'cell_select').setDisplaySize(T, T).setTint(0x4fa3ff).setDepth(2500);
      this.highlights.push(sel);
      for (let y = 0; y < f.rows; y++) {
        for (let x = 0; x < f.cols; x++) {
          if (f.cells[cellKey(x, y)]) continue;
          const ok = this.g.dungeon.canMove(this.fi, this.moveFrom.x, this.moveFrom.y, x, y);
          if (ok.ok) mark(x, y, 0x4fa3ff, '⇢');
        }
      }
    } else {
      // Indices de creusage discrets autour du donjon
      for (let y = 0; y < f.rows; y++) {
        for (let x = 0; x < f.cols; x++) {
          if (f.cells[cellKey(x, y)] || !this.g.dungeon.hasRoomNeighbor(this.fi, x, y)) continue;
          const c = this.cellCenter(x, y);
          const t = this.add.text(c.x, c.y - T * ROCK_DEPTH, '⛏️', { fontSize: `${Math.round(T * 0.26)}px` }).setOrigin(0.5).setAlpha(0.3).setDepth(2400);
          this.tweens.add({ targets: t, alpha: 0.6, duration: 1100, yoyo: true, repeat: -1, delay: (x + y) * 120 });
          this.highlights.push(t);
        }
      }
    }
    if (this.mode === 'view' && this.selected) {
      const c = this.cellCenter(this.selected.x, this.selected.y);
      const sel = this.add.image(c.x, c.y, 'cell_select').setDisplaySize(T, T).setTint(0xffcc33).setDepth(2500);
      this.tweens.add({ targets: sel, alpha: 0.5, duration: 500, yoyo: true, repeat: -1 });
      this.highlights.push(sel);
    }
  }

  // ------------------------------------------------------------------ interactions
  onPointerUp(p) {
    if (!this.downAt) return;
    const moved = Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y);
    this.downAt = null;
    if (moved > 18 * this.S) return;
    if (ctx.ui.modals.isOpen()) return;
    const wp = this.worldPoint(p);
    const { x, y } = this.toCell(wp.x, wp.y);
    const f = this.g.dungeon.floor(this.fi);
    if (x < 0 || y < 0 || x >= f.cols || y >= f.rows) {
      if (this.selected) {
        this.selected = null;
        ctx.ui.closeSheet();
        this.applyModeHighlights();
      }
      return;
    }
    const cell = f.cells[cellKey(x, y)];
    if (this.mode === 'build' && this.buildSel) {
      if (this.buildSel.type === 'room' && !cell) {
        // Premier toucher : aperçu (synergies, coût). Second toucher sur la même case : construction.
        const pv = this.previewAt;
        if (pv && pv.x === x && pv.y === y && pv.id === this.buildSel.id) return this.confirmBuild(x, y);
        if (!this.g.dungeon.hasRoomNeighbor(this.fi, x, y)) {
          ctx.ui.toasts.show('Creusez à côté d’une salle existante.', { icon: '⛏️', duration: 1600 });
          return;
        }
        sfx('click');
        this.previewAt = { x, y, id: this.buildSel.id };
        this.applyModeHighlights();
        ctx.ui.hud.showPreview(this.fi, x, y, this.buildSel.id);
        return;
      }
      if (this.buildSel.type === 'trap' && cell) {
        const res = this.g.traps.place(this.fi, x, y, this.buildSel.id);
        this.feedback(res, x, y, '🧨 Piège installé !');
        return;
      }
    }
    if (this.mode === 'move' && this.moveFrom) {
      if (!cell) {
        const res = this.g.dungeon.move(this.fi, this.moveFrom.x, this.moveFrom.y, x, y);
        this.feedback(res, x, y, '↔️ Salle déplacée');
        if (res.ok) {
          this.setMode('view');
          this.g.bus.emit('dungeonMode', 'view');
        }
      } else {
        this.setMode('view');
      }
      return;
    }
    sfx('click');
    this.selected = { x, y };
    this.applyModeHighlights();
    if (cell) ctx.ui.hud.openCell(this.fi, x, y);
    else if (this.g.dungeon.hasRoomNeighbor(this.fi, x, y)) ctx.ui.hud.openDig(this.fi, x, y);
    else {
      ctx.ui.toasts.show('Creusez à côté d’une salle existante.', { icon: '⛏️', duration: 1600 });
      this.selected = null;
      this.applyModeHighlights();
    }
  }

  confirmBuild(x, y) {
    if (!this.buildSel || this.buildSel.type !== 'room') return;
    const res = this.g.dungeon.build(this.fi, x, y, this.buildSel.id);
    this.feedback(res, x, y, `${ROOMS[this.buildSel.id].icon} Construit !`);
    if (res.ok) {
      this.fx.buildPuff(this.cellCenter(x, y), this.T);
      const syn = this.g.dungeon.synergiesAt(this.fi, x, y);
      if (syn.length) this.time.delayedCall(250, () => this.fx.floatText(this.cellCenter(x, y).x, this.cellCenter(x, y).y - this.T * 0.6, `⭐ ${syn.map((s) => s.syn.name).join(' · ')}`, '#ffe14d', 1.1));
      this.previewAt = null;
      ctx.ui.hud.clearPreview();
    }
  }

  feedback(res, x, y, okText) {
    const c = this.cellCenter(x, y);
    if (res.ok) {
      this.fx.floatText(c.x, c.y - this.T * 0.3, okText, '#9cff8a', 1);
    } else {
      sfx('error');
      ctx.ui.toasts.show(res.reason || 'Impossible', { icon: '⛔', type: 'error', duration: 1800 });
    }
  }

  clearSelection() {
    this.selected = null;
    this.applyModeHighlights();
  }

  // ------------------------------------------------------------------ ambiance
  emitAmbient() {
    if (!this.ambient.length || this.g.state.settings.quality === 'low' || !this.sys.isVisible()) return;
    const a = this.ambient[Math.floor(Math.random() * this.ambient.length)];
    const T = this.T;
    const rx = a.x + (Math.random() - 0.5) * T * 0.7;
    const ry = a.y + (Math.random() - 0.5) * T * 0.6;
    switch (a.room) {
      case 'lava':
      case 'forge':
        this.fx.ember(rx, ry, 0xff8a2b, 2);
        break;
      case 'toxic':
        this.fx.bubble(rx, ry, 0x8fe04a);
        break;
      case 'frozen':
        this.fx.sparkle(rx, ry, 0xdff4ff);
        break;
      case 'dimensional':
        this.fx.sparkle(rx, ry, 0xff5ce1);
        break;
      case 'core':
      case 'treasure':
        this.fx.sparkle(rx, ry, 0xffe14d);
        break;
      case 'lab':
        this.fx.bubble(rx, ry, 0x3cf2d0);
        break;
      case 'storm':
        if (Math.random() < 0.3) this.fx.zap(rx, ry - T * 0.2, rx, ry + T * 0.2, 0xffe14d);
        break;
      case 'grove':
        this.fx.sparkle(rx, ry, 0x9cff8a);
        break;
      default:
        if (Math.random() < 0.3) this.fx.ember(rx, ry, 0xffb060, 1);
    }
  }

  // ------------------------------------------------------------------ raids
  /** Synchronise l'affichage avec le raid en cours de l'étage (après un retour à l'écran). */
  syncRaid() {
    const cur = this.g.raids.current(this.fi);
    if (!cur) {
      if (this.raid) this.endRaidVisuals(true);
      return;
    }
    if (!this.raid || this.raid.res !== cur) this.beginRaid(cur, true);
  }

  beginRaid(res, silent = false) {
    this.endRaidVisuals(true);
    this.raid = { res, idx: 0, combat: null, heroIds: [], ended: false, cell: null };
    if (!silent) {
      sfx('raid_start');
      const lvl = res.party.level;
      this.fx.banner(`⚔️ ${res.party.name} (niv. ${lvl})`, '#ffd27a');
    }
    // Avance rapide jusqu'au temps courant
    const rt = this.g.raids.rt(this.fi);
    this.advanceRaid(rt.elapsed, true);
  }

  endRaidVisuals(instant = false) {
    if (!this.raid) return;
    for (const [id, v] of this.unitViews) {
      if (v.side !== 'B') continue;
      this.tweens.killTweensOf(v.spr);
      if (instant) v.destroy();
      else {
        this.tweens.add({ targets: [v.spr, v.shadow], alpha: 0, duration: 400, onComplete: () => v.destroy() });
      }
      this.unitViews.delete(id);
    }
    // Restaure les monstres
    for (const [uid, mv] of this.monsterViews) {
      mv.spr.setAlpha(1).clearTint();
      mv.spr.setPosition(mv.baseX, mv.baseY);
      mv.hp?.destroy();
      mv.hp = null;
      mv.ko = false;
    }
    this.unitViews.clear();
    this.raid = null;
    this.g.bus.emit('raidVisual', null);
  }

  update(time, delta) {
    if (this.layoutDirty) this.rebuildNow();
    const dt = delta / 1000;
    if (this.bgFar) {
      this.bgFar.tilePositionX += dt * 3;
      this.bgNear.tilePositionX -= dt * 6;
      this.bgNear.tilePositionY += dt * 2;
    }
    if (this.raid) {
      const rt = this.g.raids.rt(this.fi);
      if (rt.current !== this.raid.res) {
        // Raid terminé (appliqué) ou remplacé
        if (!this.raid.ended) this.advanceRaid(Infinity, true);
        this.endRaidVisuals(false);
        if (rt.current) this.beginRaid(rt.current);
      } else {
        this.advanceRaid(rt.elapsed, false);
      }
    } else {
      const cur = this.g.raids.current(this.fi);
      if (cur) this.beginRaid(cur);
    }
  }

  speed() {
    return this.g.state.settings.speed || 1;
  }

  advanceRaid(elapsed, instant) {
    const r = this.raid;
    if (!r) return;
    const evs = r.res.events;
    let budget = instant ? Infinity : 40; // limite d'événements par image
    while (r.idx < evs.length && evs[r.idx].t <= elapsed && budget-- > 0) {
      this.handleEvent(evs[r.idx], instant || evs.length - r.idx > 200 && elapsed - evs[r.idx].t > 2);
      r.idx++;
    }
  }

  heroFormation(n, i) {
    const T = this.T;
    const cols = n > 3 ? 2 : 1;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rows = Math.ceil(n / cols);
    return { dx: -T * 0.22 - col * T * 0.16, dy: (row - (rows - 1) / 2) * T * (rows > 2 ? 0.22 : 0.26) };
  }

  handleEvent(ev, instant) {
    const r = this.raid;
    const T = this.T;
    const sp = this.speed();
    switch (ev.type) {
      case 'spawn': {
        const n = ev.units.length;
        ev.units.forEach((u, i) => this.createHeroView(u, i, n));
        r.heroIds = ev.units.map((u) => u.id);
        if (ev.anomaly && !instant) this.time.delayedCall(900, () => this.fx.banner(`${ev.anomaly.icon} Anomalie : ${ev.anomaly.name}`, '#ff9ce1'));
        break;
      }
      case 'move': {
        r.cell = { x: ev.x, y: ev.y };
        const c = this.cellCenter(ev.x, ev.y);
        const alive = r.heroIds.map((id) => this.unitViews.get(id)).filter((v) => v && v.alive);
        alive.forEach((v, i) => {
          const f = this.heroFormation(alive.length, i);
          const tx = c.x + f.dx + T * 0.08;
          const ty = c.y + f.dy;
          v.moveTo(tx, ty, instant ? 0 : (ECONOMY.raid.walkStepTime * 1000 * 0.9) / sp, this);
        });
        break;
      }
      case 'combatStart': {
        r.combat = { x: ev.x, y: ev.y };
        if (!instant) {
          const c = this.cellCenter(ev.x, ev.y);
          this.fx.burst(c.x, c.y, 0xff5a3a, 10);
          sfx('slash');
        }
        this.g.bus.emit('raidVisual', { combat: true, index: r.idx, cell: r.combat });
        break;
      }
      case 'start': {
        for (const u of ev.units) {
          if (u.side === 'A') {
            const mv = this.monsterViews.get(u.monsterUid || u.id);
            if (mv) {
              mv.maxHp = u.maxHp;
              mv.hpVal = u.hp;
              if (!mv.hp) mv.hp = this.fx.hpBar(mv.spr.x, mv.spr.y - mv.size * 0.55, T * 0.42, 0x5aff6a, mv.depth + 1);
              mv.hp.set(u.hp / u.maxHp);
              this.unitViews.set(u.id, this.monsterUnitAdapter(u.id, mv));
            }
          } else {
            const v = this.unitViews.get(u.id);
            if (v) v.setHp(u.hp, u.maxHp);
          }
        }
        break;
      }
      case 'act': {
        if (instant) break;
        const src = this.unitViews.get(ev.src);
        if (!src || !src.alive) break;
        const tgts = ev.targets.map((id) => this.unitViews.get(id)).filter(Boolean);
        this.fx.playSkill(src, tgts, ev, sp);
        break;
      }
      case 'dmg': {
        const v = this.unitViews.get(ev.tgt);
        if (!v) break;
        v.setHp(ev.hp);
        if (instant) break;
        const color = ev.dot ? (STATUSES[ev.statusId]?.color || '#c0ff80') : ev.crit ? '#ffe14d' : ev.element && ev.element !== 'neutral' ? ELEMENTS[ev.element].color : v.side === 'A' ? '#ff7a7a' : '#ffffff';
        this.fx.damageNumber(v.x(), v.y() - v.size * 0.4, ev.amount, color, ev.crit, ev.eff);
        if (!ev.dot) v.flash(this);
        if (ev.crit) {
          sfx('crit');
          this.fx.shake(120, 0.004);
        }
        break;
      }
      case 'heal': {
        const v = this.unitViews.get(ev.tgt);
        if (!v) break;
        v.setHp(ev.hp);
        if (!instant) {
          this.fx.damageNumber(v.x(), v.y() - v.size * 0.4, `+${formatShort(ev.amount)}`, '#6bff8a', false);
          this.fx.heal(v.x(), v.y());
        }
        break;
      }
      case 'miss': {
        const v = this.unitViews.get(ev.tgt);
        if (v && !instant) this.fx.floatText(v.x(), v.y() - v.size * 0.4, 'Esquive', '#c0d0ff', 0.7);
        break;
      }
      case 'reaction': {
        const v = this.unitViews.get(ev.tgt);
        if (v && !instant) {
          this.fx.floatText(v.x(), v.y() - v.size * 0.7, `${ev.icon} ${ev.name}`, ev.color || '#ffffff', 1);
          this.fx.burst(v.x(), v.y(), Phaser.Display.Color.HexStringToColor(ev.color || '#ffffff').color, 12);
        }
        break;
      }
      case 'combo': {
        if (!instant && ev.side === 'A' && this.raid) {
          const c = this.raid.cell ? this.cellCenter(this.raid.cell.x, this.raid.cell.y) : null;
          if (c) this.fx.floatText(c.x, c.y - this.T * 0.55, `🔥 ${ev.name} ×${ev.count}`, '#ffd84a', 0.9);
        }
        break;
      }
      case 'status': {
        const v = this.unitViews.get(ev.tgt);
        if (v && !instant && Math.random() < 0.6) this.fx.floatText(v.x() + v.size * 0.3, v.y() - v.size * 0.5, STATUSES[ev.id].icon, '#ffffff', 0.7);
        break;
      }
      case 'trap': {
        const tv = this.trapViews?.[cellKey(ev.cell.x, ev.cell.y)];
        const c = this.cellCenter(ev.cell.x, ev.cell.y);
        if (!instant) {
          this.fx.trapFire(ev.trap, c, T, ev.element, tv);
          if (ev.synergy) {
            sfx('synergy');
            this.fx.floatText(c.x, c.y - T * 0.45, '⚗️ Synergie !', '#e0a0ff', 0.9);
          }
        }
        break;
      }
      case 'death': {
        const v = this.unitViews.get(ev.tgt);
        if (!v) break;
        v.die(this, instant);
        if (!instant) {
          if (v.side === 'B') {
            sfx('death_hero');
            this.fx.soul(v.x(), v.y());
            this.fx.coins(v.x(), v.y(), 5);
          } else sfx('death_monster');
        }
        break;
      }
      case 'revive': {
        const v = this.unitViews.get(ev.tgt);
        if (!v) break;
        v.revive(this);
        v.setHp(ev.hp);
        if (!instant) this.fx.floatText(v.x(), v.y() - v.size * 0.5, 'Renaissance !', '#b0ffb0', 0.9);
        break;
      }
      case 'combatEnd': {
        r.combat = null;
        for (const [id, v] of this.unitViews) {
          if (v.side === 'A') {
            v.hideHp();
            this.unitViews.delete(id);
          }
        }
        this.g.bus.emit('raidVisual', { combat: false });
        break;
      }
      case 'raidEnd': {
        r.ended = true;
        r.outcome = ev.outcome;
        if (!instant) {
          if (ev.outcome === 'looted') {
            sfx('defeat');
            this.fx.banner('💰 Le coffre a été pillé !', '#ff8a7a');
            const core = this.g.dungeon.findRoom(this.fi, 'core');
            if (core) {
              const c = this.cellCenter(core.x, core.y);
              this.fx.coins(c.x, c.y, 8);
            }
          } else if (ev.outcome === 'retreat') {
            this.fx.banner('🏃 Les aventuriers battent en retraite', '#ffd27a');
          } else {
            sfx('victory');
            this.fx.banner('🏆 Groupe anéanti !', '#9cff8a');
          }
        }
        for (const [id, v] of this.unitViews) {
          if (v.side === 'B' && v.alive && !instant) {
            this.tweens.add({ targets: [v.spr, v.shadow, ...(v.hpBar ? v.hpBar.parts : [])], alpha: 0, duration: 600 / sp, delay: 200 });
          }
        }
        break;
      }
      default:
        break;
    }
  }

  /** Les récompenses réelles arrivent quand RaidSystem applique le raid. */
  onRaidApplied({ result, summary }) {
    if (!this.sys.isActive() || result.floor !== this.fi || !this.sys.isVisible()) return;
    const g = summary.rewards.gold || 0;
    const T = this.T;
    const core = this.g.dungeon.findRoom(this.fi, 'core');
    const c = core ? this.cellCenter(core.x, core.y) : { x: this.scale.width / 2, y: this.scale.height / 2 };
    if (summary.outcome !== 'looted' && g > 0) {
      sfx('coins');
      this.fx.floatText(c.x, c.y - T * 0.5, `+${formatShort(g)} 🪙`, '#ffe14d', 1.2);
    } else if (summary.stolen) {
      this.fx.floatText(c.x, c.y - T * 0.5, `-${formatShort(summary.stolen)} 🪙`, '#ff6a6a', 1.1);
    }
  }

  createHeroView(u, i, n) {
    const T = this.T;
    const entrance = this.g.dungeon.findRoom(this.fi, 'entrance');
    const c = entrance ? this.cellCenter(entrance.x, entrance.y) : { x: this.scale.width / 2, y: this.y0 };
    const size = T * 0.44 * (u.elite ? 1.12 : 1);
    const f = this.heroFormation(n, i);
    const x = c.x + f.dx + T * 0.08;
    const y = c.y + f.dy - T * 0.6;
    const shadow = this.add.image(x, y + size * 0.42, 'shadow').setDisplaySize(size * 0.8, size * 0.2).setDepth(1500);
    const spr = this.add.image(x, y, u.sprite).setDisplaySize(size, size).setDepth(1501);
    this.entityLayer.add([shadow, spr]);
    const hp = this.fx.hpBar(x, y - size * 0.55, T * 0.34, 0xff5a5a, 1502);
    const view = this.makeView(u.id, 'B', spr, shadow, size, hp);
    view.maxHp = u.maxHp;
    view.hpVal = u.hp;
    if (u.elite) {
      const star = this.add.text(0, 0, '⭐', { fontSize: `${Math.round(T * 0.13)}px` }).setOrigin(0.5).setDepth(1503);
      this.entityLayer.add(star);
      view.extra = star;
    }
    this.unitViews.set(u.id, view);
    return view;
  }

  makeView(id, side, spr, shadow, size, hpBar) {
    const scene = this;
    const view = {
      id, side, spr, shadow, size, hpBar, alive: true, maxHp: 1, hpVal: 1,
      x: () => spr.x,
      y: () => spr.y,
      setHp(hp, max) {
        if (max) view.maxHp = max;
        view.hpVal = hp;
        hpBar?.set(hp / view.maxHp);
      },
      moveTo(x, y, dur) {
        view.moveTween?.stop();
        view.wobble?.stop();
        spr.setAngle(0);
        const sync = () => {
          shadow.setPosition(spr.x, spr.y + size * 0.42);
          hpBar?.setPos(spr.x, spr.y - size * 0.55);
          view.extra?.setPosition(spr.x - size * 0.32, spr.y - size * 0.55);
        };
        if (!dur) {
          spr.setPosition(x, y);
          sync();
          return;
        }
        spr.setFlipX(x < spr.x - 1);
        view.moveTween = scene.tweens.add({ targets: spr, x, y, duration: dur, ease: 'Sine.easeInOut', onUpdate: sync, onComplete: () => spr.setFlipX(false) });
        view.wobble = scene.tweens.add({ targets: spr, angle: { from: -4, to: 4 }, duration: dur / 4, yoyo: true, repeat: 1, onComplete: () => spr.setAngle(0) });
      },
      flash() {
        spr.setTintFill(0xffffff);
        scene.time.delayedCall(70, () => spr.clearTint());
      },
      die(sc, instant) {
        view.alive = false;
        hpBar?.hide();
        view.extra?.setVisible(false);
        if (instant) {
          spr.setAlpha(0);
          shadow.setAlpha(0);
          return;
        }
        scene.tweens.add({ targets: spr, alpha: 0, angle: 90, y: spr.y + size * 0.15, duration: 500 });
        scene.tweens.add({ targets: shadow, alpha: 0, duration: 500 });
      },
      revive() {
        view.alive = true;
        spr.setAlpha(1).setAngle(0);
        hpBar?.show();
      },
      hideHp() {
        hpBar?.hide();
      },
      destroy() {
        spr.destroy();
        shadow.destroy();
        hpBar?.destroy();
        view.extra?.destroy();
      },
    };
    return view;
  }

  /** Adapte une vue de monstre du donjon au protocole des vues de combat. */
  monsterUnitAdapter(id, mv) {
    const scene = this;
    const view = {
      id, side: 'A', spr: mv.spr, size: mv.size, alive: true, maxHp: mv.maxHp, hpVal: mv.hpVal,
      x: () => mv.spr.x,
      y: () => mv.spr.y,
      setHp(hp, max) {
        if (max) view.maxHp = max;
        view.hpVal = hp;
        mv.hp?.set(hp / view.maxHp);
      },
      flash() {
        mv.spr.setTintFill(0xffffff);
        scene.time.delayedCall(70, () => {
          if (mv.ko) mv.spr.setTint(0x555555);
          else mv.spr.clearTint();
        });
      },
      die(sc, instant) {
        view.alive = false;
        mv.ko = true;
        mv.hp?.hide();
        mv.spr.setTint(0x555555);
        if (!instant) scene.tweens.add({ targets: mv.spr, alpha: 0.35, duration: 400 });
        else mv.spr.setAlpha(0.35);
      },
      revive() {
        view.alive = true;
        mv.ko = false;
        mv.spr.clearTint().setAlpha(1);
        mv.hp?.show();
      },
      hideHp() {
        mv.hp?.hide();
      },
      destroy() {},
    };
    return view;
  }

  /** Infos pour le bandeau HUD. */
  raidInfo() {
    const rt = this.g.raids.rt(this.fi);
    if (!this.raid) {
      return { active: false, nextIn: Math.max(0, (rt.nextAt - Date.now()) / 1000), canRaid: this.g.raids.canRaid(this.fi) };
    }
    const heroes = this.raid.heroIds.map((id) => this.unitViews.get(id)).filter(Boolean);
    return {
      active: true,
      name: this.raid.res.party.name,
      level: this.raid.res.party.level,
      heroes: heroes.map((v) => ({ id: v.id, alive: v.alive, ratio: v.hpVal / v.maxHp, sprite: v.spr.texture.key })),
      combat: !!this.raid.combat,
      ended: this.raid.ended,
      outcome: this.raid.outcome,
      eventIndex: this.raid.idx,
    };
  }
}

