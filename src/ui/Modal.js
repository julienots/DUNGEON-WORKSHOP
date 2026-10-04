import { h, clear } from './dom.js';
import { sfx } from './context.js';
import { Button } from './Button.js';

/** Gestionnaire de fenêtres modales empilables. */
export class ModalManager {
  constructor(host) {
    this.host = host;
    this.stack = [];
  }

  open(content, { title = null, cls = '', closable = true, onClose = null, icon = null } = {}) {
    sfx('open');
    const backdrop = h('div.modal-backdrop');
    const box = h(`div.modal${cls ? '.' + cls : ''}`);
    if (title) {
      box.appendChild(h('div.modal-head', icon ? h('span.modal-icon', icon) : null, h('h2.modal-title', title), closable ? h('button.modal-close', { type: 'button', 'aria-label': 'Fermer', onclick: () => this.close(entry) }, '✕') : null));
    }
    const body = h('div.modal-body.scroll');
    if (typeof content === 'function') content = content(() => this.close(entry), body);
    if (content) body.appendChild(content);
    box.appendChild(body);
    backdrop.appendChild(box);
    if (closable) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close(entry);
      });
    }
    const entry = { backdrop, box, body, onClose };
    this.stack.push(entry);
    this.host.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));
    return entry;
  }

  close(entry = this.stack[this.stack.length - 1]) {
    if (!entry) return;
    const idx = this.stack.indexOf(entry);
    if (idx < 0) return;
    this.stack.splice(idx, 1);
    sfx('close');
    entry.backdrop.classList.remove('show');
    entry.backdrop.classList.add('hide');
    setTimeout(() => entry.backdrop.remove(), 220);
    entry.onClose?.();
  }

  closeAll() {
    while (this.stack.length) this.close();
  }

  isOpen() {
    return this.stack.length > 0;
  }

  /** Remplace le contenu de la modale (rafraîchissement). */
  refresh(entry, content) {
    clear(entry.body);
    entry.body.appendChild(content);
  }

  confirm({ title, text, okLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false, icon = '❓' }) {
    return new Promise((resolve) => {
      let done = false;
      const entry = this.open((close) => h('div.confirm',
        h('p.confirm-text', text),
        h('div.row.gap',
          Button(cancelLabel, { variant: 'ghost', onClick: () => { done = true; resolve(false); close(); } }),
          Button(okLabel, { variant: danger ? 'danger' : 'primary', onClick: () => { done = true; resolve(true); close(); } }),
        ),
      ), { title, icon, onClose: () => { if (!done) resolve(false); } });
      return entry;
    });
  }
}
