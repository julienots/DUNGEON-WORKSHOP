import { PanelScene } from './PanelScene.js';
import { AchievementsScreen } from '../ui/screens/AchievementsScreen.js';

/** Écran « Achievements » (scène Phaser + interface DOM). */
export class AchievementScene extends PanelScene {
  constructor() {
    super('Achievements', AchievementsScreen);
  }
}
