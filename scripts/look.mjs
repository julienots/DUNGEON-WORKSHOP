/**
 * Captures de contrôle visuel (développement) : accueil, donjon, combat.
 * Usage : node scripts/look.mjs <dossier> <préfixe> [sauvegarde] [étage]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [OUT, tag = 'shot', savePath, floorArg = '0'] = process.argv.slice(2);
const save = savePath ? readFileSync(savePath, 'utf8') : null;
const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
if (save) {
  await ctx.addInitScript((r) => {
    if (!sessionStorage.getItem('dw_look')) {
      sessionStorage.setItem('dw_look', '1');
      localStorage.clear();
      localStorage.setItem('dungeon_workshop_save', r);
    }
  }, save);
}
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.stack || e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(process.env.URL || 'http://localhost:4173/');
await p.waitForSelector('#btn-play', { timeout: 30000 });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/${tag}-menu.png` });
await p.tap('#btn-play', { force: true });
for (let i = 0; i < 4; i++) {
  await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll('.modal .btn, .modal-close, .tuto-skip, [data-skip]').forEach((b) => b.click()));
}
const fi = +floorArg;
await p.evaluate((fi) => { const g = window.__DW.game; g.tutorial?.skip?.(); g.setViewFloor ? g.setViewFloor(fi) : (g.viewFloor = fi, g.bus.emit('viewFloorChanged', fi)); }, fi);
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/${tag}-dungeon.png` });
console.log(await p.evaluate(() => { const sc = window.__DW.phaser.scene.getScene('Dungeon'); const f = window.__DW.game.dungeon.floor(sc.fi); return JSON.stringify({ cols: f.cols, rows: f.rows, TW: sc.TW, ox: sc.ox, oy: sc.oy, W: sc.scale.width, H: sc.scale.height, zoom: sc.zoom, scroll: [sc.cameras.main.scrollX, sc.cameras.main.scrollY], dpr: sc.S }); }));
await p.evaluate(() => { const sc = window.__DW.phaser.scene.getScene('Dungeon'); sc.setZoom(2.3, sc.scale.width / 2, sc.scale.height * 0.45); });
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/${tag}-zoom.png` });
await p.evaluate(() => window.__DW.phaser.scene.getScene('Dungeon').setZoom(1));
await p.evaluate((fi) => { const g = window.__DW.game; g.raids.rt(fi).nextAt = Date.now(); }, fi);
await p.waitForTimeout(+(process.env.RAID_WAIT || 5000));
await p.screenshot({ path: `${OUT}/${tag}-raid.png` });
const saw = await p.waitForSelector('.watch-btn:not(.hidden)', { timeout: 30000 }).then(() => true).catch(() => false);
if (saw) {
  await p.evaluate(() => document.querySelector('.watch-btn')?.click());
  await p.waitForTimeout(+(process.env.BATTLE_WAIT || 3000));
  await p.screenshot({ path: `${OUT}/${tag}-battle.png` });
}
console.log('battle', saw, 'errors:', errs.join('\n') || 'none');
await b.close();
