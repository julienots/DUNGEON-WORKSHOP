import Phaser from 'phaser';
import { ELEMENTS } from '../data/elements.js';
import { FONT_TITLE } from '../utils/constants.js';
import { formatShort } from '../utils/format.js';
import { sfx, ctx } from '../ui/context.js';

const ELEMENT_SFX = { fire: 'fire', ice: 'ice', lightning: 'lightning', poison: 'poison', shadow: 'shadow', light: 'holy', arcane: 'magic', nature: 'hit', neutral: 'hit' };

function hexColor(el) {
  return ELEMENTS[el]?.hex ?? 0xffffff;
}

/**
 * Boîte à outils d'effets visuels partagée par les scènes de donjon et de combat :
 * nombres de dégâts (pool d'objets), barres de PV, particules, projectiles, bannières.
 * Les objets fréquents sont recyclés pour éviter les créations/destructions massives.
 */
export class FxKit {
  constructor(scene, layer, S = 1) {
    this.scene = scene;
    this.layer = layer;
    this.S = S;
    this.textPool = [];
    this.spritePool = [];
    this.low = () => ctx.game?.state?.settings?.quality === 'low';
    const mk = (tex, cfg) => {
      const e = scene.add.particles(0, 0, tex, { emitting: false, ...cfg });
      layer.add(e);
      return e;
    };
    this.em = {
      spark: mk('p_spark', { lifespan: 380, speed: { min: 80 * S, max: 260 * S }, scale: { start: 0.9 * S, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', rotate: { min: 0, max: 360 } }),
      ember: mk('p_ember', { lifespan: 1300, speedY: { min: -70 * S, max: -25 * S }, speedX: { min: -14 * S, max: 14 * S }, scale: { start: 1.3 * S, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD' }),
      smoke: mk('p_smoke', { lifespan: 900, speed: { min: 10 * S, max: 50 * S }, scale: { start: 0.4 * S, end: 1.4 * S }, alpha: { start: 0.55, end: 0 } }),
      shard: mk('p_shard', { lifespan: 500, speed: { min: 120 * S, max: 300 * S }, scale: { start: 0.9 * S, end: 0.2 * S }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, gravityY: 400 * S }),
      plus: mk('p_plus', { lifespan: 900, speedY: { min: -70 * S, max: -30 * S }, speedX: { min: -20 * S, max: 20 * S }, scale: { start: 0.55 * S, end: 0.1 * S }, alpha: { start: 1, end: 0 }, blendMode: 'ADD' }),
      coin: mk('p_coin', { lifespan: 900, speed: { min: 90 * S, max: 220 * S }, angle: { min: 200, max: 340 }, gravityY: 500 * S, scale: { start: 0.9 * S, end: 0.6 * S }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 } }),
      soft: mk('p_soft', { lifespan: 600, speed: { min: 10 * S, max: 60 * S }, scale: { start: 0.5 * S, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD' }),
    };
  }

  emit(name, x, y, n, tint) {
    const e = this.em[name];
    if (!e) return;
    if (this.low()) n = Math.max(1, Math.ceil(n / 3));
    if (tint !== undefined) e.setParticleTint(tint);
    e.emitParticleAt(x, y, n);
  }

  // ------------------------------------------------------------------ pools
  getText() {
    let t = this.textPool.pop();
    if (!t) {
      t = this.scene.add.text(0, 0, '', { fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: '24px', color: '#fff', stroke: '#1b1216', strokeThickness: 5 }).setOrigin(0.5);
      this.layer.add(t);
    }
    t.setVisible(true).setAlpha(1).setScale(1).setAngle(0);
    return t;
  }

  releaseText(t) {
    t.setVisible(false);
    if (this.textPool.length < 60) this.textPool.push(t);
    else t.destroy();
  }

  getSprite(key) {
    let s = this.spritePool.pop();
    if (!s) {
      s = this.scene.add.image(0, 0, key);
      this.layer.add(s);
    } else s.setTexture(key);
    s.setVisible(true).setAlpha(1).setScale(1).setAngle(0).clearTint().setBlendMode(Phaser.BlendModes.NORMAL).setFlipX(false).setOrigin(0.5);
    return s;
  }

  releaseSprite(s) {
    this.scene.tweens.killTweensOf(s);
    s.setVisible(false);
    if (this.spritePool.length < 40) this.spritePool.push(s);
    else s.destroy();
  }

  // ------------------------------------------------------------------ textes
  damageNumber(x, y, value, color = '#fff', crit = false, eff = null) {
    const S = this.S;
    const t = this.getText();
    const txt = typeof value === 'number' ? formatShort(value) : String(value);
    t.setText(crit ? `${txt}!` : txt);
    t.setFontSize(Math.round((crit ? 30 : 22) * S));
    t.setColor(color);
    t.setStroke('#1b1216', 5 * S);
    t.setPosition(x + (Math.random() - 0.5) * 20 * S, y);
    t.setDepth(5000);
    if (crit) t.setScale(1.6);
    const dur = 750;
    this.scene.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, y: y - 46 * S, alpha: 0, duration: dur, delay: 200, ease: 'Cubic.easeIn', onComplete: () => this.releaseText(t) });
    if (eff === 'strong') this.floatText(x, y - 22 * S, 'Efficace !', '#ffb347', 0.55);
  }

  floatText(x, y, text, color = '#fff', size = 1) {
    const S = this.S;
    const t = this.getText();
    t.setText(text).setFontSize(Math.round(24 * size * S)).setColor(color).setStroke('#1b1216', 5 * S).setPosition(x, y).setDepth(5001);
    this.scene.tweens.add({ targets: t, y: y - 40 * S, alpha: 0, duration: 1300, delay: 300, ease: 'Sine.easeIn', onComplete: () => this.releaseText(t) });
    return t;
  }

  banner(text, color = '#ffd27a') {
    const S = this.S;
    const { width } = this.scene.scale;
    // Position écran convertie en coordonnées monde (la caméra du donjon peut être zoomée/déplacée)
    const cam = this.scene.cameras.main;
    const z = cam.zoom || 1;
    const p = cam.getWorldPoint(width / 2, (ctx.ui?.insets().top || 70) * S + 60 * S);
    const y = p.y;
    const t = this.getText();
    t.setText(text).setFontSize(Math.round(26 * S)).setColor(color).setStroke('#1b1216', 7 * S).setPosition(p.x, y).setDepth(6000).setAlpha(0).setScale(0.6 / z);
    t.setWordWrapWidth(width * 0.9);
    this.scene.tweens.add({ targets: t, alpha: 1, scale: 1 / z, duration: 260, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t, alpha: 0, y: y - (20 * S) / z, duration: 500, delay: 1800, onComplete: () => {
        t.setWordWrapWidth(null);
        this.releaseText(t);
      },
    });
  }

  // ------------------------------------------------------------------ barres de PV
  hpBar(x, y, w, color, depth = 4000) {
    const S = this.S;
    const h = Math.max(5, 7 * S);
    const bg = this.scene.add.rectangle(x, y, w + 4 * S, h + 4 * S, 0x140c10, 0.85).setStrokeStyle(1.5 * S, 0x000000).setDepth(depth);
    const fill = this.scene.add.rectangle(x - w / 2, y, w, h, color).setOrigin(0, 0.5).setDepth(depth + 0.1);
    const shine = this.scene.add.rectangle(x - w / 2, y - h * 0.22, w, h * 0.3, 0xffffff, 0.3).setOrigin(0, 0.5).setDepth(depth + 0.2);
    this.layer.add([bg, fill, shine]);
    let ratio = 1;
    const api = {
      parts: [bg, fill, shine],
      set(r) {
        ratio = Math.max(0, Math.min(1, r));
        fill.width = w * ratio;
        shine.width = w * ratio;
        fill.fillColor = ratio > 0.5 ? color : ratio > 0.25 ? 0xffb52e : 0xff4040;
      },
      setPos(nx, ny) {
        bg.setPosition(nx, ny);
        fill.setPosition(nx - w / 2, ny);
        shine.setPosition(nx - w / 2, ny - h * 0.22);
      },
      hide() {
        api.parts.forEach((p) => p.setVisible(false));
      },
      show() {
        api.parts.forEach((p) => p.setVisible(true));
      },
      destroy() {
        api.parts.forEach((p) => p.destroy());
      },
    };
    return api;
  }

  // ------------------------------------------------------------------ effets simples
  burst(x, y, tint = 0xffffff, n = 8) {
    this.emit('spark', x, y, n, tint);
  }

  ember(x, y, tint, n = 1) {
    this.emit('ember', x, y, n, tint);
  }

  bubble(x, y, tint) {
    this.emit('soft', x, y, 1, tint);
  }

  sparkle(x, y, tint) {
    const s = this.getSprite('p_spark');
    s.setPosition(x, y).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setDepth(4500);
    this.scene.tweens.add({ targets: s, scale: 0.7 * this.S, angle: 90, duration: 350, yoyo: true, onComplete: () => this.releaseSprite(s) });
  }

  zap(x1, y1, x2, y2, tint = 0xffe14d) {
    const s = this.getSprite('fx_bolt');
    const len = Math.hypot(x2 - x1, y2 - y1);
    s.setPosition((x1 + x2) / 2, (y1 + y2) / 2).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(4600);
    s.setDisplaySize(26 * this.S, len);
    s.setAngle(Phaser.Math.RadToDeg(Math.atan2(y2 - y1, x2 - x1)) - 90);
    this.scene.tweens.add({ targets: s, alpha: 0, duration: 220, onComplete: () => this.releaseSprite(s) });
  }

  heal(x, y) {
    this.emit('plus', x, y, 5, 0x6bff8a);
  }

  soul(x, y) {
    this.emit('soft', x, y, 6, 0xbfe6ff);
    this.emit('ember', x, y, 6, 0xbfe6ff);
  }

  coins(x, y, n = 5) {
    this.emit('coin', x, y, n);
  }

  buildPuff(c, T) {
    this.emit('smoke', c.x, c.y, 10, 0xc0b0a0);
    this.emit('shard', c.x, c.y, 8, 0x8a7a6a);
    this.scene.cameras.main.shake(140, 0.004);
  }

  impact(x, y, key, tint, size) {
    const s = this.getSprite(key);
    s.setPosition(x, y).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(4700);
    s.setDisplaySize(size, size);
    s.setAngle(Math.random() * 40 - 20);
    const sc = s.scaleX;
    s.setScale(sc * 0.6);
    this.scene.tweens.add({ targets: s, scaleX: sc * 1.15, scaleY: sc * 1.15, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => this.releaseSprite(s) });
  }

  ring(x, y, tint, size, dur = 400) {
    const s = this.getSprite('p_ring');
    s.setPosition(x, y).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(4650).setDisplaySize(size * 0.2, size * 0.2);
    const target = (size / 64);
    this.scene.tweens.add({ targets: s, scaleX: target, scaleY: target * 0.7, alpha: 0, duration: dur, ease: 'Cubic.easeOut', onComplete: () => this.releaseSprite(s) });
  }

  projectile(src, tgt, key, tint, speedMult, onHit) {
    const s = this.getSprite(key);
    const sx = src.x();
    const sy = src.y() - src.size * 0.1;
    const tx = tgt.x();
    const ty = tgt.y() - tgt.size * 0.1;
    s.setPosition(sx, sy).setDepth(4800);
    if (tint !== null) s.setTint(tint);
    if (key === 'proj_orb') s.setBlendMode(Phaser.BlendModes.ADD);
    const base = key === 'proj_arrow' ? 40 : key === 'proj_orb' ? 30 : 38;
    s.setScale((base * this.S) / s.width);
    s.setAngle(Phaser.Math.RadToDeg(Math.atan2(ty - sy, tx - sx)));
    const dist = Math.hypot(tx - sx, ty - sy);
    const dur = Math.max(120, Math.min(420, dist / (1.4 * this.S))) / speedMult;
    this.scene.tweens.add({
      targets: s, x: tx, y: ty, duration: dur, ease: 'Sine.easeIn', onComplete: () => {
        this.releaseSprite(s);
        onHit?.();
      },
    });
    if (key === 'proj_bone') this.scene.tweens.add({ targets: s, angle: s.angle + 720, duration: dur });
  }

  /** Animation d'une compétence (visuel uniquement, les dégâts viennent des événements). */
  playSkill(src, tgts, ev, speedMult = 1) {
    if (!tgts.length) return;
    const tint = ev.element && ev.element !== 'neutral' ? hexColor(ev.element) : 0xffffff;
    const S = this.S;
    const fx = ev.fx || 'slash';
    const first = tgts[0];
    const playSound = () => sfx(ELEMENT_SFX[ev.element] || 'hit');
    const lunge = () => {
      if (!src.spr || src.spr.scene !== this.scene) return;
      const dx = (first.x() - src.x()) * 0.35;
      const dy = (first.y() - src.y()) * 0.35;
      const ox = src.spr.x;
      const oy = src.spr.y;
      this.scene.tweens.add({ targets: src.spr, x: ox + dx, y: oy + dy, duration: 90 / speedMult, yoyo: true, ease: 'Quad.easeOut', onComplete: () => src.spr.setPosition(ox, oy) });
    };
    switch (fx) {
      case 'slash':
      case 'claw':
      case 'bite':
      case 'smash': {
        lunge();
        this.scene.time.delayedCall(90 / speedMult, () => {
          for (const t of tgts) {
            const key = fx === 'claw' ? 'fx_claw' : fx === 'bite' ? 'fx_bite' : 'fx_slash';
            this.impact(t.x(), t.y(), key, tint, t.size * (fx === 'smash' ? 1.1 : 0.9));
            this.emit('spark', t.x(), t.y(), fx === 'smash' ? 10 : 6, tint);
          }
          if (fx === 'smash') this.scene.cameras.main.shake(90, 0.003);
          sfx(fx === 'slash' ? 'slash' : 'hit');
          if (ev.element && ev.element !== 'neutral') playSound();
        });
        break;
      }
      case 'arrow':
      case 'projectile':
      case 'bolt':
      case 'fireball':
      case 'iceshard':
      case 'splash':
      case 'shadow':
      case 'holy': {
        const key = fx === 'arrow' ? 'proj_arrow' : fx === 'fireball' ? 'proj_fireball' : fx === 'iceshard' ? 'proj_ice' : fx === 'projectile' ? 'proj_bone' : 'proj_orb';
        sfx(fx === 'arrow' ? 'arrow' : 'magic');
        tgts.forEach((t, i) => {
          this.scene.time.delayedCall((i * 60) / speedMult, () => this.projectile(src, t, key, key === 'proj_orb' ? tint : null, speedMult, () => {
            this.emit('spark', t.x(), t.y(), 6, tint);
            if (fx === 'fireball') this.emit('ember', t.x(), t.y(), 6, 0xff8a2b);
            if (i === 0) playSound();
          }));
        });
        break;
      }
      case 'lightning': {
        for (const t of tgts) {
          this.zap(t.x() + (Math.random() - 0.5) * 20 * S, t.y() - 160 * S, t.x(), t.y(), tint);
          this.emit('spark', t.x(), t.y(), 8, tint);
        }
        sfx('lightning');
        break;
      }
      case 'beam': {
        for (const t of tgts) {
          const s = this.getSprite('fx_beam');
          const sx = src.x();
          const sy = src.y() - src.size * 0.15;
          const len = Math.hypot(t.x() - sx, t.y() - sy);
          s.setOrigin(0, 0.5).setPosition(sx, sy).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(4700);
          s.setDisplaySize(len, 20 * S);
          s.setAngle(Phaser.Math.RadToDeg(Math.atan2(t.y() - sy, t.x() - sx)));
          this.scene.tweens.add({ targets: s, alpha: 0, duration: 320, onComplete: () => this.releaseSprite(s) });
          this.emit('spark', t.x(), t.y(), 8, tint);
        }
        sfx('magic');
        break;
      }
      case 'explosion':
      case 'quake':
      case 'poisoncloud':
      case 'wave':
      case 'breath': {
        const cx = tgts.reduce((a, t) => a + t.x(), 0) / tgts.length;
        const cy = tgts.reduce((a, t) => a + t.y(), 0) / tgts.length;
        const size = Math.max(...tgts.map((t) => Math.abs(t.x() - cx) + t.size)) * 2.2;
        if (fx === 'breath') {
          for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall((i * 50) / speedMult, () => {
              for (const t of tgts) this.emit(ev.element === 'fire' ? 'ember' : 'soft', t.x(), t.y(), 3, tint);
            });
          }
        }
        if (fx === 'poisoncloud') for (const t of tgts) this.emit('smoke', t.x(), t.y(), 4, tint);
        this.ring(cx, cy, tint, size);
        for (const t of tgts) this.emit('spark', t.x(), t.y(), 5, tint);
        if (fx === 'quake' || fx === 'explosion') this.scene.cameras.main.shake(160, 0.005);
        sfx(fx === 'explosion' ? 'explosion' : ELEMENT_SFX[ev.element] || 'hit');
        break;
      }
      case 'drain': {
        lunge();
        for (const t of tgts) {
          this.emit('spark', t.x(), t.y(), 5, 0xff3a5a);
          const s = this.getSprite('p_soft');
          s.setPosition(t.x(), t.y()).setTint(0xff3a5a).setBlendMode(Phaser.BlendModes.ADD).setDepth(4700).setScale(0.6 * S);
          this.scene.tweens.add({ targets: s, x: src.x(), y: src.y(), duration: 380 / speedMult, onComplete: () => this.releaseSprite(s) });
        }
        sfx('shadow');
        break;
      }
      case 'heal': {
        for (const t of tgts) this.emit('plus', t.x(), t.y(), 5, 0x6bff8a);
        sfx('heal');
        break;
      }
      case 'buff': {
        for (const t of tgts) {
          this.ring(t.x(), t.y() + t.size * 0.3, 0xffcc33, t.size * 1.1, 500);
          this.emit('spark', t.x(), t.y(), 4, 0xffe14d);
        }
        sfx('upgrade');
        break;
      }
      default:
        lunge();
        for (const t of tgts) this.emit('spark', t.x(), t.y(), 5, tint);
        sfx('hit');
    }
  }

  /** Déclenchement visuel d'un piège dans une salle. */
  trapFire(trapId, c, T, element, trapSprite) {
    const S = this.S;
    if (trapSprite) {
      const sc = trapSprite.scaleX;
      this.scene.tweens.add({ targets: trapSprite, scaleX: sc * 1.4, scaleY: sc * 1.4, duration: 110, yoyo: true });
    }
    sfx('trap');
    const tint = hexColor(element);
    switch (trapId) {
      case 'spikes':
        this.emit('shard', c.x, c.y + T * 0.2, 10, 0xe8eef6);
        break;
      case 'arrows':
        for (let i = 0; i < 3; i++) {
          const s = this.getSprite('proj_arrow');
          const y = c.y + (i - 1) * T * 0.2;
          s.setPosition(c.x - T * 0.55, y).setDepth(4800).setScale((36 * S) / s.width);
          this.scene.tweens.add({ targets: s, x: c.x + T * 0.55, duration: 220, delay: i * 60, onComplete: () => this.releaseSprite(s) });
        }
        sfx('arrow');
        break;
      case 'fire':
        this.emit('ember', c.x, c.y, 18, 0xff8a2b);
        this.emit('spark', c.x, c.y, 10, 0xffe14d);
        sfx('fire');
        break;
      case 'ice':
        this.emit('shard', c.x, c.y, 12, 0xbfe6ff);
        this.ring(c.x, c.y, 0x9fe6ff, T, 450);
        sfx('ice');
        break;
      case 'poison':
        this.emit('smoke', c.x, c.y, 12, 0x8fe04a);
        sfx('poison');
        break;
      case 'boulder': {
        const s = this.getSprite('trap_boulder');
        s.setPosition(c.x - T * 0.6, c.y).setDepth(4800).setDisplaySize(T * 0.5, T * 0.5);
        this.scene.tweens.add({ targets: s, x: c.x + T * 0.6, angle: 360, duration: 420, onComplete: () => this.releaseSprite(s) });
        this.scene.cameras.main.shake(220, 0.006);
        this.emit('smoke', c.x, c.y + T * 0.2, 8, 0xa09080);
        sfx('explosion');
        break;
      }
      case 'lightning':
        for (let i = 0; i < 3; i++) this.zap(c.x + (Math.random() - 0.5) * T * 0.6, c.y - T * 0.6, c.x + (Math.random() - 0.5) * T * 0.5, c.y + T * 0.2, 0xffe14d);
        sfx('lightning');
        break;
      case 'arcane':
        this.ring(c.x, c.y, 0xff5ce1, T * 1.2, 500);
        this.emit('spark', c.x, c.y, 10, 0xff5ce1);
        sfx('magic');
        break;
      case 'shadow':
        this.emit('smoke', c.x, c.y, 12, 0x4a2a7a);
        sfx('shadow');
        break;
      default:
        this.burst(c.x, c.y, tint, 8);
    }
  }
}
