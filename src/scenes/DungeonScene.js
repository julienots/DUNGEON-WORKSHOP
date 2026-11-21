import Phaser from 'phaser';
import { ctx, sfx } from '../ui/context.js';
import { ROOMS } from '../data/rooms.js';
import { THEMES } from '../data/floors.js';
import { ELEMENTS } from '../data/elements.js';
import { STATUSES } from '../data/statuses.js';
import { getSpecies } from '../data/monsters.js';
import { RARITY_INFO, FONT_TITLE, FONT_BODY } from '../utils/constants.js';
import { cellKey } from '../utils/helpers.js';
import { formatShort } from '../utils/format.js';
import { ECONOMY } from '../config/economy.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { FxKit } from './FxKit.js';
import { ISO } from '../gfx/isoArt.js';
import { ROOM_PROPS, PROP_W, PROP_H, PROP_FOOT } from '../gfx/isoProps.js';

const HUD_STRIP = 112; // hauteur (px CSS) réservée au bandeau de raid au-dessus de la navigation

// Emplacements (coordonnées locales de case, 0..1) : monstres sur la moitié avant, héros sur la moitié arrière
const MONSTER_SLOTS = [
  [],
  [[0.58, 0.58]],
  [[0.44, 0.72], [0.72, 0.44]],
  [[0.38, 0.74], [0.74, 0.38], [0.7, 0.7]],
  [[0.34, 0.74], [0.74, 0.34], [0.56, 0.56], [0.8, 0.8]],
];
// Lumières émises par certains accessoires
const PROP_LIGHTS = {
  brazier: [0xff9a3a, 0.55, -0.42], candles: [0xffcc66, 0.4, -0.3], redcandles: [0xff3a4a, 0.45, -0.3], crystal: [0xff5ce1, 0.4, -0.3],
  violetcrystal: [0x9b6bff, 0.4, -0.3], ambercrystal: [0xffb52e, 0.4, -0.3], icecrystal: [0x9fe6ff, 0.4, -0.3], tesla: [0xffe14d, 0.5, -0.8],
  vat: [0x7affc0, 0.45, -0.5], cauldron: [0x8fe04a, 0.45, -0.3], obsidian: [0xff6a2b, 0.4, -0.2], altar: [0xfff3b0, 0.45, -0.5],
  obelisk: [0x7a8aff, 0.45, -0.6], mushroom: [0x8fe04a, 0.3, -0.2], goldpile: [0xffe14d, 0.35, -0.2], throne: [0xffd84a, 0.35, -0.6],
};

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
    if (!this.dragFrom) return;
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
    const nz = Phaser.Math.Clamp(z, this.minZoom || 1, 3.2);
    if (fx !== null) {
      const before = cam.getWorldPoint(fx, fy);
      cam.setZoom(nz);
      cam.preRender();
      const after = cam.getWorldPoint(fx, fy);
      cam.scrollX += before.x - after.x;
      cam.scrollY += before.y - after.y;
    } else cam.setZoom(nz);
    this.zoom = nz;
    if (fx === null && Math.abs(nz - 1) < 0.001) cam.setScroll(0, 0);
    this.clampCamera();
    this.g.bus.emit('dungeonZoom', nz);
  }

  /** La vue zoomée reste sur le diorama. */
  clampCamera() {
    const cam = this.cameras.main;
    const f = this.g.dungeon.floor(this.fi);
    if (!f) {
      cam.setScroll(0, 0);
      return;
    }
    const { width: W, height: H } = this.scale;
    const hw = W / (2 * this.zoom);
    const hh = H / (2 * this.zoom);
    const gx0 = this.iso(0, f.rows).x - this.TW * 0.25;
    const gx1 = this.iso(f.cols, 0).x + this.TW * 0.25;
    const gy0 = this.iso(0, 0).y - this.wallH - this.TH * 0.5;
    const gy1 = this.iso(f.cols, f.rows).y + this.TH * 0.6;
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
    // Vide profond (dégradé) + nappes de brume qui dérivent lentement + rais de lumière
    this.bgFar = this.add.image(width / 2, height / 2, `void_${theme}`).setDisplaySize(width * 1.1, height * 1.1);
    this.bgNear = null;
    this.fogs = [];
    const lowQ = this.g.state.settings.quality === 'low';
    const fogTint = Phaser.Display.Color.HexStringToColor(THEMES[theme]?.fog || '#3a2a1a').color;
    for (let i = 0; lowQ ? false : i < 5; i++) {
      const fog = this.add.image(Math.random() * width, height * (0.15 + i * 0.18), 'fog_cloud').setDisplaySize(width * 1.3, height * 0.32).setTint(fogTint).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);
      fog.speed = (8 + Math.random() * 10) * (i % 2 ? 1 : -1) * this.S;
      this.fogs.push(fog);
    }
    const rays = [];
    for (let i = 0; lowQ ? false : i < 3; i++) {
      const r = this.add.image(width * (0.2 + i * 0.3), 0, 'godray').setOrigin(0.5, 0).setDisplaySize(width * 0.22, height * 0.75).setAngle(-18 + i * 6).setTint(this.themeLight()).setAlpha(0.07).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: r, alpha: 0.02, duration: 3000 + i * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      rays.push(r);
    }
    this.vignette = this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width * 1.15, height * 1.1).setAlpha(0.8).setDepth(900);
    for (const o of [this.bgFar, this.vignette, ...this.fogs, ...rays]) o.setScrollFactor(0);
    this.bgLayer.add([this.bgFar, ...this.fogs, ...rays]);
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

  // ------------------------------------------------------------------ disposition (projection isométrique 2:1)
  layout() {
    const S = this.S;
    const { width: W, height: H } = this.scale;
    const ins = ctx.ui.insets();
    const f = this.g.dungeon.floor(this.fi);
    const top = (ins.top + 10) * S;
    const bottom = H - Math.max(ins.bottom + HUD_STRIP, ins.sheet + 8) * S;
    const availW = W - 2 * 6 * S;
    const availH = Math.max(100, bottom - top);
    const wallR = ISO.WALL / ISO.W;
    const fit = (nc, nr) => Math.min(availW / ((nc + nr) / 2 + 0.3), availH / ((nc + nr) / 4 + wallR + 0.35));
    // Cadrage sur la zone creusée (+1 case de roche autour) ; le reste de l'étage se découvre en glissant / dézoomant
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const key of Object.keys(f.cells)) {
      const [cx, cy] = key.split(',').map(Number);
      x0 = Math.min(x0, cx);
      y0 = Math.min(y0, cy);
      x1 = Math.max(x1, cx);
      y1 = Math.max(y1, cy);
    }
    if (!Number.isFinite(x0)) [x0, y0, x1, y1] = [0, 0, f.cols - 1, f.rows - 1];
    // demi-case de marge de chaque côté (les cases à creuser restent visibles)
    const nc = Math.min(f.cols, x1 - x0 + 2);
    const nr = Math.min(f.rows, y1 - y0 + 2);
    x0 -= 0.5;
    y0 -= 0.5;
    x1 += 0.5;
    y1 += 0.5;
    const TW = Math.floor(Math.min(fit(Math.max(3, nc), Math.max(3, nr)), 230 * S));
    this.TW = TW;
    this.TH = TW / 2;
    this.wallH = TW * wallR;
    this.lowH = TW * (ISO.LOW / ISO.W);
    this.T = TW * 0.8; // unité de taille des sprites et effets
    // dézoom possible jusqu'à voir tout l'étage
    this.minZoom = Phaser.Math.Clamp(fit(f.cols, f.rows) / TW, 0.45, 1);
    // centre de la zone cadrée au centre de la zone visible
    const mx = (x0 + x1 + 1) / 2;
    const my = (y0 + y1 + 1) / 2;
    const regionTop = ((x0 + y0) * this.TH) / 2 - this.wallH;
    const regionBot = ((x1 + 1 + y1 + 1) * this.TH) / 2 + this.TH * 0.3;
    this.ox = Math.round(W / 2 - ((mx - my) * TW) / 2);
    this.oy = Math.round(top + availH / 2 - (regionTop + regionBot) / 2);
    // compatibilité (anciens appels)
    this.x0 = this.ox;
    this.y0 = this.oy;
    this.layoutDirty = false;
  }

  /** Point écran d'une position continue de la grille (gx, gy en cases). */
  iso(gx, gy) {
    return { x: this.ox + ((gx - gy) * this.TW) / 2, y: this.oy + ((gx + gy) * this.TH) / 2 };
  }

  cellCenter(x, y) {
    return this.iso(x + 0.5, y + 0.5);
  }

  /** Point au sol à l'intérieur d'une case (lx, ly ∈ [0, 1]). */
  cellPoint(x, y, lx, ly) {
    return this.iso(x + lx, y + ly);
  }

  /** Case sous un point écran (tient compte de la hauteur des blocs de roche). */
  toCell(px, py) {
    const f = this.g.dungeon.floor(this.fi);
    if (!f) return { x: -1, y: -1 };
    const hw = this.TW / 2;
    const hh = this.TH / 2;
    let best = null;
    for (let y = -1; y <= f.rows; y++) {
      for (let x = -1; x <= f.cols; x++) {
        const c = this.cellCenter(x, y);
        const h = this.blockH?.[cellKey(x, y)] || 0;
        const dx = Math.abs(px - c.x);
        if (dx > hw) continue;
        // silhouette : losange du dessus (élevé de h) + faces jusqu'au sol
        const topY = c.y - h;
        const lim = hh * (1 - dx / hw);
        const inside = py >= topY - lim && py <= c.y + lim;
        if (inside && (!best || x + y > best.x + best.y)) best = { x, y };
      }
    }
    return best || { x: -1, y: -1 };
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
    this.blockH = {};

    const f = this.g.dungeon.floor(this.fi);
    if (!f) return;
    const theme = this.g.dungeon.def(this.fi).theme;
    const TW = this.TW;
    const TH = this.TH;
    const sc = TW / ISO.W;
    const lowQ = this.g.state.settings.quality === 'low';
    const add = (o, depth) => {
      o.setDepth(depth);
      this.gridLayer.add(o);
      this.cellObjects.push(o);
      return o;
    };
    const addE = (o, depth) => {
      o.setDepth(depth);
      this.entityLayer.add(o);
      this.cellObjects.push(o);
      return o;
    };
    const roomAt = (x, y) => (x >= 0 && y >= 0 && x < f.cols && y < f.rows ? f.cells[cellKey(x, y)] : null);
    // Un bloc devant une salle est « coupé » (bas) pour ne pas la masquer
    const isLow = (x, y) => {
      for (let a = 0; a <= 2; a++) {
        for (let b = 0; b <= 2; b++) {
          if ((a || b) && a + b <= 3 && roomAt(x - a, y - b)) return true;
        }
      }
      return false;
    };
    const light = this.themeLight();

    for (let y = -1; y <= f.rows; y++) {
      for (let x = -1; x <= f.cols; x++) {
        const c = this.cellCenter(x, y);
        const cell = roomAt(x, y);
        const v = Math.abs((x * 7 + y * 13) % 4);
        const k = x + y;
        if (cell) {
          const rd = ROOMS[cell.room];
          add(this.add.image(c.x, c.y, `iso_floor_${cell.room}`).setDisplaySize(TW + 2, TH + 1), k * 10);
          // ombres portées des murs arrière
          if (!roomAt(x - 1, y)) add(this.add.image(c.x, c.y, 'iso_ao_l').setDisplaySize(TW + 2, TH + 1).setAlpha(isLow(x - 1, y) ? 0.45 : 0.95), k * 10 + 1);
          if (!roomAt(x, y - 1)) add(this.add.image(c.x, c.y, 'iso_ao_r').setDisplaySize(TW + 2, TH + 1).setAlpha(isLow(x, y - 1) ? 0.45 : 0.95), k * 10 + 1);
          this.decorateRoom(cell, rd, c, x, y, k * 10, add, addE);
        } else {
          const low = isLow(x, y);
          const hTex = low ? ISO.LOW : ISO.WALL;
          const key = SpriteFactory.isoBlock(theme, v, low ? 'low' : 'tall');
          const texH = ISO.TOP + ISO.H + hTex;
          const blk = addE(this.add.image(c.x, c.y, key).setOrigin(0.5, (ISO.TOP + ISO.H / 2 + hTex) / texH).setDisplaySize(TW + 1, texH * sc + 0.5), c.y);
          blk.setTint(this.rockLight(f, x, y));
          this.blockH[cellKey(x, y)] = hTex * sc;
          // Torches murales sur les faces tournées vers une salle
          if (!low && !lowQ) {
            const hash = Math.abs((x * 31 + y * 17) % 3);
            if (roomAt(x, y + 1) && hash !== 1) this.addTorch(c.x - TW / 4, c.y + TH / 4 - this.wallH * 0.55, 'l', c.y + 0.5, light, addE);
            if (roomAt(x + 1, y) && hash !== 2) this.addTorch(c.x + TW / 4, c.y + TH / 4 - this.wallH * 0.55, 'r', c.y + 0.5, light, addE);
          }
        }
        // Socle du diorama sous les bords avant
        if (y === f.rows) {
          const kb = SpriteFactory.isoBase(theme, 'l', v % 2);
          add(this.add.image(c.x - TW / 2, c.y, kb).setOrigin(0, 0).setDisplaySize(TW / 2 + 0.5, (ISO.H / 2 + ISO.BASE) * sc), -5);
        }
        if (x === f.cols) {
          const kb = SpriteFactory.isoBase(theme, 'r', v % 2);
          add(this.add.image(c.x, c.y + TH / 2, kb).setOrigin(0, (ISO.H / 2) / (ISO.H / 2 + ISO.BASE)).setDisplaySize(TW / 2 + 0.5, (ISO.H / 2 + ISO.BASE) * sc), -5);
        }
      }
    }
    // Ombre sous le diorama
    const bl = this.iso(-1, f.rows + 1);
    const br = this.iso(f.cols + 1, -1);
    const bb = this.iso(f.cols + 1, f.rows + 1);
    add(this.add.image((bl.x + br.x) / 2, bb.y + TH * 0.2, 'shadow').setDisplaySize((br.x - bl.x) * 1.05, TH * 2.2).setAlpha(0.9), -10);
    this.placeMonsters();
    this.applyModeHighlights();
  }

  /** Torche murale animée (applique + flamme + halo). */
  addTorch(x, y, side, depth, color, addE) {
    const S = this.TW / ISO.W;
    const br = addE(this.add.image(x, y, `torch_${side}`).setDisplaySize(48 * S * 1.4, 64 * S * 1.4), depth);
    const fy = br.y - br.displayHeight * 0.18;
    const glow = addE(this.add.image(x, fy, 'glow').setDisplaySize(this.TW * 0.9, this.TW * 0.75).setTint(color).setAlpha(0.42).setBlendMode(Phaser.BlendModes.ADD), depth + 0.01);
    const fl = addE(this.add.image(x, fy, 'flame').setOrigin(0.5, 0.92).setDisplaySize(12 * S * 2.2, 18 * S * 2.2).setTint(0xffc060).setBlendMode(Phaser.BlendModes.ADD), depth + 0.02);
    const sx = fl.scaleX;
    const sy = fl.scaleY;
    this.tweens.add({ targets: fl, scaleY: sy * 1.25, scaleX: sx * 0.85, duration: 90 + Math.random() * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: 0.26, duration: 140 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ambient.push({ room: 'torch', x, y: fy });
  }

  /** Éclairage : la roche proche des salles est éclairée, la roche lointaine se perd dans l'ombre. */
  rockLight(f, x, y) {
    let best = 9;
    for (const key of Object.keys(f.cells)) {
      const [cx, cy] = key.split(',').map(Number);
      best = Math.min(best, Math.max(Math.abs(cx - x), Math.abs(cy - y)));
    }
    return [0xffffff, 0xeee2d6, 0xb4aaa0, 0x8a827a, 0x6e6862][Math.min(4, best)];
  }

  decorateRoom(cell, rd, c, x, y, base, add, addE) {
    const T = this.T;
    const TW = this.TW;
    const TH = this.TH;
    const S = this.S;
    const lowQ = this.g.state.settings.quality === 'low';
    // Lumières d'ambiance (flaque de lumière au sol)
    const lights = {
      lava: [0xff6a2b, 0.5], core: [0xffcc33, 0.4], dimensional: [0xff5ce1, 0.5], toxic: [0x8fe04a, 0.35],
      frozen: [0x9fe6ff, 0.35], lab: [0x3cf2d0, 0.35], storm: [0xffe14d, 0.35], sanctum: [0xfff3b0, 0.4], entrance: [0xffb060, 0.35],
      crypt: [0x9b6bff, 0.35], forge: [0xff9c4a, 0.4], grove: [0x6bff8a, 0.28], treasure: [0xffcc33, 0.35], combat: [0xff7040, 0.3], basic: [0xffb060, 0.3],
      training: [0xffb060, 0.3], mutation: [0x7affc0, 0.45], arena: [0xffd84a, 0.32], cursed: [0xff2040, 0.5], portal: [0x7a8aff, 0.55], master: [0xffe08a, 0.45],
      mine: [0xffb52e, 0.3], lair: [0xb08060, 0.25],
    };
    const l = lights[cell.room];
    if (l && !lowQ) {
      const glow = add(this.add.image(c.x, c.y, 'glow').setDisplaySize(TW * 1.25, TH * 1.25).setTint(l[0]).setAlpha(l[1]).setBlendMode(Phaser.BlendModes.ADD), base + 3);
      this.tweens.add({ targets: glow, alpha: l[1] * 0.55, duration: 900 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.ambient.push({ room: cell.room, x: c.x, y: c.y, cx: x, cy: y });
    }
    if (cell.room === 'portal') {
      const ring = add(this.add.image(c.x, c.y, 'p_ring').setDisplaySize(TW * 0.5, TH * 0.5).setTint(0x9fb0ff).setBlendMode(Phaser.BlendModes.ADD), base + 4);
      this.tweens.add({ targets: ring, scaleX: ring.scaleX * 1.2, scaleY: ring.scaleY * 1.2, alpha: 0.4, duration: 1400, yoyo: true, repeat: -1 });
      const pillar = addE(this.add.image(c.x, c.y - T * 0.35, 'glow').setDisplaySize(TW * 0.32, T * 1.1).setTint(0x7a8aff).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD), c.y);
      this.tweens.add({ targets: pillar, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (cell.room === 'dimensional') {
      const ring = add(this.add.image(c.x, c.y, 'p_ring').setDisplaySize(TW * 0.6, TH * 0.6).setTint(0xff5ce1).setBlendMode(Phaser.BlendModes.ADD), base + 4);
      this.tweens.add({ targets: ring, scaleX: ring.scaleX * 1.25, scaleY: ring.scaleY * 1.25, alpha: 0.3, duration: 1600, yoyo: true, repeat: -1 });
    }
    // Accessoires en volume
    for (const [id, lx, ly] of ROOM_PROPS[cell.room] || []) {
      if (lowQ && id === 'web') continue;
      const p = this.cellPoint(x, y, lx, ly);
      const w = TW * 0.4;
      const img = addE(this.add.image(p.x, p.y, `prop_${id}`).setOrigin(0.5, PROP_FOOT / PROP_H).setDisplaySize(w, (w * PROP_H) / PROP_W), p.y);
      const pl = PROP_LIGHTS[id];
      if (pl && !lowQ) {
        const g = addE(this.add.image(p.x, p.y + pl[2] * w, 'glow').setDisplaySize(w * 1.6, w * 1.3).setTint(pl[0]).setAlpha(pl[1]).setBlendMode(Phaser.BlendModes.ADD), p.y + 0.01);
        this.tweens.add({ targets: g, alpha: pl[1] * 0.5, duration: 160 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      if (id === 'brazier' && !lowQ) this.ambient.push({ room: 'brazier', x: p.x, y: p.y - w * 0.4 });
      void img;
    }
    // Décoration (V2, cosmétique)
    const deco = this.g.dungeon.floor(this.fi)?.decor?.[cellKey(x, y)];
    if (deco && this.textures.exists(`decor_${deco}`)) {
      const p = this.cellPoint(x, y, 0.86, 0.6);
      addE(this.add.image(p.x, p.y, `decor_${deco}`).setOrigin(0.5, 0.9).setDisplaySize(TW * 0.26, TW * 0.26), p.y);
    }
    // Synergies actives (V2)
    const synCount = this.g.dungeon.synergiesAt(this.fi, x, y).length;
    if (synCount) {
      const st = addE(this.add.text(c.x - TW * 0.36, c.y, synCount > 1 ? `⭐${synCount}` : '⭐', {
        fontFamily: FONT_BODY, fontStyle: 'bold', fontSize: `${Math.round(TW * 0.13)}px`, color: '#ffe14d', stroke: '#1b1216', strokeThickness: 3 * S,
      }).setOrigin(0, 0.5), 1e6);
      st.setShadow(0, 1 * S, '#000', 3 * S, true, true);
    }
    // Niveau de la salle (au coin avant)
    if (!rd.special) {
      const lvl = addE(this.add.text(c.x, c.y + TH * 0.4, `${cell.level}`, {
        fontFamily: FONT_TITLE, fontSize: `${Math.round(TW * 0.1)}px`, color: '#ffe6a8', stroke: '#1b1216', strokeThickness: 4 * S, fontStyle: 'bold',
      }).setOrigin(0.5, 1), 1e6);
      lvl.setShadow(0, 2 * S, '#000', 4 * S, true, true);
    }
    // Piège (décalque au sol)
    if (cell.trap) {
      const p = this.cellPoint(x, y, 0.42, 0.42);
      const tp = add(this.add.image(p.x, p.y, `iso_trap_${cell.trap.id}`).setDisplaySize(TW * 0.5, TH * 0.5), base + 5);
      this.trapViews[cellKey(x, y)] = tp;
      const syn = this.g.traps.synergiesAt(this.fi, x, y);
      if (syn.length) {
        const ring = add(this.add.image(tp.x, tp.y, 'p_ring').setDisplaySize(TW * 0.55, TH * 0.55).setTint(0xb56cff).setBlendMode(Phaser.BlendModes.ADD), base + 4);
        this.tweens.add({ targets: ring, scaleX: ring.scaleX * 1.15, scaleY: ring.scaleY * 1.15, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
      }
    }
  }

  placeMonsters() {
    const T = this.T;
    const list = this.g.state.monsters.filter((m) => m.location && m.location.floor === this.fi);
    const byCell = {};
    for (const m of list) (byCell[cellKey(m.location.x, m.location.y)] ||= []).push(m);
    for (const [key, ms] of Object.entries(byCell)) {
      const [x, y] = key.split(',').map(Number);
      const offs = MONSTER_SLOTS[Math.min(4, ms.length)];
      ms.forEach((m, i) => {
        const sp = getSpecies(m.speciesId);
        const o = offs[i] || [0.5 + i * 0.05, 0.5];
        const feet = this.cellPoint(x, y, o[0], o[1]);
        const size = T * (ms.length > 2 ? 0.5 : ms.length > 1 ? 0.56 : 0.66) * Math.min(1.35, sp.size || 1);
        const px = feet.x;
        const py = feet.y - size * 0.42;
        const depth = feet.y;
        const shadow = this.add.image(px, feet.y, 'shadow').setDisplaySize(size * 0.85, size * 0.26).setDepth(depth - 0.02);
        let aura = null;
        const rIdx = ['epic', 'legendary', 'mythic', 'ancient'].indexOf(sp.rarity);
        if (rIdx >= 0 && this.g.state.settings.quality !== 'low') {
          aura = this.add.image(px, py, 'glow').setDisplaySize(size * 1.3, size * 1.3).setTint(RARITY_INFO[sp.rarity].glow).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth - 0.01);
          this.tweens.add({ targets: aura, alpha: 0.15, duration: 1200, yoyo: true, repeat: -1 });
        }
        const spr = this.add.image(px, py, SpriteFactory.monsterKey(sp.id, m.skin)).setDisplaySize(size, size).setDepth(depth).setFlipX(true);
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

  /** Centre de la face visible d'une case (dessus du bloc pour la roche). */
  cellTop(x, y) {
    const c = this.cellCenter(x, y);
    return { x: c.x, y: c.y - (this.blockH?.[cellKey(x, y)] || 0) };
  }

  applyModeHighlights() {
    this.clearHighlights();
    const f = this.g.dungeon.floor(this.fi);
    if (!f) return;
    const T = this.T;
    const TW = this.TW;
    const TH = this.TH;
    const tileAt = (x, y, color, alpha, depth) => {
      const c = this.cellTop(x, y);
      return this.add.image(c.x, c.y, 'iso_tile').setDisplaySize(TW * 0.92, TH * 0.92).setTint(color).setAlpha(alpha).setDepth(depth);
    };
    const outlineAt = (x, y, color, depth) => {
      const c = this.cellTop(x, y);
      return this.add.image(c.x, c.y, 'iso_outline').setDisplaySize(TW * 1.02, TH * 1.08).setTint(color).setDepth(depth);
    };
    const mark = (x, y, color, label = '+') => {
      const c = this.cellTop(x, y);
      const r = tileAt(x, y, color, 0.22, 2500);
      const o = outlineAt(x, y, color, 2500.5).setAlpha(0.85);
      const t = this.add.text(c.x, c.y, label, { fontFamily: FONT_BODY, fontSize: `${Math.round(TW * 0.2)}px`, color: '#ffffff', stroke: '#000', strokeThickness: 4 * this.S }).setOrigin(0.5).setDepth(2501);
      this.tweens.add({ targets: r, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
      this.highlights.push(r, o, t);
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
        const c = this.cellTop(pv.x, pv.y);
        const ghost = this.add.image(c.x, c.y, `iso_floor_${pv.id}`).setDisplaySize(TW * 0.94, TH * 0.94).setAlpha(0.8).setDepth(2502);
        const sel = outlineAt(pv.x, pv.y, 0xffd84a, 2503);
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
      const sel = outlineAt(this.moveFrom.x, this.moveFrom.y, 0x4fa3ff, 2500);
      this.highlights.push(sel);
      for (let y = 0; y < f.rows; y++) {
        for (let x = 0; x < f.cols; x++) {
          if (f.cells[cellKey(x, y)]) continue;
          const ok = this.g.dungeon.canMove(this.fi, this.moveFrom.x, this.moveFrom.y, x, y);
          if (ok.ok) mark(x, y, 0x4fa3ff, '⇢');
        }
      }
    } else {
      // Indices de creusage discrets sur la roche autour du donjon
      for (let y = 0; y < f.rows; y++) {
        for (let x = 0; x < f.cols; x++) {
          if (f.cells[cellKey(x, y)] || !this.g.dungeon.hasRoomNeighbor(this.fi, x, y)) continue;
          const c = this.cellTop(x, y);
          const t = this.add.text(c.x, c.y, '⛏️', { fontSize: `${Math.round(TW * 0.17)}px` }).setOrigin(0.5).setAlpha(0.35).setDepth(2400);
          this.tweens.add({ targets: t, alpha: 0.7, y: c.y - TH * 0.08, duration: 1100, yoyo: true, repeat: -1, delay: (x + y) * 120, ease: 'Sine.easeInOut' });
          this.highlights.push(t);
        }
      }
    }
    if (this.mode === 'view' && this.selected) {
      const sel = outlineAt(this.selected.x, this.selected.y, 0xffcc33, 2500);
      const fill = tileAt(this.selected.x, this.selected.y, 0xffcc33, 0.16, 2499);
      this.tweens.add({ targets: [sel, fill], alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      this.highlights.push(sel, fill);
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
    let rx = a.x;
    let ry = a.y;
    if (a.cx !== undefined) {
      const p = this.cellPoint(a.cx, a.cy, 0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7);
      rx = p.x;
      ry = p.y - Math.random() * T * 0.2;
    }
    switch (a.room) {
      case 'torch':
      case 'brazier':
        this.fx.ember(rx + (Math.random() - 0.5) * T * 0.05, ry, 0xffa040, 1);
        break;
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
    if (this.fogs) {
      const W = this.scale.width;
      for (const f of this.fogs) {
        f.x += f.speed * dt;
        if (f.x > W * 1.4) f.x = -W * 0.4;
        else if (f.x < -W * 0.4) f.x = W * 1.4;
      }
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

  /** Formation des héros sur la moitié arrière de la case (coordonnées locales). */
  heroFormation(n, i) {
    const front = n > 3 ? Math.ceil(n / 2) : n;
    const row = i < front ? 0 : 1;
    const inRow = row ? n - front : front;
    const j = row ? i - front : i;
    const t = j - (inRow - 1) / 2;
    const sum = row ? 0.34 : 0.66; // rangée avant (vers les monstres) puis arrière
    const spread = inRow > 2 ? 0.17 : 0.2;
    return { lx: sum / 2 + t * spread, ly: sum / 2 - t * spread };
  }

  /** Position (centre du sprite) d'un héros de taille `size` dans la case (x, y). */
  heroSpot(x, y, f, size) {
    const p = this.cellPoint(x, y, f.lx, f.ly);
    return { x: p.x, y: p.y - size * 0.42 };
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
        const alive = r.heroIds.map((id) => this.unitViews.get(id)).filter((v) => v && v.alive);
        alive.forEach((v, i) => {
          const t = this.heroSpot(ev.x, ev.y, this.heroFormation(alive.length, i), v.size);
          v.moveTo(t.x, t.y, instant ? 0 : (ECONOMY.raid.walkStepTime * 1000 * 0.9) / sp, this);
        });
        void T;
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
    const entrance = this.g.dungeon.findRoom(this.fi, 'entrance') || { x: 0, y: 0 };
    const size = T * 0.5 * (u.elite ? 1.12 : 1);
    const f = this.heroFormation(n, i);
    // Les héros descendent l'escalier : ils apparaissent un peu en arrière de l'entrée
    const sp0 = this.heroSpot(entrance.x - 0.45, entrance.y - 0.45, f, size);
    const x = sp0.x;
    const y = sp0.y;
    const shadow = this.add.image(x, y + size * 0.42, 'shadow').setDisplaySize(size * 0.8, size * 0.22).setDepth(y + size * 0.42 - 0.02);
    const spr = this.add.image(x, y, u.sprite).setDisplaySize(size, size).setDepth(y + size * 0.42);
    this.entityLayer.add([shadow, spr]);
    const hp = this.fx.hpBar(x, y - size * 0.55, T * 0.34, 0xff5a5a, 1502);
    const view = this.makeView(u.id, 'B', spr, shadow, size, hp);
    view.maxHp = u.maxHp;
    view.hpVal = u.hp;
    if (u.elite) {
      const star = this.add.text(0, 0, '⭐', { fontSize: `${Math.round(T * 0.13)}px` }).setOrigin(0.5).setDepth(1e6);
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
          const feet = spr.y + size * 0.42;
          spr.setDepth(feet);
          shadow.setPosition(spr.x, feet).setDepth(feet - 0.02);
          hpBar?.setPos(spr.x, spr.y - size * 0.55);
          view.extra?.setPosition(spr.x - size * 0.32, spr.y - size * 0.55);
        };
        if (!dur) {
          spr.setPosition(x, y);
          sync();
          return;
        }
        spr.setFlipX(x < spr.x - 1);
        scene.fx.dust(spr.x, spr.y + size * 0.42);
        scene.time.delayedCall(dur * 0.5, () => view.alive && scene.fx.dust(spr.x, spr.y + size * 0.42));
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

