import { h } from './dom.js';

/** Carte générique : icône, titre, sous-titre, contenu et actions. */
export function Card({ icon = null, img = null, title, subtitle = null, body = null, actions = null, cls = '', onClick = null, rarity = null, badge = null }) {
  const card = h(`div.card${cls ? '.' + cls : ''}${onClick ? '.clickable' : ''}${rarity ? '.rarity-' + rarity : ''}`);
  if (onClick) card.addEventListener('click', onClick);
  const head = h('div.card-head');
  if (img) head.appendChild(h('div.card-img', h('img', { src: img, alt: '', draggable: 'false' })));
  else if (icon) head.appendChild(h('div.card-icon', icon));
  const titles = h('div.card-titles', h('div.card-title', title), subtitle ? h('div.card-sub', subtitle) : null);
  head.appendChild(titles);
  if (badge) head.appendChild(h('div.card-badge', badge));
  card.appendChild(head);
  if (body) card.appendChild(h('div.card-body', body));
  if (actions) card.appendChild(h('div.card-actions', actions));
  return card;
}

export function Section(title, ...children) {
  return h('section.section', h('h3.section-title', title), ...children);
}

export function Tabs(tabs, active, onChange) {
  const el = h('div.tabs', tabs.map((t) => h(`button.tab${t.id === active ? '.active' : ''}`, {
    type: 'button',
    onclick: () => onChange(t.id),
  }, t.icon ? h('span.tab-icon', t.icon) : null, h('span', t.label), t.badge ? h('span.badge', String(t.badge)) : null)));
  // Onglet actif toujours visible (barre défilante sur petit écran)
  requestAnimationFrame(() => {
    const a = el.querySelector('.tab.active');
    if (a && el.scrollWidth > el.clientWidth) el.scrollLeft = a.offsetLeft - (el.clientWidth - a.offsetWidth) / 2;
  });
  return el;
}

export function Stat(label, value, cls = '') {
  return h(`div.stat${cls ? '.' + cls : ''}`, h('span.stat-label', label), h('span.stat-value', value));
}

export function Empty(text, icon = '🕸️') {
  return h('div.empty', h('div.empty-icon', icon), h('div', text));
}
