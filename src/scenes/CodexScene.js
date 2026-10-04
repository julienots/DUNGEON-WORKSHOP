import { PanelScene } from './PanelScene.js';
import { CodexScreen } from '../ui/screens/CodexScreen.js';

/** Écran « Codex » (scène Phaser + interface DOM). */
export class CodexScene extends PanelScene {
  constructor() {
    super('Codex', CodexScreen);
  }
}
