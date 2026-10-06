import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-900.css';
import './styles/main.css';

import Phaser from 'phaser';
import { Game } from './core/Game.js';
import { AudioManager } from './systems/AudioManager.js';
import { UIManager } from './ui/UIManager.js';
import { Router } from './ui/Router.js';
import { ctx } from './ui/context.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { CoreScene } from './scenes/CoreScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { DungeonScene } from './scenes/DungeonScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { MonsterScene } from './scenes/MonsterScene.js';
import { ResearchScene } from './scenes/ResearchScene.js';
import { TreasuryScene } from './scenes/TreasuryScene.js';
import { CodexScene } from './scenes/CodexScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { MissionScene } from './scenes/MissionScene.js';
import { AchievementScene } from './scenes/AchievementScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { AdventurerScene } from './scenes/AdventurerScene.js';
import { PrestigeScene } from './scenes/PrestigeScene.js';
import { ModesScene } from './scenes/ModesScene.js';
import { RunScene } from './scenes/RunScene.js';
import { installBackButton } from './ui/backButton.js';
import { installDebugPanel } from './ui/DebugPanel.js';
import { MasteryScene } from './scenes/MasteryScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';
import { SeasonScene } from './scenes/SeasonScene.js';

/** Résolution interne : pixels physiques (net sur écrans haute densité), plafonnée pour les performances. */
const DPR = Math.min(2, window.devicePixelRatio || 1);

function viewport() {
  return { w: Math.max(320, window.innerWidth), h: Math.max(480, window.innerHeight) };
}

// ------------------------------------------------------------------ cœur du jeu (sans Phaser)
const game = new Game();
let loadResult;
try {
  loadResult = game.loadOrCreate();
} catch (err) {
  console.error('Chargement impossible, nouvelle partie (ancienne sauvegarde conservée)', err);
  loadResult = game.recoverFromLoadFailure(err);
}
ctx.pendingLoadInfo = loadResult.loadInfo || null;
ctx.game = game;
ctx.pendingOfflineReport = loadResult.report && !loadResult.report.suspicious ? loadResult.report : null;
ctx.audio = new AudioManager(game);
ctx.ui = new UIManager(document.getElementById('ui'));

// ------------------------------------------------------------------ Phaser
const { w, h } = viewport();
const phaserGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0708',
  banner: false,
  scale: { mode: Phaser.Scale.NONE, width: Math.round(w * DPR), height: Math.round(h * DPR), zoom: 1 / DPR },
  render: { antialias: true, powerPreference: 'high-performance', roundPixels: false },
  input: { activePointers: 2 },
  fps: { target: 60, smoothStep: true },
  scene: [BootScene, PreloadScene, CoreScene, MainMenuScene, DungeonScene, BattleScene, MonsterScene, ResearchScene, TreasuryScene, CodexScene, ShopScene, MissionScene, AchievementScene, SettingsScene, AdventurerScene, PrestigeScene, ModesScene, RunScene, MasteryScene, CollectionScene, SeasonScene],
});
phaserGame.registry.set('dpr', DPR);
ctx.phaser = phaserGame;
ctx.router = new Router(phaserGame);
installBackButton();
installDebugPanel();

let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const v = viewport();
    phaserGame.scale.resize(Math.round(v.w * DPR), Math.round(v.h * DPR));
    phaserGame.scale.setZoom(1 / DPR);
  }, 120);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// ------------------------------------------------------------------ cycle de vie mobile
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.saveNow();
    ctx.audio.setPaused(true);
  } else {
    ctx.audio.setPaused(false);
  }
});
window.addEventListener('pagehide', () => game.saveNow());
window.addEventListener('beforeunload', () => game.saveNow());

// Déverrouillage audio au premier contact
const unlock = () => ctx.audio.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('touchend', unlock, { passive: true });

// Vibrations respectant le réglage
const vib = navigator.vibrate?.bind(navigator);
if (vib) navigator.vibrate = (p) => (game.state?.settings?.vibration ? vib(p) : false);

// Pas de menu contextuel ni de zoom involontaire
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Hors ligne : service worker (production uniquement)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker indisponible', err));
  });
}

// Accès de débogage / tests automatisés
window.__DW = { game, ctx, phaser: phaserGame };
