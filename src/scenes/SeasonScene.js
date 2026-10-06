import { PanelScene } from './PanelScene.js';
import { SeasonScreen } from '../ui/screens/SeasonScreen.js';

/** Écran « Saison » (scène Phaser + interface DOM). */
export class SeasonScene extends PanelScene {
  constructor() {
    super('Season', SeasonScreen);
  }
}
