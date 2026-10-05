import { PanelScene } from './PanelScene.js';
import { MasteryScreen } from '../ui/screens/MasteryScreen.js';

/** Écran « Mastery » (scène Phaser + interface DOM). */
export class MasteryScene extends PanelScene {
  constructor() {
    super('Mastery', MasteryScreen);
  }
}
