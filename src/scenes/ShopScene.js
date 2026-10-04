import { PanelScene } from './PanelScene.js';
import { ShopScreen } from '../ui/screens/ShopScreen.js';

/** Écran « Shop » (scène Phaser + interface DOM). */
export class ShopScene extends PanelScene {
  constructor() {
    super('Shop', ShopScreen);
  }
}
