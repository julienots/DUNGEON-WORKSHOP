import { PanelScene } from './PanelScene.js';
import { TreasuryScreen } from '../ui/screens/TreasuryScreen.js';

/** Écran « Treasury » (scène Phaser + interface DOM). */
export class TreasuryScene extends PanelScene {
  constructor() {
    super('Treasury', TreasuryScreen);
  }
}
