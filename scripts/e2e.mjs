/**
 * TESTS DE BOUT EN BOUT (navigateur réel, build de production)
 * ------------------------------------------------------------
 * Usage : npm run build && npm run test:e2e
 * Lance `vite preview`, puis vérifie :
 *  1. Démarrage sans erreur
 *  2. Sauvegarde : fermer / rouvrir conserve la progression
 *  3. Mode hors ligne complet (service worker, réseau coupé)
 *  4. Progression : construire une salle -> sauvegarde
 *  5. Combat : dégâts, victoire/défaite, récompenses
 *  6. Progression hors ligne : absence simulée de 8h -> gains
 *  7. Mobile : tactile + plusieurs résolutions (aucun débordement)
 *  8. Mémoire : pas de fuite évidente après navigation intensive
 *  9. Migration : une vraie sauvegarde V1 est convertie en V2 sans perte (copie V1 conservée)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const PORT = 4173;
const URL = `http://localhost:${PORT}/`;
const OUT = 'artifacts/e2e';
mkdirSync(OUT, { recursive: true });

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function startServer() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return proc;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Le serveur de prévisualisation ne démarre pas');
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

async function newMobile(viewport = { width: 390, height: 844 }, existing = null) {
  const context = existing || (await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return { context, page, errors };
}

async function enterGame(page) {
  await page.waitForSelector('#btn-play', { timeout: 30000 });
  await page.tap('#btn-play', { force: true });
  await page.waitForFunction(() => !document.getElementById('ui').classList.contains('ui-hidden'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
}

const server = await startServer();
try {
  // ------------------------------------------------------------------ 1. Démarrage
  {
    const { context, page, errors } = await newMobile();
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await enterGame(page);
    const ok = await page.evaluate(() => !!document.querySelector('#game canvas') && window.__DW.phaser.scene.isActive('Dungeon'));
    await page.screenshot({ path: `${OUT}/1-demarrage.png` });
    record('Démarrage sans erreur', ok && errors.length === 0, errors.join(' | ').slice(0, 300));

    // -------------------------------------------------------------- 4. Progression (construction -> sauvegarde)
    const built = await page.evaluate(() => {
      const g = window.__DW.game;
      const r = g.dungeon.build(0, 2, 1, 'combat');
      g.saveNow();
      const raw = localStorage.getItem('dungeon_workshop_save');
      return { ok: r.ok, saved: !!raw && raw.includes('combat') };
    });
    record('Construire une salle → sauvegarde', built.ok && built.saved);

    // -------------------------------------------------------------- 2. Sauvegarde (fermer/rouvrir)
    await page.evaluate(() => {
      window.__DW.game.state.resources.crystals = 4321;
      window.__DW.game.saveNow();
    });
    // « Fermer le jeu » : on ferme l'onglet (même stockage local, comme un téléphone)
    await page.close({ runBeforeUnload: true });
    const s2 = await newMobile(undefined, context);
    await s2.page.goto(URL);
    await s2.page.waitForSelector('#btn-play', { timeout: 30000 });
    const kept = await s2.page.evaluate(() => ({ room: window.__DW.game.dungeon.cell(0, 2, 1)?.room, crystals: window.__DW.game.state.resources.crystals }));
    record('Fermer / rouvrir : progression conservée', kept.room === 'combat' && kept.crystals === 4321, JSON.stringify(kept));

    // -------------------------------------------------------------- 5. Combat
    const combat = await s2.page.evaluate(() => {
      const g = window.__DW.game;
      for (const sp of ['skeleton', 'orc']) {
        const m = g.monsters.create(sp);
        m.level = 10;
        m.location = { floor: 0, x: 2, y: 1 };
      }
      g.state.monsters[0].level = 10;
      const out = { outcomes: {}, dmg: 0, kills: 0 };
      const gold0 = g.state.resources.gold;
      let victoryGold = 0;
      for (let i = 0; i < 12; i++) {
        const r = g.raids.simulate(0, { seed: 1000 + i });
        out.outcomes[r.outcome] = (out.outcomes[r.outcome] || 0) + 1;
        out.dmg += r.events.filter((e) => e.type === 'dmg').length;
        out.kills += r.kills;
        if (r.outcome === 'victory') victoryGold += r.rewards.gold;
        g.raids.apply(r, { silent: true });
      }
      out.goldGain = g.state.resources.gold - gold0;
      out.victoryGold = victoryGold;
      return out;
    });
    record('Combat : dégâts calculés', combat.dmg > 0, `${combat.dmg} événements de dégâts`);
    record('Combat : victoire / défaite déterminées', Object.keys(combat.outcomes).length > 0, JSON.stringify(combat.outcomes));
    record('Combat : récompenses versées', combat.victoryGold > 0 && combat.goldGain >= combat.victoryGold * 0.99, `+${combat.goldGain} or`);

    // Combat visible + scène détaillée
    await enterGame(s2.page);
    await s2.page.evaluate(() => {
      const g = window.__DW.game;
      g.raids.rt(0).nextAt = Date.now();
    });
    const sawCombat = await s2.page.waitForSelector('.watch-btn:not(.hidden)', { timeout: 45000 }).then(() => true).catch(() => false);
    if (sawCombat) {
      await s2.page.tap('.watch-btn', { force: true });
      await s2.page.waitForTimeout(2500);
      await s2.page.screenshot({ path: `${OUT}/5-combat.png` });
    }
    const battleOk = await s2.page.evaluate(() => window.__DW.phaser.scene.isActive('Battle'));
    record('Combat regardable (scène de combat)', sawCombat && battleOk);
    record('Aucune erreur pendant le jeu', s2.errors.length === 0, s2.errors.join(' | ').slice(0, 300));

    // -------------------------------------------------------------- 6. Progression hors ligne (8h simulées)
    await s2.page.evaluate(() => {
      const g = window.__DW.game;
      g.saveNow = () => true; // empêche la sauvegarde à la fermeture
      g.saves.save(g.state, Date.now() - 8 * 3600 * 1000);
    });
    const goldBefore = await s2.page.evaluate(() => window.__DW.game.state.resources.gold);
    await s2.page.close();
    const s3 = await newMobile(undefined, context);
    await s3.page.goto(URL);
    await s3.page.waitForSelector('#btn-play', { timeout: 30000 });
    const report = await s3.page.evaluate(() => window.__DW.ctx.pendingOfflineReport);
    const goldAfter = await s3.page.evaluate(() => window.__DW.game.state.resources.gold);
    await enterGame(s3.page);
    await s3.page.waitForSelector('.modal-report', { timeout: 10000 }).catch(() => {});
    await s3.page.screenshot({ path: `${OUT}/6-hors-ligne.png` });
    const modal = await s3.page.$('.modal-report');
    record('Absence de 8h : raids simulés et gains', !!report && report.raids > 0 && goldAfter > goldBefore, report ? `${report.raids} raids, +${goldAfter - goldBefore} or` : 'pas de rapport');
    record('Rapport « Pendant votre absence » affiché', !!modal);

    // -------------------------------------------------------------- 3. Hors ligne complet (service worker)
    const swReady = await s3.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg.active;
    });
    await s3.page.waitForTimeout(1500);
    await s3.context.setOffline(true);
    await s3.page.reload();
    const offlineOk = await s3.page.waitForSelector('#btn-play', { timeout: 30000 }).then(() => true).catch(() => false);
    let playable = false;
    if (offlineOk) {
      await enterGame(s3.page);
      playable = await s3.page.evaluate(() => {
        const g = window.__DW.game;
        const r = g.raids.simulate(0, { seed: 5 });
        return window.__DW.phaser.scene.isActive('Dungeon') && r.events.length > 0;
      });
      await s3.page.screenshot({ path: `${OUT}/3-hors-ligne-reseau-coupe.png` });
    }
    record('Réseau coupé : le jeu démarre et reste jouable', swReady && offlineOk && playable, `SW actif: ${swReady}`);
    await s3.context.close();
  }

  // ------------------------------------------------------------------ 7. Résolutions mobiles
  const sizes = [
    { width: 320, height: 568, name: 'petit (iPhone SE)' },
    { width: 360, height: 640, name: 'Android compact' },
    { width: 390, height: 844, name: 'iPhone 14' },
    { width: 412, height: 915, name: 'Pixel 7 (grand)' },
    { width: 360, height: 780, name: 'ratio 19.5:9' },
    { width: 768, height: 1024, name: 'tablette portrait' },
  ];
  for (const vp of sizes) {
    const { context, page, errors } = await newMobile({ width: vp.width, height: vp.height });
    await page.goto(URL);
    await enterGame(page);
    const check = await page.evaluate(() => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const inside = (sel) => {
        const els = [...document.querySelectorAll(sel)];
        return els.every((el) => {
          const r = el.getBoundingClientRect();
          return r.width === 0 || (r.left >= -1 && r.right <= W + 1 && r.top >= -1 && r.bottom <= H + 1);
        });
      };
      const navOk = [...document.querySelectorAll('.nav-btn')].every((b) => b.getBoundingClientRect().height >= 44);
      return {
        overflowX: document.documentElement.scrollWidth > W + 1,
        topbar: inside('.topbar'),
        nav: inside('.navbar') && navOk,
        strip: inside('.raid-strip'),
        side: inside('.hud-side .icon-btn'),
      };
    });
    // Navigation tactile dans un écran
    await page.tap('.nav-btn[data-tab="Monsters"]', { force: true });
    await page.waitForTimeout(900);
    const screenOk = await page.evaluate(() => {
      const s = document.querySelector('.screen.show');
      if (!s) return false;
      const r = s.getBoundingClientRect();
      return r.left >= 0 && r.right <= window.innerWidth + 1;
    });
    await page.screenshot({ path: `${OUT}/7-${vp.width}x${vp.height}.png` });
    const ok = !check.overflowX && check.topbar && check.nav && check.strip && check.side && screenOk && errors.length === 0;
    record(`Écran ${vp.name} ${vp.width}×${vp.height}`, ok, ok ? '' : JSON.stringify({ ...check, screenOk, errors: errors.slice(0, 2) }));
    await context.close();
  }

  // ------------------------------------------------------------------ 8. Mémoire
  {
    const { context, page, errors } = await newMobile();
    const cdp = await context.newCDPSession(page);
    await page.goto(URL);
    await enterGame(page);
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const r = await cdp.send('Runtime.getHeapUsage');
      return r.usedSize;
    };
    const cycle = async () => {
      for (const tab of ['Monsters', 'Research', 'Treasury', 'Codex', 'Dungeon']) {
        await page.tap(`.nav-btn[data-tab="${tab}"]`, { force: true });
        await page.waitForTimeout(250);
      }
      await page.evaluate(() => {
        const g = window.__DW.game;
        for (let i = 0; i < 5; i++) g.raids.apply(g.raids.simulate(0, { seed: i }), { silent: true });
        g.bus.emit('dungeonChanged', 0);
      });
    };
    await cycle();
    const before = await heap();
    for (let i = 0; i < 8; i++) await cycle();
    const after = await heap();
    const growth = (after - before) / before;
    record('Mémoire : pas de fuite évidente', growth < 0.35 && errors.length === 0, `${(before / 1e6).toFixed(1)} Mo → ${(after / 1e6).toFixed(1)} Mo (${(growth * 100).toFixed(1)}%)`);
    await context.close();
  }

  // ------------------------------------------------------------------ 9. Migration V1 → V2
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const raw = readFileSync('tests/fixtures/save-v1-late.json', 'utf8');
    const v1 = JSON.parse(JSON.parse(raw).d);
    // Injectée avant le démarrage du jeu (une seule fois), comme une vraie installation V1 mise à jour
    await context.addInitScript((r) => {
      if (!sessionStorage.getItem('dw_e2e_v1')) {
        sessionStorage.setItem('dw_e2e_v1', '1');
        localStorage.clear();
        localStorage.setItem('dungeon_workshop_save', r);
      }
    }, raw);
    const { page, errors } = await newMobile(undefined, context);
    await page.goto(URL);
    await enterGame(page);
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const g = window.__DW.game;
      const toast = [...document.querySelectorAll('.toast-text')].map((e) => e.textContent).join(' | ');
      return {
        version: g.state.version, floors: g.state.floors.length, monsters: g.state.monsters.length,
        traits: g.state.monsters.every((m) => m.traits?.length === 2), backup: !!localStorage.getItem('dungeon_workshop_save_v1_backup'), toast,
        saved: JSON.parse(JSON.parse(localStorage.getItem('dungeon_workshop_save')).d).version,
      };
    });
    await page.screenshot({ path: `${OUT}/9-migration.png` });
    const ok = info.version === 2 && info.saved === 2 && info.floors === v1.floors.length && info.monsters === v1.monsters.length && info.traits && info.backup && /V2/.test(info.toast);
    record('Migration V1 → V2 (sauvegarde réelle)', ok && errors.length === 0, `${JSON.stringify(info)} ${errors.join(' | ').slice(0, 200)}`);
    await context.close();
  }
} catch (err) {
  record('Exécution des tests', false, String(err.stack || err));
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} tests réussis`);
process.exit(failed.length ? 1 : 0);
