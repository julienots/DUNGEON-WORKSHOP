import { PanelScene } from './PanelScene.js';
import { SettingsScreen } from '../ui/screens/SettingsScreen.js';

/** Écran « Settings » (scène Phaser + interface DOM). */
export class SettingsScene extends PanelScene {
  constructor() {
    super('Settings', SettingsScreen);
  }
}
