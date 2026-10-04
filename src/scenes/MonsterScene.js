import { PanelScene } from './PanelScene.js';
import { MonstersScreen } from '../ui/screens/MonstersScreen.js';

/** Écran « Monsters » (scène Phaser + interface DOM). */
export class MonsterScene extends PanelScene {
  constructor() {
    super('Monsters', MonstersScreen);
  }
}
