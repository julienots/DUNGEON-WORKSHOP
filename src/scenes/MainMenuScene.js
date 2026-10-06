import Phaser from 'phaser';
import { ctx, sfx } from '../ui/context.js';
import { h } from '../ui/dom.js';
import { FONT_TITLE } from '../utils/constants.js';
import { openSettingsModal } from '../ui/screens/SettingsScreen.js';
import { icon } from '../ui/icons.js';
import { formatShort } from '../utils/format.js';

/** Menu principal : titre animé, parade de monstres, accès au donjon. */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.entering = false;
    const { width, height } = this.scale;
    const S = this.registry.get('dpr') || 1;
    this.cameras.main.setBackgroundColor('#0a0708');
    const bg = this.add.tileSprite(0, 0, width, height, 'bg_cave').setOrigin(0);
    bg.tileScaleX = bg.tileScaleY = 2.4 * S;
    this.bg = bg;
    const bg2 = this.add.tileSprite(0, 0, width, height, 'bg_citadel').setOrigin(0).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
    bg2.tileScaleX = bg2.tileScaleY = 4 * S;
    this.bg2 = bg2;

    // Sol rocheux en bas
    const T = Math.round(width / 6);
    for (let i = 0; i < 8; i++) {
      this.add.image(i * T, height * 0.34, `rock_cave_${i % 4}`).setOrigin(0, 0).setDisplaySize(T + 1, T + 1).setTint(0x8a7a70);
      this.add.image(i * T, height * 0.34 - T * 0.2, `rockfront_cave_${i % 4}`).setOrigin(0, 0).setDisplaySize(T + 1, T * 0.2);
    }
    this.add.image(width / 2, height * 0.5, 'glow').setDisplaySize(width * 1.6, height).setTint(0xff7a2b).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD);

    // Parade de monstres
    const parade = ['goblin', 'slime', 'skeleton', 'bat', 'orc', 'mimic', 'whelp', 'ghost'];
    const size = Math.min(width / 5.5, 110 * S);
    this.parade = [];
    this.paradeSpeed = width / 22;
    parade.forEach((id, i) => {
      const x = ((i + 0.5) / parade.length) * width * 1.4 - width * 0.2;
      const y = height * 0.34 - size * 0.38;
      const sh = this.add.image(x, y + size * 0.42, 'shadow').setDisplaySize(size * 0.8, size * 0.2);
      const spr = this.add.image(x, y, `mon_${id}`).setDisplaySize(size, size).setFlipX(true);
      this.tweens.add({ targets: spr, y: y - size * 0.06, duration: 500 + i * 70, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.parade.push({ spr, sh });
    });

    // Titre
    const title = this.add.text(width / 2, height * 0.13, 'DUNGEON\nWORKSHOP', {
      fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: `${Math.round(Math.min(44 * S, width / 9))}px`, color: '#ffd27a', align: 'center', stroke: '#2a1408', strokeThickness: 10 * S, lineSpacing: -6 * S,
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#ff6a1a', 30 * S, true, true);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(width / 2, height * 0.13 + title.height * 0.6, 'V2 · Le donjon, c’est vous.', {
      fontFamily: FONT_TITLE, fontSize: `${Math.round(16 * S)}px`, color: '#c9b8a6', stroke: '#000', strokeThickness: 4 * S,
    }).setOrigin(0.5);

    this.add.particles(0, 0, 'p_ember', {
      x: { min: 0, max: width }, y: height, lifespan: 6000, speedY: { min: -60 * S, max: -140 * S }, speedX: { min: -20, max: 20 },
      scale: { start: 1.4 * S, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffa040, 0xff6a2b, 0xffd27a], frequency: ctx.game.state.settings.quality === 'low' ? 400 : 120, blendMode: 'ADD',
    });
    this.add.image(width / 2, height / 2, 'vignette').setDisplaySize(width * 1.1, height * 1.1);

    this.buildMenu();
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.events.once('shutdown', () => this.menu?.remove());
    ctx.audio?.playMusic('menu');
  }

  buildMenu() {
    const g = ctx.game;
    const p = g.state.player;
    const r = g.state.resources;
    const sub = g.state.prestige.count ? `${g.prestige.title()} · Ascension ${g.state.prestige.count}` : 'Maître du donjon';
    const need = g.master.xpToNext();
    const fi = g.state.currentFloor || 0;
    const biome = g.biomes.get(fi);
    const floor = g.state.floors[fi];
    const run = g.runs.run;
    const daily = g.runs.isUnlocked('challenge') && !g.runs.dailyChallenge().done;
    const seasonClaims = g.seasons.tiers().filter((t) => t.reached && !t.claimed).length + g.seasons.missions().filter((m) => m.done && !m.claimed).length;
    const missions = g.missions.claimableCount();
    const chests = g.collection.totalChests();
    const mastery = g.progression.availablePoints();
    const ach = g.achievements.claimableCount();
    const ev = g.events.current();
    const go = (key) => () => this.enter(key);
    const tile = (icon, label, key, badge = 0, cls = '') => h(`button.hub-tile${cls}`, { type: 'button', onclick: go(key) },
      h('span.hub-tile-icon', icon), h('span.hub-tile-label', label), badge ? h('span.badge', badge > 9 ? '9+' : String(badge)) : null);
    const res = (k, label) => h('div.hub-res', { html: `${icon(k)}<b>${formatShort(r[k] || 0)}</b><small>${label}</small>` });
    const rewards = missions + chests + seasonClaims + ach + (daily ? 1 : 0);
    this.menu = h('div.main-menu.hub',
      h('div.hub-top',
        h('div.hub-level', h('small', 'Niv.'), h('b', String(p.level))),
        h('div.hub-player', h('b', sub), h('div.hub-xp', h('div.hub-xp-fill', { style: { width: `${Math.min(100, (p.xp / need) * 100).toFixed(1)}%` } })), h('small', `${formatShort(p.xp)} / ${formatShort(need)} XP${mastery ? ` · 🧠 ${mastery} pt${mastery > 1 ? 's' : ''}` : ''}`)),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Paramètres', onclick: () => { ctx.audio?.unlock(); sfx('click'); openSettingsModal(); } }, '⚙️'),
      ),
      h('div.hub-resources', res('gold', 'Or'), res('crystals', 'Cristaux'), res('essence', 'Essence'), res('legendaryEssence', 'Légend.'), res('dimensionalFragments', 'Fragments')),
      h('button.hub-play', { type: 'button', id: 'btn-play', onclick: () => this.enter() },
        h('div.hub-play-icon', biome.icon),
        h('div.hub-play-body', h('b', g.state.stats.raidsTotal ? '▶ Entrer dans le donjon' : '▶ Commencer'),
          h('small', `Étage ${fi + 1} / ${g.state.floors.length} · ${biome.name} · ${floor ? floor.raidsDefended : 0} raids repoussés`)),
      ),
      run ? h('button.hub-banner.run', { type: 'button', onclick: go('Run') }, `⚔️ Partie en cours : reprendre`) : null,
      ev ? h('button.hub-banner.event', { type: 'button', onclick: go('Dungeon') }, `${ev.icon} Événement : ${ev.name}`) : null,
      rewards ? h('div.hub-rewards', `🎁 ${rewards} récompense${rewards > 1 ? 's' : ''} à récupérer`) : null,
      h('div.hub-grid',
        tile('🎮', 'Modes', 'Modes', run ? 1 : daily ? 1 : 0, '.featured'),
        tile('🎟️', 'Saison', 'Season', seasonClaims),
        tile('🎁', 'Collection', 'Collection', chests),
        tile('📜', 'Missions', 'Missions', missions),
        tile('🧠', 'Maîtrise', 'Mastery', mastery),
        tile('🏆', 'Succès', 'Achievements', ach),
        tile('👹', 'Monstres', 'Monsters'),
        tile('🛒', 'Boutique', 'Shop'),
        tile('✨', 'Prestige', 'Prestige', g.prestige.canAscend().ok ? 1 : 0),
      ),
      h('div.menu-foot', '100% hors ligne · Sauvegarde automatique'),
    );
    document.getElementById('ui').appendChild(this.menu);
  }

  /** Entre dans le jeu ; `target` : écran à ouvrir directement (le donjon reste en arrière-plan). */
  enter(target = null) {
    if (this.entering) return;
    this.entering = true;
    ctx.audio?.unlock();
    sfx('open');
    const ui = ctx.ui;
    if (!ui.initialized) {
      ui.init();
      ui.initialized = true;
    }
    this.menu?.remove();
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      ui.show();
      document.body.classList.add('route-dungeon');
      ctx.router.current = 'Dungeon';
      this.scene.start('Dungeon');
      ui.hud.mount();
      ui.nav.setActive('Dungeon');
      if (target && target !== 'Dungeon') setTimeout(() => ctx.router.go(target), 50);
      const info = ctx.pendingLoadInfo;
      ctx.pendingLoadInfo = null;
      if (info?.migratedFrom) ui.toasts.show(`Sauvegarde V${info.migratedFrom} convertie vers la V2 (copie d’origine conservée)`, { icon: '💾', type: 'success', duration: 5000 });
      if (info?.preservedKey) ui.toasts.show('Sauvegarde illisible : une copie a été conservée, nouvelle partie démarrée.', { icon: '⚠️', type: 'error', duration: 6000 });
      if (ctx.pendingOfflineReport) {
        const r = ctx.pendingOfflineReport;
        ctx.pendingOfflineReport = null;
        setTimeout(() => ui.showOfflineReport(r), 500);
      }
    });
  }

  update(t, dt) {
    this.bg.tilePositionX += dt * 0.01;
    this.bg2.tilePositionX -= dt * 0.02;
    const { width } = this.scale;
    for (const p of this.parade) {
      p.spr.x -= (this.paradeSpeed * dt) / 1000;
      if (p.spr.x < -width * 0.2) p.spr.x += width * 1.4;
      p.sh.x = p.spr.x;
    }
  }
}
