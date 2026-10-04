import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Génère dist/sw.js après la compilation : le service worker pré-cache TOUS les fichiers
 * du jeu (JS, polices, icônes...) pour un fonctionnement 100% hors ligne dès la première visite.
 */
function offlineServiceWorker() {
  return {
    name: 'dw-offline-sw',
    apply: 'build',
    closeBundle() {
      const dist = 'dist';
      const files = [];
      const walk = (dir) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (!p.endsWith('sw.js')) files.push(relative(dist, p).split('\\').join('/'));
        }
      };
      walk(dist);
      const hash = createHash('sha256');
      for (const f of files.sort()) hash.update(f).update(readFileSync(join(dist, f)));
      const version = hash.digest('hex').slice(0, 12);
      const urls = ['./', ...files.map((f) => `./${f}`)];
      const sw = `/* Service worker généré automatiquement — Dungeon Workshop (hors ligne) */
const CACHE = 'dungeon-workshop-${version}';
const PRECACHE = ${JSON.stringify(urls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('dungeon-workshop-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((cached) => cached || fetch(req)).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
`;
      writeFileSync(join(dist, 'sw.js'), sw);
      console.log(`[dw-offline-sw] ${urls.length} fichiers pré-cachés (version ${version})`);
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  server: { host: true },
  plugins: [offlineServiceWorker()],
});
