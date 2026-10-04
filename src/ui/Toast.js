import { h } from './dom.js';

/** Notifications éphémères empilées (limitées pour ne pas saturer l'écran). */
export class Toasts {
  constructor(host) {
    this.host = host;
    this.max = 3;
  }

  show(text, { icon = 'ℹ️', type = 'info', duration = 2600 } = {}) {
    while (this.host.children.length >= this.max) this.host.firstChild.remove();
    const el = h(`div.toast.toast-${type}`, h('span.toast-icon', icon), h('span.toast-text', text));
    this.host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
    return el;
  }
}
