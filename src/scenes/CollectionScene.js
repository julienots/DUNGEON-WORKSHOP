import { PanelScene } from './PanelScene.js';
import { CollectionScreen } from '../ui/screens/CollectionScreen.js';

/** Écran « Collection » (scène Phaser + interface DOM). */
export class CollectionScene extends PanelScene {
  constructor() {
    super('Collection', CollectionScreen);
  }
}
