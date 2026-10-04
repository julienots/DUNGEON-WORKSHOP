import { PanelScene } from './PanelScene.js';
import { ResearchScreen } from '../ui/screens/ResearchScreen.js';

/** Écran « Research » (scène Phaser + interface DOM). */
export class ResearchScene extends PanelScene {
  constructor() {
    super('Research', ResearchScreen);
  }
}
