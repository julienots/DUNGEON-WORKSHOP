/** Bus d'événements minimaliste, indépendant de Phaser (testable sous Node). */
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  on(event, fn, ctx) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push({ fn, ctx });
    return () => this.off(event, fn, ctx);
  }

  once(event, fn, ctx) {
    const off = this.on(event, (...args) => {
      off();
      fn.apply(ctx, args);
    });
    return off;
  }

  off(event, fn, ctx) {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.findIndex((h) => h.fn === fn && (ctx === undefined || h.ctx === ctx));
    if (idx >= 0) list.splice(idx, 1);
  }

  /** Retire tous les abonnements d'un contexte (ex : une scène qui se ferme). */
  offContext(ctx) {
    for (const [event, list] of this.handlers) {
      this.handlers.set(event, list.filter((h) => h.ctx !== ctx));
    }
  }

  emit(event, ...args) {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) return;
    for (const h of list.slice()) {
      try {
        h.fn.apply(h.ctx, args);
      } catch (err) {
        console.error(`[EventBus] erreur dans le gestionnaire "${event}"`, err);
      }
    }
  }
}
