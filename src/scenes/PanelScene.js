import Phaser from 'phaser';
import { ctx } from '../ui/context.js';

/**
 * Scène de menu générique : affiche un écran DOM (défini dans ui/screens) par-dessus
 * un fond animé Phaser (braises, brume) pour garder une ambiance vivante.
 */
export class PanelScene extends Phaser.Scene {
  constructor(key, screenDef) {
    super({ key });
    this.screenDef = screenDef;
  }

  create(data) {
    const { width, height } = this.scale;
    const theme = ctx.game.dungeon.def(ctx.game.viewFloor).theme;
    this.cameras.main.setBackgroundColor('#0d0a0c');
    if (this.textures.exists(`bg_${theme}`)) {
      this.bg = this.add.tileSprite(0, 0, width, height, `bg_${theme}`).setOrigin(0).setAlpha(0.55);
      this.bg.tileScaleX = this.bg.tileScaleY = 2;
    }
    this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width, height).setAlpha(0.9);
    const lowFx = ctx.game.state.settings.quality === 'low';
    if (!lowFx) {
      this.add.particles(0, 0, 'p_ember', {
        x: { min: 0, max: width },
        y: height + 10,
        lifespan: 7000,
        speedY: { min: -40 * (height / 1280), max: -110 * (height / 1280) },
        speedX: { min: -15, max: 15 },
        scale: { start: 1.2, end: 0.2 },
        alpha: { start: 0.8, end: 0 },
        tint: [0xffa040, 0xff6a2b, 0xffd27a],
        frequency: 260,
        blendMode: 'ADD',
      });
    }
    this.cameras.main.fadeIn(180, 0, 0, 0);
    this.entry = ctx.ui.openScreen({ ...this.screenDef, data });
    this.events.once('shutdown', () => {
      if (ctx.ui.currentScreen === this.entry) ctx.ui.closeScreen();
    });
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
  }

  onResize(size) {
    if (this.bg) this.bg.setSize(size.width, size.height);
  }

  update(t, dt) {
    if (this.bg) this.bg.tilePositionY -= dt * 0.004;
  }
}
