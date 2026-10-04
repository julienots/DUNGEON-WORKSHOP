/** Parcours interactif de l'interface avec captures d'écran (outil de développement). */
import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(`[console] ${m.text()}`); });
p.on('pageerror', (e) => errs.push(`[pageerror] ${e.stack || e}`));
await p.goto(url);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(3000);
await p.tap('#btn-play', { force: true });
await p.waitForFunction(() => !document.getElementById('ui').classList.contains('ui-hidden'), null, { timeout: 15000 });
await p.waitForTimeout(1500);
const shot = async (name) => p.screenshot({ path: `${out}-${name}.png` });
const cell = async (x, y) => p.evaluate(([x, y]) => {
  const s = window.__DW.phaser.scene.getScene('Dungeon');
  const c = s.cellCenter(x, y);
  const dpr = window.__DW.phaser.registry.get('dpr');
  return { x: c.x / dpr, y: c.y / dpr };
}, [x, y]);
// Tutoriel
await p.tap('.tutorial .btn', { force: true });
await p.waitForTimeout(400);
// Construire une salle de combat à droite de la salle basique
await p.tap('#btn-build', { force: true });
await p.waitForTimeout(500);
await p.tap('.rcard[data-id="combat"]', { force: true });
await p.waitForTimeout(500);
await shot('build');
await p.waitForTimeout(600);
const c = await cell(2, 1);
await p.touchscreen.tap(c.x, c.y);
await p.waitForTimeout(600);
await shot('built');
await p.tap('.palette .btn-ghost', { force: true });
await p.waitForTimeout(800);
// Ouvrir la salle et placer un monstre
const c2 = await cell(2, 1);
await p.touchscreen.tap(c2.x, c2.y);
await p.waitForTimeout(600);
await shot('cell');
const slot = await p.$('.occupant.empty-slot');
if (slot) { await slot.tap(); await p.waitForTimeout(500); await shot('picker'); const mc = await p.$('.modal .mcard'); if (mc) await mc.tap(); await p.waitForTimeout(500); }
await shot('placed');
await p.tap('.sheet-grip', { force: true }).catch(() => {});
await p.waitForTimeout(400);
// Écrans
for (const tab of ['Monsters', 'Research', 'Treasury', 'Codex']) {
  await p.tap(`.nav-btn[data-tab="${tab}"]`, { force: true });
  await p.waitForTimeout(700);
  await shot(tab);
}
await p.tap('.nav-btn[data-tab="Dungeon"]', { force: true });
await p.waitForTimeout(700);
for (const k of ['missions', 'shop', 'achievements', 'adventurers', 'prestige']) {
  await p.tap(`[data-hud="${k}"]`, { force: true });
  await p.waitForTimeout(700);
  await shot(k);
  await p.tap('.screen-back', { force: true });
  await p.waitForTimeout(500);
}
await p.tap('[data-hud="bosses"]', { force: true });
await p.waitForTimeout(600);
await shot('floors');
await p.tap('.modal-close', { force: true });
await p.waitForTimeout(400);
await p.tap('[data-hud="event"]', { force: true });
await p.waitForTimeout(600);
await shot('event');
await p.tap('.modal-close', { force: true });
await p.waitForTimeout(6000);
await shot('later');
const state = await p.evaluate(() => ({ res: window.__DW.game.state.resources, stats: window.__DW.game.state.stats.raidsTotal, tuto: window.__DW.game.state.player.tutorialStep }));
console.log(JSON.stringify(state));
console.log(errs.join('\n') || 'no errors');
await b.close();
