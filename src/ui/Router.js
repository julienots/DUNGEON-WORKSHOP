import { ctx } from './context.js';
import { NAV_TABS } from './NavBar.js';

/**
 * Navigation entre les écrans (scènes Phaser). Le donjon reste en mémoire (mis en veille)
 * pendant qu'un écran de menu est ouvert ; la simulation continue dans CoreScene.
 */
export class Router {
  constructor(phaserGame) {
    this.pg = phaserGame;
    this.current = 'MainMenu';
    this.battleReturn = null;
  }

  get sm() {
    return this.pg.scene;
  }

  go(key, data = {}) {
    const ui = ctx.ui;
    if (key === this.current && key !== 'Dungeon') return;
    ui.closeSheet();
    ctx.game.bus.emit('routeChange', key);
    if (this.current !== 'Dungeon' && this.current !== 'Battle') this.sm.stop(this.current);
    if (key === 'Dungeon') {
      ui.closeScreen();
      if (this.sm.isSleeping('Dungeon')) this.sm.wake('Dungeon');
      else if (!this.sm.isActive('Dungeon')) this.sm.run('Dungeon');
      ctx.game.watching = true;
      document.body.classList.add('route-dungeon');
    } else {
      if (this.sm.isActive('Dungeon')) this.sm.sleep('Dungeon');
      ctx.game.watching = false;
      document.body.classList.remove('route-dungeon');
      this.sm.run(key, data);
    }
    this.current = key;
    ui.nav?.setActive(NAV_TABS.some((t) => t.id === key) ? key : null);
    ui.hud?.setVisible(key === 'Dungeon');
  }

  /** Retour à l'écran d'accueil (hub). */
  goHome() {
    const ui = ctx.ui;
    ui.closeSheet();
    ui.modals.closeAll();
    if (this.current !== 'Dungeon' && this.current !== 'Battle' && this.current !== 'MainMenu') {
      this.sm.stop(this.current);
      ui.closeScreen(true);
    }
    if (this.sm.isActive('Dungeon') || this.sm.isSleeping('Dungeon') || this.sm.isPaused('Dungeon')) this.sm.stop('Dungeon');
    ui.hud?.setVisible(false);
    ui.hide();
    document.body.classList.remove('route-dungeon', 'route-battle');
    ctx.game.watching = false;
    this.current = 'MainMenu';
    this.sm.run('MainMenu');
  }

  /** Ouvre la scène de combat détaillée. data : { mode: 'raid'|'boss', ... } */
  openBattle(data) {
    const ui = ctx.ui;
    ui.closeSheet();
    this.battleReturn = this.current;
    if (this.current !== 'Dungeon') {
      this.sm.stop(this.current);
      ui.closeScreen(true);
    }
    if (this.sm.isActive('Dungeon')) this.sm.sleep('Dungeon');
    ui.hud?.setVisible(false);
    document.body.classList.add('route-battle');
    document.body.classList.remove('route-dungeon');
    this.current = 'Battle';
    ctx.game.watching = data.mode === 'raid';
    this.sm.run('Battle', data);
  }

  closeBattle() {
    this.sm.stop('Battle');
    document.body.classList.remove('route-battle');
    const back = this.battleReturn || 'Dungeon';
    this.current = 'Battle';
    this.battleReturn = null;
    this.go(back === 'Battle' ? 'Dungeon' : back);
  }
}
