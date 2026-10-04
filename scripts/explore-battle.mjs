/** Test visuel : regarder un combat de raid puis affronter le boss d'événement. */
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
// Renforcer les monstres pour le test
await p.evaluate(() => {
  const g = window.__DW.game;
  g.tutorial.skip();
  for (const sp of ['orc', 'slime', 'bat', 'mushroom']) g.monsters.create(sp);
  for (const m of g.state.monsters) m.level = 12;
  g.state.raidsSpeedTest = true;
});
// Attendre un combat
await p.waitForSelector('.watch-btn:not(.hidden)', { timeout: 60000 });
await p.tap('.watch-btn', { force: true });
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}-raidbattle.png` });
await p.waitForTimeout(6000);
await p.screenshot({ path: `${out}-raidbattle2.png` });
// Boss d'événement
await p.waitForFunction(() => window.__DW.ctx.router.current === 'Dungeon', null, { timeout: 30000 }).catch(() => {});
await p.tap('[data-hud="event"]', { force: true });
await p.waitForTimeout(800);
await p.tap('.boss-card .btn-danger', { force: true });
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}-team.png` });
await p.tap('.picker-footer .btn', { force: true });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${out}-boss1.png` });
await p.waitForTimeout(8000);
await p.screenshot({ path: `${out}-boss2.png` });
await p.tap('.battle-bottom .btn-ghost', { force: true }).catch(() => {});
await p.waitForTimeout(3500);
await p.screenshot({ path: `${out}-bossresult.png` });
console.log(errs.join('\n') || 'no errors');
await b.close();
