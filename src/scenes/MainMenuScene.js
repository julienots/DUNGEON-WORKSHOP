import Phaser from 'phaser';
import { ctx, sfx } from '../ui/context.js';
import { h } from '../ui/dom.js';
import { FONT_TITLE } from '../utils/constants.js';
import { openSettingsModal } from '../ui/screens/SettingsScreen.js';

/** Menu principal : titre animé, parade de monstres, accès au donjon. */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = this.scale;
    const S = this.registry.get('dpr') || 1;
    this.cameras.main.setBackgroundColor('#0a0708');
    const bg = this.add.tileSprite(0, 0, width, height, 'bg_cave').setOrigin(0);
    bg.tileScaleX = bg.tileScaleY = 2.4 * S;
    this.bg = bg;
    const bg2 = this.add.tileSprite(0, 0, width, height, 'bg_citadel').setOrigin(0).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    bg2.tileScaleX = bg2.tileScaleY = 4 * S;
    this.bg2 = bg2;

    // Sol rocheux en bas
    const T = Math.round(width / 6);
    for (let i = 0; i < 8; i++) {
      this.add.image(i * T, height * 0.6, `rock_cave_${i % 4}`).setOrigin(0, 0).setDisplaySize(T + 1, T + 1).setTint(0x8a7a70);
      this.add.image(i * T, height * 0.6 - T * 0.2, `rockfront_cave_${i % 4}`).setOrigin(0, 0).setDisplaySize(T + 1, T * 0.2);
    }
    this.add.image(width / 2, height * 0.5, 'glow').setDisplaySize(width * 1.6, height).setTint(0xff7a2b).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);

    // Parade de monstres
    const parade = ['goblin', 'slime', 'skeleton', 'bat', 'orc', 'mimic', 'whelp', 'ghost'];
    const size = Math.min(width / 4.5, 150 * S);
    this.parade = [];
    this.paradeSpeed = width / 22;
    parade.forEach((id, i) => {
      const x = ((i + 0.5) / parade.length) * width * 1.4 - width * 0.2;
      const y = height * 0.6 - size * 0.38;
      const sh = this.add.image(x, y + size * 0.42, 'shadow').setDisplaySize(size * 0.8, size * 0.2);
      const spr = this.add.image(x, y, `mon_${id}`).setDisplaySize(size, size).setFlipX(true);
      this.tweens.add({ targets: spr, y: y - size * 0.06, duration: 500 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.parade.push({ spr, sh });
    });

    // Titre
    const title = this.add.text(width / 2, height * 0.22, 'DUNGEON\nWORKSHOP', {
      fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: `${Math.round(Math.min(58 * S, width / 7))}px`, color: '#ffd27a', align: 'center', stroke: '#2a1408', strokeThickness: 10 * S, lineSpacing: -6 * S,
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#ff6a1a', 30 * S, true, true);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(width / 2, height * 0.22 + title.height * 0.62, 'Le donjon, c’est vous.', {
      fontFamily: FONT_TITLE, fontSize: `${Math.round(16 * S)}px`, color: '#c9b8a6', stroke: '#000', strokeThickness: 4 * S,
    }).setOrigin(0.5);

    this.add.particles(0, 0, 'p_ember', {
      x: { min: 0, max: width }, y: height, lifespan: 6000, speedY: { min: -60 * S, max: -140 * S }, speedX: { min: -20, max: 20 },
      scale: { start: 1.4 * S, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffa040, 0xff6a2b, 0xffd27a], frequency: 120, blendMode: 'ADD',
    });
    this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width * 1.1, height * 1.1);

    this.buildMenu();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.events.once('shutdown', () => this.menu?.remove());
    ctx.audio?.playMusic('menu');
  }

  buildMenu() {
    const g = ctx.game;
    const p = g.state.player;
    const sub = g.state.prestige.count ? `${g.prestige.title()} · Ascension ${g.state.prestige.count}` : `Maître niveau ${p.level}`;
    this.menu = h('div.main-menu',
      h('button.btn.btn-primary.btn-xl', { type: 'button', id: 'btn-play', onclick: () => this.enter() }, h('span', '▶'), h('span', g.state.stats.raidsTotal ? ' Entrer dans le donjon' : ' Commencer')),
      h('div.menu-sub', `${sub} · Étage ${g.state.floors.length}`),
      h('button.btn.btn-ghost', { type: 'button', onclick: () => { ctx.audio?.unlock(); sfx('click'); openSettingsModal(); } }, '⚙️ Paramètres'),
      h('div.menu-foot', '100% hors ligne · Sauvegarde automatique'),
    );
    document.getElementById('ui').appendChild(this.menu);
  }

  enter() {
    ctx.audio?.unlock();
    sfx('open');
    const ui = ctx.ui;
    if (!ui.initialized) {
      ui.init();
      ui.initialized = true;
    }
    this.menu?.remove();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      ui.show();
      document.body.classList.add('route-dungeon');
      ctx.router.current = 'Dungeon';
      this.scene.start('Dungeon');
      ui.hud.mount();
      ui.nav.setActive('Dungeon');
      const info = ctx.pendingLoadInfo;
      ctx.pendingLoadInfo = null;
      if (info?.migratedFrom) ui.toasts.show(`Sauvegarde V${info.migratedFrom} convertie vers la V2 (copie d’origine conservée)`, { icon: '💾', type: 'success', duration: 5000 });
      if (info?.preservedKey) ui.toasts.show('Sauvegarde illisible : une copie a été conservée, nouvelle partie démarrée.', { icon: '⚠️', type: 'error', duration: 6000 });
      if (ctx.pendingOfflineReport) {
        const r = ctx.pendingOfflineReport;
        ctx.pendingOfflineReport = null;
        setTimeout(() => ui.showOfflineReport(r), 500);
      }
    });
  }

  update(t, dt) {
    this.bg.tilePositionX += dt * 0.01;
    this.bg2.tilePositionX -= dt * 0.02;
    const { width } = this.scale;
    for (const p of this.parade) {
      p.spr.x -= (this.paradeSpeed * dt) / 1000;
      if (p.spr.x < -width * 0.2) p.spr.x += width * 1.4;
      p.sh.x = p.spr.x;
    }
  }
}
