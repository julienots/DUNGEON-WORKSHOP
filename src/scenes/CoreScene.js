import Phaser from 'phaser';
import { ctx } from '../ui/context.js';

/**
 * Scène invisible toujours active : fait tourner la simulation (raids, recherches, trésor, sauvegarde)
 * quel que soit l'écran affiché.
 */
export class CoreScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Core', active: false });
  }

  create() {
    this.last = Date.now();
  }

  update() {
    const now = Date.now();
    const dt = (now - this.last) / 1000;
    this.last = now;
    if (dt <= 0) return;
    ctx.game.update(dt, now);
  }
}
