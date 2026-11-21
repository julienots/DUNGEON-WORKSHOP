import Phaser from 'phaser';
import { ctx, sfx } from '../ui/context.js';
import { h } from '../ui/dom.js';
import { FxKit } from './FxKit.js';
import { ELEMENTS } from '../data/elements.js';
import { STATUSES } from '../data/statuses.js';
import { SKILLS } from '../data/skills.js';
import { ROOMS } from '../data/rooms.js';
import { FONT_TITLE, FONT_BODY, SPEEDS } from '../utils/constants.js';
import { formatShort } from '../utils/format.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { showRunEnd } from '../ui/screens/RunScreen.js';
import { ISO } from '../gfx/isoArt.js';
import { ROOM_PROPS, PROP_W, PROP_H, PROP_FOOT } from '../gfx/isoProps.js';
import { THEMES } from '../data/floors.js';

const ARENA_N = 5; // l'arène est un losange de 5 × 5 dalles

/**
 * BATTLE SCENE
 * Vue rapprochée et lisible d'un combat : PV, dégâts, compétences, effets, critiques, morts, victoire.
 * Rejoue la chronologie déterministe produite par CombatSystem (raid en cours ou combat de boss).
 * Vitesse 1x / 2x / 4x.
 */
export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.data_ = data;
  }

  create() {
    const data = this.data_;
    this.g = ctx.game;
    this.S = this.registry.get('dpr') || 1;
    this.views = new Map();
    this.finished = false;
    this.clock = 0;
    this.speed = this.g.state.settings.speed || 1;
    const { width, height } = this.scale;

    if (data.mode === 'raid') {
      this.rt = this.g.raids.rt(data.floor);
      const res = this.rt.current;
      if (!res) return this.exit();
      this.events_ = res.events;
      // Début du combat en cours (dernier combatStart avant l'index courant)
      let start = Math.min(data.index ?? 0, this.events_.length - 1);
      while (start > 0 && this.events_[start].type !== 'combatStart') start--;
      if (this.events_[start]?.type !== 'combatStart') return this.exit();
      this.idx = start;
      this.t0 = this.events_[start].t;
      this.rt.locked = true;
      this.room = this.g.dungeon.cell(data.floor, this.events_[start].x, this.events_[start].y);
      this.title = `${ROOMS[this.room?.room]?.icon || '⚔️'} ${ROOMS[this.room?.room]?.name || 'Combat'} — ${res.party.name}`;
      this.g.stats.add('battlesWatched', 1);
    } else if (data.mode === 'run') {
      // Étape d'un mode de jeu (Survie, Roguelite, Infini…)
      this.events_ = data.run.result.events;
      this.idx = 0;
      this.t0 = 0;
      this.title = data.run.title;
      ctx.audio?.playMusic(data.music || 'boss');
    } else {
      this.events_ = data.result.result.events;
      this.idx = 0;
      this.t0 = 0;
      this.title = `${data.result.boss.icon} ${data.result.boss.name}`;
      ctx.audio?.playMusic('boss');
    }

    // Décor
    const theme = data.theme || this.g.dungeon.def(data.floor ?? this.g.viewFloor).theme;
    this.cameras.main.setBackgroundColor('#0a0708');
    this.theme = theme;
    this.unitLayer = this.add.layer().setDepth(10);
    this.fxLayer = this.add.layer().setDepth(20);
    this.fx = new FxKit(this, this.fxLayer, this.S);
    this.buildArena(theme, this.room?.room || (data.mode === 'raid' ? 'basic' : 'arena'));

    this.buildHud();
    this.cameras.main.fadeIn(250, 0, 0, 0);
    sfx(data.mode === 'boss' || (data.mode === 'run' && data.run.stage.isBoss) ? 'boss_roar' : 'raid_start');
    this.events.once('shutdown', () => this.cleanup());
  }

  /** Arène isométrique : dalles de la salle, murs arrière du thème, torches, accessoires, socle. */
  buildArena(themeId, roomId) {
    const { width, height } = this.scale;
    const S = this.S;
    const N = ARENA_N;
    const lowQ = this.g.state.settings.quality === 'low';
    const topSafe = 90 * S;
    const botSafe = 110 * S;
    const availH = height - topSafe - botSafe;
    const TW = Math.min(width / (N - 0.75), (availH - 40 * S) / (N / 2 + ISO.WALL / ISO.W + 0.2));
    const TH = TW / 2;
    const wallH = (TW * ISO.WALL) / ISO.W;
    const sc = TW / ISO.W;
    const ox = width / 2;
    const oy = topSafe + wallH * 1.6 + Math.max(0, (availH - (wallH * 1.6 + N * TH)) / 2);
    this.isoA = { TW, TH, ox, oy };
    const iso = (gx, gy) => ({ x: ox + ((gx - gy) * TW) / 2, y: oy + ((gx + gy) * TH) / 2 });
    this.isoPt = iso;
    // fond : vide + brume
    this.add.image(width / 2, height / 2, `void_${themeId}`).setDisplaySize(width * 1.1, height * 1.1).setDepth(-20);
    const fogTint = Phaser.Display.Color.HexStringToColor(THEMES[themeId]?.fog || '#3a2a1a').color;
    if (!lowQ) {
      for (let i = 0; i < 3; i++) {
        const fog = this.add.image(width * (0.2 + i * 0.3), height * (0.3 + i * 0.2), 'fog_cloud').setDisplaySize(width * 1.4, height * 0.3).setTint(fogTint).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(-19);
        this.tweens.add({ targets: fog, x: fog.x + (i % 2 ? 1 : -1) * width * 0.25, duration: 14000 + i * 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    const floorKey = this.textures.exists(`iso_floor_${roomId}`) ? `iso_floor_${roomId}` : 'iso_floor_basic';
    const groundKey = this.textures.exists(`iso_ground_${roomId}`) ? `iso_ground_${roomId}` : floorKey;
    // dalles
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const c = iso(x + 0.5, y + 0.5);
        const edge = Math.max(Math.abs(x - (N - 1) / 2), Math.abs(y - (N - 1) / 2)) / ((N - 1) / 2);
        const center = x === (N - 1) / 2 && y === (N - 1) / 2;
        this.add.image(c.x, c.y, center ? floorKey : groundKey).setDisplaySize(TW + 2, TH + 1).setDepth(-10).setTint(Phaser.Display.Color.GetColor(255 - edge * 70, 255 - edge * 70, 255 - edge * 70));
        if (x === 0) this.add.image(c.x, c.y, 'iso_ao_l').setDisplaySize(TW + 2, TH + 1).setDepth(-9.5);
        if (y === 0) this.add.image(c.x, c.y, 'iso_ao_r').setDisplaySize(TW + 2, TH + 1).setDepth(-9.5);
      }
    }
    // lumière centrale
    const mid = iso(N / 2, N / 2);
    const light = THEMES[themeId]?.light || 0xffb060;
    const pool = this.add.image(mid.x, mid.y, 'glow').setDisplaySize(TW * N * 0.9, TH * N * 0.9).setTint(light).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(-9);
    this.tweens.add({ targets: pool, alpha: 0.12, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // murs arrière (rangée y = -1 et colonne x = -1)
    const blocks = [];
    for (let i = -1; i < N; i++) blocks.push([i, -1], [-1, i]);
    blocks.push([-1, -1]);
    const seen = new Set();
    for (const [x, y] of blocks) {
      const k = `${x},${y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const c = iso(x + 0.5, y + 0.5);
      const v = Math.abs((x * 7 + y * 13) % 4);
      const key = SpriteFactory.isoBlock(themeId, v, 'tall');
      const texH = ISO.TOP + ISO.H + ISO.WALL;
      // deux assises de mur : la salle paraît plus haute
      const upper = SpriteFactory.isoBlock(themeId, (v + 1) % 4, 'tall');
      this.add.image(c.x, c.y - wallH, upper).setOrigin(0.5, (ISO.TOP + ISO.H / 2 + ISO.WALL) / texH).setDisplaySize(TW + 1, texH * sc + 0.5).setDepth(-7.995 + (x + y) * 0.01).setTint(0xb8aca0);
      this.add.image(c.x, c.y, key).setOrigin(0.5, (ISO.TOP + ISO.H / 2 + ISO.WALL) / texH).setDisplaySize(TW + 1, texH * sc + 0.5).setDepth(-8 + (x + y) * 0.01);
      if (!lowQ && x >= 0 && x % 2 === 0) this.arenaTorch(c.x - TW / 4, c.y + TH / 4 - wallH * 0.55, 'l', light, sc, TW);
      if (!lowQ && y >= 0 && y % 2 === 1) this.arenaTorch(c.x + TW / 4, c.y + TH / 4 - wallH * 0.55, 'r', light, sc, TW);
    }
    // socle avant
    for (let i = 0; i < N; i++) {
      const cl = iso(i + 0.5, N - 0.5);
      this.add.image(cl.x - TW / 2, cl.y, SpriteFactory.isoBase(themeId, 'l', i % 2)).setOrigin(0, 0).setDisplaySize(TW / 2 + 0.5, (ISO.H / 2 + ISO.BASE) * sc).setDepth(-11);
      const cr = iso(N - 0.5, i + 0.5);
      this.add.image(cr.x, cr.y + TH / 2, SpriteFactory.isoBase(themeId, 'r', i % 2)).setOrigin(0, (ISO.H / 2) / (ISO.H / 2 + ISO.BASE)).setDisplaySize(TW / 2 + 0.5, (ISO.H / 2 + ISO.BASE) * sc).setDepth(-11);
    }
    // accessoires de la salle, repoussés vers le fond de l'arène
    for (const [id, lx, ly] of ROOM_PROPS[roomId] || []) {
      const p = iso(lx * 1.6, ly * 1.6);
      const w = TW * 0.42;
      const img = this.add.image(p.x, p.y, `prop_${id}`).setOrigin(0.5, PROP_FOOT / PROP_H).setDisplaySize(w, (w * PROP_H) / PROP_W).setDepth(p.y);
      this.unitLayer.add(img);
    }
    if (!lowQ) {
      // rais de lumière tombant d'une ouverture invisible + poussière en suspension
      for (let i = 0; i < 3; i++) {
        const r = this.add.image(width * (0.3 + i * 0.22), 0, 'godray').setOrigin(0.5, 0).setDisplaySize(width * 0.2, oy + TH * N * 0.6).setAngle(-14 + i * 5).setTint(light).setAlpha(0.06).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
        this.tweens.add({ targets: r, alpha: 0.015, duration: 2600 + i * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      this.add.particles(0, 0, 'p_ember', {
        x: { min: 0, max: width }, y: { min: topSafe, max: oy + TH * N }, lifespan: 5000, speedY: { min: 4 * S, max: 14 * S }, speedX: { min: -6 * S, max: 6 * S },
        scale: { start: 0.5 * S, end: 0.1 * S }, alpha: { start: 0, end: 0.6, ease: 'Sine.easeInOut' }, tint: [0xffe0b0, 0xffffff], frequency: 160, blendMode: 'ADD',
      }).setDepth(4.5);
    }
    this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width * 1.2, height * 1.2).setDepth(5);
    // lignes de placement : héros en haut à gauche, défenseurs en bas à droite
    this.lines = { B: { gx: 1.15, from: 0.55, to: N - 0.45 }, A: { gx: N - 1.25, from: 0.55, to: N - 0.45 } };
  }

  arenaTorch(x, y, side, color, sc, TW) {
    this.add.image(x, y, `torch_${side}`).setDisplaySize(48 * sc * 1.4, 64 * sc * 1.4).setDepth(-7);
    const fy = y - 64 * sc * 1.4 * 0.18;
    const glow = this.add.image(x, fy, 'glow').setDisplaySize(TW * 0.9, TW * 0.75).setTint(color).setAlpha(0.42).setBlendMode(Phaser.BlendModes.ADD).setDepth(-6.9);
    const fl = this.add.image(x, fy, 'flame').setOrigin(0.5, 0.92).setDisplaySize(12 * sc * 2.2, 18 * sc * 2.2).setTint(0xffc060).setBlendMode(Phaser.BlendModes.ADD).setDepth(-6.8);
    this.tweens.add({ targets: fl, scaleY: fl.scaleY * 1.25, scaleX: fl.scaleX * 0.85, duration: 100 + Math.random() * 80, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: glow, alpha: 0.25, duration: 160 + Math.random() * 160, yoyo: true, repeat: -1 });
  }

  cleanup() {
    clearTimeout(this.comboTimer);
    this.hud?.remove();
    if (this.rt) this.rt.locked = false;
    // La musique est rétablie par l'écran de retour (biome du donjon ou mode de jeu)
  }

  buildHud() {
    const speedBtn = h('button.btn.btn-secondary.btn-small', { type: 'button', onclick: () => this.cycleSpeed() }, `⏩ ${this.speed}x`);
    this.speedBtn = speedBtn;
    this.bossBar = null;
    this.hud = h('div.battle-hud',
      h('div.battle-top', h('div.battle-title', this.title), h('div.battle-phase', '')),
      h('div.battle-bottom',
        speedBtn,
        h('button.btn.btn-ghost.btn-small', { type: 'button', onclick: () => this.skip() }, '⏭ Passer'),
        h('button.btn.btn-danger.btn-small', { type: 'button', onclick: () => this.exit() }, '✕ Quitter'),
      ),
    );
    this.phaseEl = this.hud.querySelector('.battle-phase');
    document.getElementById('ui').appendChild(this.hud);
  }

  cycleSpeed() {
    const i = SPEEDS.indexOf(this.speed);
    this.speed = SPEEDS[(i + 1) % SPEEDS.length];
    this.g.state.settings.speed = this.speed;
    this.speedBtn.textContent = `⏩ ${this.speed}x`;
    this.g.requestSave();
  }

  // ------------------------------------------------------------------ unités
  layoutSide(side) {
    const list = [...this.views.values()].filter((v) => v.side === side);
    const n = list.length;
    const L = this.lines[side];
    const { TW } = this.isoA;
    const span = L.to - L.from;
    const size = Math.min(TW * 1.25, ((span * TW) / Math.max(1, n)) * (n >= 4 ? 1.6 : 1.3), 240 * this.S);
    list.forEach((v, i) => {
      const gy = n === 1 ? (L.from + L.to) / 2 : L.from + (span * (i + 0.5)) / n;
      // quinconce : un rang sur deux légèrement en avant
      const gx = L.gx + (n >= 3 ? (i % 2 ? 0.35 : -0.35) * (side === 'B' ? -1 : 1) : 0);
      const feet = this.isoPt(gx, gy);
      const sz = v.isBoss ? Math.min(size * 1.7, this.scale.width * 0.5) : size;
      v.place(feet.x, feet.y - sz * 0.42, sz);
    });
  }

  createView(u) {
    const S = this.S;
    if (!this.textures.exists(u.sprite)) {
      if (u.sprite.startsWith('summon_')) SpriteFactory.summonTexture({ family: u.family, sprite: u.sprite });
      else if (u.sprite.includes('__')) SpriteFactory.monsterKey(u.sprite.slice(4).split('__')[0], u.sprite.split('__')[1]);
    }
    const shadow = this.add.image(0, 0, 'shadow');
    let aura = null;
    if (u.isBoss) aura = this.add.image(0, 0, 'glow').setTint(ELEMENTS[u.element]?.hex || 0xff5040).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const spr = this.add.image(0, 0, this.textures.exists(u.sprite) ? u.sprite : 'mon_slime');
    if (u.side === 'A') spr.setFlipX(true);
    const name = this.add.text(0, 0, `${u.name} · ${u.level}`, { fontFamily: FONT_BODY, fontStyle: 'bold', fontSize: `${Math.round(13 * S)}px`, color: u.side === 'A' ? '#cfe8ff' : '#ffd6c0', stroke: '#000', strokeThickness: 4 * S }).setOrigin(0.5);
    const status = this.add.text(0, 0, '', { fontSize: `${Math.round(13 * S)}px` }).setOrigin(0.5);
    this.unitLayer.add([shadow, ...(aura ? [aura] : []), spr, name, status]);
    const hp = this.fx.hpBar(0, 0, 100 * S, u.side === 'A' ? 0x5aff6a : 0xff5a5a, 30);
    const scene = this;
    const v = {
      id: u.id, side: u.side, isBoss: u.isBoss, spr, shadow, aura, name, status, hp, size: 100, alive: u.hp > 0, maxHp: u.maxHp, hpVal: u.hp, statuses: new Map(),
      x: () => spr.x,
      y: () => spr.y,
      place(x, y, size) {
        v.size = size;
        v.baseX = x;
        v.baseY = y;
        spr.setPosition(x, y).setDisplaySize(size, size).setDepth(y + size * 0.42);
        shadow.setPosition(x, y + size * 0.42).setDisplaySize(size * 0.75, size * 0.22).setDepth(y + size * 0.42 - 0.02);
        aura?.setDepth(y + size * 0.42 - 0.01);
        name.setDepth(1e6);
        status.setDepth(1e6);
        aura?.setPosition(x, y).setDisplaySize(size * 1.5, size * 1.5);
        const barW = Math.min(size * 0.8, 160 * S);
        hp.destroy();
        v.hp = scene.fx.hpBar(x, y - size * 0.55, barW, u.side === 'A' ? 0x5aff6a : 0xff5a5a, 30);
        v.hp.set(v.hpVal / v.maxHp);
        if (!v.alive) v.hp.hide();
        name.setPosition(x, y - size * 0.55 - 16 * S);
        status.setPosition(x, y + size * 0.5 + 12 * S);
        if (v.idle) v.idle.stop();
        v.idle = scene.tweens.add({ targets: spr, y: y - size * 0.03, duration: 800 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
      setHp(val, max) {
        if (max) v.maxHp = max;
        v.hpVal = val;
        v.hp.set(val / v.maxHp);
        if (v.isBoss) scene.updateBossBar(v);
      },
      flash() {
        spr.setTintFill(0xffffff);
        scene.time.delayedCall(70, () => (v.alive ? spr.clearTint() : spr.setTint(0x444444)));
        scene.tweens.add({ targets: spr, x: v.baseX + (u.side === 'A' ? 6 : -6) * S, duration: 50, yoyo: true });
      },
      die() {
        v.alive = false;
        v.hp.hide();
        v.idle?.stop();
        name.setAlpha(0.4);
        status.setText('');
        scene.tweens.add({ targets: spr, alpha: 0.25, angle: u.side === 'A' ? -80 : 80, duration: 500 });
        scene.tweens.add({ targets: [shadow, aura].filter(Boolean), alpha: 0, duration: 500 });
      },
      revive() {
        v.alive = true;
        spr.setAlpha(1).setAngle(0).clearTint();
        v.hp.show();
        name.setAlpha(1);
      },
      refreshStatus() {
        status.setText([...v.statuses.keys()].map((id) => STATUSES[id].icon).join(''));
      },
    };
    this.views.set(u.id, v);
    return v;
  }

  updateBossBar(v) {
    if (!this.bossBar) {
      this.bossBar = h('div.boss-bar', h('div.boss-bar-fill'), h('span.boss-bar-label', ''));
      this.hud.querySelector('.battle-top').appendChild(this.bossBar);
    }
    const r = Math.max(0, v.hpVal / v.maxHp);
    this.bossBar.firstChild.style.width = `${(r * 100).toFixed(1)}%`;
    this.bossBar.lastChild.textContent = `${formatShort(v.hpVal)} / ${formatShort(v.maxHp)}`;
  }

  // ------------------------------------------------------------------ lecture
  update(time, delta) {
    if (this.finished || !this.events_) return;
    this.clock += (delta / 1000) * this.speed;
    const now = this.t0 + this.clock;
    let budget = 30;
    while (this.idx < this.events_.length && this.events_[this.idx].t <= now && budget-- > 0) {
      const ev = this.events_[this.idx];
      this.idx++;
      if (this.rt) this.rt.elapsed = Math.max(this.rt.elapsed, ev.t);
      if (this.handle(ev)) return;
    }
    this.expireStatuses(now);
    if (this.idx >= this.events_.length) this.finish();
  }

  handle(ev, instant = false) {
    const S = this.S;
    switch (ev.type) {
      case 'start': {
        for (const u of ev.units) {
          if (u.hp <= 0) continue;
          if (!this.views.has(u.id)) this.createView(u);
          else this.views.get(u.id).setHp(u.hp, u.maxHp);
        }
        this.layoutSide('A');
        this.layoutSide('B');
        const boss = [...this.views.values()].find((v) => v.isBoss);
        if (boss) this.updateBossBar(boss);
        break;
      }
      case 'act': {
        if (instant) break;
        const src = this.views.get(ev.src);
        const tgts = ev.targets.map((id) => this.views.get(id)).filter(Boolean);
        if (!src || !src.alive) break;
        this.fx.playSkill(src, tgts, ev, this.speed);
        const sk = SKILLS[ev.skill];
        if (sk && !sk.basic) this.fx.floatText(src.x(), src.y() - src.size * 0.75, `${sk.icon} ${sk.name}`, '#ffe6a8', 0.75);
        break;
      }
      case 'dmg': {
        const v = this.views.get(ev.tgt);
        if (!v) break;
        v.setHp(ev.hp);
        if (instant) break;
        const color = ev.dot ? STATUSES[ev.statusId]?.color || '#c0ff80' : ev.crit ? '#ffe14d' : ev.element && ev.element !== 'neutral' ? ELEMENTS[ev.element].color : v.side === 'A' ? '#ff8a8a' : '#ffffff';
        this.fx.damageNumber(v.x(), v.y() - v.size * 0.3, ev.amount, color, ev.crit, ev.eff);
        if (!ev.dot) v.flash();
        if (ev.crit) {
          sfx('crit');
          this.fx.shake(140, 0.005);
        }
        break;
      }
      case 'heal': {
        const v = this.views.get(ev.tgt);
        if (!v) break;
        v.setHp(ev.hp);
        if (!instant) {
          this.fx.damageNumber(v.x(), v.y() - v.size * 0.3, `+${formatShort(ev.amount)}`, '#6bff8a');
          this.fx.heal(v.x(), v.y());
        }
        break;
      }
      case 'miss': {
        const v = this.views.get(ev.tgt);
        if (v && !instant) this.fx.floatText(v.x(), v.y() - v.size * 0.3, 'Esquive !', '#c0d0ff', 0.8);
        break;
      }
      case 'status': {
        const v = this.views.get(ev.tgt);
        if (!v) break;
        // Durée réelle transmise par le moteur de combat (V2)
        v.statuses.set(ev.id, ev.t + (ev.dur ?? 5));
        v.refreshStatus();
        break;
      }
      case 'reaction': {
        if (instant) break;
        const v = this.views.get(ev.tgt);
        if (!v) break;
        this.showReaction(v, ev);
        break;
      }
      case 'combo': {
        if (ev.side === 'A') this.showCombo(ev, instant);
        break;
      }
      case 'trap': {
        const targets = ev.targets.map((id) => this.views.get(id)).filter(Boolean);
        if (!instant && targets.length) {
          const cx = targets.reduce((a, t) => a + t.x(), 0) / targets.length;
          const cy = targets.reduce((a, t) => a + t.y(), 0) / targets.length;
          this.fx.trapFire(ev.trap, { x: cx, y: cy }, 180 * S, ev.element, null);
          this.fx.floatText(cx, cy - 120 * S, ev.synergy ? '⚗️ Synergie !' : '🧨 Piège !', ev.synergy ? '#e0a0ff' : '#ffb347', 0.9);
        }
        break;
      }
      case 'death': {
        const v = this.views.get(ev.tgt);
        if (!v) break;
        v.die();
        if (!instant) {
          sfx(v.side === 'B' ? 'death_hero' : 'death_monster');
          this.fx.soul(v.x(), v.y());
          if (v.side === 'B') this.fx.coins(v.x(), v.y(), 6);
        }
        break;
      }
      case 'revive': {
        const v = this.views.get(ev.tgt);
        if (!v) break;
        v.revive();
        v.setHp(ev.hp);
        if (!instant) this.fx.floatText(v.x(), v.y() - v.size * 0.5, '✨ Renaissance !', '#b0ffb0', 1);
        break;
      }
      case 'phase': {
        const v = this.views.get(ev.tgt);
        sfx('phase');
        this.cameras.main.flash(300, 255, 80, 60);
        this.fx.shake(400, 0.008);
        this.fx.banner(`⚠️ ${ev.name}`, '#ff8a6a');
        this.phaseEl.textContent = `Phase ${ev.index + 1} — ${ev.msg}`;
        if (v) {
          v.spr.setTint(0xff8a8a);
          this.time.delayedCall(400, () => v.spr.clearTint());
          this.fx.ring(v.x(), v.y(), 0xff4a2a, v.size * 1.6, 600);
        }
        break;
      }
      case 'summon': {
        const v = this.createView(ev.unit);
        this.layoutSide(ev.unit.side);
        v.spr.setScale(0.01);
        this.tweens.add({ targets: v.spr, scaleX: v.size / v.spr.width, scaleY: v.size / v.spr.height, duration: 300, ease: 'Back.easeOut' });
        this.fx.burst(v.x(), v.y(), 0xff5ce1, 12);
        sfx('summon');
        break;
      }
      case 'combatEnd':
      case 'end':
        this.finish(ev.winner);
        return true;
      default:
        break;
    }
    if (ev.t !== undefined) this.expireStatuses(ev.t);
    return false;
  }

  /** Retire les icônes de statut expirés (fin réelle connue grâce à la durée). */
  expireStatuses(now) {
    for (const v of this.views.values()) {
      let changed = false;
      for (const [id, until] of v.statuses) {
        if (now >= until) {
          v.statuses.delete(id);
          changed = true;
        }
      }
      if (changed) v.refreshStatus();
    }
  }

  /** Réaction élémentaire : onde de choc, éclair de couleur, grand texte. */
  showReaction(v, ev) {
    const S = this.S;
    const col = Phaser.Display.Color.HexStringToColor(ev.color || '#ffffff').color;
    sfx('synergy');
    const ring = this.add.image(v.x(), v.y(), 'p_ring').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(60).setDisplaySize(v.size * 0.4, v.size * 0.4);
    this.tweens.add({ targets: ring, displayWidth: v.size * 2.4, displayHeight: v.size * 2.4, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    const glow = this.add.image(v.x(), v.y(), 'glow').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setDepth(59).setDisplaySize(v.size * 2, v.size * 2).setAlpha(0.9);
    this.tweens.add({ targets: glow, alpha: 0, duration: 650, onComplete: () => glow.destroy() });
    this.fx.burst(v.x(), v.y(), col, 18);
    this.fx.shake(120, 0.004);
    const t = this.add.text(this.scale.width / 2, this.scale.height * 0.3, `${ev.icon} ${ev.name.toUpperCase()} !`, {
      fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: `${Math.round(24 * S)}px`, color: ev.color || '#ffffff', stroke: '#1b1216', strokeThickness: 7 * S, align: 'center',
    }).setOrigin(0.5).setDepth(120).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 30 * S, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }

  /** Compteur de combo des monstres. */
  showCombo(ev, instant) {
    if (!this.comboEl) {
      this.comboEl = h('div.combo-counter');
      this.hud.appendChild(this.comboEl);
    }
    this.comboEl.innerHTML = `<b>${ev.count}</b><span>${ev.name} · +${Math.round(ev.bonus * 100)}% dégâts</span>`;
    this.comboEl.classList.remove('pop');
    void this.comboEl.offsetWidth;
    this.comboEl.classList.add('pop', 'show');
    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => this.comboEl?.classList.remove('show'), 2200);
    if (!instant) sfx('levelup');
  }

  skip() {
    sfx('click');
    while (this.idx < this.events_.length && !this.finished) {
      const ev = this.events_[this.idx];
      this.idx++;
      if (this.rt) this.rt.elapsed = Math.max(this.rt.elapsed, ev.t);
      if (this.handle(ev, true)) return;
    }
    this.finish();
  }

  finish(winner) {
    if (this.finished) return;
    this.finished = true;
    const data = this.data_;
    const S = this.S;
    const { width, height } = this.scale;
    let win;
    if (data.mode === 'boss') win = data.result.win;
    else if (data.mode === 'run') win = data.run.win;
    else win = winner === 'A';
    const text = data.mode === 'boss' || data.mode === 'run'
      ? (win ? '🏆 VICTOIRE !' : '💀 DÉFAITE')
      : (win ? '🏆 Les aventuriers sont vaincus !' : winner === 'timeout' ? '🏃 Retraite des aventuriers' : '⚔️ Les aventuriers passent…');
    sfx(win ? 'victory' : 'defeat');
    const t = this.add.text(width / 2, height * 0.42, text, {
      fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: `${Math.round(30 * S)}px`, color: win ? '#ffe14d' : '#ff8a7a', stroke: '#1b1216', strokeThickness: 8 * S, align: 'center', wordWrap: { width: width * 0.9 },
    }).setOrigin(0.5).setDepth(100).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.easeOut' });
    if (win) {
      for (let i = 0; i < 4; i++) this.time.delayedCall(i * 150, () => this.fx.burst(width * (0.3 + Math.random() * 0.4), height * (0.35 + Math.random() * 0.2), 0xffe14d, 14));
    }
    if (data.mode === 'run') {
      this.time.delayedCall(1500 / Math.min(2, this.speed), () => this.exit());
    } else if (data.mode === 'boss') {
      this.time.delayedCall(1300, () => ctx.ui.hud?.showBossResult(data.result, () => this.exit()));
    } else {
      this.time.delayedCall(1800 / Math.min(2, this.speed), () => this.exit());
    }
  }

  exit() {
    if (this.exiting) return;
    this.exiting = true;
    // Fin de partie (mode de jeu) : bilan affiché au retour, même en quittant le combat en cours de route
    const d = this.data_;
    if (d?.mode === 'run' && d.run.ended) setTimeout(() => showRunEnd(d.run.endReport), 450);
    if (this.rt) this.rt.locked = false;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(210, () => ctx.router.closeBattle());
    if (!this.cameras.main) ctx.router.closeBattle();
  }
}
