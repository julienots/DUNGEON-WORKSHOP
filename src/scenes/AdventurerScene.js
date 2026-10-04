import { PanelScene } from './PanelScene.js';
import { AdventurersScreen } from '../ui/screens/AdventurersScreen.js';

/** Écran « Adventurers » (scène Phaser + interface DOM). */
export class AdventurerScene extends PanelScene {
  constructor() {
    super('Adventurers', AdventurersScreen);
  }
}
