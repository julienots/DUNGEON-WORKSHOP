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
    const bg = this.add.tileSprite(0, 0, width, height, `bg_${theme}`).setOrigin(0);
    bg.tileScaleX = bg.tileScaleY = 2.5 * this.S;
    const floorKey = this.room ? `floor_${this.room.room}` : 'floor_lair';
    const floorY = height * 0.58;
    const floor = this.add.tileSprite(width / 2, floorY, width, height * 0.5, floorKey).setAlpha(0.55);
    floor.tileScaleX = floor.tileScaleY = 1.2 * this.S;
    this.add.image(width / 2, floorY - height * 0.25, 'shadow').setDisplaySize(width * 1.4, height * 0.12).setAlpha(0.8);
    this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width * 1.2, height * 1.2);
    this.add.image(width * 0.5, floorY, 'glow').setDisplaySize(width * 1.2, height * 0.6).setTint(0xffa040).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD);
    this.unitLayer = this.add.layer().setDepth(10);
    this.fxLayer = this.add.layer().setDepth(20);
    this.fx = new FxKit(this, this.fxLayer, this.S);
    this.arena = { left: width * 0.26, right: width * 0.74, top: height * 0.24, bottom: height * 0.78 };

    this.buildHud();
    this.cameras.main.fadeIn(250, 0, 0, 0);
    sfx(data.mode === 'boss' || (data.mode === 'run' && data.run.stage.isBoss) ? 'boss_roar' : 'raid_start');
    this.events.once('shutdown', () => this.cleanup());
  }

  cleanup() {
    clearTimeout(this.comboTimer);
    this.hud?.remove();
    if (this.rt) this.rt.locked = false;
    if (this.data_?.mode === 'boss' || this.data_?.mode === 'run') ctx.audio?.playMusic('dungeon');
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
    const { left, right, top, bottom } = this.arena;
    const x = side === 'B' ? left : right;
    const span = bottom - top;
    const size = Math.min(this.scale.width * 0.3, (span / Math.max(1, n)) * (n >= 4 ? 1.5 : 1.25), 260 * this.S);
    list.forEach((v, i) => {
      const y = n === 1 ? (top + bottom) / 2 : top + (span * (i + 0.5)) / n;
      const ox = n >= 3 ? (i % 2 ? 1 : -1) * size * 0.32 : 0;
      v.place(x + ox, y, v.isBoss ? Math.min(size * 1.6, this.scale.width * 0.48) : size);
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
        spr.setPosition(x, y).setDisplaySize(size, size);
        shadow.setPosition(x, y + size * 0.42).setDisplaySize(size * 0.75, size * 0.2);
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
          this.cameras.main.shake(140, 0.005);
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
        this.cameras.main.shake(400, 0.008);
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
    this.cameras.main.shake(120, 0.004);
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
