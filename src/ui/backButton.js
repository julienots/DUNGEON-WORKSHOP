import { ctx, sfx } from './context.js';

/**
 * BOUTON RETOUR (V2) — Android (Capacitor), bouton « précédent » du navigateur et touche Échap.
 * Ordre : fenêtre ouverte → feuille / construction → combat → écran → donjon → accueil → quitter.
 */
export function handleBack() {
  const ui = ctx.ui;
  const router = ctx.router;
  if (!ui || !router) return false;
  if (ui.modals?.isOpen()) {
    ui.modals.close();
    return true;
  }
  if (ui.hud?.building) {
    ui.hud.exitBuild(true);
    return true;
  }
  if (ui.sheet) {
    ui.closeSheet();
    return true;
  }
  if (router.current === 'Battle') {
    ctx.phaser.scene.getScene('Battle')?.exit();
    return true;
  }
  if (router.current === 'MainMenu' || !ui.initialized) return false;
  if (router.current !== 'Dungeon') {
    sfx('close');
    const def = ui.currentScreen?.def;
    router.go(def?.back || 'Dungeon');
    return true;
  }
  router.goHome();
  return true;
}

let lastExitPrompt = 0;

export function installBackButton() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null;
  const app = cap?.Plugins?.App;
  if (app?.addListener) {
    app.addListener('backButton', () => {
      if (handleBack()) return;
      // Accueil : deuxième appui rapide pour quitter
      const now = Date.now();
      if (now - lastExitPrompt < 2000) {
        ctx.game?.saveNow();
        app.exitApp?.();
      } else {
        lastExitPrompt = now;
        ctx.ui?.toasts?.show('Appuyez encore sur Retour pour quitter', { icon: '🚪', duration: 1800 });
      }
    });
  } else if (typeof window !== 'undefined') {
    // Navigateur / PWA : on garde une entrée d'historique pour intercepter « précédent »
    history.pushState({ dw: true }, '');
    window.addEventListener('popstate', () => {
      handleBack();
      history.pushState({ dw: true }, '');
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') handleBack();
  });
}
