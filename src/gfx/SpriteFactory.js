import { createCanvas, ellipse, fillPoly, linear, radial, rgba, star, seeded, shade } from './draw.js';
import { drawMonster } from './monsterArt.js';
import { drawHero } from './heroArt.js';
import { drawRockTop, drawRockFront, drawRoomFloor, drawInnerShade, drawTrap } from './tileArt.js';
import { MONSTERS } from '../data/monsters.js';
import { ADVENTURERS } from '../data/adventurers.js';
import { BOSSES } from '../data/bosses.js';
import { ROOMS } from '../data/rooms.js';
import { TRAPS } from '../data/traps.js';
import { THEMES } from '../data/floors.js';

export const MONSTER_TEX = 160;
export const BOSS_TEX = 224;
export const TILE_TEX = 128;

/**
 * SPRITE FACTORY
 * Génère toutes les textures du jeu à partir de code (art procédural) :
 * monstres, aventuriers, boss, tuiles, pièges, particules et projectiles.
 * Les mêmes canvas servent à Phaser (textures) et à l'interface DOM (images).
 */
class SpriteFactoryImpl {
  constructor() {
    this.canvases = new Map();
    this.urls = new Map();
    this.scene = null;
  }

  register(key, canvas) {
    this.canvases.set(key, canvas);
    if (this.scene && !this.scene.textures.exists(key)) this.scene.textures.addCanvas(key, canvas);
  }

  make(key, w, h, drawFn, scale = 1) {
    if (this.canvases.has(key)) return this.canvases.get(key);
    const c = createCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
    drawFn(ctx);
    ctx.restore();
    this.register(key, c);
    return c;
  }

  /** Liste des tâches de génération (permet une barre de progression). */
  buildJobs() {
    const jobs = [];
    // Particules et effets
    jobs.push(() => this.generateFx());
    // Tuiles
    for (const [themeId, theme] of Object.entries(THEMES)) {
      jobs.push(() => {
        for (let i = 0; i < 4; i++) {
          this.make(`rock_${themeId}_${i}`, TILE_TEX, TILE_TEX, (ctx) => drawRockTop(ctx, theme, 101 + i * 977 + themeId.length * 13));
          this.make(`rockfront_${themeId}_${i}`, TILE_TEX, 40, (ctx) => drawRockFront(ctx, theme, 55 + i * 331));
        }
        this.make(`bg_${themeId}`, 256, 256, (ctx) => this.drawBackground(ctx, theme, 256));
      });
    }
    jobs.push(() => {
      for (const [id, room] of Object.entries(ROOMS)) this.make(`floor_${id}`, TILE_TEX, TILE_TEX, (ctx) => drawRoomFloor(ctx, id, room, id.length * 7919));
      this.make('tile_shade', TILE_TEX, TILE_TEX, (ctx) => drawInnerShade(ctx));
      for (const id of Object.keys(TRAPS)) this.make(`trap_${id}`, 64, 64, (ctx) => drawTrap(ctx, id));
    });
    // Monstres (par paquets)
    const chunk = 8;
    for (let i = 0; i < MONSTERS.length; i += chunk) {
      const list = MONSTERS.slice(i, i + chunk);
      jobs.push(() => {
        for (const m of list) this.monsterTexture(m);
      });
    }
    jobs.push(() => {
      for (const cls of Object.values(ADVENTURERS)) {
        this.make(`hero_${cls.id}`, MONSTER_TEX, MONSTER_TEX, (ctx) => drawHero(ctx, cls.id, cls.palette, false), MONSTER_TEX / 128);
        this.make(`hero_${cls.id}_elite`, MONSTER_TEX, MONSTER_TEX, (ctx) => drawHero(ctx, cls.id, cls.palette, true), MONSTER_TEX / 128);
      }
    });
    jobs.push(() => {
      for (const b of Object.values(BOSSES)) {
        this.make(`boss_${b.id}`, BOSS_TEX, BOSS_TEX, (ctx) => drawMonster(ctx, b.family, b.palette, { stage: 4 }), BOSS_TEX / 128);
        for (const ph of b.phases || []) {
          for (const s of ph.summon || []) this.summonTexture(s);
        }
      }
    });
    return jobs;
  }

  monsterTexture(m) {
    return this.make(`mon_${m.id}`, MONSTER_TEX, MONSTER_TEX, (ctx) => drawMonster(ctx, m.family, m.palette, { stage: m.stage, gear: m.gear }), MONSTER_TEX / 128);
  }

  summonTexture(s) {
    const key = s.sprite || `summon_${s.family}`;
    return this.make(key, MONSTER_TEX, MONSTER_TEX, (ctx) => drawMonster(ctx, s.family, s.palette || { body: '#888', dark: '#333', light: '#bbb', accent: '#fff', eye: '#f00' }, { stage: 1 }), MONSTER_TEX / 128);
  }

  /** Fond de caverne tuilable. */
  drawBackground(ctx, theme, S) {
    const rnd = seeded(theme.rock.length * 999 + S);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const r = 10 + rnd() * 40;
      ctx.fillStyle = rgba(rnd() > 0.5 ? theme.rockDark : theme.fog, 0.35 + rnd() * 0.3);
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, r, r * 0.7, rnd(), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  generateFx() {
    const soft = (key, size, inner = 'rgba(255,255,255,1)') =>
      this.make(key, size, size, (ctx) => {
        ctx.fillStyle = radial(ctx, size / 2, size / 2, size / 2, [[0, inner], [0.35, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
        ctx.fillRect(0, 0, size, size);
      });
    soft('p_soft', 64);
    soft('glow', 128);
    this.make('p_spark', 32, 32, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      star(ctx, 16, 16, 14, 4, 0.22);
      ctx.fill();
    });
    this.make('p_ring', 64, 64, (ctx) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(32, 32, 24, 0, Math.PI * 2);
      ctx.stroke();
    });
    this.make('p_shard', 24, 24, (ctx) => fillPoly(ctx, [[12, 0], [20, 12], [12, 24], [4, 12]], '#ffffff'));
    this.make('p_smoke', 64, 64, (ctx) => {
      ctx.fillStyle = radial(ctx, 32, 32, 30, [[0, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();
    });
    this.make('p_ember', 12, 12, (ctx) => {
      ctx.fillStyle = radial(ctx, 6, 6, 6, [[0, '#ffffff'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 12, 12);
    });
    this.make('p_coin', 24, 24, (ctx) => {
      ellipse(ctx, 12, 12, 10, 10, linear(ctx, 0, 2, 0, 22, [[0, '#fff3a0'], [1, '#d09a10']]), '#7a5a05', 2);
      ellipse(ctx, 12, 12, 5, 6, null, rgba('#7a5a05', 0.6), 1.5);
    });
    this.make('p_plus', 32, 32, (ctx) => {
      fillPoly(ctx, [[12, 2], [20, 2], [20, 12], [30, 12], [30, 20], [20, 20], [20, 30], [12, 30], [12, 20], [2, 20], [2, 12], [12, 12]], '#ffffff');
    });
    // Projectiles
    this.make('proj_arrow', 56, 14, (ctx) => {
      fillPoly(ctx, [[2, 6], [44, 6], [44, 8], [2, 8]], '#c0a070', '#3a2a1a', 1);
      fillPoly(ctx, [[42, 2], [56, 7], [42, 12]], '#e0e8f0', '#3a3a4a', 1.5);
      fillPoly(ctx, [[0, 2], [10, 6], [10, 8], [0, 12]], '#ff6a6a');
    });
    this.make('proj_orb', 40, 40, (ctx) => {
      ctx.fillStyle = radial(ctx, 20, 20, 20, [[0, '#ffffff'], [0.4, 'rgba(255,255,255,0.9)'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 40, 40);
    });
    this.make('proj_fireball', 56, 40, (ctx) => {
      ctx.fillStyle = radial(ctx, 38, 20, 20, [[0, '#ffffff'], [0.3, '#ffe14d'], [0.7, '#ff6a2b'], [1, 'rgba(255,60,0,0)']]);
      ctx.beginPath();
      ctx.moveTo(56, 20);
      ctx.quadraticCurveTo(50, 0, 30, 4);
      ctx.quadraticCurveTo(0, 20, 30, 36);
      ctx.quadraticCurveTo(50, 40, 56, 20);
      ctx.fill();
    });
    this.make('proj_ice', 48, 20, (ctx) => {
      fillPoly(ctx, [[0, 10], [14, 2], [48, 10], [14, 18]], linear(ctx, 0, 0, 48, 0, [[0, 'rgba(255,255,255,0.3)'], [1, '#ffffff']]), '#7fd6ff', 1.5);
    });
    this.make('proj_bone', 32, 32, (ctx) => {
      fillPoly(ctx, [[8, 14], [24, 14], [24, 18], [8, 18]], '#efe8d6', '#3a3020', 1.5);
      for (const [x, y] of [[7, 13], [7, 19], [25, 13], [25, 19]]) ellipse(ctx, x, y, 3.5, 3.5, '#efe8d6', '#3a3020', 1.2);
    });
    this.make('fx_slash', 96, 96, (ctx) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      for (const [w, a] of [[10, 0.9], [4, 1]]) {
        ctx.lineWidth = w;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(48, 70, 52, -2.4, -0.7);
        ctx.stroke();
      }
    });
    this.make('fx_claw', 64, 64, (ctx) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(14 + i * 14, 8);
        ctx.lineTo(4 + i * 14, 56);
        ctx.stroke();
      }
    });
    this.make('fx_bite', 64, 64, (ctx) => {
      for (const [y, d] of [[16, 1], [48, -1]]) {
        for (let i = 0; i < 4; i++) fillPoly(ctx, [[8 + i * 13, y], [20 + i * 13, y], [14 + i * 13, y + d * 14]], '#ffffff');
      }
    });
    this.make('fx_bolt', 32, 128, (ctx) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(8, 40);
      ctx.lineTo(22, 52);
      ctx.lineTo(10, 90);
      ctx.lineTo(20, 100);
      ctx.lineTo(14, 128);
      ctx.stroke();
    });
    this.make('fx_beam', 128, 24, (ctx) => {
      ctx.fillStyle = linear(ctx, 0, 0, 0, 24, [[0, 'rgba(255,255,255,0)'], [0.5, '#ffffff'], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(0, 0, 128, 24);
    });
    this.make('shadow', 64, 24, (ctx) => {
      ctx.fillStyle = radial(ctx, 32, 12, 32, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
      ctx.save();
      ctx.scale(1, 24 / 64);
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.restore();
      ctx.fill();
    });
    this.make('vignette', 256, 256, (ctx) => {
      ctx.fillStyle = radial(ctx, 128, 128, 181, [[0.55, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
      ctx.fillRect(0, 0, 256, 256);
    });
    this.make('cell_select', 128, 128, (ctx) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(6, 6, 116, 116, 14);
      ctx.stroke();
    });
    this.make('pixel', 4, 4, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 4, 4);
    });
  }

  /** URL d'image pour le DOM (mise en cache). */
  url(key) {
    if (this.urls.has(key)) return this.urls.get(key);
    let c = this.canvases.get(key);
    if (!c) {
      const m = MONSTERS.find((x) => `mon_${x.id}` === key);
      if (m) c = this.monsterTexture(m);
    }
    if (!c || !c.toDataURL) return '';
    const u = c.toDataURL('image/png');
    this.urls.set(key, u);
    return u;
  }

  /** Attache la fabrique à une scène Phaser et enregistre les textures déjà générées. */
  attach(scene) {
    this.scene = scene;
    for (const [key, c] of this.canvases) if (!scene.textures.exists(key)) scene.textures.addCanvas(key, c);
  }

  shadeColor(hex, amt) {
    return shade(hex, amt);
  }
}

export const SpriteFactory = new SpriteFactoryImpl();
