import { h, vibrate } from './dom.js';
import { sfx } from './context.js';
import { CostView } from './CostView.js';

/**
 * Bouton tactile (zone de toucher ≥ 48px).
 * variant : primary | secondary | danger | ghost | gold
 */
export function Button(label, { onClick, variant = 'secondary', icon = null, cost = null, disabled = false, small = false, block = false, sound = 'click', title = null, id = null } = {}) {
  const btn = h(`button.btn.btn-${variant}${small ? '.btn-small' : ''}${block ? '.btn-block' : ''}`, { type: 'button', disabled, title, id });
  if (icon) btn.appendChild(h('span.btn-icon', icon));
  const body = h('span.btn-body');
  if (label) body.appendChild(h('span.btn-label', label));
  if (cost) body.appendChild(CostView(cost, { compact: true }));
  btn.appendChild(body);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (btn.disabled) return;
    if (sound) sfx(sound);
    vibrate(8);
    onClick?.(e);
  });
  return btn;
}

export function IconButton(icon, { onClick, title, badge = 0, cls = '' } = {}) {
  const btn = h(`button.icon-btn${cls ? '.' + cls : ''}`, { type: 'button', title, 'aria-label': title }, h('span', icon));
  if (badge) btn.appendChild(h('span.badge', String(badge)));
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx('click');
    vibrate(8);
    onClick?.(e);
  });
  return btn;
}
