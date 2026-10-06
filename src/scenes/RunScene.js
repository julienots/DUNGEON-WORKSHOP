import { PanelScene } from './PanelScene.js';
import { RunScreen } from '../ui/screens/RunScreen.js';
import { ctx } from '../ui/context.js';
import { MODES } from '../data/modes.js';

/** Écran « Run » (scène Phaser + interface DOM). */
export class RunScene extends PanelScene {
  constructor() {
    super('Run', RunScreen);
  }

  create(data) {
    super.create(data);
    const run = ctx.game.runs.run;
    ctx.audio?.playMusic(run ? MODES[run.mode].music || 'dungeon' : 'menu');
  }
}
