/**
 * CAPTURES POUR LA FICHE GOOGLE PLAY
 * Usage : npm run build && node scripts/store-screenshots.mjs <sauvegarde> [dossier=artifacts/store]
 *  - <sauvegarde> : contenu brut de la clé localStorage (ex. écrite par `SAVE_OUT=... node scripts/bot.mjs`)
 * Produit des captures 1080×1920 (portrait 9:16) acceptées par la console Google Play.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const [saveFile, OUT = 'artifacts/store'] = process.argv.slice(2);
const raw = readFileSync(saveFile, 'utf8');
const PORT = 4174;
const URL = `http://localhost:${PORT}/`;
mkdirSync(OUT, { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(URL)).ok) break;
  } catch {
    /* pas encore prêt */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await context.addInitScript((r) => {
  if (!sessionStorage.getItem('dw_store')) {
    sessionStorage.setItem('dw_store', '1');
    localStorage.clear();
    localStorage.setItem('dungeon_workshop_save', r);
  }
}, raw);
const page = await context.newPage();
const shot = async (name, wait = 900) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`📸 ${name}`);
};
const go = async (route) => {
  await page.evaluate((r) => {
    window.__DW.ctx.ui.modals.closeAll();
    window.__DW.ctx.router.go(r);
  }, route);
};

try {
  await page.goto(URL);
  await page.waitForSelector('#btn-play', { timeout: 30000 });
  await shot('01-accueil', 2500);

  await page.tap('#btn-play', { force: true });
  await page.waitForFunction(() => !document.getElementById('ui').classList.contains('ui-hidden'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const { game, ctx } = window.__DW;
    ctx.ui.modals.closeAll();
    // Étage bien garni en monstres
    let fi = 0;
    let best = -1;
    game.state.floors.forEach((f, i) => {
      const n = game.state.monsters.filter((m) => m.location?.floor === i).length;
      if (n > best) { best = n; fi = i; }
    });
    game.setViewFloor(fi);
  });
  await shot('02-donjon', 2000);
  await page.evaluate(() => window.__DW.game.setViewFloor(window.__DW.game.state.floors.length - 1));
  await shot('02b-donjon-biome', 2000);
  await page.evaluate(() => window.__DW.game.setViewFloor(0));
  await page.waitForTimeout(800);

  // Combat regardé
  await page.evaluate(() => {
    const g = window.__DW.game;
    g.raids.rt(g.viewFloor).nextAt = Date.now();
  });
  const raid = await page.waitForFunction(() => { const g = window.__DW.game; return !!g.raids.current(g.viewFloor) && !!window.__DW.phaser.scene.getScene('Dungeon')?.raid; }, null, { timeout: 45000, polling: 50 }).then(() => true).catch(() => false);
  if (raid) {
    await page.evaluate(() => window.__DW.ctx.ui.hud.watch());
    await shot('03-combat', 3500);
    await page.evaluate(() => {
      const { ctx } = window.__DW;
      ctx.router.go('Dungeon');
    });
    await page.waitForTimeout(1200);
  }

  for (const [route, name] of [['Monsters', '04-monstres'], ['Modes', '05-modes'], ['Collection', '06-collection'], ['Mastery', '07-maitrise'], ['Season', '08-saison']]) {
    await go(route);
    await shot(name, 1500);
  }
} finally {
  await browser.close();
  server.kill();
}
