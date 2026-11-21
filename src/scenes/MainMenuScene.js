import Phaser from 'phaser';
import { ctx, sfx } from '../ui/context.js';
import { h } from '../ui/dom.js';
import { FONT_TITLE } from '../utils/constants.js';
import { openSettingsModal } from '../ui/screens/SettingsScreen.js';
import { icon } from '../ui/icons.js';
import { formatShort } from '../utils/format.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { ISO } from '../gfx/isoArt.js';
import { PROP_W, PROP_H, PROP_FOOT } from '../gfx/isoProps.js';

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
    // Vide + brume
    this.add.image(width / 2, height / 2, 'void_cave').setDisplaySize(width * 1.1, height * 1.1);
    this.fogs = [];
    for (let i = 0; i < 3; i++) {
      const fog = this.add.image(Math.random() * width, height * (0.12 + i * 0.12), 'fog_cloud').setDisplaySize(width * 1.4, height * 0.22).setTint(0x6a4a2a).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
      fog.speed = (10 + i * 6) * (i % 2 ? 1 : -1) * S;
      this.fogs.push(fog);
    }

    // Diorama 2.5D : un couloir de donjon en diagonale, murs et torches, parade de monstres
    const TW = Math.round(width / 3.3);
    const TH = TW / 2;
    const sc = TW / ISO.W;
    const wallH = TW * (ISO.WALL / ISO.W);
    const ox = width / 2 - TW;
    const oy = height * 0.31 - TW;
    const iso = (gx, gy) => ({ x: ox + ((gx - gy) * TW) / 2, y: oy + ((gx + gy) * TH) / 2 });
    this.menuIso = iso;
    const world = this.add.layer();
    this.world = world;
    const floors = ['basic', 'crypt', 'lava', 'treasure', 'frozen', 'grove', 'combat', 'dimensional'];
    const texH = ISO.TOP + ISO.H + ISO.WALL;
    const texL = ISO.TOP + ISO.H + ISO.LOW;
    for (let gx = -5; gx <= 10; gx++) {
      const v = ((gx % 4) + 4) % 4;
      // murs du fond
      const cw = iso(gx + 0.5, -0.5);
      world.add(this.add.image(cw.x, cw.y, SpriteFactory.isoBlock('cave', v, 'tall')).setOrigin(0.5, (ISO.TOP + ISO.H / 2 + ISO.WALL) / texH).setDisplaySize(TW + 1, texH * sc + 0.5).setDepth(cw.y));
      if (gx % 2 === 0) {
        const tx = cw.x - TW / 4;
        const ty = cw.y + TH / 4 - wallH * 0.55;
        world.add(this.add.image(tx, ty, 'torch_l').setDisplaySize(48 * sc * 1.4, 64 * sc * 1.4).setDepth(cw.y + 0.1));
        const fy = ty - 64 * sc * 1.4 * 0.18;
        const glow = this.add.image(tx, fy, 'glow').setDisplaySize(TW * 1.1, TW * 0.9).setTint(0xffa040).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(cw.y + 0.11);
        const fl = this.add.image(tx, fy, 'flame').setOrigin(0.5, 0.92).setDisplaySize(12 * sc * 2.2, 18 * sc * 2.2).setTint(0xffc060).setBlendMode(Phaser.BlendModes.ADD).setDepth(cw.y + 0.12);
        world.add([glow, fl]);
        this.tweens.add({ targets: fl, scaleY: fl.scaleY * 1.25, scaleX: fl.scaleX * 0.85, duration: 100 + Math.random() * 80, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: glow, alpha: 0.25, duration: 150 + Math.random() * 150, yoyo: true, repeat: -1 });
      }
      // sol du couloir (2 dalles de large)
      for (let gy = 0; gy < 2; gy++) {
        const c = iso(gx + 0.5, gy + 0.5);
        const room = floors[(((gx + 5) >> 1) % floors.length + floors.length) % floors.length];
        this.add.image(c.x, c.y, `iso_ground_${room}`).setDisplaySize(TW + 2, TH + 1).setDepth(-50);
        if (gy === 0) this.add.image(c.x, c.y, 'iso_ao_r').setDisplaySize(TW + 2, TH + 1).setDepth(-49);
      }
      // rebord avant coupé + socle
      const cf = iso(gx + 0.5, 2.5);
      world.add(this.add.image(cf.x, cf.y, SpriteFactory.isoBlock('cave', v, 'low')).setOrigin(0.5, (ISO.TOP + ISO.H / 2 + ISO.LOW) / texL).setDisplaySize(TW + 1, texL * sc + 0.5).setDepth(cf.y + TH));
      this.add.image(cf.x - TW / 2, cf.y, SpriteFactory.isoBase('cave', 'l', v % 2)).setOrigin(0, 0).setDisplaySize(TW / 2 + 0.5, (ISO.H / 2 + ISO.BASE) * sc).setDepth(-60);
    }
    // accessoires le long du mur
    for (const [id, gx] of [['brazier', -1.2], ['barrel', 1.2], ['chest', 3.3], ['crate', 5.2], ['goldpile', 7.3]]) {
      const p = iso(gx, 0.22);
      const w = TW * 0.42;
      world.add(this.add.image(p.x, p.y, `prop_${id}`).setOrigin(0.5, PROP_FOOT / PROP_H).setDisplaySize(w, (w * PROP_H) / PROP_W).setDepth(p.y));
    }

    // Parade de monstres le long du couloir
    const parade = ['goblin', 'slime', 'skeleton', 'bat', 'orc', 'mimic', 'whelp', 'ghost'];
    const size = Math.min(TW * 0.62, 120 * S);
    this.parade = [];
    this.paradeSize = size;
    parade.forEach((id, i) => {
      const sh = this.add.image(0, 0, 'shadow').setDisplaySize(size * 0.8, size * 0.22);
      const spr = this.add.image(0, 0, `mon_${id}`).setDisplaySize(size, size).setFlipX(true);
      world.add([sh, spr]);
      this.parade.push({ spr, sh, gx: -4 + i * 1.7, gy: i % 2 ? 1.25 : 0.85, ph: Math.random() * 6 });
    });
    this.add.image(width / 2, height * 0.3, 'glow').setDisplaySize(width * 1.6, height * 0.5).setTint(0xff7a2b).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD);

    // Titre
    const title = this.add.text(width / 2, height * 0.13, 'DUNGEON\nWORKSHOP', {
      fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: `${Math.round(Math.min(44 * S, width / 9))}px`, color: '#ffd27a', align: 'center', stroke: '#2a1408', strokeThickness: 10 * S, lineSpacing: -6 * S,
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#ff6a1a', 30 * S, true, true);
    this.tweens.add({ targets: title, scale: 1.03, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(width / 2, height * 0.13 + title.height * 0.6, 'V3 · 2.5D · Le donjon, c’est vous.', {
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
      showTrapRuleNotice();
      if (ctx.pendingOfflineReport) {
        const r = ctx.pendingOfflineReport;
        ctx.pendingOfflineReport = null;
        setTimeout(() => ui.showOfflineReport(r), 500);
      }
    });
  }

  update(t, dt) {
    const { width } = this.scale;
    for (const f of this.fogs) {
      f.x += (f.speed * dt) / 1000;
      if (f.x > width * 1.4) f.x = -width * 0.4;
      else if (f.x < -width * 0.4) f.x = width * 1.4;
    }
    // Les monstres descendent le couloir en se dandinant
    const size = this.paradeSize;
    for (const p of this.parade) {
      p.gx += (dt / 1000) * 0.32;
      if (p.gx > 9) p.gx -= 13.6;
      const feet = this.menuIso(p.gx, p.gy);
      const hop = Math.abs(Math.sin(t / 180 + p.ph)) * size * 0.07;
      p.spr.setPosition(feet.x, feet.y - size * 0.42 - hop).setDepth(feet.y);
      p.spr.setAngle(Math.sin(t / 180 + p.ph) * 4);
      p.sh.setPosition(feet.x, feet.y).setDepth(feet.y - 0.01).setAlpha(1 - hop / (size * 0.14));
    }
  }
}

/** Équilibrage V2 : une seule fois, prévient les joueurs dont des étages n'étaient défendus que par des pièges. */
function showTrapRuleNotice() {
  const g = ctx.game;
  const meta = g.state.meta || (g.state.meta = {});
  if (meta.trapRuleNotice) return;
  const empty = g.state.floors
    .map((f, i) => i)
    .filter((i) => g.dungeon.roomCells(i).some((r) => r.cell.trap) && !g.state.monsters.some((m) => m.location?.floor === i));
  meta.trapRuleNotice = true;
  if (!empty.length) return;
  const list = empty.slice(0, 8).map((i) => i + 1).join(', ') + (empty.length > 8 ? '…' : '');
  setTimeout(() => {
    ctx.ui.modals.open(
      h('div',
        h('p', 'Nouvelle règle de la V2 : les pièges affaiblissent les aventuriers (jusqu’à 70 % de leurs PV par raid), mais ce sont vos monstres qui doivent les achever.'),
        h('p.small', `Étages sans aucun monstre : ${list}. Placez-y au moins quelques monstres pour continuer à remporter les raids.`),
      ),
      { title: 'Équilibrage des pièges', icon: '🧨' },
    );
  }, 1200);
  g.requestSave(true);
}
