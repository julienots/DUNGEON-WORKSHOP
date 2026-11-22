/**
 * Vérifie qu'aucun émoji n'est affiché dans l'interface (parcourt les écrans, capture chacun).
 * Usage : node scripts/emoji-scan.mjs <dossier> [sauvegarde]
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [OUT, savePath] = process.argv.slice(2);
const save = savePath ? readFileSync(savePath, 'utf8') : null;
const b = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
if (save) await ctx.addInitScript((r) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear(); localStorage.setItem('dungeon_workshop_save', r); } }, save);
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(process.env.URL || 'http://localhost:4173/');
await p.waitForSelector('#btn-play', { timeout: 30000 });
await p.waitForTimeout(1200);
const scan = () => p.evaluate(() => {
  const re = /[\p{Extended_Pictographic}️]/u;
  const found = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = n.nodeValue.replace(/[©®™↔]/g, '');
    if (re.test(t) && n.parentElement?.offsetParent !== null) found.add(t.trim().slice(0, 40));
  }
  return [...found];
});
const shots = [];
const visit = async (name) => {
  await p.waitForTimeout(700);
  const f = await scan();
  if (f.length) console.log(`❌ ${name}:`, f.slice(0, 8).join(' | '));
  await p.screenshot({ path: `${OUT}/scan-${name}.png` });
  shots.push(name);
};
await visit('accueil');
await p.tap('#btn-play', { force: true });
await p.waitForTimeout(2500);
await visit('donjon');
for (let i = 0; i < 3; i++) await p.evaluate(() => document.querySelectorAll('.modal .btn').forEach((x) => x.click()));
for (const route of ['Monsters', 'Research', 'Treasury', 'Codex', 'Shop', 'Missions', 'Achievements', 'Adventurers', 'Prestige', 'Modes', 'Mastery', 'Collection', 'Season']) {
  await p.evaluate((r) => window.__DW.ctx.router.go(r), route).catch((e) => console.log('route', route, String(e).slice(0, 80)));
  await visit(route);
}
await p.evaluate(() => window.__DW.ctx.router.go('Dungeon'));
await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('#btn-build')?.click());
await visit('construire');
console.log('écrans:', shots.length, 'erreurs:', errs.join(' | ') || 'aucune');
await b.close();
