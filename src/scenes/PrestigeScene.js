import { PanelScene } from './PanelScene.js';
import { PrestigeScreen } from '../ui/screens/PrestigeScreen.js';

/** Écran « Prestige » (scène Phaser + interface DOM). */
export class PrestigeScene extends PanelScene {
  constructor() {
    super('Prestige', PrestigeScreen);
  }
}
