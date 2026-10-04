/** Contexte partagé de l'interface (renseigné au démarrage dans main.js). */
export const ctx = {
  game: null,
  audio: null,
  ui: null,
  router: null,
  phaser: null,
};

export function sfx(key) {
  ctx.audio?.play(key);
}
