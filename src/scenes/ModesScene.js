import { PanelScene } from './PanelScene.js';
import { ModesScreen } from '../ui/screens/ModesScreen.js';

/** Écran « Modes » (scène Phaser + interface DOM). */
export class ModesScene extends PanelScene {
  constructor() {
    super('Modes', ModesScreen);
  }
}
