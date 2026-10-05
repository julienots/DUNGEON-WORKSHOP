import { PanelScene } from './PanelScene.js';
import { RunScreen } from '../ui/screens/RunScreen.js';

/** Écran « Run » (scène Phaser + interface DOM). */
export class RunScene extends PanelScene {
  constructor() {
    super('Run', RunScreen);
  }
}
