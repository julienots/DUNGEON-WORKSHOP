import { PanelScene } from './PanelScene.js';
import { MissionsScreen } from '../ui/screens/MissionsScreen.js';

/** Écran « Missions » (scène Phaser + interface DOM). */
export class MissionScene extends PanelScene {
  constructor() {
    super('Missions', MissionsScreen);
  }
}
