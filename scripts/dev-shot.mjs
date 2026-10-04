/** Capture rapide : node scripts/dev-shot.mjs <url> <out-prefix> [actions...] */
import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
p.on('pageerror', (e) => errs.push(`[pageerror] ${e.stack || e}`));
await p.goto(url);
await p.waitForTimeout(3500);
await p.screenshot({ path: `${out}-menu.png` });
const play = await p.$('#btn-play');
if (play) { await play.tap(); await p.waitForTimeout(2500); }
await p.screenshot({ path: `${out}-dungeon.png` });
console.log(errs.join('\n') || 'no errors');
await b.close();
