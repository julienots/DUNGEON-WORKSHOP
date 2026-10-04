import Phaser from 'phaser';

/** Démarrage : attend les polices embarquées puis lance le préchargement. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0708');
    const fonts = ['700 32px Cinzel', '400 16px Nunito', '700 16px Nunito', '900 16px Nunito'];
    const timeout = new Promise((r) => setTimeout(r, 2500));
    const load = document.fonts ? Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => null))) : Promise.resolve();
    Promise.race([load, timeout]).then(() => this.scene.start('Preload'));
  }
}
