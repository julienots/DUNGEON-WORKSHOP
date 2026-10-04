/** Génère les icônes PWA à partir de l'art procédural (nécessite le serveur de dev). */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const url = process.argv[2] || 'http://localhost:5173/tools/icon.html';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(url);
await p.waitForFunction(() => document.title === 'ready');
const icons = await p.evaluate(() => window.ICONS);
mkdirSync('public/icons', { recursive: true });
const save = (name, d) => writeFileSync(`public/icons/${name}`, Buffer.from(d.split(',')[1], 'base64'));
save('icon-192.png', icons.i192);
save('icon-512.png', icons.i512);
save('icon-maskable-512.png', icons.m512);
console.log('icônes générées');
await b.close();
